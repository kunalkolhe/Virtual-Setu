import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GovLayout, { GovCard } from '@/components/GovLayout';
import {
  ShieldCheck,
  QrCode,
  FileText,
  Lock,
  CheckCircle,
  ArrowRight,
  ScanLine,
  IdCard,
  HelpCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

const announcements = [
  { date: '23 Apr 2026', text: 'New: Secure document viewer with anti-screenshot protection now live.' },
  { date: '15 Apr 2026', text: 'Premium plan introduced with full AI assistant and emergency QR sharing.' },
  { date: '02 Apr 2026', text: 'Two-factor login via OTP is now available for all citizens.' },
];

export default function Index() {
  const { t } = useTranslation('common');

  const services = [
    { icon: IdCard,      title: t('index.services_s1_title', 'Digital Identity Card'),  description: t('index.services_s1_desc', 'Generate a unified digital identity card that aggregates your essential government IDs.'), to: '/dashboard' },
    { icon: FileText,    title: t('index.services_s2_title', 'Document Vault'),          description: t('index.services_s2_desc', 'Securely upload and store Aadhaar, PAN, Driving Licence, Passport and other certificates.'), to: '/dashboard' },
    { icon: QrCode,      title: t('index.services_s3_title', 'Emergency QR Access'),     description: t('index.services_s3_desc', 'Share documents during emergencies through a PIN-protected, time-limited QR code.'), to: '/scan' },
    { icon: ShieldCheck, title: t('index.services_s4_title', 'AI-Verified Records'),     description: t('index.services_s4_desc', 'AI-assisted verification keeps your records authentic with live status indicators.'), to: '/features' },
  ];

  return (
    <GovLayout>

      {/* ── Hero banner — government portal style ── */}
      <section className="bg-[#003580] text-white">
        <div className="container mx-auto max-w-7xl px-4 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-sm mb-4">
              <ShieldCheck className="h-3.5 w-3.5 text-[#FF9933]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-blue-100">{t('index.badge')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
              {t('index.hero_title')}<br />
              <span className="text-[#FF9933]">{t('index.hero_title2')}</span>
            </h1>
            <p className="text-blue-200 mt-4 max-w-xl leading-relaxed text-sm">
              {t('index.hero_subtitle')}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/register"
                className="inline-flex items-center gap-2 bg-[#FF6200] hover:bg-[#d94f00] text-white px-5 py-2.5 rounded-sm font-semibold text-sm transition-colors"
              >
                <ScanLine className="h-4 w-4" /> {t('index.register_btn')}
              </Link>
              <Link to="/auth"
                className="inline-flex items-center gap-2 border border-white/40 text-white px-5 py-2.5 rounded-sm font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                {t('index.login_btn')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-100">
              {[
                '256-bit encrypted document storage',
                'PIN-protected emergency QR sharing',
                'AI-assisted document verification',
                'WCAG 2.1 AA accessible portal',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#4caf50] mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick-access panel */}
          <div className="bg-white rounded-sm border border-blue-200 overflow-hidden shadow-lg">
            <div className="bg-[#002060] px-4 py-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#FF9933]" />
              <p className="text-sm font-semibold text-white">Quick Citizen Services</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { icon: ScanLine, label: 'Verify via QR', to: '/scan' },
                { icon: IdCard, label: 'Citizen Login', to: '/auth' },
                { icon: FileText, label: 'My Dashboard', to: '/dashboard' },
                { icon: HelpCircle, label: 'Help & Support', to: '/help' },
              ].map(({ icon: Icon, label, to }) => (
                <Link key={label} to={to}
                  className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm hover:border-[#003580] hover:bg-blue-50/80 transition-colors bg-blue-50"
                >
                  <Icon className="h-5 w-5 text-[#003580] shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                </Link>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="p-3 rounded-sm bg-[#fff8e1] border border-[#ffe082] flex items-start gap-2">
                <Lock className="h-4 w-4 text-[#795548] mt-0.5 shrink-0" />
                <p className="text-xs text-[#5d4037]">
                  All actions are PIN-verified and encrypted. We never share your personal data with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Saffron accent bottom strip */}
        <div className="h-1 bg-[#FF6200]/80" />
      </section>

      {/* ── Important Notice ── */}
      <div className="bg-[#fff8e1] border-y border-[#ffe082]">
        <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 text-sm text-[#795548]">
          <AlertCircle className="h-4 w-4 text-[#f9a825] shrink-0" />
          <p>
            <strong>Notice:</strong> {t('index.notice')} <strong>1800-XXX-XXXX</strong>.
          </p>
        </div>
      </div>

      {/* ── Services section ── */}
      <section className="container mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
          <div className="border-l-4 border-[#003580] pl-3">
            <p className="text-[11px] font-bold text-[#003580] tracking-[0.2em] uppercase">{t('index.services_badge')}</p>
            <h2 className="text-xl font-bold text-slate-900">{t('index.services_title')}</h2>
          </div>
          <Link to="/features" className="text-sm text-[#003580] hover:underline font-medium flex items-center gap-1">
            {t('index.view_all')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((s) => (
            <Link key={s.title} to={s.to}>
              <GovCard className="p-4 h-full hover:border-[#003580] hover:shadow-md transition-all group">
                <div className="p-2 rounded-sm bg-[#e8eef8] text-[#003580] w-fit mb-3 group-hover:bg-[#003580] group-hover:text-white transition-colors">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{s.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>
                <p className="text-xs text-[#003580] font-semibold mt-2 flex items-center gap-1">
                  Access Service <ChevronRight className="h-3 w-3" />
                </p>
              </GovCard>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works + Announcements ── */}
      <section className="container mx-auto max-w-7xl px-4 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* How it works */}
        <GovCard className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-slate-100 bg-[#f0f4fa]">
            <div className="border-l-4 border-[#003580] pl-2">
              <h3 className="font-bold text-slate-900 text-sm">{t('index.how_title')}</h3>
              <p className="text-[11px] text-slate-500">{t('index.how_subtitle')}</p>
            </div>
          </div>
          <ol className="divide-y divide-slate-100">
            {[
              { n: 1, title: t('index.step1_title'), desc: t('index.step1_desc') },
              { n: 2, title: t('index.step2_title'), desc: t('index.step2_desc') },
              { n: 3, title: t('index.step3_title'), desc: t('index.step3_desc') },
            ].map((s) => (
              <li key={s.n} className="flex gap-4 px-4 py-4">
                <div className="w-8 h-8 rounded-sm bg-[#003580] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-[#003580] hover:bg-[#002060] text-white text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
            >
              {t('index.start_btn')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </GovCard>

        {/* Announcements */}
        <GovCard>
          <div className="px-4 py-3 border-b border-slate-100 bg-[#f0f4fa]">
            <div className="border-l-4 border-[#FF6200] pl-2">
              <h3 className="font-bold text-slate-900 text-sm">{t('index.announcements_title')}</h3>
              <p className="text-[11px] text-slate-500">{t('index.announcements_subtitle')}</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {announcements.map((a, i) => (
              <li key={i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <p className="text-[10px] font-semibold text-[#003580] uppercase tracking-wide">{a.date}</p>
                <p className="text-xs text-slate-800 mt-0.5 leading-relaxed">{a.text}</p>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <Link to="/features" className="text-xs text-[#003580] hover:underline font-medium flex items-center gap-1">
              {t('index.view_all')} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </GovCard>
      </section>
    </GovLayout>
  );
}
