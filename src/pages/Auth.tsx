import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/Auth/LoginForm';
import SignupForm from '@/components/Auth/SignupForm';
import OtpForm from '@/components/Auth/OtpForm';
import { Lock, ShieldCheck, Info } from 'lucide-react';

export default function Auth() {
  const { t } = useTranslation('common');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'login';

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <GovLayout minimal>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0B3D91] border-t-transparent" />
        </div>
      </GovLayout>
    );
  }

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb={t('auth.citizen_portal')}
        title={t('auth.citizen_access')}
        subtitle={t('auth.citizen_subtitle')}
      />

      <section className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GovCard className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Lock className="h-4 w-4 text-[#0B3D91]" />
            <p className="text-sm font-semibold text-slate-800">
              {t('auth.secure_auth')}
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded">
              <TabsTrigger value="login">{t('auth.sign_in')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.new_registration')}</TabsTrigger>
              <TabsTrigger value="otp">{t('auth.otp_login')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="pt-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="pt-6">
              <SignupForm />
            </TabsContent>
            <TabsContent value="otp" className="pt-6">
              <OtpForm />
            </TabsContent>
          </Tabs>

          <p className="text-xs text-slate-500 mt-6 leading-relaxed">
            {t('auth.tos')}
          </p>
        </GovCard>

        <div className="space-y-4">
          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-[#138808]" />
              <p className="font-semibold text-slate-900 text-sm">
                {t('auth.your_security')}
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>{t('auth.sec1')}</li>
              <li>{t('auth.sec2')}</li>
              <li>{t('auth.sec3')}</li>
              <li>{t('auth.sec4')}</li>
            </ul>
          </GovCard>

          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">
                {t('auth.need_help')}
              </p>
            </div>
            <p className="text-xs text-slate-600">
              {t('auth.help_text')}
            </p>
          </GovCard>
        </div>
      </section>
    </GovLayout>
  );
}
