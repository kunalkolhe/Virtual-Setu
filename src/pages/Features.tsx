import React from 'react';
import { Link } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Upload, CheckSquare, CreditCard, QrCode, Zap,
  Lock, FileText, Bell, Smartphone, Cloud, Users, ArrowRight,
} from 'lucide-react';

const coreFeatures = [
  { icon: ShieldCheck, title: 'Secure Authentication', description: 'Multi-layer security with 4-digit PIN protection, encrypted storage and OTP-based passwordless login.' },
  { icon: Upload, title: 'Smart Document Upload', description: 'AI-powered document type recognition automatically categorises Aadhaar, PAN, Passport and more as you upload.' },
  { icon: CheckSquare, title: 'Dynamic Checklists', description: 'Personalised document requirement checklists tailored to your life events — visa, job, education, banking and more.' },
  { icon: CreditCard, title: 'Virtual Smart Card', description: 'A unified digital identity card that aggregates all your essential government IDs in one place.' },
  { icon: QrCode, title: 'Emergency QR Access', description: 'Generate a secure QR code so trusted contacts can access view-only documents during emergencies.' },
  { icon: Zap, title: 'Instant Verification', description: 'Real-time document status tracking with verification indicators showing which documents are active and valid.' },
];

const advancedFeatures = [
  { icon: Lock, title: 'End-to-End Encryption', description: '256-bit AES encryption ensures only you can access your data.' },
  { icon: FileText, title: 'Multi-format Support', description: 'Upload PDFs, JPGs, PNGs and more — all stored securely.' },
  { icon: Bell, title: 'Expiry Reminders', description: 'Never miss a document renewal with automated alerts.' },
  { icon: Smartphone, title: 'Mobile-First Design', description: 'Fully responsive — use Virtual Setu on any device seamlessly.' },
  { icon: Cloud, title: 'Cloud Sync', description: 'Documents sync instantly across all your devices in real time.' },
  { icon: Users, title: 'Family Profiles', description: 'Manage documents for your entire family under one account (Platinum).' },
];

const stats = [
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '256-bit', label: 'AES Encryption' },
  { value: '5+', label: 'Document Types' },
  { value: '24/7', label: 'Secure Access' },
];

export default function Features() {
  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="Citizen Portal · Features"
        title="Portal Features"
        subtitle="A complete set of tools to manage, verify and share your government documents securely."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8">
        <GovCard className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-5 text-center">
              <div className="text-2xl font-bold text-[#0B3D91]">{s.value}</div>
              <div className="text-xs text-slate-600 mt-1">{s.label}</div>
            </div>
          ))}
        </GovCard>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-8">
        <p className="text-xs font-semibold text-[#0B3D91] tracking-[0.2em] uppercase mb-1">
          Core Modules
        </p>
        <h2 className="text-xl font-bold text-slate-900 mb-5">Essential Citizen Services</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreFeatures.map((f) => (
            <GovCard key={f.title} className="p-5 hover:border-[#0B3D91] transition">
              <div className="p-2 rounded bg-blue-50 text-[#0B3D91] w-fit mb-3">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.description}</p>
            </GovCard>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <p className="text-xs font-semibold text-[#0B3D91] tracking-[0.2em] uppercase mb-1">
            Additional Capabilities
          </p>
          <h2 className="text-xl font-bold text-slate-900 mb-5">And much more</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {advancedFeatures.map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-4 border border-slate-200 rounded bg-slate-50/40">
                <div className="p-1.5 bg-blue-50 rounded text-[#0B3D91] shrink-0">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900">{f.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-10">
        <GovCard className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Ready to register?
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Create your free citizen account and start managing your documents in minutes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
              <Link to="/register">Create Account <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300">
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        </GovCard>
      </section>
    </GovLayout>
  );
}
