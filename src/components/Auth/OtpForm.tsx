import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type OtpStep = 'email' | 'verify';

export default function OtpForm() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [step, setStep] = useState<OtpStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setStep('verify');
        toast.success(`OTP sent to ${email}`);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length) {
      const next = paste.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(next);
      inputRefs.current[Math.min(paste.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length < 6) {
      toast.error('Please enter the full 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        toast.error(error.message === 'Token has expired or is invalid'
          ? 'Invalid or expired OTP. Please request a new one.'
          : error.message);
      } else {
        toast.success('Signed in successfully!');
        navigate('/dashboard');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) toast.error(error.message);
      else {
        setOtp(['', '', '', '', '', '']);
        toast.success('New OTP sent!');
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-fit p-3 bg-blue-50 rounded-xl">
            <ShieldCheck className="h-6 w-6 text-[#0B3D91]" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('auth.otp_enter')}<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-lg border border-border/30 bg-input/50 backdrop-blur-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full bg-[#0B3D91] hover:bg-[#082c6c] text-white"
          size="lg"
          disabled={isLoading || otp.join('').length < 6}
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('auth.verifying')}</>
            : t('auth.verify_sign_in')}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); }}
            className="text-muted-foreground hover:text-[#0B3D91] transition-colors"
          >
            {t('auth.change_email')}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="text-[#0B3D91] hover:underline underline-offset-2 disabled:opacity-50"
          >
            {t('auth.resend_otp')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-fit p-3 bg-blue-50 rounded-xl">
          <Mail className="h-6 w-6 text-[#0B3D91]" />
        </div>
        <p className="text-sm text-muted-foreground">{t('auth.otp_subtitle')}</p>
      </div>

      <div>
        <Label htmlFor="otp-email" className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-[#0B3D91]" />
          <span>{t('auth.email')}</span>
        </Label>
        <Input
          id="otp-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]"
          placeholder="your.email@example.com"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-[#0B3D91] hover:bg-[#082c6c] text-white"
        size="lg"
        disabled={isLoading}
      >
        {isLoading
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('auth.sending')}</>
          : <><ArrowRight className="h-4 w-4 mr-2" /> {t('auth.send_otp')}</>}
      </Button>
    </form>
  );
}
