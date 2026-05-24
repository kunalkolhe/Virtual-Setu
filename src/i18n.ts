import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── English
import enCommon from '@/locales/en/common.json';
import enDocuments from '@/locales/en/documents.json';
// ── Hindi
import hiCommon from '@/locales/hi/common.json';
import hiDocuments from '@/locales/hi/documents.json';
// ── Marathi
import mrCommon from '@/locales/mr/common.json';
import mrDocuments from '@/locales/mr/documents.json';
// ── Bengali
import bnCommon from '@/locales/bn/common.json';
import bnDocuments from '@/locales/bn/documents.json';
// ── Telugu
import teCommon from '@/locales/te/common.json';
import teDocuments from '@/locales/te/documents.json';
// ── Tamil
import taCommon from '@/locales/ta/common.json';
import taDocuments from '@/locales/ta/documents.json';
// ── Gujarati
import guCommon from '@/locales/gu/common.json';
import guDocuments from '@/locales/gu/documents.json';
// ── Kannada
import knCommon from '@/locales/kn/common.json';
import knDocuments from '@/locales/kn/documents.json';
// ── Malayalam
import mlCommon from '@/locales/ml/common.json';
import mlDocuments from '@/locales/ml/documents.json';
// ── Punjabi
import paCommon from '@/locales/pa/common.json';
import paDocuments from '@/locales/pa/documents.json';
// ── Odia
import orCommon from '@/locales/or/common.json';
import orDocuments from '@/locales/or/documents.json';
// ── Assamese
import asCommon from '@/locales/as/common.json';
import asDocuments from '@/locales/as/documents.json';
// ── Urdu
import urCommon from '@/locales/ur/common.json';
import urDocuments from '@/locales/ur/documents.json';
// ── Maithili
import maiCommon from '@/locales/mai/common.json';
import maiDocuments from '@/locales/mai/documents.json';
// ── Konkani
import kokCommon from '@/locales/kok/common.json';
import kokDocuments from '@/locales/kok/documents.json';
// ── Sindhi
import sdCommon from '@/locales/sd/common.json';
import sdDocuments from '@/locales/sd/documents.json';
// ── Nepali
import neCommon from '@/locales/ne/common.json';
import neDocuments from '@/locales/ne/documents.json';
// ── Manipuri
import mniCommon from '@/locales/mni/common.json';
import mniDocuments from '@/locales/mni/documents.json';
// ── Bodo
import brxCommon from '@/locales/brx/common.json';
import brxDocuments from '@/locales/brx/documents.json';
// ── Dogri
import dgoCommon from '@/locales/dgo/common.json';
import dgoDocuments from '@/locales/dgo/documents.json';
// ── Kashmiri
import ksCommon from '@/locales/ks/common.json';
import ksDocuments from '@/locales/ks/documents.json';
// ── Sanskrit
import saCommon from '@/locales/sa/common.json';
import saDocuments from '@/locales/sa/documents.json';
// ── Santali
import satCommon from '@/locales/sat/common.json';
import satDocuments from '@/locales/sat/documents.json';

export const RTL_LANGS = new Set(['ur', 'sd', 'ks']);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:  { common: enCommon,  documents: enDocuments  },
      hi:  { common: hiCommon,  documents: hiDocuments  },
      mr:  { common: mrCommon,  documents: mrDocuments  },
      bn:  { common: bnCommon,  documents: bnDocuments  },
      te:  { common: teCommon,  documents: teDocuments  },
      ta:  { common: taCommon,  documents: taDocuments  },
      gu:  { common: guCommon,  documents: guDocuments  },
      kn:  { common: knCommon,  documents: knDocuments  },
      ml:  { common: mlCommon,  documents: mlDocuments  },
      pa:  { common: paCommon,  documents: paDocuments  },
      or:  { common: orCommon,  documents: orDocuments  },
      as:  { common: asCommon,  documents: asDocuments  },
      ur:  { common: urCommon,  documents: urDocuments  },
      mai: { common: maiCommon, documents: maiDocuments },
      kok: { common: kokCommon, documents: kokDocuments },
      sd:  { common: sdCommon,  documents: sdDocuments  },
      ne:  { common: neCommon,  documents: neDocuments  },
      mni: { common: mniCommon, documents: mniDocuments },
      brx: { common: brxCommon, documents: brxDocuments },
      dgo: { common: dgoCommon, documents: dgoDocuments },
      ks:  { common: ksCommon,  documents: ksDocuments  },
      sa:  { common: saCommon,  documents: saDocuments  },
      sat: { common: satCommon, documents: satDocuments },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'vs_language',
    },
  });

export default i18n;
