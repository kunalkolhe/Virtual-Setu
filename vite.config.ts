import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Helper: parse JSON body from raw Node request                     */
/* ------------------------------------------------------------------ */
function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: string) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/*  Vite plugin that serves the payment API during development        */
/* ------------------------------------------------------------------ */
function apiPlugin(_env: Record<string, string>): Plugin {
  // Replit secrets live in process.env, NOT in .env files that loadEnv() reads.
  // Always read server-side secrets directly from process.env here.
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
  // SUPABASE_API_KEY is the actual service role key in this project
  const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;

  const PLAN_PRICES: Record<string, number> = {
    premium: 29900,
    platinum: 59900,
  };

  /* ---- Razorpay order creation ---- */
  async function createRazorpayOrder(amount: number) {
    const auth = Buffer.from(
      `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", payment_capture: 1 }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.error?.description || "Failed to create Razorpay order"
      );
    }
    return response.json();
  }

  /* ---- Supabase plan update ---- */
  async function updateSupabasePlan(
    userId: string,
    plan: string,
    orderId: string,
    paymentId: string
  ) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    // Update profiles table
    await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`,
      { method: "PATCH", headers, body: JSON.stringify({ plan }) }
    );

    // Update user metadata
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_metadata: { plan } }),
    });

    // Insert subscription record
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        plan,
        status: "active",
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
      }),
    });
  }

    /* ---- In-memory doc-share store (dev only) ---- */
  interface ShareEntry {
    documentId: string; userId: string; pinHash: string;
    documentName: string; documentType: string;
    signedUrl: string; expiresAt: number;
    permission: 'view' | 'download_watermark' | 'download_clean';
  }
  const shareStore = new Map<string, ShareEntry>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of shareStore) { if (v.expiresAt < now) shareStore.delete(k); }
  }, 60_000);

  async function getSignedUrlForDoc(userId: string, docId: string): Promise<{ name: string; type: string; url: string } | null> {
    const docRes = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}&user_id=eq.${userId}&select=document_name,document_type,file_url`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const docs = await docRes.json();
    if (!Array.isArray(docs) || docs.length === 0) return null;
    const doc = docs[0];
    // Create a 30-day signed URL
    const signRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/documents/${doc.file_url}`,
      {
        method: 'POST',
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 86400 * 2 }),
      }
    );
    const signData = await signRes.json();
    const signedUrl = signData.signedURL
      ? `${SUPABASE_URL}/storage/v1${signData.signedURL}`
      : signData.signedUrl
        ? `${SUPABASE_URL}/storage/v1${signData.signedUrl}`
        : null;
    if (!signedUrl) return null;
    return { name: doc.document_name, type: doc.document_type, url: signedUrl };
  }

  /* ---- Vite plugin hooks ---- */
  return {
    name: "api-server",
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const isPost = req.method === "POST";
        const isGet  = req.method === "GET";

        /* ---------- POST /api/create-doc-share ---------- */
        if (isPost && req.url === '/api/create-doc-share') {
          try {
            const { documentId, userId, pin, durationHours, permission = 'view' } = await parseJsonBody(req);
            if (!documentId || !userId || !pin || !durationHours) throw new Error('Missing fields');
            const docInfo = await getSignedUrlForDoc(userId, documentId);
            if (!docInfo) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Document not found or access denied' })); return; }
            const token = crypto.randomBytes(24).toString('hex');
            const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
            const resolvedPermission: 'view' | 'download_watermark' | 'download_clean' =
              ['view', 'download_watermark', 'download_clean'].includes(permission) ? permission : 'view';
            shareStore.set(token, {
              documentId, userId, pinHash,
              documentName: docInfo.name, documentType: docInfo.type,
              signedUrl: docInfo.url,
              expiresAt: Date.now() + durationHours * 3_600_000,
              permission: resolvedPermission,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        /* ---------- POST /api/get-doc-share ---------- */
        if (isPost && req.url === '/api/get-doc-share') {
          try {
            const { token, pin } = await parseJsonBody(req);
            const entry = token ? shareStore.get(token) : null;
            if (!entry || entry.expiresAt < Date.now()) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Share link not found or expired' })); return; }
            const pinHash = crypto.createHash('sha256').update(pin || '').digest('hex');
            if (pinHash !== entry.pinHash) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid PIN' })); return; }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              documentName: entry.documentName,
              documentType: entry.documentType,
              signedUrl: entry.signedUrl,
              expiresAt: entry.expiresAt,
              permission: entry.permission || 'view',
            }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        /* ---------- POST /api/revoke-doc-share ---------- */
        if (isPost && req.url === '/api/revoke-doc-share') {
          try {
            const { token } = await parseJsonBody(req);
            if (!token || !shareStore.has(token)) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Share not found' })); return; }
            shareStore.delete(token);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (!isPost) return next();

        /* ---------- POST /api/create-order ---------- */
        if (req.url === "/api/create-order") {
          try {
            const body = await parseJsonBody(req);
            const { plan } = body;

            if (!plan || !PLAN_PRICES[plan]) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid plan" }));
              return;
            }

            const amount = PLAN_PRICES[plan];
            const order = await createRazorpayOrder(amount);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: RAZORPAY_KEY_ID,
              })
            );
          } catch (err: any) {
            console.error("create-order error:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: err.message || "Internal server error",
              })
            );
          }
          return;
        }

        /* ---------- POST /api/verify-payment ---------- */
        if (req.url === "/api/verify-payment") {
          try {
            const body = await parseJsonBody(req);
            const {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              plan,
              userId,
            } = body;

            if (
              !razorpay_order_id ||
              !razorpay_payment_id ||
              !razorpay_signature ||
              !plan ||
              !userId
            ) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ error: "Missing required fields" })
              );
              return;
            }

            const sigBody = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expectedSignature = crypto
              .createHmac("sha256", RAZORPAY_KEY_SECRET)
              .update(sigBody)
              .digest("hex");

            if (expectedSignature !== razorpay_signature) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ error: "Invalid payment signature" })
              );
              return;
            }

            await updateSupabasePlan(
              userId,
              plan,
              razorpay_order_id,
              razorpay_payment_id
            );

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, plan }));
          } catch (err: any) {
            console.error("verify-payment error:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: err.message || "Internal server error",
              })
            );
          }
          return;
        }

        /* ---------- POST /api/sarvam/translate ---------- */
        if (isPost && req.url === '/api/sarvam/translate') {
          try {
            const body = await parseJsonBody(req);
            const { texts, target_lang } = body;
            const sarvamKey = process.env.SARVAM_API_KEY;
            if (!sarvamKey) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Sarvam service not configured' }));
              return;
            }
            if (!Array.isArray(texts) || !target_lang) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'texts[] and target_lang required' }));
              return;
            }
            const SARVAM_LANG_MAP: Record<string, string> = {
              hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
              kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', gu: 'gu-IN', or: 'od-IN',
              as: 'as-IN', ur: 'ur-IN', mai: 'mai-IN', kok: 'kok-IN', ne: 'ne-IN',
              mni: 'mni-IN', brx: 'brx-IN', dgo: 'dgo-IN', ks: 'ks-IN',
              sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN',
            };
            const sarvamLang = SARVAM_LANG_MAP[target_lang];
            if (!sarvamLang) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Unsupported language: ${target_lang}` }));
              return;
            }
            const BATCH = 5;
            const allTexts = texts as string[];
            const translations: string[] = new Array(allTexts.length).fill('');
            const translateOne = async (text: string): Promise<string> => {
              if (!text || !text.trim()) return text;
              try {
                const r = await fetch('https://api.sarvam.ai/translate', {
                  method: 'POST',
                  headers: { 'api-subscription-key': sarvamKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input: text, source_language_code: 'en-IN', target_language_code: sarvamLang, model: 'mayura:v1', mode: 'formal' }),
                });
                if (!r.ok) { console.error('[Sarvam proxy] item error', r.status); return text; }
                const json = await r.json();
                return json.translated_text || text;
              } catch (e: any) { console.error('[Sarvam proxy] item threw:', e.message); return text; }
            };
            for (let i = 0; i < allTexts.length; i += BATCH) {
              const batch = allTexts.slice(i, i + BATCH);
              const results = await Promise.all(batch.map(translateOne));
              results.forEach((t, j) => { translations[i + j] = t; });
              if (i + BATCH < allTexts.length) await new Promise(r => setTimeout(r, 150));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ translations }));
          } catch (e: any) {
            console.error('[Sarvam proxy] threw:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        /* ---------- POST /api/ai/chat ---------- */
        if (isPost && req.url === '/api/ai/chat') {
          try {
            const body = await parseJsonBody(req);
            const { messages, max_tokens = 4000, temperature = 0.1 } = body;
            const groqKey = process.env.VITE_GROQ_API_KEY;
            if (!groqKey) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'AI service not configured' }));
              return;
            }
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature, max_tokens }),
            });
            const groqJson = await groqRes.json();
            if (!groqRes.ok) {
              console.error('[AI proxy] Groq error', groqRes.status, JSON.stringify(groqJson).slice(0, 200));
              res.writeHead(groqRes.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: groqJson.error?.message ?? 'Groq error' }));
              return;
            }
            const text = groqJson.choices?.[0]?.message?.content?.trim() ?? '';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ text }));
          } catch (e: any) {
            console.error('[AI proxy] threw:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        /* ---------- POST /api/delete-document ---------- */
        if (req.url === '/api/delete-document') {
          try {
            const body = await parseJsonBody(req);
            const { documentId, userId, filePath } = body;

            if (!documentId || !userId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing documentId or userId' }));
              return;
            }

            const baseHeaders: Record<string, string> = {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            };
            const writeHeaders = { ...baseHeaders, Prefer: 'return=minimal' };

            // Verify ownership (no Prefer header so rows are actually returned)
            const checkRes = await fetch(
              `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}&select=id`,
              { headers: baseHeaders }
            );
            if (!checkRes.ok) {
              const err = await checkRes.text();
              throw new Error(`Supabase auth error: ${checkRes.status} ${err}`);
            }
            const rows = await checkRes.json();
            if (!Array.isArray(rows) || rows.length === 0) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Document not found or access denied' }));
              return;
            }

            // Delete from DB
            const delRes = await fetch(
              `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}`,
              { method: 'DELETE', headers: writeHeaders }
            );
            if (!delRes.ok) {
              const errText = await delRes.text();
              throw new Error(`DB delete failed: ${errText}`);
            }

            // Delete from storage (best-effort)
            if (filePath) {
              await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${filePath}`, {
                method: 'DELETE',
                headers: writeHeaders,
              }).catch(() => {});
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            console.error('delete-document error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
          return;
        }

        next();
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Vite config                                                       */
/* ------------------------------------------------------------------ */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Expose VITE_* secrets from process.env (Replit secrets) to the browser
  // by merging them into Vite's define map.
  const viteEnvDefines: Record<string, string> = {};
  const VITE_KEYS = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL_BACKEND",
    "VITE_GROQ_API_KEY",
    "VITE_GEMINI_API_KEY",
    "VITE_RAZORPAY_KEY_ID",
    "VITE_SCRAPER_API_KEY",
    "VITE_YOUTUBE_API_KEY",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_DATABASE_URL",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
  ];
  for (const key of VITE_KEYS) {
    const val = process.env[key] ?? env[key] ?? "";
    viteEnvDefines[`import.meta.env.${key}`] = JSON.stringify(val);
  }

  return {
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: true,
    },
    define: viteEnvDefines,
    plugins: [react(), ...(mode === "development" ? [apiPlugin(env)] : [])],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
