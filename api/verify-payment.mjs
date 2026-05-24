export const config = { runtime: 'edge' };

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan || !userId)
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const expected = await hmacSha256Hex(process.env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) return new Response(JSON.stringify({ error: 'Invalid payment signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ plan }) });
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_metadata: { plan } }) });
    const end = new Date(); end.setFullYear(end.getFullYear() + 1);
    await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, { method: 'POST', headers: h, body: JSON.stringify({ user_id: userId, plan, status: 'active', razorpay_order_id, razorpay_payment_id, start_date: new Date().toISOString(), end_date: end.toISOString() }) });
    return new Response(JSON.stringify({ success: true, plan }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
