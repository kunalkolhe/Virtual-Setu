import type { GovScheme } from '@/data/govSchemes';

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

export const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  mr: 'Marathi (मराठी)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  gu: 'Gujarati (ગુજરાતી)',
  or: 'Odia (ଓଡ଼ିଆ)',
  as: 'Assamese (অসমীয়া)',
  ur: 'Urdu (اردو)',
  mai: 'Maithili (मैथिली)',
  kok: 'Konkani (कोंकणी)',
  sd: 'Sindhi (سنڌي)',
  ne: 'Nepali (नेपाली)',
  mni: 'Meitei/Manipuri (মৈতৈলোন্)',
  brx: 'Bodo (बड़ो)',
  dgo: 'Dogri (डोगरी)',
  ks: 'Kashmiri (کٲشُر)',
  sa: 'Sanskrit (संस्कृतम्)',
  sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
};

export const DEVANAGARI_LANGS = new Set(['hi', 'mr', 'mai', 'kok', 'ne', 'dgo', 'sa', 'brx']);

export interface CardTranslation {
  name: string;
  description: string;
}

export interface DetailTranslation {
  name: string;
  description: string;
  objective: string;
  ministry: string;
  eligibility: string[];
  benefits: string[];
  requiredDocuments: string[];
  applicationProcess: string[];
  labels: {
    eligibilityTitle: string;
    benefitsTitle: string;
    documentsTitle: string;
    applyTitle: string;
    applyButton: string;
    launchedLabel: string;
    ministryLabel: string;
  };
}

function cardsCacheKey(lang: string) { return `vs_scheme_cards_trans_v5_${lang}`; }
function detailCacheKey(lang: string, id: string) { return `vs_scheme_detail_trans_v5_${lang}_${id}`; }

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as T;
  } catch { return null; }
}

function cacheSet<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// ── Sarvam AI translate ────────────────────────────────────────────────────────
// Calls Sarvam directly from the browser when VITE_SARVAM_API_KEY is set
// (works on Vercel and everywhere), with proxy fallback for dev without the key.

const SARVAM_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', gu: 'gu-IN', or: 'od-IN',
  as: 'as-IN', ur: 'ur-IN', mai: 'mai-IN', kok: 'kok-IN', ne: 'ne-IN',
  mni: 'mni-IN', brx: 'brx-IN', dgo: 'dgo-IN', ks: 'ks-IN',
  sa: 'sa-IN', sat: 'sat-IN', sd: 'sd-IN',
};

// Collect all available Sarvam keys (support up to 3 for round-robin)
function getSarvamKeys(): string[] {
  const env = (import.meta as any).env ?? {};
  const keys: string[] = [];
  if (env.VITE_SARVAM_API_KEY)   keys.push(env.VITE_SARVAM_API_KEY);
  if (env.VITE_SARVAM_API_KEY_2) keys.push(env.VITE_SARVAM_API_KEY_2);
  if (env.VITE_SARVAM_API_KEY_3) keys.push(env.VITE_SARVAM_API_KEY_3);
  return keys;
}

// Translate one text — tries keys round-robin, retries on 429 with next key
async function translateOneDirect(
  text: string, sarvamLang: string, keys: string[], keyIndex: number,
): Promise<string> {
  if (!text || !text.trim()) return text;
  const body = JSON.stringify({
    input: text,
    source_language_code: 'en-IN',
    target_language_code: sarvamLang,
    model: 'mayura:v1',
    mode: 'formal',
  });
  // Try each key in turn (starting from keyIndex), then wait and retry
  const maxAttempts = keys.length * 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = keys[(keyIndex + attempt) % keys.length];
    try {
      const r = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body,
      });
      if (r.status === 429) {
        // All keys exhausted for this round — wait before cycling again
        if ((attempt + 1) % keys.length === 0) {
          const wait = 2000 * (Math.floor(attempt / keys.length) + 1);
          console.warn(`[Sarvam] all ${keys.length} key(s) rate-limited, waiting ${wait}ms`);
          await new Promise(res => setTimeout(res, wait));
        }
        continue;
      }
      if (!r.ok) return text;
      const j = await r.json();
      return j.translated_text || text;
    } catch { /* network error — try next key */ }
  }
  return text;
}

async function callSarvam(texts: string[], lang: string): Promise<string[]> {
  const sarvamLang = SARVAM_LANG_MAP[lang];
  if (!sarvamLang) return texts;

  // Prefer direct browser call (works on Vercel without any proxy)
  const keys = getSarvamKeys();
  if (keys.length > 0) {
    // With N keys, run N requests concurrently (one per key), stagger batches by 300ms
    const BATCH = Math.max(keys.length, 3);
    const DELAY = Math.max(600 - keys.length * 150, 150); // fewer ms needed with more keys
    const translations: string[] = new Array(texts.length).fill('');
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      // Assign each request a starting key index in round-robin order
      const results = await Promise.all(
        batch.map((t, j) => translateOneDirect(t, sarvamLang, keys, (i + j) % keys.length)),
      );
      results.forEach((t, j) => { translations[i + j] = t; });
      if (i + BATCH < texts.length) await new Promise(r => setTimeout(r, DELAY));
    }
    return translations;
  }

  // Fallback: server-side proxy (dev server / Express)
  try {
    const res = await fetch('/api/sarvam/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target_lang: lang }),
    });
    if (!res.ok) { console.error('[Sarvam] proxy error', res.status); return texts; }
    const json = await res.json();
    return json.translations ?? texts;
  } catch (e: any) {
    console.error('[Sarvam] fetch threw:', e.message);
    return texts;
  }
}

// ── Batch card translation ─────────────────────────────────────────────────────

export async function translateSchemeCards(
  schemes: GovScheme[],
  lang: string,
): Promise<Record<string, CardTranslation>> {
  if (lang === 'en') return {};

  const cached = cacheGet<Record<string, CardTranslation>>(cardsCacheKey(lang));
  if (cached) return cached;

  const isDevanagari = DEVANAGARI_LANGS.has(lang);
  const result: Record<string, CardTranslation> = {};

  if (isDevanagari) {
    // Names come from nameHindi — only translate descriptions
    const descriptions = schemes.map(s => s.description);
    const translated = await callSarvam(descriptions, lang);
    for (let i = 0; i < schemes.length; i++) {
      result[schemes[i].id] = {
        name: schemes[i].nameHindi || schemes[i].name,
        description: translated[i] || schemes[i].description,
      };
    }
    // Only cache if descriptions actually got translated (not silently English-fallback)
    const successCount = translated.filter((t, i) => t !== descriptions[i]).length;
    if (successCount >= descriptions.length * 0.8) {
      cacheSet(cardsCacheKey(lang), result);
    }
  } else {
    // Translate names and descriptions separately to avoid rate-limit on a single huge batch
    const names = schemes.map(s => s.name);
    const descs = schemes.map(s => s.description);
    const translatedNames = await callSarvam(names, lang);
    const translatedDescs = await callSarvam(descs, lang);
    const n = schemes.length;
    for (let i = 0; i < n; i++) {
      result[schemes[i].id] = {
        name: translatedNames[i] || schemes[i].name,
        description: translatedDescs[i] || schemes[i].description,
      };
    }
    // Only cache if both names AND descriptions actually got translated
    const nameSuccess = translatedNames.filter((t, i) => t !== names[i]).length;
    const descSuccess = translatedDescs.filter((t, i) => t !== descs[i]).length;
    if (nameSuccess >= n * 0.8 && descSuccess >= n * 0.8) {
      cacheSet(cardsCacheKey(lang), result);
    }
  }
  return result;
}

// ── Detail translation ─────────────────────────────────────────────────────────

export async function translateSchemeDetail(
  scheme: GovScheme,
  lang: string,
): Promise<DetailTranslation | null> {
  if (lang === 'en') return null;

  const cached = cacheGet<DetailTranslation>(detailCacheKey(lang, scheme.id));
  if (cached) return cached;

  const isDevanagari = DEVANAGARI_LANGS.has(lang);

  const eligibility = scheme.eligibility ?? [];
  const benefits = scheme.benefits ?? [];
  const requiredDocuments = scheme.requiredDocuments ?? [];
  const applicationProcess = scheme.applicationProcess ?? [];

  const labelTexts = [
    'Eligibility Criteria',
    'Benefits & Support',
    'Required Documents',
    'How to Apply',
    'Apply / Visit Official Website',
    'Launched',
    'Ministry',
  ];

  // Build flat array of all texts to translate in one parallel batch
  const sourceTexts = [
    scheme.name,
    scheme.description,
    scheme.objective ?? '',
    scheme.ministry,
    ...eligibility,
    ...benefits,
    ...requiredDocuments,
    ...applicationProcess,
    ...labelTexts,
  ];

  const translated = await callSarvam(sourceTexts, lang);

  // Walk the result array with an index pointer
  let i = 0;
  const nameT        = translated[i++] || scheme.name;
  const descT        = translated[i++] || scheme.description;
  const objectiveT   = translated[i++] || (scheme.objective ?? '');
  const ministryT    = translated[i++] || scheme.ministry;
  const eligibilityT = eligibility.map(e => translated[i++] || e);
  const benefitsT    = benefits.map(b => translated[i++] || b);
  const docsT        = requiredDocuments.map(d => translated[i++] || d);
  const stepsT       = applicationProcess.map(s => translated[i++] || s);
  const labT         = labelTexts.map(l => translated[i++] || l);

  const result: DetailTranslation = {
    name: isDevanagari ? (scheme.nameHindi || nameT) : nameT,
    description: descT,
    objective: objectiveT,
    ministry: ministryT,
    eligibility: eligibilityT,
    benefits: benefitsT,
    requiredDocuments: docsT,
    applicationProcess: stepsT,
    labels: {
      eligibilityTitle: labT[0],
      benefitsTitle:    labT[1],
      documentsTitle:   labT[2],
      applyTitle:       labT[3],
      applyButton:      labT[4],
      launchedLabel:    labT[5],
      ministryLabel:    labT[6],
    },
  };

  cacheSet(detailCacheKey(lang, scheme.id), result);
  return result;
}
