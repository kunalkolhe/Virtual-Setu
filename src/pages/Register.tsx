import React from 'react';
import { Link } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Info, ShieldCheck } from 'lucide-react';
import SignupForm from '@/components/Auth/SignupForm';

export default function Register() {
  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="Citizen Portal · New Registration"
        title="Citizen Account Registration"
        subtitle="Aadhaar-verified registration — your identity is secured end-to-end."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GovCard className="lg:col-span-2 p-6">
          <SignupForm />
        </GovCard>

        <div className="space-y-4">
          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">Before you begin</p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Keep your original Aadhaar card ready for scanning.</li>
              <li>Ensure good lighting when taking the Aadhaar photo.</li>
              <li>One Aadhaar number can only be linked to one account.</li>
              <li>Your Aadhaar number is stored as an irreversible hash — never in plain text.</li>
            </ul>
          </GovCard>

          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-[#138808]" />
              <p className="font-semibold text-slate-900 text-sm">Privacy Notice</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Aadhaar details are used solely to verify your identity. Only a
              cryptographic hash is stored — the actual number is never retained on our
              servers, in compliance with the Aadhaar Act 2016.
            </p>
          </GovCard>

          <GovCard className="p-5 border-[#FF9933]/40 bg-[#FF9933]/5">
            <p className="text-xs font-semibold text-[#FF9933] mb-1">Already registered?</p>
            <Link to="/auth" className="text-xs text-[#0B3D91] underline">
              Sign in to your existing account
            </Link>
          </GovCard>
        </div>
      </section>
    </GovLayout>
  );
}
