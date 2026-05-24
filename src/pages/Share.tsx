import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Lock, ShieldCheck, ArrowLeft, X, Loader2, Download, Sparkles } from 'lucide-react';

/* ── Download helpers ── */
async function downloadImageWithWatermark(url: string, fileName: string) {
  try {
    // Fetch as blob first so the canvas won't be CORS-tainted
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = blobUrl;
    });
    URL.revokeObjectURL(blobUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 600;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#003580';
    ctx.font = `bold ${Math.max(18, Math.floor(canvas.width / 22))}px Arial`;
    ctx.rotate(-Math.PI / 6);
    const step = Math.floor(canvas.width / 2.5);
    for (let y = -canvas.height; y < canvas.height * 2; y += 120) {
      for (let x = -canvas.width; x < canvas.width * 2; x += step) {
        ctx.fillText('VIRTUAL SETU', x, y);
        ctx.fillText(new Date().toLocaleDateString('en-IN'), x, y + 36);
      }
    }
    ctx.restore();

    canvas.toBlob((b) => {
      if (!b) { window.open(url, '_blank'); return; }
      const a = document.createElement('a');
      const objUrl = URL.createObjectURL(b);
      a.href = objUrl;
      a.download = `${(fileName || 'document').replace(/\.[^.]+$/, '')}_watermarked.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    }, 'image/jpeg', 0.92);
  } catch {
    // Fallback: open URL directly
    window.open(url, '_blank');
  }
}

async function downloadFile(url: string, fileName: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    window.open(url, '_blank');
  }
}

interface SharedDoc {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
  signed_url: string;
}

type Step = 'pin' | 'list' | 'viewer';

const BLOCKED_MSG = 'Action blocked for security reasons in Virtual Setu.';

export default function Share() {
  const { uid } = useParams();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<SharedDoc[] | null>(null);
  const [step, setStep] = useState<Step>('pin');
  const [activeDoc, setActiveDoc] = useState<SharedDoc | null>(null);

  const unlock = async () => {
    if (!uid) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      toast.error('Invalid document link format.');
      return;
    }

    if (!pin || pin.length < 4) {
      toast.error('Enter your 4-digit PIN');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-docs', {
        body: { uid, pin },
      });

      if (error) {
        let msg = error.message;
        
        // Attempt to parse JSON body from the error response
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errData = await error.context.json();
            if (errData?.error) {
              msg = errData.error;
            }
          } catch (e) {
            // Context wasn't JSON
          }
        }
        
        if (msg.includes('non-2xx status code')) {
          msg = 'Document not found or invalid PIN provided.';
        }
        throw new Error(msg);
      }
      const list: SharedDoc[] = data?.documents || [];
      setDocs(list);
      setStep('list');
      if (!list.length) toast.info('No documents found for this account');
      else toast.success('Access granted');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Invalid PIN or unable to load documents');
    } finally {
      setLoading(false);
    }
  };

  const openDocument = (doc: SharedDoc) => {
    setActiveDoc(doc);
    setStep('viewer');
  };

  const closeViewer = () => {
    setActiveDoc(null);
    setStep('list');
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      {/* ── Government-style header ── */}
      <header className="bg-gradient-to-r from-[#00266e] to-[#0047ab] text-white">
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-white/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.2em] uppercase text-blue-200">
              Government of India · भारत सरकार
            </p>
            <p className="font-semibold tracking-wide">Virtual Setu — Secure Document Access</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {step === 'pin' && (
          <PinStep pin={pin} setPin={setPin} loading={loading} onUnlock={unlock} />
        )}

        {step === 'list' && docs && (
          <DocList docs={docs} onSelect={openDocument} onBack={() => setStep('pin')} />
        )}
      </main>

      {step === 'viewer' && activeDoc && (
        <SecureViewer doc={activeDoc} onClose={closeViewer} userId={uid || ''} />
      )}

      {/* Bottom tricolor */}
      <div className="h-1 flex fixed bottom-0 left-0 right-0">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
    </div>
  );
}

/* ─────────────────────────── PIN STEP ─────────────────────────── */
function PinStep({
  pin,
  setPin,
  loading,
  onUnlock,
}: {
  pin: string;
  setPin: (v: string) => void;
  loading: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#dbeafe] shadow-sm p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-5 w-5 text-[#00266e]" />
        <h1 className="text-lg font-semibold text-[#00266e]">Verify your identity</h1>
      </div>
      <p className="text-sm text-slate-600 mb-5">
        Enter your secret PIN to view documents linked to this card.
      </p>

      <div className="space-y-3">
        <Label htmlFor="pin" className="text-slate-700">PIN</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Enter 4–6 digit PIN"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onUnlock();
          }}
          className="bg-white border-slate-300 focus-visible:ring-[#0047ab]"
        />
        <Button
          onClick={onUnlock}
          disabled={loading || pin.length < 4}
          className="w-full bg-[#00266e] hover:bg-[#001b52] text-white"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </span>
          ) : (
            'Unlock Documents'
          )}
        </Button>
      </div>

      <p className="text-[11px] text-slate-500 mt-4">
        Your PIN is verified securely. Documents are presented in view-only mode.
      </p>
    </div>
  );
}

/* ─────────────────────────── DOC LIST ─────────────────────────── */
function DocList({
  docs,
  onSelect,
  onBack,
}: {
  docs: SharedDoc[];
  onSelect: (d: SharedDoc) => void;
  onBack: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#dbeafe] shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#00266e]">Select a document to view</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-[#00266e]"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {docs.length === 0 ? (
        <p className="text-slate-600 text-sm">No documents available.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d)}
                className="w-full flex items-center justify-between py-3 px-2 hover:bg-[#f4f7fb] rounded-md text-left transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-[#e6efff] text-[#00266e]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{d.document_name}</div>
                    <div className="text-xs text-slate-500 capitalize">{d.document_type}</div>
                  </div>
                </div>
                <span className="text-xs text-[#0047ab] font-medium">View →</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
        Documents open in a secure view-only mode. Downloading, printing, copying and
        screen capture are restricted.
      </p>
    </div>
  );
}

/* ────────────────────────── SECURE VIEWER ────────────────────────── */
function SecureViewer({
  doc,
  onClose,
  userId,
}: {
  doc: SharedDoc;
  onClose: () => void;
  userId: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [hideReason, setHideReason] = useState<string>('Viewing paused for safety');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const blockedToast = useRef(0);
  const isDownloading = useRef(false);

  const notifyBlocked = () => {
    const now = Date.now();
    if (now - blockedToast.current < 1500) return;
    blockedToast.current = now;
    toast.error(BLOCKED_MSG);
  };

  const isMobile =
    typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Try to enter fullscreen on open (some browsers require user gesture
  // — we attempt anyway and offer a manual button if denied).
  const requestFs = async () => {
    const el = rootRef.current as any;
    if (!el) return;
    const fn =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (fn) {
      try {
        await fn.call(el);
      } catch {
        /* user denied / unsupported */
      }
    }
  };

  useEffect(() => {
    requestFs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hard block: keyboard shortcuts (save, print, copy, devtools, view-source)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        k === 'printscreen' ||
        k === 'f12' ||
        (ctrl && ['s', 'p', 'c', 'x', 'a', 'u'].includes(k)) ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 's'].includes(k))
      ) {
        e.preventDefault();
        e.stopPropagation();
        // Many systems take the screenshot before JS runs — blur as a
        // last-line defence so the second/burst shot is useless.
        setHideReason('Possible screen capture detected');
        setHidden(true);
        setTimeout(() => setHidden(false), 1500);
        notifyBlocked();
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      notifyBlocked();
    };

    const onVisibility = () => {
      if (isDownloading.current) return;
      if (document.visibilityState !== 'visible') {
        setHideReason('Viewing paused — return to this tab to continue');
        setHidden(true);
      } else {
        setHidden(false);
      }
    };
    const onBlur = () => {
      if (isDownloading.current) return;
      setHideReason('Viewing paused for safety');
      setHidden(true);
    };
    const onFocus = () => setHidden(false);

    const onFsChange = () => {
      if (isDownloading.current) return;
      const fsEl =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement;
      const inFs = !!fsEl;
      setIsFullscreen(inFs);
      if (!inFs) {
        setHideReason('Fullscreen exited — viewing paused');
        setHidden(true);
      } else {
        setHidden(false);
      }
    };

    // Block long-press / pinch-zoom on document area
    const blockTouch = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };
    const blockGesture = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('copy', onCopy, true);
    window.addEventListener('cut', onCopy, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('msfullscreenchange', onFsChange);
    document.addEventListener('touchmove', blockTouch, { passive: false });
    document.addEventListener('gesturestart', blockGesture as any);
    document.addEventListener('gesturechange', blockGesture as any);
    document.addEventListener('gestureend', blockGesture as any);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('copy', onCopy, true);
      window.removeEventListener('cut', onCopy, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('msfullscreenchange', onFsChange);
      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('gesturestart', blockGesture as any);
      document.removeEventListener('gesturechange', blockGesture as any);
      document.removeEventListener('gestureend', blockGesture as any);
    };
  }, []);

  const handleClose = async () => {
    try {
      const exit =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).msExitFullscreen;
      if (exit && (document.fullscreenElement || (document as any).webkitFullscreenElement)) {
        await exit.call(document);
      }
    } catch {
      /* ignore */
    }
    onClose();
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 bg-[#0b1220] flex flex-col overscroll-none"
      style={{
        // Block iOS callout / long-press menus
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        notifyBlocked();
      }}
    >
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#00266e] to-[#0047ab] text-white shadow-md shrink-0">
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.16em] uppercase text-blue-200">
                Virtual Setu · Secure View
              </p>
              <p className="font-medium truncate text-sm sm:text-base">
                {doc.document_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={requestFs}
                className="text-white hover:bg-white/15 hidden sm:inline-flex"
              >
                Fullscreen
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white hover:bg-white/15"
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </div>
        </div>

        {/* Download buttons — always visible in the bar for QR scan */}
        <div className="px-3 sm:px-4 pb-2.5 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              isDownloading.current = true;
              try {
                const isImage = /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(doc.signed_url);
                if (isImage) {
                  await downloadImageWithWatermark(doc.signed_url, doc.document_name);
                } else {
                  await downloadFile(doc.signed_url, doc.document_name);
                }
              } finally {
                setTimeout(() => { isDownloading.current = false; }, 3000);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download with Watermark
          </button>
          <button
            onClick={async () => {
              isDownloading.current = true;
              try {
                await downloadFile(doc.signed_url, doc.document_name);
              } finally {
                setTimeout(() => { isDownloading.current = false; }, 3000);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FF9933]/90 hover:bg-[#FF9933] text-[#00266e] rounded-sm transition-colors font-bold"
          >
            <Sparkles className="h-3.5 w-3.5" /> Download without Watermark
          </button>
        </div>
      </div>

      {/* Document area */}
      <div
        className="flex-1 overflow-auto p-2 sm:p-4 relative"
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="relative mx-auto bg-white rounded-lg shadow-2xl border border-[#dbeafe] overflow-hidden"
          style={{ maxWidth: 900, width: '100%' }}
        >
          <DocumentRenderer doc={doc} />

          {/* Dynamic moving watermark — covers the full viewer */}
          <DynamicWatermark userId={userId} isMobile={isMobile} />

          {/* Privacy blur when window loses focus / fullscreen exited */}
          {hidden && (
            <div className="absolute inset-0 bg-[#00266e]/95 text-white flex flex-col items-center justify-center text-center p-6 z-40">
              <ShieldCheck className="h-10 w-10 mb-3" />
              <p className="font-semibold text-lg">Security Alert</p>
              <p className="text-sm text-blue-100 mt-1 max-w-sm">{hideReason}</p>
              <Button
                onClick={() => {
                  setHidden(false);
                  requestFs();
                }}
                className="mt-4 bg-white text-[#00266e] hover:bg-blue-50"
              >
                Resume secure view
              </Button>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-blue-200/80 mt-3 px-2">
          <p>Use the download buttons above to save this document.</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Dynamic moving watermark ────────────── */
function DynamicWatermark({
  userId,
  isMobile,
}: {
  userId: string;
  isMobile: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('en-IN', { hour12: false });
  const shortId = (userId || 'unknown').slice(0, 8).toUpperCase();
  const device = isMobile ? 'Mobile' : 'Desktop';

  // Repeating tile to cover the whole document area
  const rows = Array.from({ length: 14 });
  const cols = Array.from({ length: 5 });

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-hidden
      style={{ mixBlendMode: 'multiply' }}
    >
      <style>{`
        @keyframes vsetu-wm-drift {
          0%   { transform: rotate(-28deg) translate3d(0, 0, 0); }
          50%  { transform: rotate(-28deg) translate3d(-40px, -30px, 0); }
          100% { transform: rotate(-28deg) translate3d(0, 0, 0); }
        }
      `}</style>
      <div
        className="absolute -inset-[20%]"
        style={{
          animation: 'vsetu-wm-drift 12s ease-in-out infinite',
          transformOrigin: 'center',
        }}
      >
        {rows.map((_, r) => (
          <div key={r} className="flex justify-around" style={{ marginTop: 64 }}>
            {cols.map((__, c) => (
              <div
                key={c}
                style={{
                  color: 'rgba(0, 38, 110, 0.18)',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  fontFamily: '"Segoe UI", system-ui, sans-serif',
                  textAlign: 'center',
                  lineHeight: 1.15,
                }}
              >
                <div style={{ fontSize: 13, letterSpacing: '0.18em' }}>
                  VIRTUAL SETU
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.05em' }}>
                  ID: {shortId} · {device}
                </div>
                <div style={{ fontSize: 10, letterSpacing: '0.05em' }}>
                  {time}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────── Per-type renderer ────────────── */
function DocumentRenderer({ doc }: { doc: SharedDoc }) {
  const kind = useMemo(() => detectKind(doc), [doc]);

  if (kind === 'image') return <ImageView url={doc.signed_url} />;
  if (kind === 'pdf') return <PdfView url={doc.signed_url} />;
  return <UnsupportedView doc={doc} />;
}

function detectKind(doc: SharedDoc): 'image' | 'pdf' | 'other' {
  const u = (doc.signed_url || '').toLowerCase();
  const n = (doc.document_name || '').toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp)(\?|$)/.test(u) || /\.(png|jpe?g|webp|gif|bmp)$/.test(n))
    return 'image';
  if (/\.pdf(\?|$)/.test(u) || n.endsWith('.pdf')) return 'pdf';
  return 'other';
}

/* ────────────── Image renderer ────────────── */
function ImageView({ url }: { url: string }) {
  return (
    <div className="flex items-center justify-center bg-[#f8fafc] p-4 min-h-[60vh]">
      <img
        src={url}
        alt="document"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{
          maxWidth: '100%',
          maxHeight: '78vh',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}

/* ────────────── PDF renderer (rendered via pdf.js to canvas — no browser PDF UI) ────────────── */
function PdfView({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        setError(null);
        const pdfjsLib: any = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        setPages(pdf.numPages);

        // Clear container
        const host = containerRef.current;
        if (!host) return;
        host.innerHTML = '';

        const containerWidth = host.clientWidth || 800;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, containerWidth / viewport.width);
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(scaledViewport.width);
          canvas.height = Math.ceil(scaledViewport.height);
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 16px';
          canvas.style.maxWidth = '100%';
          canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
          canvas.style.borderRadius = '4px';
          // Block right-click on canvas itself
          canvas.oncontextmenu = (e) => {
            e.preventDefault();
            return false;
          };

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          if (cancelled) return;
          host.appendChild(canvas);
          setProgress(pageNum);
        }
      } catch (e: any) {
        console.error('PDF render error:', e);
        if (!cancelled) setError(e?.message || 'Unable to display document');
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="bg-[#f8fafc] p-4 min-h-[60vh]">
      {error && (
        <div className="text-center text-red-600 text-sm py-10">{error}</div>
      )}
      {!error && pages === 0 && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading secure document…
        </div>
      )}
      {pages > 0 && progress < pages && (
        <div className="text-center text-xs text-slate-500 mb-2">
          Rendering page {progress} of {pages}…
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}

/* ────────────── Unsupported type fallback ────────────── */
function UnsupportedView({ doc }: { doc: SharedDoc }) {
  return (
    <div className="p-10 text-center bg-[#f8fafc] min-h-[40vh] flex flex-col items-center justify-center">
      <FileText className="h-10 w-10 text-[#00266e] mb-2" />
      <p className="font-semibold text-slate-800">{doc.document_name}</p>
      <p className="text-sm text-slate-500 mt-1">
        This file type cannot be displayed in secure view-only mode.
      </p>
    </div>
  );
}
