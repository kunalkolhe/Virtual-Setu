export const config = { runtime: 'edge' };

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const { token, pin } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/doc_shares?token=eq.${encodeURIComponent(token)}&select=*`, { headers: h });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return new Response(JSON.stringify({ error: 'Share link not found or expired' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    const entry = rows[0];
    if (new Date(entry.expires_at).getTime() < Date.now()) {
      await fetch(`${SUPABASE_URL}/rest/v1/doc_shares?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=minimal' } }).catch(() => {});
      return new Response(JSON.stringify({ error: 'Share link not found or expired' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    const pinHash = await sha256Hex(pin || '');
    if (pinHash !== entry.pin_hash) return new Response(JSON.stringify({ error: 'Invalid PIN' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ documentName: entry.document_name, documentType: entry.document_type, signedUrl: entry.signed_url, expiresAt: new Date(entry.expires_at).getTime() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
