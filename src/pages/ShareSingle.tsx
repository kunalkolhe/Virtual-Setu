import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ShieldCheck, Lock, FileText, Loader2, AlertCircle, X, Download, Eye, Sparkles,
} from 'lucide-react';

const BLOCKED_MSG = 'Action blocked for security reasons in Virtual Setu.';

type Permission = 'view' | 'download_watermark' | 'download_clean';

interface DocShare {
  documentName: string;
  documentType: string;
  signedUrl: string;
  expiresAt: number;
  permission: Permission;
}

/* ── Download helpers ── */
async function downloadImageWithWatermark(url: string, fileName: string) {
  try {
    // Fetch as blob first so canvas won't be CORS-tainted
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

export default function ShareSingle() {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<DocShare | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    if (!token) return;
    if (pin.length < 4) { toast.error('Enter your share PIN (4–6 digits)'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/get-doc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid PIN or link expired');
      setDoc({ ...data, permission: data.permission || 'view' });
    } catch (e: any) {
      setError(e.message || 'Invalid PIN or link expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f7]" style={{ fontFamily: "'Noto Sans','Segoe UI',Arial,sans-serif" }}>
      {/* Gov header */}
      <div className="h-1 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-gray-200" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <div className="bg-[#003580] text-white text-[11px]">
        <div className="max-w-2xl mx-auto px-4 py-1.5">
          <span className="tracking-wide">भारत सरकार · Government of India · Ministry of Electronics &amp; IT</span>
        </div>
      </div>
      <header className="bg-white border-b-2 border-[#003580] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <AshokaChakraMini />
          <div className="border-l-2 border-[#003580] pl-3">
            <p className="font-bold text-[#003580] text-sm leading-none">Virtual Setu</p>
            <p className="text-[11px] text-slate-500">Emergency Document Access · सुरक्षित दस्तावेज़</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!doc ? (
          <div className="bg-white border border-[#cdd3da] rounded-sm shadow-sm overflow-hidden">
            <div className="bg-[#003580] px-5 py-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#FF9933]" />
                <div>
                  <h1 className="text-sm font-bold text-white">Secure Document Access</h1>
                  <p className="text-[11px] text-blue-200">Enter the share PIN provided by the document owner</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-[#ffebee] border-l-4 border-[#ef5350]">
                  <AlertCircle className="h-4 w-4 text-[#c62828] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#b71c1c]">{error}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Share PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 4–6 digit PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && unlock()}
                  className="border-slate-300 rounded-sm focus-visible:ring-[#003580]"
                />
              </div>
              <Button
                onClick={unlock}
                disabled={loading || pin.length < 4}
                className="w-full bg-[#003580] hover:bg-[#002060] text-white font-semibold rounded-sm"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying…</>
                  : 'Unlock Document'
                }
              </Button>
              <div className="p-3 bg-[#fff8e1] border-l-4 border-[#f9a825]">
                <p className="text-xs text-[#5d4037]">
                  Your PIN is verified securely. Documents are presented in view-only mode.
                  Downloading, copying, and screen capture are restricted.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <SecureDocViewer doc={doc} />
        )}
      </main>

      <div className="h-1 flex fixed bottom-0 left-0 right-0 z-50">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
    </div>
  );
}

/* ── Inline Ashoka Chakra (no import needed here) ── */
function AshokaChakraMini() {
  const cx = 20, cy = 20, outerR = 17.5, innerR = 5;
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 - 90) * (Math.PI / 180);
    return {
      x1: cx + innerR * Math.cos(angle), y1: cy + innerR * Math.sin(angle),
      x2: cx + outerR * Math.cos(angle), y2: cy + outerR * Math.sin(angle),
    };
  });
  return (
    <svg viewBox="0 0 40 40" width={36} height={36} aria-hidden>
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#003580" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#003580" strokeWidth="1.5" />
      {spokes.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#003580" strokeWidth="0.9" />)}
    </svg>
  );
}

/* ── Secure doc viewer ── */
function SecureDocViewer({ doc }: { doc: DocShare }) {
  const [hidden, setHidden] = useState(false);
  const [hideReason, setHideReason] = useState('Viewing paused for safety');
  const rootRef = useRef<HTMLDivElement>(null);
  const blockedToast = useRef(0);
  const isDownloading = useRef(false);
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const notifyBlocked = () => {
    const now = Date.now();
    if (now - blockedToast.current < 1500) return;
    blockedToast.current = now;
    toast.error(BLOCKED_MSG);
  };

  const requestFs = async () => {
    const el = rootRef.current as any;
    if (!el) return;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fn) { try { await fn.call(el); } catch {} }
  };

  useEffect(() => { requestFs(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (k === 'printscreen' || k === 'f12' || (ctrl && ['s','p','c','x','a','u'].includes(k)) || (ctrl && e.shiftKey && ['i','j','c','s'].includes(k))) {
        e.preventDefault(); e.stopPropagation();
        setHideReason('Possible screen capture detected'); setHidden(true);
        setTimeout(() => setHidden(false), 1500); notifyBlocked();
      }
    };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); notifyBlocked(); };
    const onVis = () => {
      if (isDownloading.current) return;
      if (document.visibilityState !== 'visible') { setHideReason('Viewing paused — return to this tab'); setHidden(true); } else setHidden(false);
    };
    const onBlur = () => {
      if (isDownloading.current) return;
      setHideReason('Viewing paused for safety'); setHidden(true);
    };
    const onFocus = () => setHidden(false);
    const onFs = () => {
      if (isDownloading.current) return;
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fsEl) { setHideReason('Fullscreen exited — viewing paused'); setHidden(true); } else setHidden(false);
    };
    const blockTouch = (e: TouchEvent) => { if (e.touches?.length > 1) e.preventDefault(); };
    const blockGesture = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('copy', onCopy, true);
    window.addEventListener('cut', onCopy, true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    document.addEventListener('touchmove', blockTouch, { passive: false });
    document.addEventListener('gesturestart', blockGesture as any);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('copy', onCopy, true);
      window.removeEventListener('cut', onCopy, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('gesturestart', blockGesture as any);
    };
  }, []);

  const isImage = /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(doc.signedUrl);
  const isPdf   = /\.pdf(\?|$)/i.test(doc.signedUrl) || doc.documentType === 'pdf';

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 bg-[#0b1220] flex flex-col overscroll-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-y' }}
      onContextMenu={(e) => { e.preventDefault(); notifyBlocked(); }}
    >
      {/* Viewer top bar */}
      <div className="bg-[#003580] text-white shrink-0">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-5 w-5 text-[#FF9933] shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest uppercase text-blue-200">Virtual Setu · Secure View</p>
              <p className="font-semibold truncate text-sm">{doc.documentName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={requestFs} className="text-white hover:bg-white/15 hidden sm:inline-flex text-xs">
              Fullscreen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-white hover:bg-white/15 text-xs">
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </div>
        </div>

        {/* Download buttons — shown based on owner-set permission */}
        {doc.permission === 'download_watermark' && (
          <div className="px-4 pb-2.5">
            <button
              onClick={async () => {
                isDownloading.current = true;
                try {
                  if (isImage) {
                    await downloadImageWithWatermark(doc.signedUrl, doc.documentName);
                  } else {
                    await downloadFile(doc.signedUrl, doc.documentName);
                  }
                } finally {
                  setTimeout(() => { isDownloading.current = false; }, 3000);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-sm transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download with Watermark
            </button>
          </div>
        )}
        {doc.permission === 'download_clean' && (
          <div className="px-4 pb-2.5">
            <button
              onClick={async () => {
                isDownloading.current = true;
                try {
                  await downloadFile(doc.signedUrl, doc.documentName);
                } finally {
                  setTimeout(() => { isDownloading.current = false; }, 3000);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FF9933]/90 hover:bg-[#FF9933] text-[#003580] rounded-sm transition-colors font-bold"
            >
              <Sparkles className="h-3.5 w-3.5" /> Download without Watermark
            </button>
          </div>
        )}
      </div>

      {/* Document */}
      <div className="flex-1 overflow-auto p-2 sm:p-4" onDragStart={(e) => e.preventDefault()}>
        <div className="relative mx-auto bg-white rounded shadow-2xl overflow-hidden" style={{ maxWidth: 900 }}>
          {isImage ? (
            <div className="flex items-center justify-center bg-[#f8fafc] p-4 min-h-[60vh]">
              <img src={doc.signedUrl} alt="document" draggable={false}
                onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
                style={{ maxWidth: '100%', maxHeight: '78vh', userSelect: 'none', WebkitUserSelect: 'none' }}
              />
            </div>
          ) : isPdf ? (
            <iframe src={doc.signedUrl + '#toolbar=0&navpanes=0&scrollbar=0'} title="document"
              className="w-full" style={{ height: '80vh', border: 'none' }} />
          ) : (
            <div className="flex items-center justify-center min-h-[40vh] p-8 text-center">
              <div>
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">{doc.documentName}</p>
                <p className="text-xs text-slate-400 mt-1">Preview not available for this file type.</p>
              </div>
            </div>
          )}

          {/* Moving watermark */}
          <MovingWatermark isMobile={isMobile} />

          {/* Privacy blur */}
          {hidden && (
            <div className="absolute inset-0 bg-[#003580]/95 text-white flex flex-col items-center justify-center text-center p-6 z-40">
              <ShieldCheck className="h-10 w-10 mb-3 text-[#FF9933]" />
              <p className="font-bold text-lg">Security Alert</p>
              <p className="text-sm text-blue-100 mt-1 max-w-sm">{hideReason}</p>
              <Button onClick={() => { setHidden(false); requestFs(); }} className="mt-4 bg-white text-[#003580] hover:bg-blue-50 font-semibold">
                Resume Secure View
              </Button>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-blue-200/70 mt-3 px-2">
          {doc.permission === 'view'
            ? 'View-only mode · Downloading, printing, copying and screen capture are restricted.'
            : doc.permission === 'download_watermark'
              ? 'Watermarked download enabled by the document owner.'
              : 'Full download enabled by the document owner.'}
        </div>
      </div>
    </div>
  );
}

function MovingWatermark({ isMobile }: { isMobile: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const time = now.toLocaleTimeString('en-IN', { hour12: false });
  const device = isMobile ? 'Mobile' : 'Desktop';
  const rows = Array.from({ length: 12 });
  const cols = Array.from({ length: 5 });
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden style={{ mixBlendMode: 'multiply' }}>
      <style>{`@keyframes vs-wm { 0%,100% { transform: rotate(-28deg) translate3d(0,0,0); } 50% { transform: rotate(-28deg) translate3d(-40px,-30px,0); } }`}</style>
      <div className="absolute -inset-[20%]" style={{ animation: 'vs-wm 12s ease-in-out infinite', transformOrigin: 'center' }}>
        {rows.map((_, r) => (
          <div key={r} className="flex justify-around" style={{ marginTop: 72 }}>
            {cols.map((__, c) => (
              <div key={c} style={{ color: 'rgba(0,53,128,0.16)', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em' }}>VIRTUAL SETU</div>
                <div style={{ fontSize: 9 }}>{device} · {time}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
