export const config = { runtime: 'edge' };

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const { documentId, userId, pin, durationHours } = await req.json();
    if (!documentId || !userId || !pin || !durationHours) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const dr = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&user_id=eq.${userId}&select=document_name,document_type,file_url`, { headers: h });
    const docs = await dr.json();
    if (!Array.isArray(docs) || docs.length === 0) return new Response(JSON.stringify({ error: 'Document not found or access denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    const doc = docs[0];
    const sr = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/documents/${doc.file_url}`, { method: 'POST', headers: h, body: JSON.stringify({ expiresIn: 172800 }) });
    const sd = await sr.json();
    const signedUrl = sd.signedURL ? `${SUPABASE_URL}/storage/v1${sd.signedURL}` : sd.signedUrl ? `${SUPABASE_URL}/storage/v1${sd.signedUrl}` : null;
    if (!signedUrl) return new Response(JSON.stringify({ error: 'Could not generate signed URL' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const token = randomHex(24);
    const pinHash = await sha256Hex(pin);
    const expiresAt = new Date(Date.now() + Number(durationHours) * 3600000).toISOString();
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/doc_shares`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ token, document_id: documentId, user_id: userId, pin_hash: pinHash, document_name: doc.document_name, document_type: doc.document_type, signed_url: signedUrl, expires_at: expiresAt }) });
    if (!ins.ok) throw new Error(`Failed to create share: ${await ins.text()}`);
    return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
