export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const check = await fetch(`${SUPABASE_URL}/rest/v1/doc_shares?token=eq.${encodeURIComponent(token)}&select=token`, { headers: h });
    const rows = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) return new Response(JSON.stringify({ error: 'Share not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    const del = await fetch(`${SUPABASE_URL}/rest/v1/doc_shares?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=minimal' } });
    if (!del.ok) throw new Error(`Delete failed: ${await del.text()}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
