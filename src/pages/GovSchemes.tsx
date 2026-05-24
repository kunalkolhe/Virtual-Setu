import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import {
  Search, X, Bookmark, BookmarkCheck, ExternalLink, ChevronDown,
  Filter, Sparkles, Globe, Calendar, CheckCircle, XCircle, BadgeInfo,
  Building2, Loader2, Zap, Languages,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  GOV_SCHEMES, CATEGORIES, CATEGORY_ICONS,
  type GovScheme, type SchemeCategory, type TargetGender, type TargetIncome,
} from '@/data/govSchemes';
import { searchSchemesWithAI, type AISchemeResult } from '@/lib/schemeSearchService';
import {
  translateSchemeCards, translateSchemeDetail,
  type CardTranslation, type DetailTranslation,
} from '@/lib/schemeTranslationService';

const BOOKMARK_KEY = 'vs_scheme_bookmarks';

const CAT_I18N_KEY: Record<string, string> = {
  'Education': 'cat_Education',
  'Healthcare': 'cat_Healthcare',
  'Agriculture': 'cat_Agriculture',
  'Business': 'cat_Business',
  'Employment': 'cat_Employment',
  'Housing': 'cat_Housing',
  'Social Welfare': 'cat_Social_Welfare',
  'Women & Children': 'cat_Women_Children',
  'Senior Citizens': 'cat_Senior_Citizens',
  'Financial Inclusion': 'cat_Financial_Inclusion',
  'Skill Development': 'cat_Skill_Development',
  'Rural Development': 'cat_Rural_Development',
  'Environment & Energy': 'cat_Environment_Energy',
};

function getBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveBookmarks(set: Set<string>) {
  try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set])); } catch {}
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const { t } = useTranslation();
  return status === 'active'
    ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide"><CheckCircle className="h-2.5 w-2.5" /> {t('schemes_page.badge_active')}</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide"><XCircle className="h-2.5 w-2.5" /> {t('schemes_page.badge_inactive')}</span>;
}

function NewBadge() {
  const { t } = useTranslation();
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#FF6200] text-white uppercase tracking-wide"><Sparkles className="h-2.5 w-2.5" /> {t('schemes_page.badge_new')}</span>;
}

function LevelBadge({ level }: { level: 'central' | 'state' }) {
  const { t } = useTranslation();
  return level === 'central'
    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#003580] border border-blue-200"><Building2 className="h-2.5 w-2.5" /> {t('schemes_page.badge_central')}</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200"><Globe className="h-2.5 w-2.5" /> {t('schemes_page.badge_state')}</span>;
}

interface SchemeDetailProps {
  scheme: GovScheme;
  onClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  translation?: DetailTranslation | null;
  translating?: boolean;
}

function SchemeDetail({ scheme, onClose, bookmarked, onToggleBookmark, translation, translating }: SchemeDetailProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.split('-')[0] === 'en';
  const T = translation;
  const labels = T?.labels;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-2xl rounded-sm border border-[#cdd3da] shadow-2xl my-4">

        {/* Modal header */}
        <div className="bg-[#003580] text-white px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-sm">{CATEGORY_ICONS[scheme.category]} {t(`schemes_page.${CAT_I18N_KEY[scheme.category]}`)}</span>
              <StatusBadge status={scheme.status} />
              {scheme.isNew && <NewBadge />}
              <LevelBadge level={scheme.level} />
              {translating && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-sm">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> {t('schemes_page.badge_translating')}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold leading-tight">{T?.name ?? (isEn ? scheme.name : (scheme.nameHindi || scheme.name))}</h2>
            <p className="text-blue-200 text-xs mt-0.5">{isEn ? scheme.nameHindi : scheme.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button onClick={() => onToggleBookmark(scheme.id)} className="p-1.5 rounded-sm bg-white/10 hover:bg-white/20 transition-colors" title="Bookmark">
              {bookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-300" /> : <Bookmark className="h-4 w-4 text-white" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-sm bg-white/10 hover:bg-white/20 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[75vh] overflow-y-auto">

          {/* Translating banner */}
          {translating && !T && (
            <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" />
              <span className="text-xs text-amber-700 font-medium">{t('schemes_page.badge_translating')}…</span>
            </div>
          )}

          {/* Ministry + Launch */}
          <div className="px-6 py-3 bg-[#f0f4fa] flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {translating && !T
              ? <span className="h-3 w-48 bg-slate-200 rounded animate-pulse" />
              : <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[#003580]" /> {T?.ministry ?? scheme.ministry}</span>
            }
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#003580]" /> {labels?.launchedLabel ?? t('schemes_page.launched_label')}: {new Date(scheme.launchDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          {/* Description */}
          <div className="px-6 py-4">
            {translating && !T ? (
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-11/12" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3 mt-3" />
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">{T?.description ?? scheme.description}</p>
                {(T?.objective ?? scheme.objective) && (
                  <p className="text-xs text-slate-500 mt-2 italic">{T?.objective ?? scheme.objective}</p>
                )}
              </>
            )}
          </div>

          {/* Eligibility */}
          <Section title={labels?.eligibilityTitle ?? t('schemes_page.eligibility_title')} icon="✅">
            {translating && !T ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{width: `${85 - i*8}%`}} />)}
              </div>
            ) : (
              <ul className="space-y-1">
                {(T?.eligibility ?? scheme.eligibility).map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-green-500 mt-0.5 shrink-0">•</span>{e}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* Benefits */}
          <Section title={labels?.benefitsTitle ?? t('schemes_page.benefits_title')} icon="🎁">
            {translating && !T ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{width: `${90 - i*10}%`}} />)}
              </div>
            ) : (
              <ul className="space-y-1">
                {(T?.benefits ?? scheme.benefits).map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-[#003580] mt-0.5 shrink-0">▸</span>{b}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* Required Documents */}
          <Section title={labels?.documentsTitle ?? t('schemes_page.documents_title')} icon="📄">
            {translating && !T ? (
              <div className="flex flex-wrap gap-1.5">
                {[1,2,3,4].map(i => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" style={{width: `${60 + i*12}px`}} />)}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(T?.requiredDocuments ?? scheme.requiredDocuments).map((d, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-sm">{d}</span>
                ))}
              </div>
            )}
          </Section>

          {/* Application Process */}
          <Section title={labels?.applyTitle ?? t('schemes_page.apply_title')} icon="📝">
            {translating && !T ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <ol className="space-y-2">
                {(T?.applicationProcess ?? scheme.applicationProcess).map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#003580] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {/* Official Link */}
          <div className="px-6 py-4">
            <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#003580] hover:bg-[#002060] text-white text-sm font-semibold rounded-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> {labels?.applyButton ?? t('schemes_page.apply_button')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

interface SchemeCardProps {
  scheme: GovScheme;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onClick: () => void;
  cardTranslation?: CardTranslation;
  translating?: boolean;
}

function SchemeCard({ scheme, bookmarked, onToggleBookmark, onClick, cardTranslation, translating }: SchemeCardProps) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.split('-')[0] === 'en';
  const displayName = cardTranslation?.name ?? (isEn ? scheme.name : (scheme.nameHindi || scheme.name));
  const displayDesc = cardTranslation?.description ?? scheme.description;

  return (
    <div className="bg-white border border-[#cdd3da] rounded-sm shadow-sm hover:shadow-md hover:border-[#003580]/40 transition-all group flex flex-col">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge status={scheme.status} />
            {scheme.isNew && <NewBadge />}
            <LevelBadge level={scheme.level} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(scheme.id); }}
            className="p-1 rounded-sm text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors shrink-0"
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this scheme'}
          >
            {bookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-500" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{CATEGORY_ICONS[scheme.category]}</span>
          {translating && !cardTranslation ? (
            <div className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
          ) : (
            <p className="font-bold text-slate-900 text-sm leading-tight group-hover:text-[#003580] transition-colors">{displayName}</p>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mb-2">{isEn ? scheme.nameHindi : scheme.name}</p>
        {translating && !cardTranslation ? (
          <div className="space-y-1.5">
            <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-4/6" />
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{displayDesc}</p>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          <span className="truncate max-w-[140px]">{scheme.ministry.replace('Ministry of ', '')}</span>
        </span>
        <button
          onClick={onClick}
          className="text-xs font-semibold text-[#003580] hover:underline flex items-center gap-1 shrink-0"
        >
          {t('schemes_page.view_details')} <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function GovSchemes() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<SchemeCategory | 'All' | 'Bookmarked' | 'New'>('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | 'central' | 'state'>('all');
  const [filterGender, setFilterGender] = useState<TargetGender | 'all'>('all');
  const [filterIncome, setFilterIncome] = useState<TargetIncome | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(getBookmarks);
  const [selected, setSelected] = useState<GovScheme | null>(null);
  const [aiSelected, setAiSelected] = useState<AISchemeResult | null>(null);
  const [aiResults, setAiResults] = useState<AISchemeResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Card translations (batch) ─────────────────────────────────────────────
  const [cardTranslations, setCardTranslations] = useState<Record<string, CardTranslation>>({});
  const [translatingCards, setTranslatingCards] = useState(false);

  // Languages sharing Devanagari script — nameHindi works as instant fallback
  const DEVANAGARI_LANGS = new Set(['hi', 'mr', 'mai', 'kok', 'ne', 'dgo', 'sa', 'brx']);

  useEffect(() => {
    if (lang === 'en') { setCardTranslations({}); setTranslatingCards(false); return; }
    let cancelled = false;

    if (DEVANAGARI_LANGS.has(lang)) {
      // Phase 1 — instant: fill names from nameHindi (zero API calls)
      const immediate: Record<string, CardTranslation> = {};
      for (const s of GOV_SCHEMES) {
        immediate[s.id] = { name: s.nameHindi || s.name, description: s.description };
      }
      if (!cancelled) setCardTranslations(immediate);
      // Phase 2 — background: translate all descriptions in one server-proxy call
      translateSchemeCards(GOV_SCHEMES, lang).then((res) => {
        if (!cancelled && Object.keys(res).length > 0) {
          setCardTranslations(res);
          setTranslatingCards(false);
        }
      });
    } else {
      // Phase 1 — instant: show English content so cards are never blank
      const immediate: Record<string, CardTranslation> = {};
      for (const s of GOV_SCHEMES) {
        immediate[s.id] = { name: s.name, description: s.description };
      }
      if (!cancelled) { setCardTranslations(immediate); setTranslatingCards(true); }
      // Phase 2 — background: translate names + descriptions via Sarvam
      translateSchemeCards(GOV_SCHEMES, lang).then((res) => {
        if (!cancelled && Object.keys(res).length > 0) {
          setCardTranslations(res);
          setTranslatingCards(false);
        }
      });
    }
    return () => { cancelled = true; };
  }, [lang]);

  // ── Detail translation (per scheme on open) ───────────────────────────────
  const [detailTranslation, setDetailTranslation] = useState<DetailTranslation | null>(null);
  const [translatingDetail, setTranslatingDetail] = useState(false);

  useEffect(() => {
    if (!selected) { setDetailTranslation(null); return; }
    if (lang === 'en') { setDetailTranslation(null); return; }
    let cancelled = false;
    setTranslatingDetail(true);
    setDetailTranslation(null);
    translateSchemeDetail(selected, lang).then((res) => {
      if (!cancelled) { setDetailTranslation(res); setTranslatingDetail(false); }
    });
    return () => { cancelled = true; };
  }, [selected, lang]);

  // ── Debounced AI search — fires 800ms after user stops typing ─────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim() || search.trim().length < 3) {
      setAiResults([]);
      setAiLoading(false);
      return;
    }
    setAiLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchSchemesWithAI(search.trim(), lang);
      setAiResults(results);
      setAiLoading(false);
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, lang]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = GOV_SCHEMES;

    if (activeCategory === 'Bookmarked') list = list.filter((s) => bookmarks.has(s.id));
    else if (activeCategory === 'New') list = list.filter((s) => s.isNew);
    else if (activeCategory !== 'All') list = list.filter((s) => s.category === activeCategory);

    if (filterStatus !== 'all') list = list.filter((s) => s.status === filterStatus);
    if (filterLevel !== 'all') list = list.filter((s) => s.level === filterLevel);
    if (filterGender !== 'all') list = list.filter((s) => s.targetGender === 'all' || s.targetGender === filterGender);
    if (filterIncome !== 'all') list = list.filter((s) => s.targetIncome === 'any' || s.targetIncome === filterIncome);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.nameHindi.includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.eligibility.some((e) => e.toLowerCase().includes(q)) ||
        s.benefits.some((b) => b.toLowerCase().includes(q)) ||
        s.ministry.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, activeCategory, filterStatus, filterLevel, filterGender, filterIncome, bookmarks]);

  const activeCount = GOV_SCHEMES.filter((s) => s.status === 'active').length;
  const newCount = GOV_SCHEMES.filter((s) => s.isNew).length;

  const QUICK_TABS = [
    { key: 'All' as const, label: t('schemes_page.tab_all', { count: GOV_SCHEMES.length }) },
    { key: 'New' as const, label: t('schemes_page.tab_new', { count: newCount }) },
    { key: 'Bookmarked' as const, label: t('schemes_page.tab_saved', { count: bookmarks.size }) },
  ];

  const hasActiveFilters = filterStatus !== 'all' || filterLevel !== 'all' || filterGender !== 'all' || filterIncome !== 'all';

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb={t('schemes_page.breadcrumb')}
        title={t('schemes_page.title')}
        subtitle={t('schemes_page.subtitle')}
      />

      <section className="container mx-auto max-w-7xl px-4 py-6 space-y-5">

        {/* Stats bar */}
        <GovCard className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {[
            { value: GOV_SCHEMES.length, label: t('schemes_page.stat_total') },
            { value: activeCount, label: t('schemes_page.stat_active') },
            { value: newCount, label: t('schemes_page.stat_new') },
            { value: CATEGORIES.length, label: t('schemes_page.stat_categories') },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4 text-center">
              <div className="text-2xl font-bold text-[#003580]">{s.value}+</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </GovCard>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('schemes_page.search_placeholder')}
              className="pl-9 pr-9 h-9 text-sm bg-white border-[#cdd3da] rounded-sm focus-visible:ring-[#003580]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-sm transition-colors h-9 ${
              hasActiveFilters || showFilters
                ? 'bg-[#003580] text-white border-[#003580]'
                : 'bg-white text-slate-700 border-[#cdd3da] hover:border-[#003580] hover:text-[#003580]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {t('schemes_page.filters_btn')} {hasActiveFilters && <span className="bg-white text-[#003580] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">!</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <GovCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-slate-900 text-sm">{t('schemes_page.advanced_filters')}</p>
              {hasActiveFilters && (
                <button onClick={() => { setFilterStatus('all'); setFilterLevel('all'); setFilterGender('all'); setFilterIncome('all'); }}
                  className="text-xs text-red-600 hover:underline">{t('schemes_page.clear_all_filters')}</button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FilterGroup label={t('schemes_page.filter_status')} value={filterStatus} onChange={(v) => setFilterStatus(v as any)}
                options={[{ value: 'all', label: t('schemes_page.opt_all') }, { value: 'active', label: t('schemes_page.opt_active') }, { value: 'inactive', label: t('schemes_page.opt_inactive') }]} />
              <FilterGroup label={t('schemes_page.filter_level')} value={filterLevel} onChange={(v) => setFilterLevel(v as any)}
                options={[{ value: 'all', label: t('schemes_page.opt_all') }, { value: 'central', label: t('schemes_page.opt_central') }, { value: 'state', label: t('schemes_page.opt_state') }]} />
              <FilterGroup label={t('schemes_page.filter_gender')} value={filterGender} onChange={(v) => setFilterGender(v as any)}
                options={[{ value: 'all', label: t('schemes_page.opt_all') }, { value: 'female', label: t('schemes_page.opt_women') }, { value: 'male', label: t('schemes_page.opt_men') }]} />
              <FilterGroup label={t('schemes_page.filter_income')} value={filterIncome} onChange={(v) => setFilterIncome(v as any)}
                options={[{ value: 'all', label: t('schemes_page.opt_all') }, { value: 'bpl', label: t('schemes_page.opt_bpl') }, { value: 'low', label: t('schemes_page.opt_low') }, { value: 'middle', label: t('schemes_page.opt_middle') }]} />
            </div>
          </GovCard>
        )}

        {/* Quick tab row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveCategory(tab.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                activeCategory === tab.key
                  ? 'bg-[#003580] text-white border-[#003580]'
                  : 'bg-white text-slate-700 border-[#cdd3da] hover:border-[#003580] hover:text-[#003580]'
              }`}>
              {tab.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors ${
                activeCategory === cat
                  ? 'bg-[#003580] text-white border-[#003580]'
                  : 'bg-white text-slate-700 border-[#cdd3da] hover:border-[#003580] hover:text-[#003580]'
              }`}>
              {CATEGORY_ICONS[cat]} {t(`schemes_page.${CAT_I18N_KEY[cat] ?? cat}`)}
            </button>
          ))}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {t('schemes_page.showing')} <span className="font-semibold text-slate-900">{filtered.length}</span> {filtered.length !== 1 ? t('schemes_page.scheme_plural') : t('schemes_page.scheme_singular')}
            {activeCategory !== 'All' && <span className="text-[#003580]"> {t('schemes_page.in_label')} <span className="font-semibold">{activeCategory}</span></span>}
            {search && <span className="text-[#003580]"> {t('schemes_page.matching')} <span className="font-semibold">"{search}"</span></span>}
          </p>
          {(activeCategory !== 'All' || search || hasActiveFilters) && (
            <button onClick={() => { setSearch(''); setActiveCategory('All'); setFilterStatus('all'); setFilterLevel('all'); setFilterGender('all'); setFilterIncome('all'); }}
              className="text-xs text-[#003580] hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> {t('schemes_page.clear_all')}
            </button>
          )}
        </div>

        {/* Translation status banner */}
        {lang !== 'en' && translatingCards && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-700">
            <Languages className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span>{t('schemes_page.translating_banner')}</span>
          </div>
        )}

        {/* Scheme grid */}
        {filtered.length === 0 && !aiLoading && aiResults.length === 0 ? (
          <GovCard className="py-16 text-center">
            <BadgeInfo className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">{t('schemes_page.no_results_title')}</p>
            <p className="text-sm text-slate-500 mt-1">{t('schemes_page.no_results_sub')}</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); setFilterStatus('all'); setFilterLevel('all'); setFilterGender('all'); setFilterIncome('all'); }}
              className="mt-4 text-sm text-[#003580] font-semibold hover:underline">{t('schemes_page.view_all_schemes')}</button>
          </GovCard>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((scheme) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                bookmarked={bookmarks.has(scheme.id)}
                onToggleBookmark={toggleBookmark}
                onClick={() => setSelected(scheme)}
                cardTranslation={cardTranslations[scheme.id]}
                translating={translatingCards}
              />
            ))}
          </div>
        ) : null}

        {/* AI Live Search Results */}
        {search.trim().length >= 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200">
                {aiLoading ? (
                  <Loader2 className="h-3 w-3 text-violet-600 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3 text-violet-600" />
                )}
                <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">
                  {aiLoading ? t('schemes_page.ai_searching') : aiResults.length > 0 ? t('schemes_page.ai_results', { count: aiResults.length }) : t('schemes_page.ai_live_label')}
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-violet-200 to-transparent" />
            </div>

            {aiLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-violet-100 rounded-sm p-4 bg-violet-50/30 animate-pulse">
                    <div className="h-3 bg-violet-100 rounded w-1/3 mb-3" />
                    <div className="h-4 bg-violet-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-violet-100 rounded w-full mb-1" />
                    <div className="h-3 bg-violet-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && aiResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiResults.map((scheme) => (
                  <AISchemeCard key={scheme.id} scheme={scheme} onClick={() => setAiSelected(scheme)} />
                ))}
              </div>
            )}

            {!aiLoading && aiResults.length === 0 && search.trim().length >= 3 && (
              <div className="text-center py-5 text-sm text-slate-400">
                {t('schemes_page.ai_no_results')}
              </div>
            )}

            <p className="text-[10px] text-center text-slate-400">
              {t('schemes_page.ai_disclaimer')}
            </p>
          </div>
        )}

        {/* Footer note */}
        <div className="text-[11px] text-slate-400 text-center pb-2">
          {t('schemes_page.footer_note')}
        </div>
      </section>

      {/* Static scheme detail modal */}
      {selected && (
        <SchemeDetail
          scheme={selected}
          onClose={() => setSelected(null)}
          bookmarked={bookmarks.has(selected.id)}
          onToggleBookmark={toggleBookmark}
          translation={detailTranslation}
          translating={translatingDetail}
        />
      )}

      {/* AI scheme detail modal */}
      {aiSelected && <AISchemeDetail scheme={aiSelected} onClose={() => setAiSelected(null)} />}
    </GovLayout>
  );
}

function FilterGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-col gap-1">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)}
              className="accent-[#003580] h-3 w-3" />
            <span className={`text-xs ${value === o.value ? 'font-semibold text-[#003580]' : 'text-slate-600'}`}>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── AI Scheme Card ─────────────────────────────────────────────────────────────

function AISchemeCard({ scheme, onClick }: { scheme: AISchemeResult; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.split('-')[0] === 'en';
  return (
    <div
      className="bg-white border border-violet-200 rounded-sm shadow-sm hover:shadow-md hover:border-violet-400 transition-all group flex flex-col cursor-pointer relative"
      onClick={onClick}
    >
      {/* AI badge ribbon */}
      <div className="absolute top-0 right-0 bg-violet-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-sm tracking-wider flex items-center gap-1">
        <Zap className="h-2.5 w-2.5" /> AI
      </div>

      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${scheme.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
            {scheme.status === 'active' ? `● ${t('schemes_page.badge_active')}` : `○ ${t('schemes_page.badge_inactive')}`}
          </span>
          <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 font-semibold px-2 py-0.5 rounded-sm">
            {t(`schemes_page.${CAT_I18N_KEY[scheme.category] ?? scheme.category}`)}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-0.5 group-hover:text-violet-700 transition-colors pr-6">
          {isEn ? scheme.name : (scheme.nameHindi || scheme.name)}
        </h3>
        {(isEn ? scheme.nameHindi : scheme.name) && (
          <p className="text-[11px] text-slate-500 mb-2">{isEn ? scheme.nameHindi : scheme.name}</p>
        )}

        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{scheme.description}</p>
      </div>

      <div className="px-4 py-2 border-t border-violet-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Building2 className="h-3 w-3" />
          <span className="line-clamp-1">{scheme.ministry}</span>
        </div>
        <button className="inline-flex items-center gap-1 text-[10px] text-violet-600 font-semibold hover:text-violet-800">
          {t('schemes_page.view_details')} <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── AI Scheme Detail Modal ─────────────────────────────────────────────────────

function AISchemeDetail({ scheme, onClose }: { scheme: AISchemeResult; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.split('-')[0] === 'en';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-sm shadow-2xl max-w-2xl w-full my-6 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-violet-500 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> {t('schemes_page.ai_powered_badge')}
                </span>
                <span className="text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-sm">{t(`schemes_page.${CAT_I18N_KEY[scheme.category] ?? scheme.category}`)}</span>
              </div>
              <h2 className="text-lg font-bold leading-snug">{isEn ? scheme.name : (scheme.nameHindi || scheme.name)}</h2>
              {(isEn ? scheme.nameHindi : scheme.name) && <p className="text-sm text-white/80 mt-0.5">{isEn ? scheme.nameHindi : scheme.name}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-sm transition-colors flex-shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-white/80">
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{scheme.ministry}</span>
            {scheme.launchDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t('schemes_page.launched_label')}: {new Date(scheme.launchDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</span>}
            <span className="flex items-center gap-1">
              {scheme.status === 'active' ? <CheckCircle className="h-3 w-3 text-emerald-300" /> : <XCircle className="h-3 w-3 text-red-300" />}
              {scheme.status === 'active' ? t('schemes_page.badge_active') : t('schemes_page.badge_inactive')}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          <div className="px-6 py-4">
            <p className="text-sm text-slate-700 leading-relaxed">{scheme.description}</p>
          </div>

          {scheme.eligibility.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-1.5">👥 {t('schemes_page.who_can_apply')}</h3>
              <ul className="space-y-1">
                {scheme.eligibility.map((e, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />{e}</li>)}
              </ul>
            </div>
          )}

          {scheme.benefits.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-1.5">🎁 {t('schemes_page.benefits_label')}</h3>
              <ul className="space-y-1">
                {scheme.benefits.map((b, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-violet-600 mt-0.5 shrink-0">▸</span>{b}</li>)}
              </ul>
            </div>
          )}

          {scheme.requiredDocuments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-1.5">📄 {t('schemes_page.documents_title')}</h3>
              <div className="flex flex-wrap gap-1.5">
                {scheme.requiredDocuments.map((d, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-sm">{d}</span>
                ))}
              </div>
            </div>
          )}

          {scheme.applicationProcess.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-1.5">📝 {t('schemes_page.apply_title')}</h3>
              <ol className="space-y-2">
                {scheme.applicationProcess.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
            <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {t('schemes_page.ai_detail_disclaimer')}
            </p>
          </div>

          <div className="px-6 py-4">
            <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold rounded-sm transition-colors">
              <ExternalLink className="h-4 w-4" /> {t('schemes_page.visit_official')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
