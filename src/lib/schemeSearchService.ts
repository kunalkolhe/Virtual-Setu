const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_PREFIX = 'vs_scheme_ai_';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export interface AISchemeResult {
  id: string;
  name: string;
  nameHindi: string;
  category: string;
  ministry: string;
  launchDate: string;
  status: 'active' | 'inactive';
  description: string;
  eligibility: string[];
  benefits: string[];
  requiredDocuments: string[];
  applicationProcess: string[];
  officialUrl: string;
  isAI: true;
}

interface CacheEntry {
  results: AISchemeResult[];
  fetchedAt: number;
}

export const SEARCH_LANG_NAMES: Record<string, string> = {
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

const SCRIPT_NOTES: Record<string, string> = {
  hi: 'Use Devanagari script (देवनागरी). Write all text in Hindi.',
  mr: 'Use Devanagari script (देवनागरी). Write all text in Marathi.',
  mai: 'Use Devanagari script. Write all text in Maithili.',
  kok: 'Use Devanagari script. Write all text in Konkani.',
  ne: 'Use Devanagari script. Write all text in Nepali.',
  dgo: 'Use Devanagari script. Write all text in Dogri.',
  sa: 'Use Devanagari script. Write all text in Sanskrit.',
  brx: 'Use Devanagari script. Write all text in Bodo.',
  bn: 'Use Bengali script (বাংলা হরফ). Write all text in Bengali.',
  as: 'Use Bengali/Assamese script. Write all text in Assamese.',
  ta: 'Use Tamil script (தமிழ்). Write all text in Tamil.',
  te: 'Use Telugu script (తెలుగు). Write all text in Telugu.',
  kn: 'Use Kannada script (ಕನ್ನಡ). Write all text in Kannada.',
  ml: 'Use Malayalam script (മലയാളം). Write all text in Malayalam.',
  pa: 'Use Gurmukhi script (ਗੁਰਮੁਖੀ). Write all text in Punjabi.',
  gu: 'Use Gujarati script (ગુજરાતી). Write all text in Gujarati.',
  or: 'Use Odia script (ଓଡ଼ିଆ). Write all text in Odia.',
  ur: 'Use Urdu/Nastaliq script (اردو). Write all text in Urdu.',
  sd: 'Use Arabic/Sindhi script (سنڌي). Write all text in Sindhi.',
  ks: 'Use Arabic/Kashmiri script. Write all text in Kashmiri.',
  mni: 'Use Meitei Mayek script. Write all text in Meitei/Manipuri.',
  sat: 'Use Ol Chiki script (ᱥᱟᱱᱛᱟᱲᱤ). Write all text in Santali.',
};

const CATEGORY_LIST = 'Education|Healthcare|Agriculture|Business|Employment|Housing|Social Welfare|Women & Children|Senior Citizens|Financial Inclusion|Skill Development|Rural Development|Environment & Energy';

function cacheKey(query: string, lang: string) {
  return `${CACHE_PREFIX}${query.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 60)}__${lang}`;
}

function fromCache(query: string, lang: string): AISchemeResult[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(query, lang));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL) return null;
    return entry.results;
  } catch { return null; }
}

function toCache(query: string, lang: string, results: AISchemeResult[]) {
  try {
    localStorage.setItem(cacheKey(query, lang), JSON.stringify({ results, fetchedAt: Date.now() }));
  } catch {}
}

async function callSearchAI(systemMsg: string, userMsg: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 3000,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json.text ?? '';
  } catch {
    return '';
  }
}

export async function searchSchemesWithAI(query: string, lang = 'en'): Promise<AISchemeResult[]> {
  const normalizedLang = lang.split('-')[0];
  if (!query.trim()) return [];

  const cached = fromCache(query.trim().toLowerCase(), normalizedLang);
  if (cached) return cached;

  const isNonEnglish = normalizedLang !== 'en';
  const langName = SEARCH_LANG_NAMES[normalizedLang] ?? 'English';
  const scriptNote = SCRIPT_NOTES[normalizedLang] ?? '';

  // System message — language instruction for non-English
  const systemMsg = isNonEnglish
    ? `You are an expert on Indian government welfare schemes. ${scriptNote} Every text field you write (name, ministry, description, eligibility items, benefits, required documents, application steps) MUST be in ${langName}. The only exceptions are: the "nameHindi" field (always in Hindi Devanagari), "category" (use the English value from the list), "status", "launchDate", and "officialUrl".`
    : 'You are an expert on Indian government welfare schemes. Respond in English.';

  // User message — clean, no template-literal placeholders in format
  const userMsg = `Find up to 4 Indian government schemes that match this search: "${query}"

Include schemes from 2023, 2024, and 2025 if relevant. Prefer lesser-known or recently launched schemes.

Respond ONLY with a raw JSON array (no markdown fences, no explanation). Use this exact structure for each object:

[
  {
    "name": "scheme name",
    "nameHindi": "हिन्दी में योजना का नाम",
    "category": "one of: ${CATEGORY_LIST}",
    "ministry": "ministry name",
    "launchDate": "YYYY-MM-DD",
    "status": "active",
    "description": "2-3 sentence description of the scheme",
    "eligibility": ["who is eligible"],
    "benefits": ["what benefits are provided"],
    "requiredDocuments": ["documents needed"],
    "applicationProcess": ["how to apply"],
    "officialUrl": "https://official-url"
  }
]

If no relevant Indian government schemes match the query, return: []`;

  try {
    const text = await callSearchAI(systemMsg, userMsg);
    if (!text) return [];

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const raw: any[] = JSON.parse(match[0]);
    const results: AISchemeResult[] = raw.slice(0, 4).map((s, i) => ({
      id: `ai_${Date.now()}_${i}`,
      name: s.name ?? '',
      nameHindi: s.nameHindi ?? '',
      category: s.category ?? 'Social Welfare',
      ministry: s.ministry ?? 'Government of India',
      launchDate: s.launchDate ?? '2024-01-01',
      status: s.status === 'inactive' ? 'inactive' : 'active',
      description: s.description ?? '',
      eligibility: Array.isArray(s.eligibility) ? s.eligibility : [],
      benefits: Array.isArray(s.benefits) ? s.benefits : [],
      requiredDocuments: Array.isArray(s.requiredDocuments) ? s.requiredDocuments : [],
      applicationProcess: Array.isArray(s.applicationProcess) ? s.applicationProcess : [],
      officialUrl: s.officialUrl ?? 'https://india.gov.in',
      isAI: true,
    }));

    toCache(query.trim().toLowerCase(), normalizedLang, results);
    return results;
  } catch {
    return [];
  }
}
