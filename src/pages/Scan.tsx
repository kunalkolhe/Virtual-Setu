import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine, Camera, Link2, AlertTriangle, ShieldCheck, Info, X } from 'lucide-react';

export default function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const handleResult = (raw: string) => {
    stop();
    try {
      const url = new URL(raw);
      if (url.origin === window.location.origin) {
        navigate(url.pathname + url.search);
        return;
      }
      window.location.href = raw;
    } catch {
      // Not a URL — try treating as user ID
      navigate(`/i/${raw}`);
    }
  };

  const start = async () => {
    setError(null);
    if (!('BarcodeDetector' in window)) {
      setError(
        'Your browser does not support live QR scanning. Please use the manual link option below or try Chrome / Edge on Android.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-ignore
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      setScanning(true);
      tick();
    } catch (e: any) {
      setError(e?.message || 'Could not access camera. Please allow camera permission and try again.');
    }
  };

  const tick = async () => {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes && codes.length > 0 && codes[0].rawValue) {
        handleResult(codes[0].rawValue);
        return;
      }
    } catch {
      /* swallow - try next frame */
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    handleResult(manual.trim());
  };

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="Citizen Services · Verify Document"
        title="Scan QR or Open Shared Link"
        subtitle="Scan a Virtual Setu QR code with your camera, or paste a shared link to access view-only documents."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GovCard className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ScanLine className="h-4 w-4 text-[#0B3D91]" />
            <p className="text-sm font-semibold text-slate-800">Live Camera Scanner</p>
          </div>

          <div className="mt-4 relative bg-slate-900 rounded overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${scanning ? 'block' : 'hidden'}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {!scanning && (
              <div className="text-center text-slate-300 px-6">
                <Camera className="h-10 w-10 mx-auto mb-2 opacity-70" />
                <p className="text-sm">Camera preview will appear here</p>
                <p className="text-xs text-slate-400 mt-1">Allow camera permission when prompted</p>
              </div>
            )}

            {scanning && (
              <>
                <div className="absolute inset-10 border-2 border-white/80 rounded-lg pointer-events-none" />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-[11px] flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Scanning…
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 rounded border border-amber-200 bg-amber-50 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!scanning ? (
              <Button onClick={start} className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                <Camera className="h-4 w-4 mr-2" /> Start Scanner
              </Button>
            ) : (
              <Button onClick={stop} variant="outline" className="border-slate-300">
                <X className="h-4 w-4 mr-2" /> Stop Scanner
              </Button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-[#0B3D91]" />
              <p className="text-sm font-semibold text-slate-800">Or paste a shared link</p>
            </div>
            <form onSubmit={submitManual} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="https://virtualsetu.in/i/..."
                className="bg-white border-slate-300 focus:border-[#0B3D91]"
              />
              <Button type="submit" className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                Open
              </Button>
            </form>
          </div>
        </GovCard>

        <div className="space-y-4">
          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-[#138808]" />
              <p className="font-semibold text-slate-900 text-sm">Privacy &amp; Security</p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Camera frames are processed entirely on this device.</li>
              <li>Nothing is uploaded until a valid QR is detected.</li>
              <li>Shared documents are PIN-protected and view-only.</li>
            </ul>
          </GovCard>

          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">How to scan</p>
            </div>
            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Click <span className="font-medium">Start Scanner</span> and allow camera access.</li>
              <li>Hold the QR code steady within the frame.</li>
              <li>Once detected, you'll be redirected to enter the access PIN.</li>
            </ol>
            <p className="text-[11px] text-slate-500 mt-2">
              Live scanning works best on Chrome or Edge (Android &amp; desktop).
            </p>
          </GovCard>
        </div>
      </section>
    </GovLayout>
  );
}
