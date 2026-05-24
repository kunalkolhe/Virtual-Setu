import { supabase } from '@/integrations/supabase/client';

export interface AadhaarScanResult {
  success: boolean;
  extractedName?: string;
  extractedAadhaar?: string;
  extractedAddress?: string;
  extractedDob?: string;
  maskedAadhaar?: string;
  aadhaarHash?: string;
  error?: string;
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function hashAadhaar(digits: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(digits);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function maskAadhaar(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 12) return 'XXXX XXXX ' + d.slice(-4);
  return `XXXX XXXX ${d.slice(8)}`;
}

function normalizeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|shri|smt|kumari|kumar|sh|shr)\b\.?/gi, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function namesMatch(entered: string, extracted: string): boolean {
  const enteredParts = normalizeName(entered);
  const extractedParts = normalizeName(extracted);
  if (enteredParts.length === 0 || extractedParts.length === 0) return false;

  const fullExtracted = extractedParts.join(' ');
  let matched = 0;
  for (const part of enteredParts) {
    if (part.length < 2) continue;
    if (fullExtracted.includes(part)) matched++;
  }
  const ratio = matched / Math.max(enteredParts.filter(p => p.length >= 2).length, 1);
  return ratio >= 0.6;
}

export async function checkAadhaarUnique(hash: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from('profiles').select('user_id').eq('aadhaar_hash', hash);
  if (excludeUserId) query = query.neq('user_id', excludeUserId);
  const { data } = await query.maybeSingle();
  return !data;
}

export async function scanAndVerifyAadhaar(
  imageFile: File,
  enteredName: string,
  enteredAadhaar: string,
  excludeUserId?: string,
): Promise<AadhaarScanResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey) return { success: false, error: 'Groq API key not configured.' };

  const enteredDigits = enteredAadhaar.replace(/\D/g, '');
  if (enteredDigits.length !== 12) {
    return { success: false, error: 'Aadhaar number must be exactly 12 digits.' };
  }

  let base64: string;
  try {
    base64 = await toBase64(imageFile);
  } catch {
    return { success: false, error: 'Could not read image file. Please try again.' };
  }

  const prompt = `This is an Indian Aadhaar card (or e-Aadhaar). Extract and return ONLY a valid JSON object with these exact keys:
- "name": full name in English (as printed on card)
- "aadhaar_number": the 12-digit Aadhaar number (digits only, no spaces; if masked show visible digits)
- "address": complete address as a single line string
- "dob": date of birth in DD/MM/YYYY format

Return ONLY the JSON object with no markdown, no explanation.`;

  let groqResponse: any;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${imageFile.type || 'image/jpeg'};base64,${base64}` },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
        temperature: 0.0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Could not read Aadhaar card (Groq ${res.status}). Please use a clear image.` };
    }
    groqResponse = await res.json();
  } catch {
    return { success: false, error: 'Network error while scanning card. Please try again.' };
  }

  let extracted: any = {};
  try {
    const raw = groqResponse?.choices?.[0]?.message?.content ?? '';
    const jsonStr = raw.replace(/```json\n?|```/g, '').trim();
    extracted = JSON.parse(jsonStr);
  } catch {
    return { success: false, error: 'Could not read card details. Please use a clearer image of your Aadhaar card.' };
  }

  const extractedName: string = extracted.name || '';
  const extractedAadhaarRaw: string = (extracted.aadhaar_number || '').replace(/\D/g, '');
  const extractedAddress: string = extracted.address || '';
  const extractedDob: string = extracted.dob || '';

  if (!extractedName && !extractedAadhaarRaw) {
    return { success: false, error: 'Could not detect Aadhaar card details. Please upload a clear, well-lit photo of your Aadhaar card.' };
  }

  if (extractedName && !namesMatch(enteredName, extractedName)) {
    return {
      success: false,
      error: `Name mismatch: card shows "${extractedName}" but you entered "${enteredName}". Please enter your name exactly as on your Aadhaar card.`,
    };
  }

  if (extractedAadhaarRaw.length === 12 && extractedAadhaarRaw !== enteredDigits) {
    return {
      success: false,
      error: 'Aadhaar number entered does not match what is printed on the card. Please check and re-enter.',
    };
  }

  if (extractedAadhaarRaw.length < 12 && extractedAadhaarRaw.length >= 4) {
    const visibleDigits = extractedAadhaarRaw.slice(-4);
    if (enteredDigits.slice(-4) !== visibleDigits) {
      return {
        success: false,
        error: 'Last 4 digits of Aadhaar number do not match the card. Please check and re-enter.',
      };
    }
  }

  const hash = await hashAadhaar(enteredDigits);
  const isUnique = await checkAadhaarUnique(hash, excludeUserId);
  if (!isUnique) {
    return {
      success: false,
      error: 'An account already exists with this Aadhaar number. Each Aadhaar can only be linked to one account.',
    };
  }

  return {
    success: true,
    extractedName,
    extractedAadhaar: enteredDigits,
    extractedAddress,
    extractedDob,
    maskedAadhaar: maskAadhaar(enteredDigits),
    aadhaarHash: hash,
  };
}
