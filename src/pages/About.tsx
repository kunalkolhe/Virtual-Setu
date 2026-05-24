import React from 'react';
import { Link } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Target, Heart, Globe, Award, Mail, ArrowRight } from 'lucide-react';

const values = [
  { icon: ShieldCheck, title: 'Security First', description: 'Every feature is designed with your data security as the top priority. We use enterprise-grade encryption and never share your data.' },
  { icon: Heart, title: 'Built for India', description: 'We understand the unique challenges Indian citizens face with government documentation and built Virtual Setu specifically to solve them.' },
  { icon: Target, title: 'Simplicity Matters', description: 'Complex problems deserve simple solutions. Our interface is designed so anyone — regardless of tech comfort — can use it with ease.' },
  { icon: Globe, title: 'Always Available', description: '99.9% uptime means your documents are always accessible, whether you are at a government office or in an emergency.' },
];

const recognition = [
  { label: 'Digital India Initiative Partner', sub: 'Ministry of Electronics & IT' },
  { label: 'Best FinTech Startup 2025', sub: 'India Tech Awards' },
  { label: 'ISO 27001 Certified', sub: 'Information Security Management' },
];

export default function About() {
  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="About the Portal"
        title="About Virtual Setu"
        subtitle="Building India's Digital Identity Future — a secure, intelligent and citizen-first document management portal."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GovCard className="p-6">
          <p className="text-xs font-semibold text-[#0B3D91] tracking-[0.2em] uppercase mb-1">Mission</p>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            To empower every Indian citizen with a secure, intelligent and
            always-accessible digital identity vault — eliminating the
            frustration of lost documents, missed renewals, and emergency
            inaccessibility.
          </p>
          <p className="text-sm text-slate-700 leading-relaxed mt-3">
            We believe managing your Aadhaar, PAN, Passport and other
            government IDs should be as effortless as checking your phone.
            Virtual Setu is the bridge between India's digital ambitions and
            everyday citizens.
          </p>
        </GovCard>

        <GovCard className="p-6">
          <p className="text-xs font-semibold text-[#0B3D91] tracking-[0.2em] uppercase mb-1">Problem Statement</p>
          <h2 className="text-xl font-bold text-slate-900 mb-3">The problem we solve</h2>
          <ul className="space-y-2.5">
            {[
              'Valuable documents stored in unsafe physical folders',
              'No central place for all government IDs',
              'Missed renewal deadlines costing time and money',
              'No reliable way to share documents in emergencies',
            ].map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-red-50 text-red-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  ✗
                </span>
                {p}
              </li>
            ))}
          </ul>
        </GovCard>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <p className="text-xs font-semibold text-[#0B3D91] tracking-[0.2em] uppercase mb-1">Our Values</p>
          <h2 className="text-xl font-bold text-slate-900 mb-5">Principles that guide us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v) => (
              <GovCard key={v.title} className="p-5">
                <div className="p-2 rounded bg-blue-50 text-[#0B3D91] w-fit mb-3">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{v.title}</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{v.description}</p>
              </GovCard>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-8">
        <GovCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-[#0B3D91]" />
            <h2 className="text-lg font-bold text-slate-900">Recognition</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recognition.map((r) => (
              <div key={r.label} className="p-4 rounded border border-slate-200 bg-slate-50/40">
                <p className="font-semibold text-sm text-slate-900">{r.label}</p>
                <p className="text-xs text-slate-500 mt-1">{r.sub}</p>
              </div>
            ))}
          </div>
        </GovCard>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-10">
        <GovCard className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Get in touch</h2>
            <p className="text-sm text-slate-600 mt-1">
              Questions, partnerships or feedback — we'd love to hear from you.
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-700 mt-2">
              <Mail className="h-4 w-4 text-[#0B3D91]" /> support@virtualsetu.in
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
              <Link to="/register">Start for Free <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300">
              <Link to="/features">View Features</Link>
            </Button>
          </div>
        </GovCard>
      </section>
    </GovLayout>
  );
}
