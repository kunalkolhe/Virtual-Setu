export interface VerificationResult {
  isValid: boolean;
  detectedType: string;
  message: string;
  expiryDate?: string | null;   // YYYY-MM-DD extracted from the document, or null if not present
  documentNumber?: string | null; // ID/number extracted from the document
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan_card: 'PAN Card',
  voter_id: 'Voter ID',
  driving_license: 'Driving License',
  passport: 'Passport',
  birth_certificate: 'Birth Certificate',
  income_certificate: 'Income Certificate',
  caste_certificate: 'Caste Certificate',
  domicile_certificate: 'Domicile Certificate',
  other: 'Other',
};

function fileToBase64(file: File): Promise<string> {
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

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 2);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

function buildPrompt(selectedTypeLabel: string): string {
  const isOther = selectedTypeLabel.toLowerCase() === 'other';

  return `You are a strict document authenticity verification AI for Virtual Setu, an Indian government document management portal.

The user claims to be uploading a: "${selectedTypeLabel}"

Your job is to CAREFULLY analyse the document and determine if it is:
1. The correct type of document the user claims it is
2. A GENUINE, REAL document — NOT a sample, specimen, fake, template, or watermarked copy

Respond with ONLY valid JSON in this exact format:
{
  "detectedType": "<detected document type>",
  "isValid": <true or false>,
  "message": "<short 1-2 sentence explanation for the user>",
  "expiryDate": "<expiry/validity date in YYYY-MM-DD format if visible on the document, otherwise null>",
  "documentNumber": "<the primary ID number on the document (Aadhaar number, PAN number, passport number, etc.) if visible, otherwise null>"
}

EXPIRY DATE EXTRACTION RULES:
- Look for fields labelled: "Date of Expiry", "Valid Till", "Validity", "Expiry Date", "DOE", "Valid Upto", "Expires On"
- Convert any date format to YYYY-MM-DD (e.g. "31/12/2029" → "2029-12-31", "31 DEC 2029" → "2029-12-31")
- If the document type never expires (e.g. Aadhaar Card, PAN Card, Birth Certificate, Caste Certificate) set expiryDate to null
- If the document has an expiry field but it is not readable/visible, set expiryDate to null

${isOther
  ? `Since the user selected "Other", accept any document type. Set isValid to true and briefly describe what you see.`
  : `STRICT AUTHENTICITY RULES — reject the document (isValid: false) if ANY of the following are true:
- The document contains watermarks such as "SAMPLE", "SPECIMEN", "FAKE", "TEST", "DEMO", "EXAMPLE", "FOR ILLUSTRATION", or any website domain (e.g. "IMMIHELP.COM", "SAMPLEDOCS.IN", "EXAMPLE.COM")
- The document appears to be a template, printout from a tutorial, or illustrative copy
- For PAN Card: the PAN number follows an obviously fake/sequential pattern like "ABCDE1234F", "AAAAA0000A", "XXXXX0000X", or any clearly non-genuine pattern. Real PAN cards have a format where the first 3 letters are random, the 4th letter indicates taxpayer type (P, C, H, F, A, T, B, L, J, G), and the 5th letter is the first letter of the surname.
- For Aadhaar: the 12-digit number appears fake (e.g. 1234 5678 9012, all same digits, sequential)
- For Passport: passport number appears fake or sequential
- The document does not match the claimed type
- The document appears digitally created, edited, or tampered with
- Visible disclaimers, copyright notices, or annotations indicating it is not official
- The image is clearly a screenshot of a document found online rather than a real physical document scan

ACCEPT (isValid: true) only if:
- The document clearly matches the claimed type
- There are no fake/sample/watermark indicators
- The document identifiers (PAN, Aadhaar number, etc.) follow valid real-world formats
- The document appears to be a genuine official document`
}

Keep the message short, clear, and helpful for the citizen.`;
}

export async function verifyDocument(
  file: File,
  selectedType: string
): Promise<VerificationResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const selectedTypeLabel = DOCUMENT_TYPE_LABELS[selectedType] ?? selectedType;

  if (!apiKey) {
    return {
      isValid: false,
      detectedType: selectedTypeLabel,
      message: 'Verification unavailable — API key not configured. Please contact support.',
    };
  }

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  let messages: object[];
  let model: string;

  if (isImage) {
    const base64 = await fileToBase64(file);
    model = 'meta-llama/llama-4-scout-17b-16e-instruct';
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${file.type};base64,${base64}` },
          },
          {
            type: 'text',
            text: buildPrompt(selectedTypeLabel),
          },
        ],
      },
    ];
  } else if (isPdf) {
    model = 'llama-3.3-70b-versatile';
    let pdfText = '';
    try {
      pdfText = await extractPdfText(file);
    } catch {
      pdfText = `[PDF file: "${file.name}", size: ${(file.size / 1024).toFixed(1)} KB. Text could not be extracted — likely a scanned document.]`;
    }
    messages = [
      {
        role: 'user',
        content: `${buildPrompt(selectedTypeLabel)}\n\nExtracted document text:\n${pdfText || '[No readable text found]'}`,
      },
    ];
  } else {
    throw new Error('Unsupported file type. Please upload a JPG, PNG, or PDF.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GROQ API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content) as VerificationResult;
    if (selectedType === 'other') {
      return { ...parsed, isValid: true, detectedType: parsed.detectedType || 'Other' };
    }

    // Safety net: if the AI message contains authenticity red-flag words but
    // still returned isValid: true, force-reject. This handles cases where the
    // model correctly describes the problem in the message but forgets to flip
    // isValid to false.
    const msg = (parsed.message ?? '').toLowerCase();
    const RED_FLAGS = [
      'sample', 'specimen', 'fake', 'not genuine', 'not real', 'not authentic',
      'not a genuine', 'not an authentic', 'not a real', 'illustrative',
      'template', 'demo', 'test document', 'example document', 'watermark',
      'immihelp', 'sampledoc', 'for illustration', 'not valid', 'invalid document',
      'appear to be a sample', 'appears to be a sample', 'appears to be fake',
      'not issued', 'not official', 'tutorial', 'placeholder',
    ];
    const flagged = RED_FLAGS.some((flag) => msg.includes(flag));
    if (flagged && parsed.isValid) {
      return {
        ...parsed,
        isValid: false,
        message: parsed.message,
      };
    }

    return parsed;
  } catch {
    throw new Error('Unexpected response format from AI. Please try again.');
  }
}
