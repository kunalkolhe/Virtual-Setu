import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle, X, Zap, Crown, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan, Plan } from '@/hooks/useUserPlan';

declare global {
  interface Window { Razorpay: any; }
}

interface PricingPlan {
  id: Plan;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  badge?: string;
  features: { text: string; included: boolean }[];
  buttonLabel: string;
  highlight?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: 'free', name: 'Free Tier', price: 0, priceLabel: '₹0',
    description: 'Basic citizen account with essential document management.',
    buttonLabel: 'Current Plan',
    features: [
      { text: 'Up to 5 document uploads', included: true },
      { text: 'Basic AI chatbot access', included: true },
      { text: 'Digital ID card', included: true },
      { text: 'Smart checklist', included: true },
      { text: 'QR emergency sharing', included: false },
      { text: 'Full AI assistant', included: false },
      { text: 'Priority verification', included: false },
      { text: 'Advanced AI analysis', included: false },
    ],
  },
  {
    id: 'premium', name: 'Premium', price: 29900, priceLabel: '₹299',
    description: 'Complete document management with AI assistant and emergency QR sharing.',
    badge: 'Recommended',
    buttonLabel: 'Upgrade to Premium',
    highlight: true,
    features: [
      { text: 'Up to 100 document uploads', included: true },
      { text: 'Basic AI chatbot access', included: true },
      { text: 'Digital ID card', included: true },
      { text: 'Smart checklist', included: true },
      { text: 'QR emergency sharing', included: true },
      { text: 'Full AI assistant', included: true },
      { text: 'Priority verification', included: true },
      { text: 'Advanced AI analysis', included: false },
    ],
  },
  {
    id: 'platinum', name: 'Platinum', price: 59900, priceLabel: '₹599',
    description: 'Unlimited storage, advanced AI analysis and instant QR access.',
    buttonLabel: 'Upgrade to Platinum',
    features: [
      { text: 'Unlimited document uploads', included: true },
      { text: 'Basic AI chatbot access', included: true },
      { text: 'Digital ID card', included: true },
      { text: 'Smart checklist', included: true },
      { text: 'QR emergency sharing', included: true },
      { text: 'Full AI assistant', included: true },
      { text: 'Priority verification', included: true },
      { text: 'Advanced AI analysis', included: true },
      { text: 'Instant QR access (no PIN delay)', included: true },
      { text: 'Future features — early access', included: true },
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan, refreshPlan } = useUserPlan();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const handleUpgrade = async (target: Plan) => {
    if (!user) { toast.error('Please sign in to upgrade your plan'); navigate('/auth'); return; }
    if (target === 'free') return;
    if (target === currentPlan) { toast.info('You are already on this plan'); return; }

    const cfg = PLANS.find((p) => p.id === target)!;
    setLoadingPlan(target);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Could not load payment gateway.'); return; }

      const res = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: target, amount: cfg.price }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create order');
      const { orderId, amount, currency, keyId } = await res.json();

      const rzp = new window.Razorpay({
        key: keyId, amount, currency,
        name: 'Virtual Setu',
        description: `${cfg.name} Plan Subscription`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const v = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: target, userId: user.id,
              }),
            });
            if (!v.ok) throw new Error((await v.json()).error || 'Payment verification failed');
            await refreshPlan();
            toast.success(`Successfully upgraded to ${cfg.name} plan!`);
            navigate('/dashboard');
          } catch (err: any) { toast.error(err.message || 'Payment verification failed'); }
        },
        prefill: { email: user.email },
        theme: { color: '#0B3D91' },
        modal: { ondismiss: () => setLoadingPlan(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const order = (p: Plan) => ({ free: 0, premium: 1, platinum: 2 }[p]);
  const getButton = (id: Plan) => {
    if (id === 'free') return { disabled: true, label: currentPlan === 'free' ? 'Current Plan' : 'Downgrade not available' };
    if (id === currentPlan) return { disabled: true, label: 'Current Plan' };
    if (order(id) < order(currentPlan)) return { disabled: true, label: 'Downgrade not available' };
    return { disabled: false, label: PLANS.find((p) => p.id === id)!.buttonLabel };
  };

  const planIcon = (id: Plan) =>
    id === 'platinum' ? <Crown className="h-5 w-5" /> :
    id === 'premium' ? <Zap className="h-5 w-5" /> :
    <Shield className="h-5 w-5" />;

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb="Citizen Portal · Subscription Plans"
        title="Citizen Subscription Plans"
        subtitle="Choose a plan that suits your document management needs. All payments are securely processed via Razorpay."
      />

      <section className="container mx-auto max-w-7xl px-4 py-8">
        {currentPlan !== 'free' && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-[#0B3D91] text-sm">
            <ShieldCheck className="h-4 w-4" /> Active plan: <span className="capitalize font-semibold">{currentPlan}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p) => {
            const btn = getButton(p.id);
            const isLoading = loadingPlan === p.id;
            return (
              <GovCard
                key={p.id}
                className={`flex flex-col ${p.highlight ? 'border-[#0B3D91] ring-1 ring-[#0B3D91]/30' : ''}`}
              >
                {p.badge && (
                  <div className="bg-[#0B3D91] text-white text-[11px] uppercase tracking-wider text-center py-1 font-semibold">
                    {p.badge}
                  </div>
                )}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-[#0B3D91]">
                    {planIcon(p.id)}
                    <h3 className="font-bold text-lg">{p.name}</h3>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-slate-900">{p.priceLabel}</span>
                    {p.price > 0 && <span className="text-slate-500 text-sm"> /year</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{p.description}</p>
                </div>

                <ul className="p-5 space-y-2.5 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {f.included
                        ? <CheckCircle className="h-4 w-4 text-[#138808] mt-0.5 shrink-0" />
                        : <X className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />}
                      <span className={f.included ? 'text-slate-800' : 'text-slate-400 line-through'}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="p-5 pt-0">
                  <Button
                    className={`w-full ${p.highlight ? 'bg-[#0B3D91] hover:bg-[#082c6c] text-white' : ''}`}
                    variant={p.highlight ? 'default' : 'outline'}
                    disabled={btn.disabled || isLoading}
                    onClick={() => handleUpgrade(p.id)}
                  >
                    {isLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
                      : btn.label}
                  </Button>
                </div>
              </GovCard>
            );
          })}
        </div>

        <GovCard className="mt-8 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-1">Payment &amp; Refund Policy</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            All payments are processed securely by Razorpay. Prices are inclusive
            of applicable taxes and are listed in Indian Rupees (INR).
            Subscriptions auto-expire after one year and may be renewed from your
            <Link to="/dashboard" className="text-[#0B3D91] underline ml-1">dashboard</Link>.
          </p>
        </GovCard>
      </section>
    </GovLayout>
  );
}
