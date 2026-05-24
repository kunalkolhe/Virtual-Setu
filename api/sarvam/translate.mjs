export const config = { runtime: 'edge' };

const SARVAM_LANG_MAP = {
  hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', gu: 'gu-IN', or: 'od-IN',
  as: 'as-IN', ur: 'ur-IN', mai: 'mai-IN', kok: 'kok-IN', ne: 'ne-IN',
  mni: 'mni-IN', brx: 'brx-IN', dgo: 'dgo-IN', ks: 'ks-IN',
  sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!sarvamKey) {
    return new Response(JSON.stringify({ error: 'Sarvam service not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { texts, target_lang } = body;
  if (!Array.isArray(texts) || !target_lang) {
    return new Response(JSON.stringify({ error: 'texts[] and target_lang required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sarvamLang = SARVAM_LANG_MAP[target_lang];
  if (!sarvamLang) {
    return new Response(JSON.stringify({ error: `Unsupported language: ${target_lang}` }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const translateOne = async (text) => {
    if (!text || !text.trim()) return text;
    try {
      const r = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          source_language_code: 'en-IN',
          target_language_code: sarvamLang,
          model: 'mayura:v1',
          mode: 'formal',
        }),
      });
      if (!r.ok) return text;
      const j = await r.json();
      return j.translated_text || text;
    } catch { return text; }
  };

  try {
    const BATCH = 5;
    const translations = new Array(texts.length).fill('');
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(translateOne));
      results.forEach((t, j) => { translations[i + j] = t; });
      if (i + BATCH < texts.length) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    return new Response(JSON.stringify({ translations }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
