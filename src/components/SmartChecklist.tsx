import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Sparkles,
  AlertCircle, Target, ListChecks, Info, Search, X,
  Youtube, ExternalLink, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChecklist } from '@/hooks/useChecklist';

interface UserDocument {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
}

export default function SmartChecklist() {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language;

  const QUICK_PURPOSES = [
    { id: 'passport_application',  label: t('checklist.p_passport') },
    { id: 'pan_card_application',  label: t('checklist.p_pan') },
    { id: 'driving_license',       label: t('checklist.p_driving') },
    { id: 'voter_id_registration', label: t('checklist.p_voter') },
    { id: 'bank_account_opening',  label: t('checklist.p_bank') },
    { id: 'aadhaar_enrollment',    label: t('checklist.p_aadhaar') },
    { id: 'job_application',       label: t('checklist.p_job') },
    { id: 'college_admission',     label: t('checklist.p_college') },
  ];

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [userDocs, setUserDocs] = useState<UserDocument[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const { status, data, error, fetch: fetchChecklist, reset } = useChecklist();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadUserDocuments(); }, []);
  useEffect(() => { setVideoError(false); }, [data?.videoId]);

  const loadUserDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: docs } = await supabase
        .from('documents')
        .select('id, document_name, document_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserDocs(docs ?? []);
    } catch { /* ignore */ }
  };

  const handleSearch = (purposeId: string, purposeLabel: string) => {
    const trimmed = purposeLabel.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    setNotesOpen(false);
    fetchChecklist(purposeId, trimmed, userDocs, lang);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    handleSearch(trimmed.toLowerCase().replace(/\s+/g, '_'), trimmed);
  };

  const handleQuickSelect = (purposeId: string, label: string) => {
    setQuery(label);
    handleSearch(purposeId, label);
  };

  const handleClear = () => {
    setQuery('');
    setSubmittedQuery('');
    reset();
    inputRef.current?.focus();
  };

  const handleRefresh = () => {
    if (!submittedQuery) return;
    fetchChecklist(submittedQuery.toLowerCase().replace(/\s+/g, '_'), submittedQuery, userDocs, lang, true);
  };

  const available = data?.requiredDocuments.filter((d) => d.status === 'available') ?? [];
  const missing   = data?.requiredDocuments.filter((d) => d.status === 'missing') ?? [];
  const requiredMissing = missing.filter((d) => d.required);
  const total = data?.requiredDocuments.length ?? 0;
  const pct   = total > 0 ? Math.round((available.length / total) * 100) : 0;
  const barColor = pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-400';

  // Official URL helpers
  const officialUrl = data?.officialUrl;
  let officialDomain = '';
  try { if (officialUrl) officialDomain = new URL(officialUrl).hostname.replace('www.', ''); } catch { /* */ }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('checklist.title')}
            <Badge variant="secondary" className="ml-auto flex items-center gap-1 text-xs font-normal">
              <Sparkles className="h-3 w-3" />
              {data?.source === 'scraped' ? t('checklist.live_badge') : t('checklist.ai_scraping')}
            </Badge>
          </CardTitle>
          <CardDescription>{t('checklist.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('checklist.placeholder')}
                className="pl-9 pr-9"
              />
              {query && (
                <button type="button" onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={!query.trim() || status === 'loading'}
              className="bg-gradient-primary glow-primary">
              {status === 'loading'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{t('checklist.search')}</span>
            </Button>
            {submittedQuery && status !== 'loading' && (
              <Button variant="outline" size="icon" onClick={handleRefresh} title={t('checklist.refetch')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </form>

          {/* Quick-select chips */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">{t('checklist.quick_select')}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PURPOSES.map((p) => (
                <button key={p.id} type="button"
                  onClick={() => handleQuickSelect(p.id, p.label)}
                  disabled={status === 'loading'}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50 ${
                    submittedQuery.toLowerCase() === p.label.toLowerCase()
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{t('checklist.generating')}</p>
              <p className="text-xs">
                {t('checklist.building_for')} <span className="font-semibold text-foreground">{submittedQuery}</span>
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">{t('checklist.failed')}</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                  <RefreshCw className="h-3 w-3 mr-2" /> {t('checklist.try_again')}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════ RESULTS ══════════════════════════ */}
          {status === 'success' && data && (
            <div className="space-y-6">

              {/* Active query pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{t('checklist.results_for')}</span>
                <Badge variant="outline" className="flex items-center gap-1 text-xs font-medium capitalize">
                  <Search className="h-3 w-3" />
                  {submittedQuery}
                  <button onClick={handleClear} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
                {data.fromCache && (
                  <button onClick={handleRefresh}
                    className="text-xs text-muted-foreground underline hover:no-underline ml-auto">
                    {t('checklist.refetch')}
                  </button>
                )}
              </div>

              {/* ── 1. Progress bar ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {available.length} / {total} {t('checklist.docs_ready')}
                  </span>
                  <span className={`font-semibold ${pct === 100 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* ── 2. Document list ── */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> {t('checklist.required_docs')}
                </h4>
                {data.requiredDocuments.map((doc, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    doc.status === 'available'
                      ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
                      : doc.required
                      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                      : 'border-border bg-muted/30'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {doc.status === 'available'
                        ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        : <XCircle className={`h-5 w-5 ${doc.required ? 'text-red-500' : 'text-muted-foreground'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${
                          doc.status === 'available' ? 'text-green-900 dark:text-green-100'
                          : doc.required ? 'text-red-900 dark:text-red-100' : 'text-foreground'}`}>
                          {doc.name}
                        </span>
                        <Badge variant={doc.status === 'available' ? 'default' : 'secondary'}
                          className={`text-xs ${
                            doc.status === 'available' ? 'bg-green-500 hover:bg-green-600 text-white'
                            : doc.required ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}>
                          {doc.status === 'available' ? t('checklist.uploaded')
                            : doc.required ? t('checklist.missing') : t('checklist.optional')}
                        </Badge>
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        doc.status === 'available' ? 'text-green-700 dark:text-green-300'
                        : doc.required ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}>
                        {doc.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Missing alert */}
              {requiredMissing.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {requiredMissing.length}{' '}
                    {requiredMissing.length === 1 ? t('checklist.still_missing_one') : t('checklist.still_missing')}
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    {requiredMissing.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        {d.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pct === 100 && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">{t('checklist.ready_title')}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{t('checklist.ready_desc')}</p>
                  </div>
                </div>
              )}

              {/* ── 3. YouTube Tutorial — only shown when a real video ID was found ── */}
              {data.videoId && !videoError && (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900">
                    <Youtube className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold">{t('checklist.watch_tutorial')}</span>
                  </div>
                  <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      key={data.videoId}
                      src={`https://www.youtube-nocookie.com/embed/${data.videoId}?rel=0&modestbranding=1`}
                      title={t('checklist.watch_tutorial')}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={() => setVideoError(true)}
                    />
                  </div>
                </div>
              )}

              {/* ── 4. Application Steps ── */}
              {data.steps.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900">
                    <ListChecks className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold">{t('checklist.app_steps')}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{data.steps.length} steps</Badge>
                  </div>
                  <ol className="divide-y divide-border">
                    {data.steps.map((step, i) => (
                      <li key={i} className="flex gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/90">
                          {step.replace(/^Step \d+:\s*/i, '')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ── 5. Important Notes (collapsible) ── */}
              {data.notes.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900 text-sm font-medium hover:bg-amber-100/50 transition-colors"
                    onClick={() => setNotesOpen((v) => !v)}>
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-600" />
                      {t('checklist.important_notes')}
                    </span>
                    {notesOpen
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {notesOpen && (
                    <ul className="px-4 py-3 space-y-2.5 bg-amber-50/30 dark:bg-amber-950/10">
                      {data.notes.map((note, i) => (
                        <li key={i} className="flex gap-2.5 text-sm">
                          <span className="text-amber-600 flex-shrink-0 mt-0.5 font-bold">•</span>
                          <span className="text-foreground/80">{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── 6. Official Application Portal — only shown when URL was found ── */}
              {officialUrl && (
                <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-0.5">{t('checklist.official_portal')}</p>
                      {officialDomain && (
                        <p className="text-xs text-muted-foreground font-mono mb-1 truncate">{officialDomain}</p>
                      )}
                      <p className="text-xs text-muted-foreground mb-4">{t('checklist.portal_note')}</p>
                      <a href={officialUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-primary hover:bg-primary/90 gap-2">
                          {t('checklist.apply_now')}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Empty idle state */}
          {status === 'idle' && !submittedQuery && (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <Search className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">{t('checklist.idle_hint')}</p>
              <p className="text-xs opacity-70">{t('checklist.idle_examples')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
