import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Package, FileText, Bell,
  LogOut, CheckCircle, XCircle, Clock, Truck,
  RefreshCw, Send, Crown, Zap, Shield,
  IndianRupee, Menu, X, Settings, Search,
} from 'lucide-react';

interface OverviewStats {
  total: number; free: number; premium: number; platinum: number;
  pendingDocs: number; totalDocs: number; pendingOrders: number; revenue: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-800 border-amber-300',
  processing: 'bg-blue-100 text-blue-800 border-blue-300',
  dispatched: 'bg-purple-100 text-purple-800 border-purple-300',
  delivered:  'bg-green-100 text-green-800 border-green-300',
  cancelled:  'bg-red-100 text-red-700 border-red-300',
  verified:   'bg-green-100 text-green-800 border-green-300',
  rejected:   'bg-red-100 text-red-700 border-red-300',
  free:       'bg-slate-100 text-slate-700 border-slate-300',
  premium:    'bg-blue-100 text-blue-800 border-blue-300',
  platinum:   'bg-amber-100 text-amber-700 border-amber-300',
  active:     'bg-green-100 text-green-800 border-green-300',
  inactive:   'bg-slate-100 text-slate-500 border-slate-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-[#003580] border-blue-200',
    green:   'bg-green-50 text-green-700 border-green-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
    red:     'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    slate:   'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className={`border rounded-sm p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

const TABS = [
  { id: 'overview',      label: 'Overview',       icon: LayoutDashboard },
  { id: 'citizens',      label: 'Citizens',        icon: Users           },
  { id: 'revenue',       label: 'Revenue',         icon: IndianRupee     },
  { id: 'delivery',      label: 'Card Delivery',   icon: Package         },
  { id: 'documents',     label: 'Documents',       icon: FileText        },
  { id: 'notifications', label: 'Notifications',   icon: Bell            },
];

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [overview, setOverview]       = useState<OverviewStats | null>(null);
  const [citizens, setCitizens]       = useState<any[]>([]);
  const [subscriptions, setSubs]      = useState<any[]>([]);
  const [orders, setOrders]           = useState<any[]>([]);
  const [allDocs, setAllDocs]         = useState<any[]>([]);
  const [sentNotifs, setSentNotifs]   = useState<any[]>([]);
  const [profileMap, setProfileMap]   = useState<Record<string, any>>({});

  const [citizenSearch, setCitizenSearch] = useState('');
  const [orderFilter, setOrderFilter]     = useState('all');
  const [docFilter, setDocFilter]         = useState('pending');
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [newStatus, setNewStatus]         = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [notifForm, setNotifForm] = useState({
    recipient: 'all', userId: '', type: 'info', title: '', message: '',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'overview')       fetchOverview();
    else if (tab === 'citizens')  fetchCitizens();
    else if (tab === 'revenue')   fetchRevenue();
    else if (tab === 'delivery')  fetchOrders();
    else if (tab === 'documents') fetchDocuments();
    else if (tab === 'notifications') fetchNotifications();
  }, [tab, isAdmin]);

  const fetchOverview = async () => {
    setLoading(true);
    const [pRes, dRes, coRes] = await Promise.all([
      supabase.from('profiles').select('plan'),
      supabase.from('documents').select('verification_status'),
      supabase.from('card_orders').select('status'),
    ]);
    const profiles = pRes.data || [];
    const docs     = dRes.data  || [];
    const cos      = coRes.data || [];
    const premium  = profiles.filter(p => p.plan === 'premium').length;
    const platinum = profiles.filter(p => p.plan === 'platinum').length;
    setOverview({
      total: profiles.length,
      free: profiles.filter(p => !p.plan || p.plan === 'free').length,
      premium, platinum,
      pendingDocs: docs.filter(d => d.verification_status === 'pending').length,
      totalDocs: docs.length,
      pendingOrders: cos.filter(o => o.status === 'pending').length,
      revenue: premium * 299 + platinum * 599,
    });
    setLoading(false);
  };

  const fetchCitizens = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setCitizens(data || []);
    setLoading(false);
  };

  const fetchRevenue = async () => {
    setLoading(true);
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    setSubs(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('card_orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: docs } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setAllDocs(docs || []);
    const ids = [...new Set((docs || []).map(d => d.user_id))];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id,full_name,phone').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => { map[p.user_id] = p; });
      setProfileMap(map);
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setSentNotifs(data || []);
    setLoading(false);
  };

  const sendNotification = async () => {
    if (!notifForm.title || !notifForm.message) { toast.error('Title and message required'); return; }
    setSending(true);
    const payload: any = { title: notifForm.title, message: notifForm.message, type: notifForm.type };
    if (notifForm.recipient === 'specific') {
      if (!notifForm.userId.trim()) { toast.error('Enter a User ID'); setSending(false); return; }
      payload.user_id = notifForm.userId.trim();
    } else {
      payload.user_id = null;
    }
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) toast.error('Failed to send: ' + error.message);
    else {
      toast.success('Notification sent!');
      setNotifForm({ recipient: 'all', userId: '', type: 'info', title: '', message: '' });
      fetchNotifications();
    }
    setSending(false);
  };

  const updateOrderStatus = async (orderId: string) => {
    if (!newStatus) { toast.error('Select a status'); return; }
    const { error } = await supabase.from('card_orders').update({
      status: newStatus,
      ...(trackingInput ? { tracking_number: trackingInput } : {}),
    }).eq('id', orderId);
    if (error) { toast.error('Update failed'); return; }

    const order = orders.find(o => o.id === orderId);
    if (order) {
      const msgs: Record<string, { title: string; message: string; type: string }> = {
        processing: {
          title: 'ID Card Being Processed',
          message: 'Your physical Virtual Setu ID card is being prepared and will be dispatched soon via India Post.',
          type: 'delivery',
        },
        dispatched: {
          title: '📦 ID Card Dispatched!',
          message: `Your physical ID card is on its way via India Post. Tracking No: ${trackingInput || 'To be updated shortly'}.`,
          type: 'delivery',
        },
        delivered: {
          title: '✅ ID Card Delivered!',
          message: 'Your Virtual Setu physical ID card has been delivered. Please check your post box. Thank you!',
          type: 'success',
        },
        cancelled: {
          title: 'ID Card Order Cancelled',
          message: 'Your physical ID card order has been cancelled. Please contact support if this is an error.',
          type: 'warning',
        },
      };
      const msg = msgs[newStatus];
      if (msg) await supabase.from('notifications').insert({ user_id: order.user_id, ...msg });
    }

    toast.success('Status updated — citizen notified!');
    setUpdatingId(null); setNewStatus(''); setTrackingInput('');
    fetchOrders();
  };

  const verifyDocument = async (docId: string, userId: string, docName: string, status: 'verified' | 'rejected') => {
    await supabase.from('documents').update({ verification_status: status }).eq('id', docId);
    await supabase.from('notifications').insert({
      user_id: userId,
      title: status === 'verified' ? '✅ Document Verified' : 'Document Requires Resubmission',
      message: status === 'verified'
        ? `Your ${docName} has been successfully verified by the portal authority.`
        : `Your ${docName} could not be verified. Please re-upload a clearer, valid copy.`,
      type: status === 'verified' ? 'success' : 'warning',
    });
    toast.success(`Document ${status}`);
    fetchDocuments();
  };

  const changePlan = async (userId: string, plan: string) => {
    await supabase.from('profiles').update({ plan }).eq('user_id', userId);
    toast.success(`Plan changed to ${plan}`);
    setCitizens(prev => prev.map(c => c.user_id === userId ? { ...c, plan } : c));
  };

  const filteredCitizens = citizens.filter(c =>
    (c.full_name || '').toLowerCase().includes(citizenSearch.toLowerCase()) ||
    (c.phone || '').includes(citizenSearch)
  );
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
  const filteredDocs   = docFilter === 'all' ? allDocs : allDocs.filter(d => d.verification_status === docFilter);

  const premiumActive  = subscriptions.filter(s => s.plan === 'premium' && s.status === 'active').length;
  const platinumActive = subscriptions.filter(s => s.plan === 'platinum' && s.status === 'active').length;
  const totalRevenue   = premiumActive * 299 + platinumActive * 599;

  if (adminLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#003580] border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f4f9] flex" style={{ fontFamily: "'Noto Sans','Segoe UI',Arial,sans-serif" }}>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-[#003580] text-white flex flex-col z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-blue-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center shrink-0">
            <Settings className="h-4.5 w-4.5 text-[#003580]" style={{ height: 18, width: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none">Admin Console</p>
            <p className="text-blue-300 text-[10px] mt-0.5 truncate">Virtual Setu Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-blue-300 hover:text-white shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                tab === id
                  ? 'bg-white/15 border-r-[3px] border-white text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-blue-700/60 space-y-2">
          <p className="text-[10px] text-blue-300 truncate">{user?.email}</p>
          <button
            onClick={async () => { await signOut(); navigate('/'); }}
            className="flex items-center gap-2 text-blue-200 hover:text-white text-xs transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-60 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-slate-600 hover:text-[#003580]">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#003580] text-sm leading-none">
              {TABS.find(t => t.id === tab)?.label}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Virtual Setu Admin Console</p>
          </div>
          <div className="flex items-center gap-3">
            {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
            <span className="hidden sm:inline text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-sm font-bold uppercase tracking-wide">
              Admin
            </span>
            <Link to="/dashboard" className="text-xs text-[#003580] hover:underline font-medium whitespace-nowrap">
              ← Citizen Portal
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 space-y-5 overflow-x-hidden">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Users}         label="Total Citizens"       value={overview.total}                                color="blue"   />
                <StatCard icon={IndianRupee}   label="Total Revenue"        value={`₹${overview.revenue.toLocaleString('en-IN')}`} color="green"  sub="Active subscriptions" />
                <StatCard icon={Zap}           label="Premium Users"        value={overview.premium}                              color="blue"   sub="₹299/yr" />
                <StatCard icon={Crown}         label="Platinum Users"       value={overview.platinum}                             color="amber"  sub="₹599/yr" />
                <StatCard icon={FileText}      label="Total Documents"      value={overview.totalDocs}                            color="purple" />
                <StatCard icon={Clock}         label="Pending Verifications" value={overview.pendingDocs}                        color={overview.pendingDocs > 0 ? 'red' : 'emerald'} />
                <StatCard icon={Package}       label="Card Orders Pending"  value={overview.pendingOrders}                        color={overview.pendingOrders > 0 ? 'amber' : 'emerald'} />
                <StatCard icon={Shield}        label="Free Plan Users"      value={overview.free}                                 color="slate"  />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Plan distribution */}
                <div className="bg-white border border-slate-200 rounded-sm">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="font-semibold text-sm text-slate-800">Plan Distribution</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'Free',     count: overview.free,     color: 'bg-slate-400' },
                      { label: 'Premium',  count: overview.premium,  color: 'bg-blue-500'  },
                      { label: 'Platinum', count: overview.platinum, color: 'bg-amber-500' },
                    ].map(({ label, count, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="font-medium">{label}</span>
                          <span>{count} ({overview.total > 0 ? Math.round(count / overview.total * 100) : 0}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all`}
                            style={{ width: `${overview.total > 0 ? (count / overview.total * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue breakdown */}
                <div className="bg-white border border-slate-200 rounded-sm">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="font-semibold text-sm text-slate-800">Revenue Breakdown</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { label: 'Free Plan',              value: 0,                                       note: 'No charge' },
                      { label: 'Premium × ' + overview.premium, value: overview.premium * 299,           note: '₹299 each' },
                      { label: 'Platinum × ' + overview.platinum, value: overview.platinum * 599,        note: '₹599 each' },
                    ].map(({ label, value, note }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-sm text-slate-700 font-medium">{label}</p>
                          <p className="text-[10px] text-slate-400">{note}</p>
                        </div>
                        <p className="text-sm font-semibold text-green-700">₹{value.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t-2 border-slate-200 mt-1">
                      <p className="text-sm font-bold text-slate-800">Total Revenue</p>
                      <p className="text-base font-bold text-green-700">₹{overview.revenue.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── CITIZENS ── */}
          {tab === 'citizens' && (
            <div className="bg-white border border-slate-200 rounded-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <p className="font-semibold text-sm text-slate-800">All Citizens ({filteredCitizens.length})</p>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={citizenSearch}
                    onChange={e => setCitizenSearch(e.target.value)}
                    placeholder="Search name or phone…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-[#003580] w-52"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Name', 'Phone', 'Plan', 'Aadhaar', 'Blood', 'Joined', 'Change Plan'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCitizens.map(c => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{c.full_name}</td>
                        <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.plan || 'free'} /></td>
                        <td className="px-4 py-3">
                          {c.aadhaar_verified
                            ? <span className="text-green-600 font-bold text-xs">✓ Verified</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.blood_group || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={c.plan || 'free'}
                            onChange={e => changePlan(c.user_id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#003580] bg-white cursor-pointer"
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="platinum">Platinum</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {filteredCitizens.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No citizens found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REVENUE ── */}
          {tab === 'revenue' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={IndianRupee} label="Total Revenue"      value={`₹${totalRevenue.toLocaleString('en-IN')}`}                    color="green"  />
                <StatCard icon={IndianRupee} label="Est. MRR"           value={`₹${Math.round(totalRevenue / 12).toLocaleString('en-IN')}`}    color="emerald" sub="Annual ÷ 12" />
                <StatCard icon={Zap}         label="Active Premium"     value={premiumActive}                                                  color="blue"   sub="₹299/yr each" />
                <StatCard icon={Crown}       label="Active Platinum"    value={platinumActive}                                                  color="amber"  sub="₹599/yr each" />
              </div>
              <div className="bg-white border border-slate-200 rounded-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-sm text-slate-800">Subscription History ({subscriptions.length})</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Citizen ID', 'Plan', 'Amount', 'Status', 'Razorpay Payment', 'Start Date', 'End Date'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map(s => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-slate-400">{s.user_id?.slice(0, 8)}…</td>
                          <td className="px-4 py-2.5"><StatusBadge status={s.plan} /></td>
                          <td className="px-4 py-2.5 font-semibold text-green-700">
                            ₹{s.plan === 'premium' ? '299' : s.plan === 'platinum' ? '599' : '0'}
                          </td>
                          <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                          <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{s.razorpay_payment_id || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{new Date(s.start_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-slate-500">{s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN') : '—'}</td>
                        </tr>
                      ))}
                      {subscriptions.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No subscriptions yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── CARD DELIVERY ── */}
          {tab === 'delivery' && (
            <>
              {/* Filter pills */}
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'processing', 'dispatched', 'delivered', 'cancelled'].map(s => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className={`px-3 py-1 rounded-sm text-xs font-semibold border capitalize transition-colors ${
                      orderFilter === s
                        ? 'bg-[#003580] text-white border-[#003580]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#003580] hover:text-[#003580]'
                    }`}
                  >
                    {s} ({s === 'all' ? orders.length : orders.filter(o => o.status === s).length})
                  </button>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-sm text-slate-800">Physical ID Card Orders</p>
                  <p className="text-xs text-slate-500 mt-0.5">Update status to automatically notify citizens · India Post tracking</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Citizen', 'Plan', 'Delivery Address', 'Status', 'Tracking No.', 'Requested', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(o => (
                        <React.Fragment key={o.id}>
                          <tr className="border-b border-slate-50 hover:bg-slate-50/80">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{o.full_name}</p>
                              <p className="text-slate-400 text-[10px] mt-0.5">{o.phone || '—'}</p>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={o.plan} /></td>
                            <td className="px-4 py-3 max-w-[160px]">
                              <p className="text-slate-600 leading-snug line-clamp-2" title={o.address}>{o.address}</p>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                            <td className="px-4 py-3 font-mono text-slate-500">{o.tracking_number || '—'}</td>
                            <td className="px-4 py-3 text-slate-400">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3">
                              {o.status !== 'delivered' && o.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    setUpdatingId(updatingId === o.id ? null : o.id);
                                    setNewStatus(''); setTrackingInput('');
                                  }}
                                  className="flex items-center gap-1 text-xs text-[#003580] font-semibold hover:underline"
                                >
                                  <Truck className="h-3 w-3" /> Update
                                </button>
                              )}
                            </td>
                          </tr>
                          {updatingId === o.id && (
                            <tr className="bg-blue-50/60 border-b border-blue-100">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="flex flex-wrap items-end gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">New Status</label>
                                    <select
                                      value={newStatus}
                                      onChange={e => setNewStatus(e.target.value)}
                                      className="text-xs border border-slate-300 rounded-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#003580] bg-white"
                                    >
                                      <option value="">Select status…</option>
                                      {['processing', 'dispatched', 'delivered', 'cancelled'].map(s => (
                                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">India Post Tracking No.</label>
                                    <input
                                      value={trackingInput}
                                      onChange={e => setTrackingInput(e.target.value)}
                                      placeholder="e.g. EM123456789IN"
                                      className="text-xs border border-slate-300 rounded-sm px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-[#003580] w-44"
                                    />
                                  </div>
                                  <button
                                    onClick={() => updateOrderStatus(o.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003580] text-white text-xs rounded-sm font-semibold hover:bg-[#002060] transition-colors"
                                  >
                                    <Send className="h-3 w-3" /> Confirm & Notify Citizen
                                  </button>
                                  <button
                                    onClick={() => setUpdatingId(null)}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No card orders found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'documents' && (
            <>
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'verified', 'rejected'].map(s => (
                  <button
                    key={s}
                    onClick={() => setDocFilter(s)}
                    className={`px-3 py-1 rounded-sm text-xs font-semibold border capitalize transition-colors ${
                      docFilter === s
                        ? 'bg-[#003580] text-white border-[#003580]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#003580]'
                    }`}
                  >
                    {s} ({s === 'all' ? allDocs.length : allDocs.filter(d => d.verification_status === s).length})
                  </button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-sm text-slate-800">Document Verification Queue</p>
                  <p className="text-xs text-slate-500">{allDocs.filter(d => d.verification_status === 'pending').length} pending · {allDocs.length} total</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Document Name', 'Type', 'Citizen', 'Uploaded', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map(doc => (
                        <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{doc.document_name}</td>
                          <td className="px-4 py-3 text-slate-600 capitalize">{doc.document_type}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-700">{profileMap[doc.user_id]?.full_name || '—'}</p>
                            <p className="text-slate-400 text-[10px]">{profileMap[doc.user_id]?.phone || doc.user_id?.slice(0, 8) + '…'}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{new Date(doc.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3"><StatusBadge status={doc.verification_status || 'pending'} /></td>
                          <td className="px-4 py-3">
                            {doc.verification_status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => verifyDocument(doc.id, doc.user_id, doc.document_name, 'verified')}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[11px] font-semibold hover:bg-green-100 transition-colors"
                                >
                                  <CheckCircle className="h-3 w-3" /> Verify
                                </button>
                                <button
                                  onClick={() => verifyDocument(doc.id, doc.user_id, doc.document_name, 'rejected')}
                                  className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[11px] font-semibold hover:bg-red-100 transition-colors"
                                >
                                  <XCircle className="h-3 w-3" /> Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredDocs.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No documents found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── NOTIFICATIONS ── */}
          {tab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Compose */}
              <div className="bg-white border border-slate-200 rounded-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-sm text-slate-800">Send Notification</p>
                  <p className="text-xs text-slate-500 mt-0.5">Alert a specific citizen or broadcast to everyone</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Recipient</label>
                    <select
                      value={notifForm.recipient}
                      onChange={e => setNotifForm(f => ({ ...f, recipient: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#003580]"
                    >
                      <option value="all">📢 All Citizens (Broadcast)</option>
                      <option value="specific">👤 Specific Citizen</option>
                    </select>
                  </div>

                  {notifForm.recipient === 'specific' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Citizen User ID (UUID)</label>
                      <input
                        value={notifForm.userId}
                        onChange={e => setNotifForm(f => ({ ...f, userId: e.target.value }))}
                        placeholder="Paste user_id from Citizens tab"
                        className="w-full text-xs border border-slate-200 rounded-sm px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-[#003580]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Type</label>
                    <select
                      value={notifForm.type}
                      onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#003580]"
                    >
                      <option value="info">ℹ️ Info</option>
                      <option value="success">✅ Success</option>
                      <option value="warning">⚠️ Warning</option>
                      <option value="delivery">📦 Delivery Update</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Title</label>
                    <input
                      value={notifForm.title}
                      onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Notification title"
                      className="w-full text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#003580]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Message</label>
                    <textarea
                      value={notifForm.message}
                      onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Enter your message to the citizen(s)…"
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#003580] resize-none"
                    />
                  </div>

                  <button
                    onClick={sendNotification}
                    disabled={sending || !notifForm.title || !notifForm.message}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#003580] hover:bg-[#002060] text-white text-sm font-semibold rounded-sm disabled:opacity-50 transition-colors"
                  >
                    {sending
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Sending…</>
                      : <><Send className="h-4 w-4" /> {notifForm.recipient === 'all' ? 'Broadcast to All Citizens' : 'Send to Citizen'}</>
                    }
                  </button>
                </div>
              </div>

              {/* Sent log */}
              <div className="bg-white border border-slate-200 rounded-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="font-semibold text-sm text-slate-800">Sent Notifications ({sentNotifs.length})</p>
                  <button onClick={fetchNotifications} className="flex items-center gap-1 text-xs text-[#003580] hover:underline">
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                </div>
                <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                  {sentNotifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">No notifications sent yet</div>
                  ) : (
                    sentNotifs.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50/60">
                        <div className="flex gap-2">
                          <span className="text-base shrink-0 leading-none mt-0.5">
                            {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'delivery' ? '📦' : 'ℹ️'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(n.created_at).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {n.user_id ? `→ ${n.user_id.slice(0, 8)}…` : '📢 Broadcast'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
