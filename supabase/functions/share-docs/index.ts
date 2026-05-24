// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePath(urlOrPath: string) {
  if (!urlOrPath) return urlOrPath;
  if (urlOrPath.startsWith('http')) {
    const pubMarker = '/object/public/documents/';
    const pubIdx = urlOrPath.indexOf(pubMarker);
    if (pubIdx !== -1) return urlOrPath.slice(pubIdx + pubMarker.length);
    const anyIdx = urlOrPath.indexOf('/documents/');
    if (anyIdx !== -1) return urlOrPath.slice(anyIdx + '/documents/'.length);
  }
  return urlOrPath.replace(/^\/+/, '');
}

const htmlPage = (uid: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Document Access</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5}.container{max-width:400px;margin:0 auto;background:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}input{width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:4px;font-size:16px}button{width:100%;padding:12px;background:#007bff;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer}button:hover{background:#0056b3}.error{color:red;margin:10px 0}.hidden{display:none}.doc{border:1px solid #eee;padding:10px;margin:10px 0;border-radius:4px}.doc a{color:#007bff;text-decoration:none}</style></head><body><div class="container"><h1>Document Access</h1><div id="form"><input type="password" id="pin" placeholder="Enter PIN" maxlength="6"><button onclick="unlock()">Access Documents</button></div><div id="docs" class="hidden"><h2>Your Documents</h2><div id="list"></div></div><div id="error" class="error hidden"></div></div><script>async function unlock(){const pin=document.getElementById('pin').value;if(!pin){document.getElementById('error').textContent='Enter PIN';document.getElementById('error').classList.remove('hidden');return;}try{const res=await fetch(window.location.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:'${uid}',pin})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Invalid PIN');document.getElementById('form').classList.add('hidden');document.getElementById('docs').classList.remove('hidden');const list=document.getElementById('list');list.innerHTML=data.documents.map(d=>\`<div class="doc"><strong>\${d.document_name}</strong><br><a href="\${d.signed_url}" target="_blank">View Document</a></div>\`).join('');}catch(e){document.getElementById('error').textContent=e.message;document.getElementById('error').classList.remove('hidden');}}</script></body></html>`;

serve(async (req) => {
  console.log('Share-docs function called:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get('uid');
  
  console.log('UID parameter:', uid);

  // GET request - show HTML page
  if (req.method === 'GET' && uid) {
    console.log('Serving HTML page for UID:', uid);
    const html = htmlPage(uid);
    console.log('HTML length:', html.length);
    
    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  // POST request - handle PIN verification
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { uid: bodyUid, pin } = await req.json();
    const targetUid = bodyUid || uid;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!targetUid || !pin || !uuidRegex.test(targetUid)) {
      return new Response(JSON.stringify({ error: 'Valid uid and pin are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Compute SHA-256 hash of provided PIN
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    const pinHashHex = toHex(hash);

    // Fetch profile
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('pin_hash')
      .eq('user_id', targetUid)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: 'Internal error or invalid input' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let valid = false;

    if (profile?.pin_hash) {
      valid = profile.pin_hash === pinHashHex;
    } else {
      // Fallback to user_metadata.pin if pin_hash not set
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(targetUid);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      const metaPin = (userData.user.user_metadata as any)?.pin;
      valid = !!metaPin && String(metaPin) === String(pin);
    }

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid PIN' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Load user's documents
    const { data: docs, error: docsErr } = await admin
      .from('documents')
      .select('id, document_name, document_type, file_url, created_at')
      .eq('user_id', targetUid)
      .order('created_at', { ascending: false });

    if (docsErr) throw docsErr;

    const results: any[] = [];

    for (const d of docs || []) {
      const path = normalizePath(d.file_url || '');
      if (!path) continue;
      const { data: signed, error: signErr } = await admin.storage
        .from('documents')
        .createSignedUrl(path, 60 * 10);
      if (signErr) continue;
      results.push({
        id: d.id,
        document_name: d.document_name,
        document_type: d.document_type,
        created_at: d.created_at,
        signed_url: signed?.signedUrl,
      });
    }

    return new Response(JSON.stringify({ documents: results }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
