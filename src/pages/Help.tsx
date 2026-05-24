import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, Mail, Phone, MapPin, Clock, MessageCircle, Send, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const FAQS = [
  {
    q: 'How is my data secured on Virtual Setu?',
    a: 'All documents are encrypted at rest using 256-bit AES and transmitted over TLS. Access requires both your account password and a 4-digit PIN that only you know.',
  },
  {
    q: 'I forgot my 4-digit PIN. How do I reset it?',
    a: 'PIN reset is currently performed via citizen support. Please contact us through this Help page or call our toll-free number with your registered email and a valid government ID.',
  },
  {
    q: 'What happens if I exceed the document upload limit?',
    a: 'Free accounts can store up to 5 documents. Once the limit is reached, you can either delete older documents or upgrade to Premium / Platinum from the Pricing page.',
  },
  {
    q: 'How does emergency QR sharing work?',
    a: 'A signed QR on your Digital ID Card opens a secure share link. The recipient must enter your 4-digit PIN to view documents. Documents are read-only and protected from screenshots.',
  },
  {
    q: 'Which document types are supported?',
    a: 'You can upload Aadhaar, PAN, Passport, Driving License, Voter ID and most general PDF/JPG/PNG documents up to the size limit of your plan.',
  },
  {
    q: 'How do I cancel or refund my subscription?',
    a: 'Subscriptions are valid for one year and do not auto-renew. For exceptional refund requests, please contact citizen support within 7 days of purchase.',
  },
];

export default function Help() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in your name, email and message.');
      return;
    }
    setSending(true);
    // Local-only acknowledgement (no backend ticketing wired yet).
    setTimeout(() => {
      setSending(false);
      setForm({ name: '', email: '', subject: '', message: '' });
      toast.success('Thank you! Your request has been received. Our team will reply within 1 business day.');
    }, 700);
  };

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="Citizen Services · Help &amp; Support"
        title="Help &amp; Support"
        subtitle="Find answers to common questions or contact our citizen support team."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GovCard>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">Frequently Asked Questions</p>
            </div>
            <div className="p-5">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium text-slate-900 hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </GovCard>

          <GovCard>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">Contact Citizen Support</p>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="h-name" className="text-sm text-slate-700">Full Name</Label>
                  <Input id="h-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="As per government ID" className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" />
                </div>
                <div>
                  <Label htmlFor="h-email" className="text-sm text-slate-700">Email Address</Label>
                  <Input id="h-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your.email@example.com" className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" />
                </div>
              </div>
              <div>
                <Label htmlFor="h-sub" className="text-sm text-slate-700">Subject</Label>
                <Input id="h-sub" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief description of your issue" className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" />
              </div>
              <div>
                <Label htmlFor="h-msg" className="text-sm text-slate-700">Message</Label>
                <Textarea id="h-msg" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Please describe your issue in detail." className="mt-1 bg-white border-slate-300 focus:border-[#0B3D91]" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={sending} className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                  <Send className="h-4 w-4 mr-2" /> {sending ? 'Sending…' : 'Submit Request'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Average response time: within 1 business day. Do not share your password or PIN in support requests.
              </p>
            </form>
          </GovCard>
        </div>

        <div className="space-y-4">
          <GovCard className="p-5">
            <p className="font-semibold text-slate-900 text-sm mb-3">Direct Contact</p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-[#0B3D91] mt-0.5" />
                <div>
                  <p className="font-medium">Toll-Free</p>
                  <p className="text-slate-600 text-xs">1800-XXX-XXXX</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-[#0B3D91] mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-slate-600 text-xs">support@virtualsetu.in</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#0B3D91] mt-0.5" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-slate-600 text-xs">Citizen Services Cell, New Delhi, India</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-[#0B3D91] mt-0.5" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-slate-600 text-xs">Mon–Sat · 9:00 – 18:00 IST</p>
                </div>
              </li>
            </ul>
          </GovCard>

          <GovCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-[#0B3D91]" />
              <p className="font-semibold text-slate-900 text-sm">Useful Links</p>
            </div>
            <ul className="text-sm text-[#0B3D91] space-y-1.5">
              <li><Link to="/features" className="hover:underline">Portal Features</Link></li>
              <li><Link to="/pricing" className="hover:underline">Subscription Plans</Link></li>
              <li><Link to="/scan" className="hover:underline">Verify a Shared Document</Link></li>
              <li><Link to="/about" className="hover:underline">About Virtual Setu</Link></li>
            </ul>
          </GovCard>
        </div>
      </section>
    </GovLayout>
  );
}
