import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { RTL_LANGS } from '@/i18n';

export const LANGUAGES = [
  { code: 'en',  native: 'English',       english: 'English'    },
  { code: 'hi',  native: 'हिन्दी',         english: 'Hindi'      },
  { code: 'mr',  native: 'मराठी',          english: 'Marathi'    },
  { code: 'bn',  native: 'বাংলা',          english: 'Bengali'    },
  { code: 'te',  native: 'తెలుగు',         english: 'Telugu'     },
  { code: 'ta',  native: 'தமிழ்',          english: 'Tamil'      },
  { code: 'gu',  native: 'ગુજરાતી',        english: 'Gujarati'   },
  { code: 'kn',  native: 'ಕನ್ನಡ',          english: 'Kannada'    },
  { code: 'ml',  native: 'മലയാളം',         english: 'Malayalam'  },
  { code: 'pa',  native: 'ਪੰਜਾਬੀ',         english: 'Punjabi'    },
  { code: 'or',  native: 'ଓଡ଼ିଆ',          english: 'Odia'       },
  { code: 'as',  native: 'অসমীয়া',        english: 'Assamese'   },
  { code: 'ur',  native: 'اردو',           english: 'Urdu'       },
  { code: 'mai', native: 'मैथिली',         english: 'Maithili'   },
  { code: 'kok', native: 'कोंकणी',         english: 'Konkani'    },
  { code: 'sd',  native: 'سنڌي',           english: 'Sindhi'     },
  { code: 'ne',  native: 'नेपाली',         english: 'Nepali'     },
  { code: 'mni', native: 'মৈতৈলোন্',       english: 'Manipuri'   },
  { code: 'brx', native: 'बर\'',           english: 'Bodo'       },
  { code: 'dgo', native: 'डोगरी',          english: 'Dogri'      },
  { code: 'ks',  native: 'کٲشُر',          english: 'Kashmiri'   },
  { code: 'sa',  native: 'संस्कृतम्',      english: 'Sanskrit'   },
  { code: 'sat', native: 'ᱥᱟᱱᱛᱟᱲᱤ',       english: 'Santali'    },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    // Handle RTL
    document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Apply RTL on initial load
  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold border border-[#c8d4e8] rounded-sm bg-white hover:bg-[#f0f4fa] text-slate-700 transition-colors"
        title="Select Language / भाषा चुनें"
      >
        <Globe className="h-3.5 w-3.5 text-[#003580] shrink-0" />
        <span className="max-w-[70px] truncate">{current.native}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#cdd3da] rounded-sm shadow-lg w-52 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-100 bg-[#f0f4fa]">
            <p className="text-[10px] font-bold text-[#003580] uppercase tracking-widest">
              भाषा / Language
            </p>
          </div>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#f0f4fa] transition-colors ${
                lang.code === i18n.language ? 'bg-blue-50 text-[#003580] font-semibold' : 'text-slate-700'
              }`}
              dir={RTL_LANGS.has(lang.code) ? 'rtl' : 'ltr'}
            >
              <span>{lang.native}</span>
              <span className="text-[10px] text-slate-400 ml-2">{lang.english}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
