export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const { documentId, userId, filePath } = await req.json();
    if (!documentId || !userId) return new Response(JSON.stringify({ error: 'Missing documentId or userId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const check = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}&select=id`, { headers: h });
    const rows = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) return new Response(JSON.stringify({ error: 'Document not found or access denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    const del = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=minimal' } });
    if (!del.ok) throw new Error(`DB delete failed: ${await del.text()}`);
    if (filePath) await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${filePath}`, { method: 'DELETE', headers: { ...h, Prefer: 'return=minimal' } }).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
