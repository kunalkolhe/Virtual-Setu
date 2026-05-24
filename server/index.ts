import express from 'express';
import crypto from 'crypto';
import pg from 'pg';

const app = express();
app.use(express.json());

// ── Run Aadhaar migration on startup (idempotent) ──────────────────────────
(async () => {
  const url = process.env.VITE_SUPABASE_URL_BACKEND || process.env.DATABASE_URL;
  if (!url) return;
  try {
    const { Pool } = pg;
    const pool = new Pool({ connectionString: url, ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined });
    await pool.query(`
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS aadhaar_number   TEXT,
        ADD COLUMN IF NOT EXISTS aadhaar_hash     TEXT,
        ADD COLUMN IF NOT EXISTS aadhaar_address  TEXT,
        ADD COLUMN IF NOT EXISTS aadhaar_dob      TEXT,
        ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT FALSE
    `);
    // Add unique constraint if not already there
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'profiles_aadhaar_hash_unique'
        ) THEN
          ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_aadhaar_hash_unique UNIQUE (aadhaar_hash);
        END IF;
      END $$
    `);
    // Update trigger to propagate aadhaar fields from auth metadata
    // photo_url and blood_group columns
    await pool.query(`
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS photo_url   TEXT,
        ADD COLUMN IF NOT EXISTS blood_group TEXT
    `);
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (
          user_id, full_name, phone,
          aadhaar_number, aadhaar_hash, aadhaar_address, aadhaar_dob, aadhaar_verified,
          photo_url, blood_group
        ) VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
          COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
          NEW.raw_user_meta_data ->> 'aadhaar_number',
          NEW.raw_user_meta_data ->> 'aadhaar_hash',
          NEW.raw_user_meta_data ->> 'aadhaar_address',
          NEW.raw_user_meta_data ->> 'aadhaar_dob',
          COALESCE((NEW.raw_user_meta_data ->> 'aadhaar_verified')::boolean, false),
          NEW.raw_user_meta_data ->> 'photo_url',
          NEW.raw_user_meta_data ->> 'blood_group'
        ) ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    `);
    await pool.end();
    console.log('[migration] Aadhaar columns applied successfully');
  } catch (e: any) {
    console.warn('[migration] Could not apply Aadhaar migration (may need manual Supabase run):', e.message?.slice(0, 120));
  }
})();

// ── Run Admin + Card Orders + Notifications migration ──────────────────────
(async () => {
  const url = process.env.VITE_SUPABASE_URL_BACKEND || process.env.DATABASE_URL;
  if (!url) return;
  try {
    const { Pool } = pg;
    const pool = new Pool({ connectionString: url, ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined });

    // is_admin flag
    await pool.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);

    // is_admin() helper function
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS BOOLEAN AS $$
        SELECT COALESCE(
          (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
          false
        );
      $$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
    `);

    // Admin RLS policies (skip if already exist)
    const policySQL = `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
          CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles') THEN
          CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all documents' AND tablename = 'documents') THEN
          CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT TO authenticated USING (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all documents' AND tablename = 'documents') THEN
          CREATE POLICY "Admins can update all documents" ON public.documents FOR UPDATE TO authenticated USING (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all subscriptions' AND tablename = 'subscriptions') THEN
          CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_admin());
        END IF;
      END $$
    `;
    await pool.query(policySQL);

    // card_orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.card_orders (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        plan TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','dispatched','delivered','cancelled')),
        tracking_number TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE public.card_orders ENABLE ROW LEVEL SECURITY`);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own card orders' AND tablename = 'card_orders') THEN
          CREATE POLICY "Users can view their own card orders" ON public.card_orders FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own card orders' AND tablename = 'card_orders') THEN
          CREATE POLICY "Users can insert their own card orders" ON public.card_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all card orders' AND tablename = 'card_orders') THEN
          CREATE POLICY "Admins can view all card orders" ON public.card_orders FOR SELECT TO authenticated USING (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all card orders' AND tablename = 'card_orders') THEN
          CREATE POLICY "Admins can update all card orders" ON public.card_orders FOR UPDATE TO authenticated USING (public.is_admin());
        END IF;
      END $$
    `);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_card_orders_updated_at') THEN
          CREATE TRIGGER update_card_orders_updated_at BEFORE UPDATE ON public.card_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
      END $$
    `);

    // notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','delivery')),
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY`);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications' AND tablename = 'notifications') THEN
          CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notifications' AND tablename = 'notifications') THEN
          CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert notifications' AND tablename = 'notifications') THEN
          CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all notifications' AND tablename = 'notifications') THEN
          CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_admin());
        END IF;
      END $$
    `);

    await pool.end();
    console.log('[migration] Admin + card_orders + notifications applied successfully');
  } catch (e: any) {
    console.warn('[migration] Could not apply admin migration:', e.message?.slice(0, 200));
  }
})();

/* ── In-memory share store ── */
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

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
// SUPABASE_API_KEY is the actual service role key in this project
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
// SESSION_SECRET is used to HMAC-sign share tokens for tamper detection
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production';

const PLAN_PRICES: Record<string, number> = {
  premium: 29900,
  platinum: 59900,
};

async function createRazorpayOrder(amount: number): Promise<any> {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.description || 'Failed to create Razorpay order');
  }
  return res.json();
}

async function updateSupabasePlan(userId: string, plan: string, orderId: string, paymentId: string) {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  // Update profiles table plan column (works once migration has been run)
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ plan }),
  });

  // Also update user metadata so plan is readable before/without DB migration
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_metadata: { plan } }),
  });

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  // Insert subscription record (works once migration has been run)
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      plan,
      status: 'active',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    }),
  });
}

app.post('/api/create-order', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const amount = PLAN_PRICES[plan];
    const order = await createRazorpayOrder(amount);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID });
  } catch (err: any) {
    console.error('create-order error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await updateSupabasePlan(userId, plan, razorpay_order_id, razorpay_payment_id);

    res.json({ success: true, plan });
  } catch (err: any) {
    console.error('verify-payment error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/delete-document', async (req, res) => {
  try {
    const { documentId, userId, filePath } = req.body;
    if (!documentId || !userId) {
      return res.status(400).json({ error: 'Missing documentId or userId' });
    }

    const baseHeaders = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    };
    // 'Prefer: return=minimal' suppresses row data — only use it for writes
    const writeHeaders = { ...baseHeaders, Prefer: 'return=minimal' };

    // Verify ownership (no Prefer header so rows are actually returned)
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}&select=id`,
      { headers: baseHeaders }
    );
    const rows = await checkRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: 'Document not found or access denied' });
    }

    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}`,
      { method: 'DELETE', headers: writeHeaders }
    );
    if (!delRes.ok) {
      const err = await delRes.text();
      throw new Error(`DB delete failed: ${err}`);
    }

    // Delete from storage (best-effort)
    if (filePath) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${filePath}`, {
        method: 'DELETE',
        headers: writeHeaders,
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('delete-document error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/* ── Helper: get doc info + signed URL ── */
async function getDocSignedUrl(userId: string, docId: string) {
  const baseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const docRes = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}&user_id=eq.${userId}&select=document_name,document_type,file_url`,
    { headers: baseHeaders }
  );
  const docs = await docRes.json();
  if (!Array.isArray(docs) || docs.length === 0) return null;
  const doc = docs[0];
  const signRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/documents/${doc.file_url}`,
    { method: 'POST', headers: baseHeaders, body: JSON.stringify({ expiresIn: 86400 * 2 }) }
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

/* ── POST /api/create-doc-share ── */
app.post('/api/create-doc-share', async (req, res) => {
  try {
    const { documentId, userId, pin, durationHours, permission = 'view' } = req.body;
    if (!documentId || !userId || !pin || !durationHours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const docInfo = await getDocSignedUrl(userId, documentId);
    if (!docInfo) return res.status(403).json({ error: 'Document not found or access denied' });

    const token = crypto.randomBytes(24).toString('hex');
    const pinHash = crypto.createHash('sha256').update(String(pin)).digest('hex');
    shareStore.set(token, {
      documentId, userId, pinHash,
      documentName: docInfo.name, documentType: docInfo.type,
      signedUrl: docInfo.url,
      expiresAt: Date.now() + Number(durationHours) * 3_600_000,
      permission: ['view','download_watermark','download_clean'].includes(permission) ? permission : 'view',
    });
    res.json({ token });
  } catch (err: any) {
    console.error('create-doc-share error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/* ── POST /api/revoke-doc-share ── */
app.post('/api/revoke-doc-share', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !shareStore.has(token)) {
      return res.status(404).json({ error: 'Share not found' });
    }
    shareStore.delete(token);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/* ── POST /api/get-doc-share ── */
app.post('/api/get-doc-share', async (req, res) => {
  try {
    const { token, pin } = req.body;
    const entry = token ? shareStore.get(token) : null;
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }
    const pinHash = crypto.createHash('sha256').update(String(pin || '')).digest('hex');
    if (pinHash !== entry.pinHash) {
      return res.status(403).json({ error: 'Invalid PIN' });
    }
    res.json({
      documentName: entry.documentName,
      documentType: entry.documentType,
      signedUrl: entry.signedUrl,
      expiresAt: entry.expiresAt,
      permission: entry.permission || 'view',
    });
  } catch (err: any) {
    console.error('get-doc-share error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ── Sarvam AI translate proxy ─────────────────────────────────────────────────
const SARVAM_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', gu: 'gu-IN', or: 'od-IN',
  as: 'as-IN', ur: 'ur-IN', mai: 'mai-IN', kok: 'kok-IN', ne: 'ne-IN',
  mni: 'mni-IN', brx: 'brx-IN', dgo: 'dgo-IN', ks: 'ks-IN',
  sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN',
};

app.post('/api/sarvam/translate', async (req, res) => {
  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!sarvamKey) return res.status(503).json({ error: 'Sarvam service not configured' });
  const { texts, target_lang } = req.body;
  if (!Array.isArray(texts) || !target_lang) return res.status(400).json({ error: 'texts[] and target_lang required' });
  const sarvamLang = SARVAM_LANG_MAP[target_lang];
  if (!sarvamLang) return res.status(400).json({ error: `Unsupported language: ${target_lang}` });
  const BATCH = 5;
  const allTexts = texts as string[];
  const translateOne = async (text: string): Promise<string> => {
    if (!text || !text.trim()) return text;
    try {
      const r = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: { 'api-subscription-key': sarvamKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, source_language_code: 'en-IN', target_language_code: sarvamLang, model: 'mayura:v1', mode: 'formal' }),
      });
      if (!r.ok) { console.error('[Sarvam proxy] item error', r.status); return text; }
      const j = await r.json();
      return j.translated_text || text;
    } catch { return text; }
  };
  try {
    const translations: string[] = new Array(allTexts.length).fill('');
    for (let i = 0; i < allTexts.length; i += BATCH) {
      const batch = allTexts.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(translateOne));
      results.forEach((t, j) => { translations[i + j] = t; });
      if (i + BATCH < allTexts.length) await new Promise(r => setTimeout(r, 150));
    }
    return res.json({ translations });
  } catch (err: any) {
    console.error('[Sarvam proxy] threw:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── AI proxy — routes Groq calls from the browser through the server ──────────
// The browser env injection of VITE_GROQ_API_KEY can be unreliable;
// calling from the server is always reliable (verified with curl).
app.post('/api/ai/chat', async (req, res) => {
  const groqKey = process.env.VITE_GROQ_API_KEY;
  if (!groqKey) return res.status(503).json({ error: 'AI service not configured' });

  const { messages, max_tokens = 4000, temperature = 0.1 } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[AI proxy] Groq error', groqRes.status, errText.slice(0, 200));
      return res.status(groqRes.status).json({ error: errText.slice(0, 200) });
    }

    const json = await groqRes.json();
    const text = json.choices?.[0]?.message?.content?.trim() ?? '';
    return res.json({ text });
  } catch (err: any) {
    console.error('[AI proxy] fetch threw:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
