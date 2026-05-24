import { supabase } from '@/integrations/supabase/client';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SCRAPER_URL = 'https://api.scraperapi.com';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LS_PREFIX = 'vs_checklist_v5_';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी, Devanagari script)',
  mr: 'Marathi (मराठी, Devanagari script)',
  bn: 'Bengali (বাংলা)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ, Gurmukhi script)',
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

const GOVT_URLS: Record<string, string> = {
  passport_application: 'https://www.passportindia.gov.in/AppOnlineProject/online/reqDocsForFreshPassport',
  pan_card_application: 'https://www.incometaxindia.gov.in/Pages/tax-services/apply-for-pan.aspx',
  driving_license: 'https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do',
  voter_id_registration: 'https://voters.eci.gov.in/',
  bank_account_opening: 'https://rbi.org.in/Scripts/PublicationReportDetails.aspx?UrlPage=&ID=508',
  aadhaar_enrollment: 'https://myaadhaar.uidai.gov.in/',
  job_application: 'https://www.ncs.gov.in/',
  college_admission: 'https://www.ugc.gov.in/',
};

// YouTube: map app language code → YouTube relevanceLanguage + query suffix
const YT_LANG_CODE: Record<string, string> = {
  en: 'en', hi: 'hi', mr: 'mr', bn: 'bn', ta: 'ta',
  te: 'te', kn: 'kn', ml: 'ml', pa: 'pa', gu: 'gu',
};
const YT_LANG_SUFFIX: Record<string, string> = {
  hi: 'Hindi', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil',
  te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi',
  gu: 'Gujarati', or: 'Odia', as: 'Assamese',
};

// Curated YouTube search queries for builtin purposes
const VIDEO_QUERIES: Record<string, string> = {
  passport_application: 'passport online apply India 2024 step by step',
  pan_card_application: 'PAN card online apply NSDL UTIITSL 2024 India',
  driving_license: 'driving license online apply Sarathi parivahan India 2024',
  voter_id_registration: 'voter ID card online registration voters.eci.gov.in 2024',
  bank_account_opening: 'bank account online open zero balance India 2024',
  aadhaar_enrollment: 'aadhaar card enrollment update myaadhaar 2024',
  job_application: 'government job application documents India 2024',
  college_admission: 'college admission documents process India 2024',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequiredDocument {
  name: string;
  description: string;
  required: boolean;
  document_type: string;
}

export interface ChecklistData {
  documentType: string;
  requiredDocuments: RequiredDocument[];
  steps: string[];
  notes: string[];
  videoId?: string;
  videoSearchQuery?: string;
  officialUrl?: string;
  generatedAt: number;
  fromCache: boolean;
  source: 'scraped' | 'ai' | 'cache';
}

// ─── localStorage cache ───────────────────────────────────────────────────────

function lsCacheKey(purposeId: string, lang: string) {
  return `${LS_PREFIX}${purposeId}_${lang}`;
}

function lsGet(purposeId: string, lang: string): ChecklistData | null {
  try {
    const raw = localStorage.getItem(lsCacheKey(purposeId, lang));
    if (!raw) return null;
    const data: ChecklistData = JSON.parse(raw);
    if (Date.now() - data.generatedAt > CACHE_TTL_MS) {
      localStorage.removeItem(lsCacheKey(purposeId, lang));
      return null;
    }
    return { ...data, fromCache: true };
  } catch {
    return null;
  }
}

function lsSet(purposeId: string, lang: string, data: ChecklistData): void {
  try {
    localStorage.setItem(lsCacheKey(purposeId, lang), JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

// ─── Supabase cache ───────────────────────────────────────────────────────────

function dbKey(purposeId: string, lang: string) {
  return lang === 'en' ? purposeId : `${purposeId}_${lang}`;
}

async function supabaseGet(purposeId: string, lang: string): Promise<ChecklistData | null> {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('document_type', dbKey(purposeId, lang))
      .maybeSingle();
    if (error || !data) return null;
    const age = Date.now() - new Date(data.created_at as string).getTime();
    if (age > CACHE_TTL_MS) return null;
    return {
      documentType: data.document_type as string,
      requiredDocuments: data.required_documents as RequiredDocument[],
      steps: data.steps as string[],
      notes: data.notes as string[],
      generatedAt: new Date(data.created_at as string).getTime(),
      fromCache: true,
      source: 'cache',
    };
  } catch {
    return null;
  }
}

async function supabaseSave(purposeId: string, lang: string, data: ChecklistData): Promise<void> {
  try {
    await supabase.from('checklists').upsert(
      {
        document_type: dbKey(purposeId, lang),
        required_documents: data.requiredDocuments,
        steps: data.steps,
        notes: data.notes,
      },
      { onConflict: 'document_type' }
    );
  } catch { /* table may not exist yet */ }
}

// ─── ScraperAPI ───────────────────────────────────────────────────────────────

async function scrapeGovPage(url: string): Promise<string> {
  const apiKey = import.meta.env.VITE_SCRAPER_API_KEY;
  if (!apiKey) throw new Error('VITE_SCRAPER_API_KEY not set');
  const endpoint = `${SCRAPER_URL}?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 9000);
}

// ─── DuckDuckGo search: find current official URL (plain HTML, no JS needed) ──

async function searchOfficialUrl(purposeLabel: string): Promise<string | undefined> {
  const scraperKey = import.meta.env.VITE_SCRAPER_API_KEY;
  if (!scraperKey) return undefined;
  try {
    // DuckDuckGo HTML endpoint — plain HTML, no JS rendering, minimal bot blocking
    const query = `${purposeLabel} official website gov.in India`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const endpoint = `${SCRAPER_URL}?api_key=${scraperKey}&url=${encodeURIComponent(ddgUrl)}&render=false`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return undefined;
    const html = await res.text();

    // DuckDuckGo HTML results contain direct href links AND uddg= encoded redirects
    const direct = [...(html.matchAll(/href="(https?:\/\/[^"]+)"/g))]
      .map((m) => m[1]);
    const redirects = [...(html.matchAll(/uddg=(https?[^&">\s]+)/g))]
      .map((m) => { try { return decodeURIComponent(m[1]); } catch { return ''; } });

    const allUrls = [...direct, ...redirects].filter((u) =>
      u.startsWith('http') &&
      !u.includes('duckduckgo.') &&
      !u.includes('duck.co') &&
      !u.includes('google.') &&
      !u.includes('facebook.') &&
      !u.includes('twitter.')
    );

    // Strongly prefer .gov.in / .nic.in
    const govUrl = allUrls.find((u) => /\.(gov\.in|nic\.in)/.test(u));
    // Second preference: any Indian government-adjacent domain
    const indiaUrl = allUrls.find((u) => /\.(in|gov|mahaonline|mahabhumi|digitalsatbara)/.test(u));
    return govUrl ?? indiaUrl ?? allUrls[0] ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── YouTube: get real video ID (YouTube Data API v3 → ScraperAPI fallback) ───

async function searchYouTubeVideo(searchQuery: string, lang = 'en'): Promise<string | undefined> {
  // Build a language-aware query: append language name so YouTube returns the right language
  const suffix = lang !== 'en' ? (YT_LANG_SUFFIX[lang] ?? '') : '';
  const langQuery = suffix ? `${searchQuery} ${suffix}` : searchQuery;
  const ytLang = YT_LANG_CODE[lang] ?? 'en';

  // Primary: YouTube Data API v3 — instant, free 10k units/day, 100% reliable
  const ytApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (ytApiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(langQuery)}&maxResults=3&type=video&relevanceLanguage=${ytLang}&key=${ytApiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const json = await res.json();
        const id = json.items?.[0]?.id?.videoId;
        if (id) return id;
      }
    } catch { /* fallthrough to ScraperAPI */ }
  }

  // Fallback: ScraperAPI scraping YouTube with JS rendering
  const scraperKey = import.meta.env.VITE_SCRAPER_API_KEY;
  if (!scraperKey) return undefined;
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(langQuery)}&hl=${ytLang}`;
    const endpoint = `${SCRAPER_URL}?api_key=${scraperKey}&url=${encodeURIComponent(ytUrl)}&render=true`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(35_000) });
    if (!res.ok) return undefined;
    const html = await res.text();
    const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    return match?.[1] ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── GROQ extraction from scraped content ────────────────────────────────────

async function extractFromScrapedText(
  purposeLabel: string,
  scrapedText: string,
  langName: string
): Promise<RequiredDocument[] | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  const langInstruction = langName === 'English'
    ? ''
    : `\n\nIMPORTANT: Respond ENTIRELY in ${langName}. All "name" and "description" values must be written in ${langName}.`;

  const prompt = `You are an expert on Indian government document requirements.

Below is raw text scraped from an official Indian government website about: "${purposeLabel}"${langInstruction}

Scraped text:
"""
${scrapedText}
"""

Return ONLY valid JSON array:
[
  {
    "name": "Document name",
    "description": "What it is and why needed (1 sentence)",
    "required": true,
    "document_type": "<one of: aadhaar, pan_card, voter_id, driving_license, passport, birth_certificate, income_certificate, caste_certificate, domicile_certificate, other>"
  }
]

Rules:
- Extract ONLY documents actually mentioned in the text
- If the text doesn't contain useful document info, return []
- Return ONLY the JSON array, nothing else`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) return null;
  const raw = await res.json();
  const content: string = raw.choices?.[0]?.message?.content ?? '[]';
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as RequiredDocument[];
    return parsed.length >= 3 ? parsed : null;
  } catch {
    return null;
  }
}

// ─── GROQ full generation ─────────────────────────────────────────────────────

async function generateWithGroq(
  purposeId: string,
  purposeLabel: string,
  langName: string,
  lang = 'en'
): Promise<ChecklistData> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ API key not configured.');

  const langInstruction = langName === 'English'
    ? ''
    : `\n\nIMPORTANT: Respond ENTIRELY in ${langName}. All "name", "description", "steps", and "notes" values must be written in ${langName} script. Do NOT use English for any content values.`;

  const prompt = `You are an expert on Indian government document requirements.

A user in India wants to: "${purposeLabel}"${langInstruction}

Generate a comprehensive checklist in EXACTLY this JSON format (no other text):
{
  "requiredDocuments": [
    {
      "name": "Full document name",
      "description": "What it is and why it is needed (1 sentence)",
      "required": true,
      "document_type": "<one of: aadhaar, pan_card, voter_id, driving_license, passport, birth_certificate, income_certificate, caste_certificate, domicile_certificate, other>"
    }
  ],
  "steps": ["Step 1: ...", "Step 2: ..."],
  "notes": ["Fee and timing info", "Helpline or contact info"]
}

Rules:
- 5–8 documents (mix of required true/false), 4–7 detailed steps, 2–3 notes
- Focus on 2024 Indian government requirements
- Return ONLY valid JSON`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service error (${res.status}): ${text.slice(0, 120)}`);
  }

  const raw = await res.json();
  const content: string = raw.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);

  const videoQuery = VIDEO_QUERIES[purposeId] || `${purposeLabel} India 2024 how to apply tutorial`;

  // Run YouTube search and Google official URL search in parallel
  const [videoId, liveOfficialUrl] = await Promise.all([
    searchYouTubeVideo(videoQuery, lang),
    GOVT_URLS[purposeId]
      ? Promise.resolve(GOVT_URLS[purposeId])   // known purpose → use hardcoded verified URL
      : searchOfficialUrl(purposeLabel),          // custom purpose → Google it live
  ]);

  return {
    documentType: purposeId,
    requiredDocuments: (parsed.requiredDocuments ?? []) as RequiredDocument[],
    steps: (parsed.steps ?? []) as string[],
    notes: (parsed.notes ?? []) as string[],
    videoId,
    videoSearchQuery: videoQuery,
    officialUrl: liveOfficialUrl || '',
    generatedAt: Date.now(),
    fromCache: false,
    source: 'ai',
  };
}

// ─── Combined: scrape → extract → fallback ───────────────────────────────────

async function generateChecklist(
  purposeId: string,
  purposeLabel: string,
  lang: string
): Promise<ChecklistData> {
  const langName = LANG_NAMES[lang] ?? 'English';
  const govUrl = GOVT_URLS[purposeId];
  const scraperKey = import.meta.env.VITE_SCRAPER_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;

  const videoQuery = VIDEO_QUERIES[purposeId] || `${purposeLabel} India 2024 how to apply tutorial`;
  // Start YouTube search early — pass lang so results are in the right language
  const videoPromise = searchYouTubeVideo(videoQuery, lang);

  if (scraperKey && govUrl) {
    try {
      const [text] = await Promise.all([scrapeGovPage(govUrl)]);

      if (text.length > 200) {
        const extracted = await extractFromScrapedText(purposeLabel, text, langName);

        if (extracted && extracted.length >= 3) {
          const langInstruction = langName === 'English'
            ? ''
            : ` Respond ENTIRELY in ${langName}. All steps and notes must be in ${langName}.`;

          const enrichPrompt = `Based on the following scraped document requirements for "${purposeLabel}" in India, generate detailed application steps and important notes.${langInstruction}

Documents found:
${extracted.map((d) => `- ${d.name}`).join('\n')}

Return ONLY valid JSON:
{
  "steps": ["Step 1: detailed description...", "Step 2: ..."],
  "notes": ["Note 1", "Note 2"]
}

Make the steps detailed — include fees, timelines, and what to bring.`;

          let steps: string[] = [];
          let notes: string[] = [];

          try {
            if (groqKey) {
              const r = await fetch(GROQ_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [{ role: 'user', content: enrichPrompt }],
                  temperature: 0.2,
                  max_tokens: 800,
                  response_format: { type: 'json_object' },
                }),
              });
              if (r.ok) {
                const rd = await r.json();
                const rc = JSON.parse(rd.choices?.[0]?.message?.content ?? '{}');
                steps = rc.steps ?? [];
                notes = rc.notes ?? [];
              }
            }
          } catch { /* enrichment failure */ }

          const videoId = await videoPromise;
          return {
            documentType: purposeId,
            requiredDocuments: extracted,
            steps,
            notes,
            videoId,
            videoSearchQuery: videoQuery,
            officialUrl: GOVT_URLS[purposeId] || '',
            generatedAt: Date.now(),
            fromCache: false,
            source: 'scraped',
          };
        }
      }
    } catch (err) {
      console.warn('[Checklist] Scraping failed, falling back to AI:', err);
    }
  }

  return generateWithGroq(purposeId, purposeLabel, langName, lang);
}

// ─── Built-in data ────────────────────────────────────────────────────────────

const BUILTIN: Record<string, { docs: RequiredDocument[]; steps: string[]; notes: string[] }> = {
  passport_application: {
    docs: [
      { name: 'Aadhaar Card', description: 'Primary proof of identity and address accepted at all PSKs', required: true, document_type: 'aadhaar' },
      { name: 'PAN Card', description: 'Income tax proof required for all adult passport applicants', required: true, document_type: 'pan_card' },
      { name: 'Birth Certificate / Class 10 Certificate', description: 'Proof of date of birth — original board certificate accepted', required: true, document_type: 'birth_certificate' },
      { name: 'Proof of Address', description: 'Utility bill / bank statement not older than 3 months', required: true, document_type: 'domicile_certificate' },
      { name: 'Passport Size Photographs', description: '2 recent colour photos, 3.5×4.5 cm, white background, ears visible', required: true, document_type: 'other' },
      { name: 'Existing Passport', description: 'Old passport required only for renewal or re-issue', required: false, document_type: 'passport' },
    ],
    steps: [
      'Register at passportindia.gov.in → Click "Register Now" → verify your email',
      'Log in → click "Apply for Fresh Passport / Reissue" → fill Form 1 carefully (name must match Aadhaar exactly)',
      'Pay the fee online: ₹1,500 for 36-page booklet or ₹2,000 for 60-page booklet (Tatkal: add ₹2,000–₹3,500)',
      'Book an appointment at your nearest Passport Seva Kendra (PSK) or Post Office PSK — choose the earliest slot',
      'Visit the PSK on your appointment date with originals + two sets of self-attested photocopies of all documents',
      'Complete biometric capture (fingerprints, photo, signature) and document verification at the PSK counter',
      'Police verification is conducted at your address (may be skipped if Aadhaar is linked to the application)',
      'Passport is dispatched by Speed Post — track at passportindia.gov.in → "Track Application Status"',
    ],
    notes: [
      'Tatkal passports are typically delivered within 7–14 working days (fee: ₹2,000–₹3,500 extra)',
      'Linking your Aadhaar can eliminate police verification for normal scheme',
      'Helpline: 1800-258-1800 (toll free) | SMS "STATUS <file no>" to 9704100100',
    ],
  },
  pan_card_application: {
    docs: [
      { name: 'Aadhaar Card', description: 'Most widely accepted identity + address proof — enables instant e-PAN', required: true, document_type: 'aadhaar' },
      { name: 'Proof of Identity', description: 'Voter ID / Driving License / Passport (any one)', required: true, document_type: 'voter_id' },
      { name: 'Proof of Address', description: 'Utility bill / bank statement (any one, not older than 3 months)', required: true, document_type: 'domicile_certificate' },
      { name: 'Proof of Date of Birth', description: 'Birth certificate / Class 10 marksheet / Aadhaar card', required: true, document_type: 'birth_certificate' },
      { name: 'Passport Size Photographs', description: '2 recent colour photos for offline / physical application', required: true, document_type: 'other' },
    ],
    steps: [
      'Visit incometax.gov.in → "Instant e-PAN" (free, if Aadhaar is linked to mobile) OR go to onlineservices.nsdl.com for a full application',
      'Select Form 49A (for Indian citizens) — fill all fields exactly as they appear on your Aadhaar',
      'Upload scanned copies of identity proof, address proof, and date-of-birth proof (JPG/PDF, max 300 KB each)',
      'Pay the fee: ₹107 for Indian address, ₹1,020 for foreign address — pay online via Net Banking / UPI / Debit card',
      'Note the 15-digit Acknowledgement Number — you will need it to track your PAN status',
      'e-PAN is sent to your registered email within 2–3 working days; physical PAN card arrives in 15–20 working days',
    ],
    notes: [
      'Instant free e-PAN at incometax.gov.in requires Aadhaar linked to mobile number',
      'PAN–Aadhaar linking is mandatory — penalty of ₹1,000 applies if not linked',
      'Helpline: 020-27218080 (NSDL) | 033-40802999 (UTIITSL) | Monday–Saturday 7 AM–11 PM',
    ],
  },
  driving_license: {
    docs: [
      { name: 'Aadhaar Card', description: 'Identity and address proof accepted at all RTOs across India', required: true, document_type: 'aadhaar' },
      { name: 'Proof of Age', description: 'Birth certificate / Class 10 certificate / Aadhaar (showing DOB)', required: true, document_type: 'birth_certificate' },
      { name: 'Proof of Address', description: 'Aadhaar / utility bill / bank passbook (matching RTO state)', required: true, document_type: 'domicile_certificate' },
      { name: 'Learning Licence', description: 'Valid LL obtained at least 30 days before the DL driving test', required: true, document_type: 'other' },
      { name: 'Passport Size Photographs', description: '2 recent colour photos, white background', required: true, document_type: 'other' },
      { name: 'Medical Certificate — Form 1A', description: 'Required only for commercial vehicle / heavy vehicle licences', required: false, document_type: 'other' },
    ],
    steps: [
      'Register at parivahan.gov.in → "Drivers/Learners Licence" → select your state',
      'Apply for Learning Licence — submit Form 1 & 2, pay ₹200, and appear for the LL online computer test at the RTO',
      'Wait at least 30 days after getting your Learning Licence before applying for a Driving Licence',
      'Apply for DL online at Sarathi portal → upload documents → pay fees (₹200–₹750 depending on vehicle class)',
      'Book your driving skill test slot at the RTO — bring originals + photocopies on the test day',
      'Appear for the driving skill test in the vehicle class you are applying for',
      'If you pass, a smart card DL is dispatched to your address within 7 working days',
    ],
    notes: [
      'Minimum age: 18 years for motor car/bike; 16 years for gearless mopeds (≤50cc)',
      "Learner's Licence is valid for 6 months — apply for DL within this window",
      'Keep your LL acknowledgement as valid proof while your smart card DL is in transit',
    ],
  },
  voter_id_registration: {
    docs: [
      { name: 'Proof of Age', description: 'Birth certificate / Aadhaar / Class 10 certificate (any one)', required: true, document_type: 'birth_certificate' },
      { name: 'Proof of Address', description: 'Aadhaar / utility bill / bank passbook (must match polling area)', required: true, document_type: 'domicile_certificate' },
      { name: 'Passport Size Photograph', description: 'One recent colour photo (3.5×4.5 cm) for the EPIC card', required: true, document_type: 'other' },
    ],
    steps: [
      'Visit voters.eci.gov.in or install the "Voter Helpline" app (1950)',
      'Click "New Voter Registration" → fill Form 6 (name, DOB, address, constituency)',
      'Upload your photograph and supporting documents (proof of age + proof of address)',
      'Submit the form and note your Reference ID for status tracking',
      'A Booth Level Officer (BLO) may visit your address to verify details',
      'EPIC card (Voter ID) is dispatched within 30 days of successful verification',
    ],
    notes: [
      'Eligibility: Indian citizen, 18+ years as of 1 January of the registration year',
      'NRIs can register via Form 6A using their Indian passport',
      'Check your name on the voter list at electoralsearch.eci.gov.in | Helpline: 1950',
    ],
  },
  bank_account_opening: {
    docs: [
      { name: 'Aadhaar Card', description: 'Officially Valid Document (OVD) for full KYC verification', required: true, document_type: 'aadhaar' },
      { name: 'PAN Card', description: 'Mandatory for all bank accounts under Income Tax Act', required: true, document_type: 'pan_card' },
      { name: 'Proof of Address', description: 'Utility bill / Passport / Voter ID (if Aadhaar address differs)', required: true, document_type: 'domicile_certificate' },
      { name: 'Passport Size Photographs', description: '2 recent colour photos for the account opening form', required: true, document_type: 'other' },
      { name: 'Existing Bank Statement', description: 'Last 6 months — only if transferring primary banking relationship', required: false, document_type: 'income_certificate' },
    ],
    steps: [
      'Choose account type: Savings / Current / Salary / Jan Dhan (PMJDY — zero balance)',
      'Visit the bank branch or apply online at the bank\'s official app / website',
      'Fill the KYC form — provide Aadhaar and PAN details (Aadhaar OTP verification may be used)',
      'Submit self-attested photocopies of all OVDs (Aadhaar + PAN mandatory)',
      'Deposit initial minimum balance: ₹0 (Jan Dhan / Salary) to ₹5,000 (premium accounts)',
      'Account is activated within 1–3 working days; internet/mobile banking credentials sent via SMS/email',
      'Debit card and welcome kit are delivered by post within 7–10 working days',
    ],
    notes: [
      'Video KYC (V-KYC) available with most private banks — no branch visit needed',
      'Jan Dhan (PMJDY) accounts have zero minimum balance and include accidental insurance of ₹2 lakh',
      'Link your mobile number and Aadhaar on Day 1 to activate UPI and online banking',
    ],
  },
  aadhaar_enrollment: {
    docs: [
      { name: 'Proof of Identity', description: 'Passport / PAN / Voter ID / Driving License / NREGS Card (any one)', required: true, document_type: 'voter_id' },
      { name: 'Proof of Address', description: 'Bank passbook / utility bill / Passport / rental agreement (any one)', required: true, document_type: 'domicile_certificate' },
      { name: 'Proof of Date of Birth', description: 'Birth certificate / Class 10 certificate (optional but recommended)', required: false, document_type: 'birth_certificate' },
    ],
    steps: [
      'Locate the nearest Aadhaar Enrollment Centre at uidai.gov.in → "Locate Enrolment Centre"',
      'Fill the Enrolment Form at the centre (or download and fill beforehand from uidai.gov.in)',
      'Submit original POI and POA documents for verification at the counter',
      'Biometric capture: fingerprints (all 10), iris scan (both eyes), and photograph',
      'Collect the acknowledgement slip with your 14-digit Enrolment ID (EID) — keep it safe',
      'Track your Aadhaar status at myaadhaar.uidai.gov.in or call 1947',
      'e-Aadhaar downloadable from myaadhaar.uidai.gov.in within 30–90 days; physical card follows by post',
    ],
    notes: [
      'Aadhaar enrollment is completely FREE at all UIDAI-authorised centres',
      'Aadhaar update (name, address, mobile) is available at myaadhaar.uidai.gov.in for ₹50',
      'Helpline: 1947 (toll free) | Email: help@uidai.gov.in | App: mAadhaar',
    ],
  },
  job_application: {
    docs: [
      { name: 'Aadhaar Card', description: 'Primary identity proof required by all employers for BGV', required: true, document_type: 'aadhaar' },
      { name: 'PAN Card', description: 'Mandatory for payroll, Form 16, and TDS deduction', required: true, document_type: 'pan_card' },
      { name: 'Educational Certificates', description: 'Degree / diploma / mark sheets for all qualifying examinations', required: true, document_type: 'other' },
      { name: 'Experience Certificate & Relieving Letter', description: 'From each previous employer — mandatory for background verification', required: true, document_type: 'other' },
      { name: 'Bank Account Details', description: 'Cancelled cheque or bank passbook for salary credit setup', required: true, document_type: 'income_certificate' },
      { name: 'Passport Size Photographs', description: '4–6 recent colour photos for ID cards and employer forms', required: true, document_type: 'other' },
      { name: 'Passport', description: 'Required for MNCs, government jobs, or security-clearance roles', required: false, document_type: 'passport' },
      { name: 'Salary Slips', description: 'Last 3 months from current/previous employer (for salary negotiation)', required: false, document_type: 'income_certificate' },
    ],
    steps: [
      'Prepare an updated resume and gather all certificates (self-attest photocopies)',
      'Apply via the company portal, Naukri.com, LinkedIn, or directly at walk-in drives',
      'Appear for aptitude / technical / HR interview rounds as required',
      'Submit documents for Background Verification (BGV) — typically done by a third-party agency',
      'Negotiate offer and sign the offer letter; note joining date and probation terms',
      'Complete joining formalities on Day 1: submit originals (some employers keep them), fill PF/ESI forms',
      'HR will issue your Employee ID, work email, and access credentials on or after joining',
    ],
    notes: [
      'Government jobs require educational documents attested by a Gazetted Officer',
      'PF enrollment is mandatory for companies with 20+ employees — provide UAN if already enrolled',
      'Police Verification Certificate may be required for banking, PSU, defence, or security roles',
    ],
  },
  college_admission: {
    docs: [
      { name: 'Class 10 Marksheet & Certificate', description: 'Board-certified 10th marksheet and passing certificate (original + 2 copies)', required: true, document_type: 'other' },
      { name: 'Class 12 Marksheet & Certificate', description: 'Board-certified 12th marksheet — primary criterion for admission eligibility', required: true, document_type: 'other' },
      { name: 'Transfer Certificate (TC)', description: 'Issued by your last school / college — mandatory for migration to a new institution', required: true, document_type: 'other' },
      { name: 'Aadhaar Card', description: 'Identity proof required by all universities and as per UGC guidelines', required: true, document_type: 'aadhaar' },
      { name: 'Passport Size Photographs', description: '6–10 recent colour photos for application forms and college ID card', required: true, document_type: 'other' },
      { name: 'Caste / Category Certificate', description: 'SC/ST/OBC/EWS certificate for reservation benefits (from competent authority)', required: false, document_type: 'caste_certificate' },
      { name: 'Income Certificate', description: 'Required for scholarship, fee waiver, or EWS category claims', required: false, document_type: 'income_certificate' },
      { name: 'Migration Certificate', description: 'Required when moving from a different state board or university', required: false, document_type: 'other' },
    ],
    steps: [
      'Check eligibility: minimum percentage, entrance exam score (JEE/NEET/CUET/state CET)',
      'Fill the university or state centralised admission form online — register with a valid email and mobile',
      'Upload scanned documents as per portal specifications (typical: JPG, max 200 KB per file)',
      'Pay the application fee online: ₹100–₹1,000 depending on the institution',
      'Attend counselling / merit-based allotment rounds and check your seat status',
      'Accept the allocated seat and pay the first-year college fees within the deadline to confirm admission',
      'Report to the college on joining day with all original documents + self-attested copies for physical verification',
    ],
    notes: [
      'Carry 5+ sets of self-attested photocopies of all documents on the joining day',
      'SC/ST/OBC certificates must be issued by a competent authority of your home state',
      'Seat acceptance deadlines are strict — missing them forfeits your seat; always check SMS/email',
    ],
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getChecklist(
  purposeId: string,
  purposeLabel: string,
  lang: string,
  forceRefresh = false
): Promise<ChecklistData> {
  if (!forceRefresh) {
    const cached = lsGet(purposeId, lang);
    if (cached) return cached;

    const dbCached = await supabaseGet(purposeId, lang);
    if (dbCached) {
      lsSet(purposeId, lang, dbCached);
      return dbCached;
    }

    // Built-in (English only) — search YouTube in parallel
    if (lang === 'en' && BUILTIN[purposeId]) {
      const b = BUILTIN[purposeId];
      const videoQuery = VIDEO_QUERIES[purposeId];
      const videoId = await searchYouTubeVideo(videoQuery, 'en');
      const data: ChecklistData = {
        documentType: purposeId,
        requiredDocuments: b.docs,
        steps: b.steps,
        notes: b.notes,
        videoId,
        videoSearchQuery: videoQuery,
        officialUrl: GOVT_URLS[purposeId],
        generatedAt: Date.now(),
        fromCache: false,
        source: 'ai',
      };
      lsSet(purposeId, lang, data);
      return data;
    }
  }

  const data = await generateChecklist(purposeId, purposeLabel, lang);
  lsSet(purposeId, lang, data);
  supabaseSave(purposeId, lang, data);
  return data;
}
