import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, RotateCcw, CheckCircle2 } from 'lucide-react';
import QRCode from '@/components/QRCode';

interface DigitalIDCardProps {
  name: string;
  phone: string;
  userId: string;
  memberSince?: string;
  shareUrl?: string;
  aadhaarMasked?: string;
  aadhaarAddress?: string;
  dob?: string;
  aadhaarVerified?: boolean;
  photoUrl?: string;
  bloodGroup?: string;
  _forceFlipped?: boolean;
}

/* ISO ID-1 = 85.6 × 54 mm  →  480 × 302 px */
const W = 480;
const H = 302;

const SAFFRON = '#FF9933';
const GREEN   = '#138808';
const NAVY    = '#003580';
const BLUE    = '#0047ab';
const WHITE   = '#FFFFFF';

function Tricolor() {
  return (
    <div style={{ display: 'flex', height: 4, width: '100%', flexShrink: 0 }}>
      <div style={{ flex: 1, background: SAFFRON }} />
      <div style={{ flex: 1, background: WHITE, borderTop: '0.5px solid #dde3ea', borderBottom: '0.5px solid #dde3ea' }} />
      <div style={{ flex: 1, background: GREEN }} />
    </div>
  );
}

function Header() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 12px', flexShrink: 0,
      background: `linear-gradient(90deg, ${NAVY} 0%, ${BLUE} 100%)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src="/emblem-india-clean.png" alt="Emblem of India"
          style={{ width: 28, height: 34, objectFit: 'contain', flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
        <div>
          <p style={{ color: WHITE, fontWeight: 800, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Virtual Setu</p>
          <p style={{ color: '#93c5fd', fontSize: 6, letterSpacing: '0.04em', margin: '2px 0 0 0', lineHeight: 1 }}>Digital Identity Authority of India</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ color: '#bfdbfe', fontSize: 6, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Government of India</p>
        <p style={{ color: WHITE, fontSize: 8, fontWeight: 700, margin: '2px 0 0 0', lineHeight: 1 }}>भारत सरकार</p>
      </div>
    </div>
  );
}

/* Silhouette placeholder — shown when no photo uploaded */
function PhotoPlaceholder({ w, h, stretch }: { w: number; h: number; stretch?: boolean }) {
  return (
    <div style={{
      width: stretch ? '100%' : w,
      height: stretch ? '100%' : h,
      borderRadius: 6, flexShrink: 0,
      background: '#d8e4ef',
      border: '1.5px solid #93aec8',
      overflow: 'hidden', position: 'relative',
    }}>
      <svg viewBox="0 0 92 116" preserveAspectRatio="xMidYMax meet"
        style={{ display: 'block', position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%' }}>
        <path d="M-4,116 C-4,116 8,74 46,72 C84,72 96,116 96,116 Z" fill="#5a7a99" />
        <rect x="37" y="57" width="18" height="18" rx="3" fill="#5a7a99" />
        <ellipse cx="46" cy="40" rx="22" ry="24" fill="#5a7a99" />
        <ellipse cx="24" cy="42" rx="4" ry="5.5" fill="#5a7a99" />
        <ellipse cx="68" cy="42" rx="4" ry="5.5" fill="#5a7a99" />
      </svg>
    </div>
  );
}

export default function DigitalIDCard({
  name, phone, userId, memberSince, shareUrl,
  aadhaarMasked, aadhaarAddress, dob, aadhaarVerified,
  photoUrl, bloodGroup, _forceFlipped,
}: DigitalIDCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef  = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(_forceFlipped ?? false);

  React.useEffect(() => {
    if (_forceFlipped !== undefined) setFlipped(_forceFlipped);
  }, [_forceFlipped]);

  const qrData         = shareUrl || `${window.location.origin}/i/${userId}`;
  const shortId        = userId.slice(0, 8).toUpperCase();

  /* Format 12 digits as "XXXX XXXX XXXX", or show as-is if already formatted */
  function formatAadhaar(raw?: string): string {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 12) return `${digits.slice(0,4)} ${digits.slice(4,8)} ${digits.slice(8)}`;
    return raw;
  }
  const displayAadhaar = formatAadhaar(aadhaarMasked);

  const CARD: React.CSSProperties = {
    width: W, height: H, borderRadius: 12,
    border: '1px solid #b0c4de',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    position: 'absolute', top: 0, left: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    overflow: 'hidden', userSelect: 'none',
    display: 'flex', flexDirection: 'column',
  };

  const handleDownload = async (ref: React.RefObject<HTMLDivElement>, side: string) => {
    if (!ref.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const el = ref.current;
      const prev = el.style.transform;
      if (side === 'back') el.style.transform = 'rotateY(0deg)';
      const url = await toPng(el, { pixelRatio: 4, cacheBust: true });
      if (side === 'back') el.style.transform = prev;
      const a = document.createElement('a');
      a.download = `VirtualSetu_ID_${side}_${shortId}.png`;
      a.href = url; a.click();
    } catch (e) { console.error(e); }
  };

  const PH = 116;  /* photo height */
  const PW = 92;   /* photo width  */

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ width: W, height: H, perspective: 1400, cursor: 'pointer' }}
           onClick={() => setFlipped(f => !f)}>
        <div style={{
          width: '100%', height: '100%', position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* ══════════════ FRONT ══════════════ */}
          <div ref={frontRef} style={{
            ...CARD,
            background: 'linear-gradient(150deg, #f0f6ff 0%, #e4eefa 60%, #d6e8f7 100%)',
          }}>
            <Tricolor />
            <Header />

            {/* thin separator with "DIGITAL IDENTITY CARD" label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 13px', flexShrink: 0, height: 14,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,53,128,0.12)' }} />
              <span style={{ fontSize: 5.5, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#5b7fa6', whiteSpace: 'nowrap' }}>Digital Identity Card</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,53,128,0.12)' }} />
            </div>

            {/* ── Body: photo | fields | QR ── */}
            <div style={{ flex: 1, display: 'flex', gap: 10, padding: '6px 13px 6px 13px', minHeight: 0, alignItems: 'center' }}>

              {/* LEFT — fixed portrait photo */}
              <div style={{ flexShrink: 0 }}>
                {photoUrl
                  ? <img src={photoUrl} alt={name} style={{ width: 105, height: 130, objectFit: 'cover', objectPosition: 'center top', borderRadius: 6, border: '1.5px solid #93aec8', display: 'block' }} />
                  : <PhotoPlaceholder w={105} h={130} />
                }
              </div>

              {/* MIDDLE — 5 fields spread across exactly photo height */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 130, minWidth: 0 }}>

                {/* Name */}
                <div>
                  <p style={{ fontSize: 5, color: '#7a92a8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0, lineHeight: 1 }}>Name / नाम</p>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: '1.5px 0 0 0', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || '—'}</p>
                </div>

                {/* Blood Group */}
                <div>
                  <p style={{ fontSize: 5, color: '#7a92a8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0, lineHeight: 1 }}>Blood Group / रक्त समूह</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1.5 }}>
                    <span style={{ fontSize: 9 }}>🩸</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: bloodGroup ? '#dc2626' : '#94a3b8', letterSpacing: '0.04em', lineHeight: 1 }}>{bloodGroup || '—'}</span>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <p style={{ fontSize: 5, color: '#7a92a8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0, lineHeight: 1 }}>Date of Birth / जन्म तिथि</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: '#1e3a5f', margin: '1.5px 0 0 0', lineHeight: 1 }}>{dob || '—'}</p>
                </div>

                {/* Mobile */}
                <div>
                  <p style={{ fontSize: 5, color: '#7a92a8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0, lineHeight: 1 }}>Mobile / मोबाइल</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: '#1e3a5f', margin: '1.5px 0 0 0', lineHeight: 1 }}>{phone || '—'}</p>
                </div>

                {/* Enrolled */}
                <div>
                  <p style={{ fontSize: 5, color: '#7a92a8', textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0, lineHeight: 1 }}>Enrolled Since / नामांकन</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: '#1e3a5f', margin: '1.5px 0 0 0', lineHeight: 1 }}>{memberSince || '—'}</p>
                </div>

              </div>

              {/* RIGHT — QR code, top-aligned to match photo top */}
              <div style={{ height: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 4, flexShrink: 0 }}>
                <div style={{
                  padding: 5, background: WHITE, borderRadius: 7,
                  border: '2px solid #2563eb',
                  boxShadow: '0 2px 10px rgba(37,99,235,0.18)',
                }}>
                  <QRCode data={qrData} size={96} errorCorrectionLevel="M" />
                </div>
                <p style={{ fontSize: 5, color: '#5b7fa6', fontWeight: 600, textAlign: 'center', margin: 0, letterSpacing: '0.06em' }}>SCAN TO VERIFY</p>
              </div>
            </div>

            {/* ── Aadhaar number band ── */}
            <div style={{
              margin: '0 13px 5px 13px', padding: '5px 10px',
              borderRadius: 6, flexShrink: 0,
              background: 'rgba(0,53,128,0.07)', border: '1px solid rgba(0,53,128,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 5.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Aadhaar No / आधार संख्या</p>
                <p style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: 16, letterSpacing: '0.25em', color: NAVY, margin: '2px 0 0 0', lineHeight: 1 }}>
                  {displayAadhaar}
                </p>
              </div>
              {aadhaarVerified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 style={{ width: 11, height: 11, color: '#16a34a' }} />
                  <span style={{ fontSize: 7, color: '#15803d', fontWeight: 700 }}>Aadhaar Verified</span>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '3px 13px', flexShrink: 0,
              background: 'rgba(0,53,128,0.04)', borderTop: '1px solid rgba(0,53,128,0.09)',
            }}>
              <p style={{ fontSize: 5.5, color: '#94a3b8', margin: 0 }}>ID: VS-{shortId}</p>
              <p style={{ fontSize: 5.5, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Issued by Virtual Setu · भारत सरकार</p>
              <p style={{ fontSize: 5.5, color: '#94a3b8', margin: 0 }}>Click to view back →</p>
            </div>

            <Tricolor />
          </div>

          {/* ══════════════ BACK ══════════════ */}
          <div ref={backRef} style={{
            ...CARD,
            background: 'linear-gradient(150deg, #f0f6ff 0%, #e4eefa 60%, #d6e8f7 100%)',
            transform: 'rotateY(180deg)',
            position: 'relative',
          }}>
            {/* Watermark Ashoka Chakra */}
            <div style={{
              position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
              fontSize: 110, color: 'rgba(0,53,128,0.05)', lineHeight: 1,
              pointerEvents: 'none', userSelect: 'none', zIndex: 0,
            }}>☸</div>

            <Tricolor />
            <Header />

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '9px 14px 7px 14px', gap: 8, position: 'relative', zIndex: 1, minHeight: 0 }}>

              {/* Address block */}
              <div style={{
                background: 'rgba(0,53,128,0.05)', border: '1px solid rgba(0,53,128,0.13)',
                borderRadius: 7, padding: '7px 10px', flex: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 9 }}>📍</span>
                  <p style={{ fontSize: 5.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 }}>
                    Registered Address / पंजीकृत पता
                  </p>
                </div>
                <p style={{
                  fontSize: 9.5, color: '#1e3a5f', margin: 0, lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {aadhaarAddress || 'Address will appear here after Aadhaar verification is complete.'}
                </p>
              </div>

              {/* Bottom row: signature left, info right */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>

                {/* Signature */}
                <div>
                  <p style={{ fontSize: 13, color: NAVY, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.1 }}>Virtual Setu</p>
                  <div style={{ width: 110, height: 1, background: 'rgba(0,53,128,0.25)', margin: '4px 0 3px 0' }} />
                  <p style={{ fontSize: 6, color: '#475569', margin: 0, fontWeight: 600 }}>Authorised Signatory</p>
                  <p style={{ fontSize: 5.5, color: '#94a3b8', margin: '1px 0 0 0' }}>Digital Identity Authority of India</p>
                </div>

                {/* Right info stack */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {/* Validity badge */}
                  <div style={{
                    padding: '3px 9px', borderRadius: 20,
                    background: 'rgba(19,136,8,0.09)', border: '1px solid rgba(19,136,8,0.25)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                    <p style={{ fontSize: 7, color: '#15803d', fontWeight: 700, margin: 0, letterSpacing: '0.07em' }}>LIFETIME VALID</p>
                  </div>
                  {/* Member since */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 5.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Valid From</p>
                    <p style={{ fontSize: 9, color: NAVY, fontWeight: 700, margin: '1px 0 0 0', lineHeight: 1 }}>{memberSince || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '3px 13px', flexShrink: 0,
              background: 'rgba(0,53,128,0.05)', borderTop: '1px solid rgba(0,53,128,0.1)',
              position: 'relative', zIndex: 1,
            }}>
              <p style={{ fontSize: 5.5, color: '#94a3b8', margin: 0 }}>ID: VS-{shortId}</p>
              <p style={{ fontSize: 5.5, color: '#6b7280', margin: 0, fontStyle: 'italic' }}>यदि मिले तो निकटतम सरकारी कार्यालय में जमा करें</p>
              <p style={{ fontSize: 5.5, color: '#94a3b8', margin: 0 }}>virtualsetu.gov.in</p>
            </div>

            <Tricolor />
          </div>

        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <RotateCcw className="h-3 w-3" />
        Click the card to flip · Front shows Aadhaar number · Back shows registered address
      </p>

      <div className="flex gap-3 no-print">
        <Button onClick={() => window.print()} variant="outline" className="gap-2 border-slate-200">
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button onClick={() => handleDownload(flipped ? backRef : frontRef, flipped ? 'back' : 'front')}
          className="bg-gradient-to-r from-[#003580] to-[#0047ab] text-white gap-2 hover:opacity-90">
          <Download className="h-4 w-4" /> Download {flipped ? 'Back' : 'Front'}
        </Button>
      </div>
    </div>
  );
}
