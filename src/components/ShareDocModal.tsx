import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import QRCode from '@/components/QRCode';
import { toast } from 'sonner';
import {
  QrCode, Copy, Clock, Lock, ShieldCheck, X, CheckCircle, Share2,
  StopCircle, AlertTriangle, Eye, Download, Sparkles,
} from 'lucide-react';

type Permission = 'view' | 'download_watermark' | 'download_clean';

const PERMISSIONS: { value: Permission; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'view',               label: 'View Only',                   sub: 'Watermarked · No download',               icon: <Eye className="h-3.5 w-3.5" /> },
  { value: 'download_watermark', label: 'Download with Watermark',     sub: 'They can download a watermarked copy',    icon: <Download className="h-3.5 w-3.5" /> },
  { value: 'download_clean',     label: 'Download without Watermark',  sub: 'Full clean copy — use with trust only',   icon: <Sparkles className="h-3.5 w-3.5" /> },
];

/* ── Persistence helpers ── */
interface StoredShare {
  token: string;
  shareUrl: string;
  expiresAt: number;
  pinLength: number;
  permission: Permission;
}

function loadShare(documentId: string): StoredShare | null {
  try {
    const raw = localStorage.getItem(`vs_share_${documentId}`);
    if (!raw) return null;
    const s: StoredShare = JSON.parse(raw);
    if (s.expiresAt <= Date.now()) {
      localStorage.removeItem(`vs_share_${documentId}`);
      return null;
    }
    return s;
  } catch { return null; }
}

function saveShare(documentId: string, s: StoredShare) {
  localStorage.setItem(`vs_share_${documentId}`, JSON.stringify(s));
}

function clearShare(documentId: string) {
  localStorage.removeItem(`vs_share_${documentId}`);
}

/* ── Countdown formatter ── */
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

const DURATIONS = [
  { label: '1 Hour',   value: 1 },
  { label: '6 Hours',  value: 6 },
  { label: '24 Hours', value: 24 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  userId: string;
}

export default function ShareDocModal({ open, onClose, documentId, documentName, userId }: Props) {
  /* ── Form state ── */
  const [pin, setPin] = useState('');
  const [duration, setDuration] = useState(6);
  const [permission, setPermission] = useState<Permission>('view');
  const [loading, setLoading] = useState(false);

  /* ── Active share state (loaded from localStorage on open) ── */
  const [activeShare, setActiveShare] = useState<StoredShare | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Load persisted share when modal opens ── */
  useEffect(() => {
    if (!open) return;
    const stored = loadShare(documentId);
    if (stored) {
      setActiveShare(stored);
      setExpired(false);
      setRevoked(false);
    } else {
      setActiveShare(null);
      setExpired(false);
      setRevoked(false);
    }
    setConfirmRevoke(false);
    setCopied(false);
  }, [open, documentId]);

  /* ── Live countdown ── */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!activeShare) return;

    const tick = () => {
      const remaining = activeShare.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setExpired(true);
        clearShare(documentId);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTimeLeft(remaining);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeShare, documentId]);

  /* ── Create share ── */
  const handleCreate = async () => {
    if (pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/create-doc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId, pin, durationHours: duration, permission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create share');

      const share: StoredShare = {
        token: data.token,
        shareUrl: `${window.location.origin}/s/${data.token}`,
        expiresAt: Date.now() + duration * 3_600_000,
        pinLength: pin.length,
        permission,
      };
      saveShare(documentId, share);
      setActiveShare(share);
      setExpired(false);
      setRevoked(false);
      setPin('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  /* ── Revoke share ── */
  const handleRevoke = async () => {
    if (!activeShare) return;
    setRevoking(true);
    try {
      await fetch('/api/revoke-doc-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeShare.token }),
      });
      clearShare(documentId);
      setRevoked(true);
      setExpired(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
      toast.success('Access revoked — link is now invalid');
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke access');
    } finally {
      setRevoking(false);
      setConfirmRevoke(false);
    }
  };

  const copyLink = async () => {
    if (!activeShare?.shareUrl) return;
    await navigator.clipboard.writeText(activeShare.shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    // do NOT reset activeShare on close — leave it in localStorage
    setPin('');
    setConfirmRevoke(false);
    setCopied(false);
    onClose();
  };

  const countdownColor =
    expired || revoked                  ? 'text-red-600 bg-red-50 border-red-200'
    : timeLeft < 5 * 60 * 1000         ? 'text-red-600 bg-red-50 border-red-200'
    : timeLeft < 30 * 60 * 1000        ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-[#138808] bg-[#e8f5e9] border-green-200';

  const showActive = !!activeShare;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent hideClose className="max-w-md bg-white border border-[#cdd3da] rounded-sm p-0 overflow-hidden">

        {/* Header */}
        <div className="bg-[#003580] text-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-[#FF9933]" />
              <div>
                <DialogTitle className="text-sm font-bold text-white">Emergency QR Share</DialogTitle>
                <p className="text-[11px] text-blue-200 mt-0.5">Time-limited · PIN-protected · Revocable</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-blue-200 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Document name */}
          <div className="p-3 bg-[#f0f4fa] border border-[#c8d4e8] rounded-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#003580] shrink-0" />
            <p className="text-sm font-semibold text-slate-800 truncate">{documentName}</p>
          </div>

          {!showActive ? (
            /* ── Step 1: Configure new share ── */
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Set Share PIN <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="4–6 digit PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="border-slate-300 rounded-sm focus-visible:ring-[#003580]"
                />
                <p className="text-[11px] text-slate-500">The recipient will need this PIN to view the document.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Link Valid For
                </Label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={`flex-1 py-2 text-xs font-semibold border rounded-sm transition-colors ${
                        duration === d.value
                          ? 'bg-[#003580] text-white border-[#003580]'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-[#003580]'
                      }`}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              {/* Permission */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Recipient Permission
                </Label>
                <div className="flex flex-col gap-1.5">
                  {PERMISSIONS.map((p) => (
                    <button key={p.value} onClick={() => setPermission(p.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 border rounded-sm text-left transition-colors ${
                        permission === p.value
                          ? 'bg-[#003580] text-white border-[#003580]'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-[#003580]'
                      }`}
                    >
                      <span className={permission === p.value ? 'text-[#FF9933]' : 'text-slate-400'}>{p.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-none">{p.label}</p>
                        <p className={`text-[10px] mt-0.5 ${permission === p.value ? 'text-blue-200' : 'text-slate-400'}`}>{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#fff8e1] border-l-4 border-[#f9a825]">
                <p className="text-xs text-[#5d4037]">
                  <strong>Note:</strong> The link stays active until it expires or you revoke it.
                  Closing this dialog does not stop the share.
                </p>
              </div>

              <Button onClick={handleCreate} disabled={loading || pin.length < 4}
                className="w-full bg-[#003580] hover:bg-[#002060] text-white font-semibold rounded-sm"
              >
                {loading ? 'Generating…' : <><QrCode className="h-4 w-4 mr-2" /> Generate QR Code</>}
              </Button>
            </>
          ) : (
            /* ── Step 2: Active share — timer + QR + revoke ── */
            <>
              {/* Countdown */}
              <div className={`flex items-center justify-between px-3 py-2 border rounded-sm ${countdownColor}`}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {revoked ? 'Access Revoked' : expired ? 'Link Expired' : 'Access Expires In'}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold tabular-nums">
                  {revoked ? '—' : formatCountdown(timeLeft)}
                </span>
              </div>

              {/* QR or expired state */}
              {!expired && !revoked ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="p-3 bg-white border-2 border-[#003580] rounded-sm inline-block">
                    <QRCode data={activeShare.shareUrl} size={170} errorCorrectionLevel="M" />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[#138808]">
                    <CheckCircle className="h-4 w-4" />
                    <p className="text-sm font-semibold">Share link active</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-sm">
                    <StopCircle className="h-10 w-10 text-red-500 mx-auto" />
                  </div>
                  <p className="text-sm font-semibold text-red-700 text-center">
                    {revoked ? 'You revoked this share — no one can access it.' : 'This link has expired.'}
                  </p>
                </div>
              )}

              {/* Link copy */}
              <div className="flex gap-2">
                <Input value={activeShare.shareUrl} readOnly disabled={expired || revoked}
                  className={`text-xs border-slate-300 rounded-sm flex-1 ${expired || revoked ? 'opacity-40 line-through' : 'bg-slate-50'}`}
                />
                <Button onClick={copyLink} disabled={expired || revoked} variant="outline"
                  className="shrink-0 border-[#003580] text-[#003580] rounded-sm hover:bg-blue-50 disabled:opacity-40"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-[#138808]" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Permission label */}
              {!expired && !revoked && activeShare.permission && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f4fa] border border-[#c8d4e8] rounded-sm">
                  {activeShare.permission === 'view' && <Eye className="h-3.5 w-3.5 text-[#003580] shrink-0" />}
                  {activeShare.permission === 'download_watermark' && <Download className="h-3.5 w-3.5 text-[#003580] shrink-0" />}
                  {activeShare.permission === 'download_clean' && <Sparkles className="h-3.5 w-3.5 text-[#003580] shrink-0" />}
                  <p className="text-xs text-slate-700">
                    <strong>Permission:</strong>{' '}
                    {activeShare.permission === 'view' && 'View Only (watermarked, no download)'}
                    {activeShare.permission === 'download_watermark' && 'Download with Watermark allowed'}
                    {activeShare.permission === 'download_clean' && 'Download without Watermark allowed'}
                  </p>
                </div>
              )}

              {/* PIN reminder */}
              {!expired && !revoked && (
                <div className="p-3 bg-[#e8f5e9] border-l-4 border-[#138808]">
                  <p className="text-xs text-[#1b5e20]">
                    <strong>PIN reminder:</strong> The PIN you set is <strong>{'•'.repeat(activeShare.pinLength)}</strong> ({activeShare.pinLength} digits).
                    Share it separately from the QR link. Closing this dialog keeps the link active.
                  </p>
                </div>
              )}

              {/* Revoke button */}
              {!expired && !revoked && (
                !confirmRevoke ? (
                  <button onClick={() => setConfirmRevoke(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors"
                  >
                    <StopCircle className="h-3.5 w-3.5" /> Revoke Access Now
                  </button>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700 font-semibold">
                        Immediately block all access? Anyone currently viewing will lose access too.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleRevoke} disabled={revoking}
                        className="flex-1 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-sm disabled:opacity-60"
                      >
                        {revoking ? 'Revoking…' : 'Yes, Revoke Now'}
                      </button>
                      <button onClick={() => setConfirmRevoke(false)}
                        className="flex-1 py-1.5 text-xs font-semibold border border-slate-300 rounded-sm hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Create new share after expiry/revoke */}
              {(expired || revoked) && (
                <button
                  onClick={() => { setActiveShare(null); setExpired(false); setRevoked(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#003580] border border-[#003580] rounded-sm hover:bg-blue-50 transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5" /> Create New Share Link
                </button>
              )}

              <Button onClick={handleClose} variant="outline" className="w-full border-slate-300 rounded-sm text-sm">
                {expired || revoked ? 'Close' : 'Close (link stays active)'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
