import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Lock, User, Phone, Shield, Eye, EyeOff, Loader2,
  Upload, CheckCircle, XCircle, CreditCard, ScanLine, Camera, RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { scanAndVerifyAadhaar, AadhaarScanResult } from '@/lib/aadhaarVerification';

interface SignupFormProps { onSuccess?: () => void; }
type Step = 'info' | 'aadhaar' | 'done';
type ScanState = 'idle' | 'scanning' | 'verified' | 'failed';
type PhotoMode = 'upload' | 'camera';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* Resize + compress to 240×300 JPEG data-URL (≈ 20–40 KB) */
async function compressPhoto(source: HTMLImageElement | HTMLVideoElement, isVideo = false): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 240, 300);
  const srcW = isVideo ? (source as HTMLVideoElement).videoWidth  : (source as HTMLImageElement).naturalWidth;
  const srcH = isVideo ? (source as HTMLVideoElement).videoHeight : (source as HTMLImageElement).naturalHeight;
  const srcAr = srcW / srcH;
  const dstAr = 240 / 300;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  if (srcAr > dstAr) { sw = srcH * dstAr; sx = (srcW - sw) / 2; }
  else               { sh = srcW / dstAr;  sy = (srcH - sh) / 2; }
  ctx.drawImage(source as CanvasImageSource, sx, sy, sw, sh, 0, 0, 240, 300);
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function compressFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => { resolve(await compressPhoto(img)); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const { t } = useTranslation('common');
  const { signUp } = useAuth();
  const [step, setStep] = useState<Step>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<AadhaarScanResult | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);

  /* Photo state */
  const [photoMode, setPhotoMode] = useState<PhotoMode>('upload');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const photoInputRef  = useRef<HTMLInputElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    password: '', confirmPassword: '', pin: '',
    aadhaarNumber: '', bloodGroup: '',
  });

  /* Stop camera stream on unmount */
  useEffect(() => () => { stopCamera(); }, []);

  /* Restart camera when facingMode changes */
  useEffect(() => {
    if (cameraActive) startCamera();
  }, [facingMode]); // eslint-disable-line

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 900 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : 'Could not access camera. Please try uploading a photo instead.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const handleSwitchToCamera = () => {
    setPhotoMode('camera');
    startCamera();
  };

  const handleSwitchToUpload = () => {
    stopCamera();
    setPhotoMode('upload');
    setCameraError(null);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !cameraActive) return;
    try {
      const dataUrl = await compressPhoto(videoRef.current, true);
      setPhotoDataUrl(dataUrl);
      setPhotoPreview(dataUrl);
      stopCamera();
      setPhotoMode('upload'); /* switch to preview mode */
    } catch { toast.error('Could not capture photo, try again.'); }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be smaller than 10MB'); return; }
    setPhotoPreview(URL.createObjectURL(file));
    try { setPhotoDataUrl(await compressFile(file)); }
    catch { toast.error('Could not process photo'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'aadhaarNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 12);
      const formatted = digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(' '));
      setForm(p => ({ ...p, aadhaarNumber: formatted }));
      if (scanState !== 'idle') { setScanState('idle'); setScanResult(null); }
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be smaller than 10MB'); return; }
    setAadhaarFile(file);
    setAadhaarPreview(URL.createObjectURL(file));
    setScanState('idle'); setScanResult(null);
  };

  const handleInfoNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) { toast.error('Please upload or capture your photo'); return; }
    if (!form.bloodGroup) { toast.error('Please select your blood group'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) { toast.error('PIN must be exactly 4 digits'); return; }
    setStep('aadhaar');
  };

  const handleScanAadhaar = async () => {
    if (!aadhaarFile) { toast.error('Please upload your Aadhaar card image'); return; }
    const digits = form.aadhaarNumber.replace(/\D/g, '');
    if (digits.length !== 12) { toast.error('Please enter your complete 12-digit Aadhaar number'); return; }
    setScanState('scanning'); setScanResult(null);
    const result = await scanAndVerifyAadhaar(aadhaarFile, form.fullName, digits);
    setScanResult(result);
    setScanState(result.success ? 'verified' : 'failed');
    if (!result.success) toast.error(result.error || 'Aadhaar verification failed');
  };

  const handleFinalSubmit = async () => {
    if (!scanResult?.success) { toast.error('Please verify your Aadhaar first'); return; }
    setIsLoading(true);
    try {
      const { error } = await signUp(form.email, form.password, {
        full_name: form.fullName, phone: form.phone, pin: form.pin,
        blood_group: form.bloodGroup, photo_url: photoDataUrl,
        aadhaar_number: scanResult.extractedAadhaar,
        aadhaar_hash: scanResult.aadhaarHash,
        aadhaar_address: scanResult.extractedAddress,
        aadhaar_dob: scanResult.extractedDob,
        aadhaar_verified: true,
      });
      if (error) { toast.error(error.message); }
      else { setStep('done'); onSuccess?.(); }
    } catch { toast.error('An unexpected error occurred'); }
    finally { setIsLoading(false); }
  };

  if (step === 'done') {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="mx-auto w-fit p-3 bg-green-50 rounded-xl">
          <CheckCircle className="h-8 w-8 text-[#138808]" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Account Created!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a verification link to <strong>{form.email}</strong>.<br />
            Click it to activate your Aadhaar-verified account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-2">
        {(['info', 'aadhaar'] as const).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              step === s ? 'bg-[#0B3D91] text-white' :
              (step === 'aadhaar' && s === 'info') ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {step === 'aadhaar' && s === 'info'
                ? <CheckCircle className="h-3 w-3" />
                : <span className="w-3.5 h-3.5 flex items-center justify-center">{i + 1}</span>}
              {s === 'info' ? 'Basic Info' : 'Aadhaar Verify'}
            </div>
            {i === 0 && <div className="flex-1 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Basic Info ── */}
      {step === 'info' && (
        <form onSubmit={handleInfoNext} className="space-y-4">

          {/* ── Photo section ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#0B3D91]" />
                <span>Your Photo</span>
                <span className="text-red-500 text-xs">*required</span>
              </Label>
              {/* mode toggle */}
              <div className="flex rounded overflow-hidden border border-slate-300 text-xs">
                <button type="button"
                  onClick={handleSwitchToUpload}
                  className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${photoMode === 'upload' ? 'bg-[#0B3D91] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <Upload className="h-3 w-3" /> Upload
                </button>
                <button type="button"
                  onClick={handleSwitchToCamera}
                  className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${photoMode === 'camera' ? 'bg-[#0B3D91] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <Camera className="h-3 w-3" /> Selfie
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Front-facing photo — will appear on your Digital ID card.
            </p>

            {/* ── Camera mode ── */}
            {photoMode === 'camera' && (
              <div className="border-2 border-[#0B3D91] rounded-lg overflow-hidden bg-black">
                {cameraError ? (
                  <div className="p-4 text-center text-sm text-red-600 bg-red-50">{cameraError}</div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay playsInline muted
                      className="w-full block"
                      style={{ maxHeight: 220, objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                    />
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 gap-2">
                      <button type="button" onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
                        className="text-slate-300 hover:text-white text-xs flex items-center gap-1">
                        <RefreshCcw className="h-3.5 w-3.5" /> Flip
                      </button>
                      <button type="button" onClick={handleCapture}
                        className="w-12 h-12 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0" />
                      <span className="text-xs text-slate-400 w-12 text-right">Tap ●</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Upload mode ── */}
            {photoMode === 'upload' && (
              <>
                <input ref={photoInputRef} type="file" accept="image/*" capture="user"
                  onChange={handlePhotoFileChange} className="hidden" />
                <div onClick={() => photoInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-lg transition-colors flex items-center gap-4 p-3 ${
                    photoDataUrl ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50 hover:border-[#0B3D91] hover:bg-blue-50'
                  }`}>
                  {photoPreview
                    ? <>
                        <img src={photoPreview} alt="Your photo" className="w-14 h-[70px] object-cover rounded border border-slate-300 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700">✓ Photo selected</p>
                          <p className="text-xs text-slate-500 mt-0.5">Click to change</p>
                        </div>
                      </>
                    : <div className="flex flex-col items-center justify-center gap-1 py-3 w-full">
                        <Camera className="h-7 w-7 text-slate-400" />
                        <p className="text-sm text-slate-600">Click to upload photo</p>
                        <p className="text-xs text-slate-400">JPG or PNG — max 10MB</p>
                      </div>
                  }
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="signup-name" className="flex items-center space-x-2">
                <User className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.full_name')}</span>
              </Label>
              <Input id="signup-name" name="fullName" type="text" required autoComplete="name"
                value={form.fullName} onChange={handleChange}
                className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" placeholder="Rahul Sharma" />
            </div>
            <div>
              <Label htmlFor="signup-email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.email')}</span>
              </Label>
              <Input id="signup-email" name="email" type="email" required autoComplete="email"
                value={form.email} onChange={handleChange}
                className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" placeholder="your.email@example.com" />
            </div>
            <div>
              <Label htmlFor="signup-phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.phone')}</span>
              </Label>
              <Input id="signup-phone" name="phone" type="tel" required autoComplete="tel"
                value={form.phone} onChange={handleChange}
                className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" placeholder="+91 98765 43210" />
            </div>

            {/* Blood group */}
            <div className="sm:col-span-2">
              <Label htmlFor="signup-blood" className="flex items-center gap-1.5 text-sm font-medium mb-1">
                <span>🩸</span> Blood Group
                <span className="text-red-500 text-xs">*required</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(p => ({ ...p, bloodGroup: g }))}
                    className={`py-2 rounded-md border text-sm font-semibold transition-all ${
                      form.bloodGroup === g
                        ? 'bg-[#0B3D91] text-white border-[#0B3D91] shadow-md scale-[1.04]'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-[#0B3D91] hover:text-[#0B3D91]'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="signup-password" className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.password')}</span>
              </Label>
              <div className="relative mt-1">
                <Input id="signup-password" name="password" type={showPassword ? 'text' : 'password'}
                  required autoComplete="new-password" value={form.password} onChange={handleChange}
                  className="bg-white border-slate-300 focus:border-[#0B3D91] pr-10" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="signup-confirm" className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.confirm_password')}</span>
              </Label>
              <Input id="signup-confirm" name="confirmPassword" type="password" required autoComplete="new-password"
                value={form.confirmPassword} onChange={handleChange}
                className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" placeholder="Re-enter password" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="signup-pin" className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-[#0B3D91]" /><span>{t('auth.pin_label')}</span>
              </Label>
              <Input id="signup-pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]*"
                required maxLength={4} value={form.pin} onChange={handleChange}
                className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91] tracking-widest text-center text-lg"
                placeholder="••••" />
              <p className="text-xs text-muted-foreground mt-1">{t('auth.pin_hint')}</p>
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#0B3D91] hover:bg-[#082c6c] text-white" size="lg">
            Continue to Aadhaar Verification →
          </Button>
        </form>
      )}

      {/* ── STEP 2: Aadhaar Verification ── */}
      {step === 'aadhaar' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>Why Aadhaar is required:</strong> We verify your identity to prevent duplicate accounts. Your Aadhaar details are stored securely and never shared.
          </div>
          <div>
            <Label htmlFor="aadhaar-number" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-[#0B3D91]" />
              <span>Aadhaar Number / आधार संख्या</span>
              <span className="text-red-500 text-xs">*required</span>
            </Label>
            <Input id="aadhaar-number" name="aadhaarNumber" type="text" inputMode="numeric"
              value={form.aadhaarNumber} onChange={handleChange}
              className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91] tracking-widest font-mono text-center text-base"
              placeholder="XXXX XXXX XXXX" maxLength={14} />
          </div>
          <div>
            <Label className="flex items-center space-x-2">
              <Upload className="h-4 w-4 text-[#0B3D91]" />
              <span>Upload Aadhaar Card Image</span>
              <span className="text-red-500 text-xs">*required</span>
            </Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()}
              className={`mt-1 cursor-pointer border-2 border-dashed rounded-lg transition-colors ${
                aadhaarPreview ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50 hover:border-[#0B3D91] hover:bg-blue-50'
              }`}>
              {aadhaarPreview
                ? <div className="relative p-2">
                    <img src={aadhaarPreview} alt="Aadhaar preview" className="w-full h-32 object-contain rounded" />
                    <p className="text-center text-xs text-green-700 mt-1 font-medium">✓ {aadhaarFile?.name}</p>
                  </div>
                : <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <p className="text-sm text-slate-600">Click to upload Aadhaar card photo</p>
                    <p className="text-xs text-slate-400">JPG, PNG — max 10MB</p>
                  </div>
              }
            </div>
          </div>

          {scanState === 'verified' && scanResult?.success && (
            <div className="p-3 bg-green-50 border border-green-300 rounded-lg space-y-1">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                <CheckCircle className="h-4 w-4" /> Aadhaar Verified Successfully
              </div>
              {scanResult.extractedName && <p className="text-xs text-green-700">Name matched: <strong>{scanResult.extractedName}</strong></p>}
              {scanResult.extractedDob  && <p className="text-xs text-green-700">DOB: <strong>{scanResult.extractedDob}</strong></p>}
              {scanResult.extractedAddress && <p className="text-xs text-green-700">Address detected ✓</p>}
            </div>
          )}
          {scanState === 'failed' && scanResult && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm"><XCircle className="h-4 w-4" /> Verification Failed</div>
              <p className="text-xs text-red-600 mt-1">{scanResult.error}</p>
            </div>
          )}

          <Button type="button" onClick={handleScanAadhaar}
            disabled={scanState === 'scanning' || !aadhaarFile}
            variant="outline" className="w-full border-[#0B3D91] text-[#0B3D91] hover:bg-blue-50" size="lg">
            {scanState === 'scanning'
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning Aadhaar Card...</>
              : scanState === 'verified'
              ? <><CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Re-scan Aadhaar</>
              : <><ScanLine className="h-4 w-4 mr-2" /> Scan & Verify Aadhaar</>}
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('info')} className="flex-1">← Back</Button>
            <Button type="button" onClick={handleFinalSubmit}
              disabled={scanState !== 'verified' || isLoading}
              className="flex-1 bg-[#0B3D91] hover:bg-[#082c6c] text-white" size="lg">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</> : 'Create Account'}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">🔒 Your Aadhaar number is hashed and never stored in plain text</p>
        </div>
      )}
    </div>
  );
}
