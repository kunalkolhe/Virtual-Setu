import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GovLayout, { GovCard, GovPageHeader } from '@/components/GovLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Shield, Upload, FileText, CheckCircle, AlertCircle, Clock,
  MessageCircle, Zap, Crown, Lock, RefreshCw, ScanLine, Package, Truck, MapPin,
} from 'lucide-react';
import { scanAndVerifyAadhaar } from '@/lib/aadhaarVerification';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUserPlan } from '@/hooks/useUserPlan';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import SmartChecklist from '@/components/SmartChecklist';
import AIChatbot from '@/components/AIChatbot';
import DigitalIDCard from '@/components/DigitalIDCard';
import ActivityLog from '@/components/ActivityLog';
import ExpiryTracker from '@/components/ExpiryTracker';
import { logActivity } from '@/lib/activityLog';
import { getExpiry, getExpiryStatus } from '@/lib/documentExpiry';

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  pin_hash: string;
  emergency_contact: string;
  created_at: string;
  aadhaar_number: string | null;
  aadhaar_address: string | null;
  aadhaar_dob: string | null;
  aadhaar_verified: boolean | null;
  photo_url: string | null;
  blood_group: string | null;
}

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  verification_status: string;
  created_at: string;
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'platinum') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 capitalize">
        <Crown className="h-3 w-3 mr-1" /> Platinum
      </Badge>
    );
  }
  if (plan === 'premium') {
    return (
      <Badge className="bg-blue-100 text-[#0B3D91] border-blue-200 capitalize">
        <Zap className="h-3 w-3 mr-1" /> Premium
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="capitalize border-slate-300 text-slate-700">
      <Shield className="h-3 w-3 mr-1" /> Free
    </Badge>
  );
}

const VALID_TABS = ['overview', 'documents', 'checklist', 'digital-id', 'profile'];

export default function Dashboard() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plan, limits, canUploadDocument } = useUserPlan();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);

  const [showReVerify, setShowReVerify] = useState(false);
  const [reVerifyFile, setReVerifyFile] = useState<File | null>(null);
  const [reVerifyAadhaar, setReVerifyAadhaar] = useState('');
  const [reVerifyLoading, setReVerifyLoading] = useState(false);
  const reVerifyInputRef = useRef<HTMLInputElement>(null);

  const [cardOrder, setCardOrder] = useState<{ status: string; tracking_number: string | null } | null | undefined>(undefined);
  const [showCardOrderForm, setShowCardOrderForm] = useState(false);
  const [cardAddress, setCardAddress] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [cardOrderLoading, setCardOrderLoading] = useState(false);

  const handleReVerifyAadhaar = async () => {
    if (!reVerifyFile || !user || !profile) return;
    setReVerifyLoading(true);
    try {
      const result = await scanAndVerifyAadhaar(reVerifyFile, profile.full_name, reVerifyAadhaar, user.id);
      if (!result.success) { toast.error(result.error || 'Verification failed'); return; }
      const { error } = await supabase.from('profiles').update({
        aadhaar_number: result.extractedAadhaar,
        aadhaar_hash: result.aadhaarHash,
        aadhaar_address: result.extractedAddress || profile.aadhaar_address,
        aadhaar_dob: result.extractedDob || profile.aadhaar_dob,
        aadhaar_verified: true,
      }).eq('user_id', user.id);
      if (error) { toast.error('Failed to update profile'); return; }
      await fetchProfile();
      setShowReVerify(false);
      setReVerifyFile(null);
      toast.success('Aadhaar number updated — your card now shows the full number');
    } finally {
      setReVerifyLoading(false);
    }
  };

  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam ?? '') ? tabParam! : 'overview';

  useEffect(() => {
    if (!user || !['premium', 'platinum'].includes(plan)) return;
    supabase.from('card_orders').select('status,tracking_number').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setCardOrder(data ?? null));
  }, [user?.id, plan]);

  const handleCardOrderRequest = async () => {
    if (!user || !profile) return;
    if (!cardAddress.trim()) { toast.error('Please enter your delivery address'); return; }
    setCardOrderLoading(true);
    const { error } = await supabase.from('card_orders').insert({
      user_id: user.id,
      full_name: profile.full_name,
      address: cardAddress.trim(),
      phone: cardPhone.trim() || profile.phone || '',
      plan,
    });
    if (error) { toast.error('Could not place order. Please try again.'); setCardOrderLoading(false); return; }
    setCardOrder({ status: 'pending', tracking_number: null });
    setShowCardOrderForm(false);
    setCardAddress(''); setCardPhone('');
    toast.success('Physical card order placed! We will notify you when it is dispatched.');
    setCardOrderLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchProfile().catch(console.error);
    fetchDocuments().catch(console.error);
    const lastLogin = sessionStorage.getItem('vs_last_login');
    if (!lastLogin) {
      logActivity(user.id, { type: 'login', title: 'Signed in', description: `Logged in as ${user.email}` });
      sessionStorage.setItem('vs_last_login', Date.now().toString());
    }
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (error) console.error(error); else setProfile(data);
    } finally { setLoading(false); }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase.from('documents').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (error) console.error(error); else setDocuments(data || []);
  };

  const getStatusIcon = (s: string) =>
    s === 'verified' ? <CheckCircle className="h-4 w-4 text-[#138808]" /> :
    s === 'rejected' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
    <Clock className="h-4 w-4 text-amber-600" />;

  const getStatusColor = (s: string) =>
    s === 'verified' ? 'bg-green-50 text-[#138808] border-green-200' :
    s === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
    'bg-amber-50 text-amber-700 border-amber-200';

  const getStatusLabel = (s: string) =>
    s === 'verified' ? t('status.verified') :
    s === 'rejected' ? t('status.rejected') :
    t('status.pending');

  const docLimit = limits.maxDocuments === Infinity ? '∞' : limits.maxDocuments;
  const uploadAllowed = canUploadDocument(documents.length);

  const sectionTitle: Record<string, string> = {
    overview:   t('dashboard.overview'),
    documents:  t('dashboard.documents'),
    checklist:  t('dashboard.checklist'),
    'digital-id': t('dashboard.digital_id'),
    profile:    t('dashboard.profile'),
  };

  if (loading) {
    return (
      <GovLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0B3D91] border-t-transparent" />
        </div>
      </GovLayout>
    );
  }

  return (
    <GovLayout>
      <GovPageHeader
        breadcrumb={`Citizen ID · ${user?.id?.slice(0, 8) || ''}`}
        title={`${profile?.full_name || user?.email}`}
        subtitle={sectionTitle[activeTab]}
      />

      <section className="container mx-auto max-w-7xl px-4 py-6 space-y-5">

        {/* Plan badge row */}
        <div className="flex flex-wrap items-center gap-3">
          <PlanBadge plan={plan} />
          {plan === 'free' && (
            <Link to="/pricing">
              <Button size="sm" className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                <Zap className="h-4 w-4 mr-1" /> {t('actions.upgrade')}
              </Button>
            </Link>
          )}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            {plan === 'free' && !uploadAllowed && (
              <GovCard className="border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm text-amber-800">{t('dashboard.limit_message', { count: limits.maxDocuments })}</p>
                  </div>
                  <Link to="/pricing">
                    <Button size="sm" className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                      <Zap className="h-4 w-4 mr-1" /> {t('actions.upgrade')}
                    </Button>
                  </Link>
                </div>
              </GovCard>
            )}

            {/* ── Compact Expiry Alert Strip (urgent only) ── */}
            {user && (() => {
              const urgentDocs = documents.filter((doc) => {
                const rec = getExpiry(user.id, doc.id);
                if (!rec?.expiryDate) return false;
                const st = getExpiryStatus(rec.expiryDate);
                return st === 'expired' || st === 'critical' || st === 'warning';
              });
              if (urgentDocs.length === 0) return null;
              const hasExpiredOrCritical = urgentDocs.some((doc) => {
                const st = getExpiryStatus(getExpiry(user.id, doc.id)?.expiryDate);
                return st === 'expired' || st === 'critical';
              });
              return (
                <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-sm border text-sm ${
                  hasExpiredOrCritical
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 shrink-0 ${hasExpiredOrCritical ? 'text-red-600' : 'text-amber-600'}`} />
                    <span className="font-medium">
                      {urgentDocs.length} document{urgentDocs.length > 1 ? 's' : ''} need{urgentDocs.length === 1 ? 's' : ''} attention —{' '}
                      {urgentDocs.map(d => d.document_name).join(', ')}
                    </span>
                  </div>
                  <button
                    onClick={() => document.getElementById('expiry-tracker-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className={`text-xs font-semibold underline underline-offset-2 shrink-0 ${
                      hasExpiredOrCritical ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    View →
                  </button>
                </div>
              );
            })()}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: FileText,
                  label: t('dashboard.total_documents'),
                  value: `${documents.length} / ${docLimit}`,
                  sub: t('upload.title'),
                },
                {
                  icon: CheckCircle,
                  label: t('dashboard.verified_documents'),
                  value: documents.filter(d => d.verification_status === 'verified').length.toString(),
                  sub: t('status.verified'),
                },
                {
                  icon: Shield,
                  label: t('dashboard.plan_label'),
                  value: t(`plan.${plan}`, plan),
                  sub: plan === 'free' ? t('plan.free') : t('status.active'),
                  cap: true,
                },
              ].map((s, i) => (
                <GovCard key={i} className="p-5">
                  <div className="flex items-center gap-2 text-[#0B3D91]">
                    <s.icon className="h-4 w-4" />
                    <p className="text-sm font-semibold">{s.label}</p>
                  </div>
                  <p className={`text-3xl font-bold text-slate-900 mt-2 ${s.cap ? 'capitalize' : ''}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                </GovCard>
              ))}
            </div>

            {/* ── Full Expiry Tracker ── */}
            {user && documents.length > 0 && (
              <div id="expiry-tracker-section">
                <ExpiryTracker
                  documents={documents}
                  userId={user.id}
                  onExpiryUpdated={fetchDocuments}
                />
              </div>
            )}

            {/* Recent Documents */}
            <GovCard>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="font-semibold text-slate-900 text-sm">{t('dashboard.recent_documents')}</p>
                <p className="text-xs text-slate-500">{t('dashboard.recent_subtitle')}</p>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">{t('dashboard.no_documents')}</p>
                  <p className="text-sm text-slate-500 mb-4">{t('dashboard.upload_first')}</p>
                  <Button
                    className="bg-[#0B3D91] hover:bg-[#082c6c] text-white"
                    onClick={() => setSearchParams({ tab: 'documents' })}
                  >
                    <Upload className="h-4 w-4 mr-2" /> {t('actions.upload')}
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {documents.slice(0, 5).map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-6 w-6 text-[#0B3D91] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{doc.document_name}</p>
                          <p className="text-xs text-slate-500 capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(doc.verification_status)}>
                        {getStatusIcon(doc.verification_status)}
                        <span className="ml-1">{getStatusLabel(doc.verification_status)}</span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </GovCard>

            {/* Upgrade banner */}
            {plan === 'free' && (
              <GovCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-blue-200 bg-blue-50/40">
                <div>
                  <p className="font-semibold text-slate-900">{t('dashboard.upgrade_banner')}</p>
                  <p className="text-sm text-slate-600">{t('dashboard.upgrade_message')}</p>
                </div>
                <Link to="/pricing">
                  <Button className="bg-[#0B3D91] hover:bg-[#082c6c] text-white whitespace-nowrap">
                    <Zap className="h-4 w-4 mr-2" /> {t('actions.view_plans')}
                  </Button>
                </Link>
              </GovCard>
            )}

            {/* Activity Log */}
            <GovCard>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="font-semibold text-slate-900 text-sm">{t('dashboard.activity_log')}</p>
                <p className="text-xs text-slate-500">{t('dashboard.activity_subtitle')}</p>
              </div>
              <ActivityLog userId={user?.id || ''} />
            </GovCard>
          </>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <>
            {uploadAllowed ? (
              <div id="document-upload"><DocumentUpload onUploadComplete={fetchDocuments} /></div>
            ) : (
              <GovCard className="p-8 text-center space-y-3">
                <Lock className="h-10 w-10 text-amber-600 mx-auto" />
                <p className="font-semibold text-slate-900">{t('dashboard.upload_limit_reached')}</p>
                <p className="text-sm text-slate-600">{t('dashboard.limit_message', { count: limits.maxDocuments })}</p>
                <Link to="/pricing">
                  <Button className="bg-[#0B3D91] hover:bg-[#082c6c] text-white">
                    <Zap className="h-4 w-4 mr-2" /> {t('actions.upgrade')}
                  </Button>
                </Link>
              </GovCard>
            )}
            <DocumentList documents={documents} onDelete={fetchDocuments} />
          </>
        )}

        {/* ── CHECKLIST ── */}
        {activeTab === 'checklist' && <SmartChecklist />}

        {/* ── DIGITAL ID ── */}
        {activeTab === 'digital-id' && (
          <GovCard>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="font-semibold text-slate-900 text-sm">{t('dashboard.digital_id')}</p>
              <p className="text-xs text-slate-500">{t('nav.digital_id')}</p>
            </div>
            <div className="flex justify-center py-6 px-4">
              <DigitalIDCard
                name={profile?.full_name || ''}
                phone={profile?.phone || ''}
                userId={user?.id || 'unknown'}
                memberSince={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : undefined}
                shareUrl={`${window.location.origin}/i/${user?.id}`}
                aadhaarMasked={profile?.aadhaar_number || undefined}
                aadhaarAddress={profile?.aadhaar_address || undefined}
                dob={profile?.aadhaar_dob || undefined}
                aadhaarVerified={profile?.aadhaar_verified ?? false}
                photoUrl={profile?.photo_url || undefined}
                bloodGroup={profile?.blood_group || ''}
              />
            </div>
            {/* Re-verify Aadhaar */}
            <div className="mx-5 mb-5 border border-slate-200 rounded">
              <button
                onClick={() => { setShowReVerify(v => !v); setReVerifyFile(null); setReVerifyAadhaar(''); }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#003580]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Update Aadhaar Number</p>
                    <p className="text-xs text-slate-500">Re-scan your card to store the full 12-digit number</p>
                  </div>
                </div>
                <span className="text-xs text-[#003580] font-medium">{showReVerify ? 'Cancel' : 'Update →'}</span>
              </button>

              {showReVerify && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  <input
                    ref={reVerifyInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => setReVerifyFile(e.target.files?.[0] ?? null)}
                  />
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Your 12-digit Aadhaar Number</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 1234 5678 9012"
                      maxLength={14}
                      value={reVerifyAadhaar}
                      onChange={e => setReVerifyAadhaar(e.target.value.replace(/[^0-9\s]/g, ''))}
                      className="mt-1 border-slate-300 rounded-sm focus-visible:ring-[#003580] font-mono tracking-widest"
                    />
                  </div>
                  <div
                    onClick={() => reVerifyInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:border-[#003580] hover:bg-blue-50/30 transition-colors"
                  >
                    {reVerifyFile ? (
                      <p className="text-sm font-medium text-[#003580]">{reVerifyFile.name}</p>
                    ) : (
                      <>
                        <ScanLine className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-sm text-slate-600">Click to upload your Aadhaar card image</p>
                        <p className="text-xs text-slate-400 mt-0.5">JPG or PNG, front side</p>
                      </>
                    )}
                  </div>
                  <Button
                    onClick={handleReVerifyAadhaar}
                    disabled={!reVerifyFile || reVerifyLoading || reVerifyAadhaar.replace(/\D/g,'').length !== 12}
                    className="w-full bg-[#003580] hover:bg-[#002060] text-white text-sm"
                  >
                    {reVerifyLoading
                      ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Scanning…</>
                      : <><ScanLine className="h-4 w-4 mr-2" /> Scan & Update</>}
                  </Button>
                </div>
              )}
            </div>

            {/* Physical ID Card Order */}
            {(plan === 'premium' || plan === 'platinum') && (
              <div className="mx-5 mb-5 border border-slate-200 rounded">
                {cardOrder ? (
                  /* Order exists — show status */
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-[#003580]" />
                      <p className="text-sm font-semibold text-slate-800">Physical ID Card Order</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border capitalize ${
                        cardOrder.status === 'delivered'  ? 'bg-green-100 text-green-800 border-green-300' :
                        cardOrder.status === 'dispatched' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                        cardOrder.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        cardOrder.status === 'cancelled'  ? 'bg-red-100 text-red-700 border-red-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        <Truck className="h-3 w-3" /> {cardOrder.status}
                      </span>
                      {cardOrder.tracking_number && (
                        <p className="text-xs text-slate-600 font-mono">
                          India Post: <span className="font-bold">{cardOrder.tracking_number}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {cardOrder.status === 'pending'    && 'Your order is being reviewed. You will be notified when processing begins.'}
                      {cardOrder.status === 'processing' && 'Your card is being printed and prepared for dispatch.'}
                      {cardOrder.status === 'dispatched' && 'Your card is on the way via India Post. Track using the number above.'}
                      {cardOrder.status === 'delivered'  && 'Your physical ID card has been delivered!'}
                      {cardOrder.status === 'cancelled'  && 'Your order was cancelled. Contact support for assistance.'}
                    </p>
                  </div>
                ) : (
                  /* No order yet — show request form toggle */
                  <>
                    <button
                      onClick={() => setShowCardOrderForm(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#003580]" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Order Physical ID Card</p>
                          <p className="text-xs text-slate-500">Get a laminated card delivered to your address via India Post</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#003580] font-medium shrink-0">
                        {showCardOrderForm ? 'Cancel' : 'Order →'}
                      </span>
                    </button>
                    {showCardOrderForm && (
                      <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            <MapPin className="h-3 w-3 inline mr-1" />Delivery Address
                          </Label>
                          <textarea
                            value={cardAddress}
                            onChange={e => setCardAddress(e.target.value)}
                            placeholder="House/Flat No., Street, City, State, PIN code"
                            rows={3}
                            className="mt-1 w-full text-sm border border-slate-300 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#003580] resize-none"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Phone (optional)
                          </Label>
                          <Input
                            value={cardPhone}
                            onChange={e => setCardPhone(e.target.value)}
                            placeholder={profile?.phone || 'Contact number for delivery'}
                            className="mt-1 border-slate-300 rounded-sm focus-visible:ring-[#003580]"
                          />
                        </div>
                        <p className="text-xs text-slate-400 bg-slate-50 rounded p-2 border border-slate-200">
                          Your laminated Virtual Setu ID card will be dispatched within 5–7 working days via India Post Speed Post. You will receive notifications at each step.
                        </p>
                        <Button
                          onClick={handleCardOrderRequest}
                          disabled={!cardAddress.trim() || cardOrderLoading}
                          className="w-full bg-[#003580] hover:bg-[#002060] text-white text-sm"
                        >
                          {cardOrderLoading
                            ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Placing Order…</>
                            : <><Package className="h-4 w-4 mr-2" /> Confirm Order</>}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Upsell for free plan */}
            {plan === 'free' && (
              <div className="mx-5 mb-5 p-3 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <p className="text-sm text-slate-500">
                  Physical ID card delivery available on{' '}
                  <Link to="/pricing" className="text-[#0B3D91] underline font-semibold">Premium &amp; Platinum</Link>
                </p>
              </div>
            )}

            {!limits.qrEmergencySharing && (
              <div className="mx-5 mb-5 p-3 rounded border border-slate-200 bg-slate-50 flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <p className="text-sm text-slate-600">
                  QR emergency sharing requires{' '}
                  <Link to="/pricing" className="text-[#0B3D91] underline">Premium or Platinum</Link>
                </p>
              </div>
            )}
          </GovCard>
        )}

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GovCard>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="font-semibold text-slate-900 text-sm">{t('profile.title')}</p>
                <p className="text-xs text-slate-500">{t('profile.subtitle')}</p>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: t('profile.full_name'),    value: profile?.full_name || t('profile.not_provided') },
                  { label: t('profile.email'),         value: user?.email },
                  { label: t('profile.phone'),         value: profile?.phone || t('profile.not_provided') },
                  { label: t('profile.member_since'),  value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—' },
                ].map((f) => (
                  <div key={f.label}>
                    <Label className="text-xs uppercase tracking-wider text-slate-500">{f.label}</Label>
                    <p className="text-slate-900">{f.value}</p>
                  </div>
                ))}
              </div>
            </GovCard>

            <GovCard>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="font-semibold text-slate-900 text-sm">{t('profile.security_title')}</p>
                <p className="text-xs text-slate-500">{t('profile.subtitle')}</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{t('profile.current_plan')}</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {t(`plan.${plan}`, plan)} — {plan === 'free' ? '5 ' + t('dashboard.total_documents') : plan === 'premium' ? '100 ' + t('dashboard.total_documents') : t('plan.unlimited')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanBadge plan={plan} />
                    {plan !== 'platinum' && (
                      <Link to="/pricing">
                        <Button size="sm" variant="outline" className="border-[#0B3D91] text-[#0B3D91]">{t('actions.upgrade')}</Button>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">PIN Protection</p>
                    <p className="text-xs text-slate-500">4-digit PIN for card access</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-[#138808] border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> {t('status.active')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Email Verification</p>
                    <p className="text-xs text-slate-500">Email address verification status</p>
                  </div>
                  <Badge variant="outline" className={user?.email_confirmed_at ? 'bg-green-50 text-[#138808] border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                    {user?.email_confirmed_at
                      ? <><CheckCircle className="h-3 w-3 mr-1" /> {t('status.verified')}</>
                      : <><Clock className="h-3 w-3 mr-1" /> {t('status.pending')}</>}
                  </Badge>
                </div>
              </div>
            </GovCard>
          </div>
        )}

      </section>

      {/* Floating Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            if (!limits.aiChatbot) { toast.error('AI Chatbot is not available on your plan'); return; }
            setShowChatbot(!showChatbot);
          }}
          className="rounded-full w-14 h-14 shadow-lg bg-[#0B3D91] hover:bg-[#082c6c] text-white"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
      {showChatbot && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96">
          <AIChatbot documents={documents} onClose={() => setShowChatbot(false)} />
        </div>
      )}
    </GovLayout>
  );
}
