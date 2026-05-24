import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, FileText, ListChecks, CreditCard, HelpCircle, Zap, Crown, LayoutDashboard, UserCircle, Menu, X, Landmark, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAdmin } from '@/hooks/useAdmin';
import LanguageSelector from '@/components/LanguageSelector';
import NotificationBell from '@/components/NotificationBell';

interface GovLayoutProps {
  children: React.ReactNode;
  minimal?: boolean;
}

/* ── Ashoka Chakra SVG — 24-spoke dharma wheel ── */
function AshokaChakra({ size = 40 }: { size?: number }) {
  const cx = 20, cy = 20, outerR = 17.5, innerR = 5;
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15 - 90) * (Math.PI / 180);
    return {
      x1: cx + innerR * Math.cos(angle),
      y1: cy + innerR * Math.sin(angle),
      x2: cx + outerR * Math.cos(angle),
      y2: cy + outerR * Math.sin(angle),
    };
  });
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#003580" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#003580" strokeWidth="1.5" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#003580" strokeWidth="0.9" />
      ))}
    </svg>
  );
}

function PlanChip({ plan }: { plan: string }) {
  if (plan === 'platinum')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide"><Crown className="h-3 w-3" /> Platinum</span>;
  if (plan === 'premium')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-bold bg-blue-100 text-[#003580] border border-blue-300 uppercase tracking-wide"><Zap className="h-3 w-3" /> Premium</span>;
  return null;
}

/* CitizenNavItem — hook at component level, not inside map */
function CitizenNavItem({ to, label, icon: Icon, mobile, onClick }: {
  to: string; label: string; icon: React.ElementType; mobile?: boolean; onClick?: () => void;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get('tab') || 'overview';

  let isActive: boolean;
  if (to === '/help') {
    isActive = location.pathname === '/help';
  } else if (to.startsWith('/dashboard')) {
    const toParams = new URLSearchParams(to.includes('?') ? to.split('?')[1] : '');
    const toTab = toParams.get('tab') || 'overview';
    isActive = location.pathname === '/dashboard' && currentTab === toTab;
  } else {
    isActive = location.pathname === to;
  }

  if (mobile) {
    return (
      <Link to={to} onClick={onClick}
        className={`flex items-center gap-2 py-2.5 px-3 text-sm border-b border-slate-100 ${
          isActive ? 'text-[#003580] font-semibold bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  }

  return (
    <Link to={to} onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
        isActive
          ? 'text-[#003580] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#003580]'
          : 'text-slate-600 hover:text-[#003580] hover:bg-slate-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

export default function GovLayout({ children, minimal = false }: GovLayoutProps) {
  const { t } = useTranslation('common');
  const { user, signOut } = useAuth();
  const { plan } = useUserPlan();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/'); };
  const isLoggedIn = !!user;

  const PUBLIC_NAV = [
    { to: '/', label: t('nav.home') },
    { to: '/features', label: t('nav.features') },
    { to: '/schemes', label: t('nav.schemes') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/about', label: t('nav.about') },
    { to: '/scan', label: t('nav.verify') },
    { to: '/help', label: t('nav.help') },
  ];

  const CITIZEN_NAV = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard },
    { to: '/dashboard?tab=documents', label: t('nav.my_documents'), icon: FileText },
    { to: '/dashboard?tab=checklist', label: t('nav.checklist'), icon: ListChecks },
    { to: '/dashboard?tab=digital-id', label: t('nav.digital_id'), icon: CreditCard },
    { to: '/schemes', label: t('nav.schemes'), icon: Landmark },
    { to: '/dashboard?tab=profile', label: t('nav.profile'), icon: UserCircle },
    { to: '/help', label: t('nav.help'), icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f7] text-[#0f172a]" style={{ fontFamily: "'Noto Sans','Segoe UI',Arial,sans-serif" }}>

      {/* ── Tricolor stripe ── */}
      <div className="h-1 flex shrink-0 z-50 sticky top-0">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-gray-200" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ── Government identity bar ── */}
      <div className="bg-[#003580] text-white text-[11px] shrink-0">
        <div className="container mx-auto max-w-7xl px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-wide">{t('gov.bharat')} · {t('gov.india')}</span>
            <span className="text-blue-300 hidden sm:inline">|</span>
            <span className="text-blue-200 hidden sm:inline">{t('gov.ministry')}</span>
          </div>
          <span className="hidden md:inline text-blue-200 tracking-wide text-[10px]">{t('gov.digital_india')}</span>
        </div>
      </div>

      {/* ── Main header: emblem + logo + plan/auth ── */}
      <header className="bg-white border-b-2 border-[#003580] shadow-sm shrink-0">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          {/* Emblem + logo */}
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 min-w-0 shrink-0">
            <AshokaChakra size={40} />
            <div className="leading-tight min-w-0 border-l-2 border-[#003580] pl-3">
              <p className="font-bold text-[#003580] text-base sm:text-lg truncate leading-none">{t('portal.name')}</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{t('portal.tagline')} · {t('portal.tagline_native')}</p>
            </div>
          </Link>

          {!minimal && (
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSelector />
              {isLoggedIn ? (
                <>
                  {plan === 'free' ? (
                    <Link to="/pricing"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#FF6200] hover:bg-[#d94f00] text-white rounded-sm transition-colors uppercase tracking-wide"
                    >
                      <Zap className="h-3 w-3" /> {t('actions.upgrade')}
                    </Link>
                  ) : (
                    <PlanChip plan={plan} />
                  )}
                  <NotificationBell />
                  <button onClick={handleSignOut}
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 rounded-sm text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wide font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t('nav.sign_out')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth"
                    className="hidden sm:inline-flex px-4 py-1.5 text-sm text-[#003580] border border-[#003580] rounded-sm hover:bg-blue-50 font-semibold transition-colors"
                  >{t('nav.login')}</Link>
                  <Link to="/register"
                    className="hidden sm:inline-flex px-4 py-1.5 text-sm bg-[#003580] text-white rounded-sm hover:bg-[#002060] font-semibold transition-colors"
                  >{t('nav.register')}</Link>
                </>
              )}
              <button className="sm:hidden p-2 text-slate-700" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          )}

        </div>
      </header>

      {/* ── Navigation bar (separate row, official style) ── */}
      {!minimal && (
        <nav className="bg-[#f0f4fa] border-b border-[#c8d4e8] shrink-0 hidden sm:block">
          <div className="container mx-auto max-w-7xl px-4 flex items-center">
            {isLoggedIn ? (
              <>
                {CITIZEN_NAV.map(n => (
                  <CitizenNavItem key={n.to} to={n.to} label={n.label} icon={n.icon} />
                ))}
                {isAdmin && (
                  <Link to="/admin"
                    className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      location.pathname === '/admin'
                        ? 'text-red-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-red-600'
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
              </>
            ) : (
              PUBLIC_NAV.map(n => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'}
                  className={({ isActive }) =>
                    `relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-[#003580] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#003580]'
                        : 'text-slate-600 hover:text-[#003580] hover:bg-slate-100'
                    }`
                  }
                >{n.label}</NavLink>
              ))
            )}
          </div>
        </nav>
      )}

      {/* ── Mobile nav drawer ── */}
      {!minimal && open && (
        <div className="sm:hidden border-b-2 border-[#003580] bg-white shadow-md z-40">
          <div className="flex flex-col">
            {isLoggedIn ? (
              <>
                {CITIZEN_NAV.map(n => (
                  <CitizenNavItem key={n.to} to={n.to} label={n.label} icon={n.icon} mobile onClick={() => setOpen(false)} />
                ))}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 py-2.5 px-3 text-sm border-b border-slate-100 text-red-600 font-semibold hover:bg-red-50"
                  >
                    <Settings className="h-4 w-4" /> Admin Panel
                  </Link>
                )}
                <div className="flex gap-2 p-3 border-t border-slate-100">
                  {plan === 'free' ? (
                    <Link to="/pricing" onClick={() => setOpen(false)}
                      className="flex-1 text-center py-2 text-sm font-bold bg-[#FF6200] text-white rounded-sm uppercase tracking-wide"
                    >⚡ {t('actions.upgrade')}</Link>
                  ) : (
                    <span className="flex-1 text-center py-2 text-sm font-bold text-[#003580]">
                      {plan === 'platinum' ? '🏅 Platinum' : '⚡ Premium'} Plan
                    </span>
                  )}
                  <button onClick={() => { setOpen(false); handleSignOut(); }}
                    className="flex-1 py-2 text-sm border border-slate-300 rounded-sm text-slate-700 font-semibold"
                  >{t('nav.sign_out')}</button>
                </div>
              </>
            ) : (
              <>
                {PUBLIC_NAV.map(n => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `py-2.5 px-4 text-sm border-b border-slate-100 ${isActive ? 'text-[#003580] font-semibold bg-blue-50' : 'text-slate-700'}`
                    }
                  >{n.label}</NavLink>
                ))}
                <div className="flex gap-2 p-3 border-t border-slate-100">
                  <Link to="/auth" onClick={() => setOpen(false)}
                    className="flex-1 text-center py-2 text-sm border border-[#003580] text-[#003580] rounded-sm font-semibold"
                  >{t('nav.login')}</Link>
                  <Link to="/register" onClick={() => setOpen(false)}
                    className="flex-1 text-center py-2 text-sm bg-[#003580] text-white rounded-sm font-semibold"
                  >{t('nav.register')}</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="bg-[#003580] text-blue-100 mt-8">
        <div className="container mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <AshokaChakra size={32} />
              <div>
                <p className="font-bold text-white text-sm">{t('portal.name')}</p>
                <p className="text-blue-300 text-[11px]">{t('portal.tagline_native')}</p>
              </div>
            </div>
            <p className="text-blue-200 text-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <p className="text-white font-bold mb-2 text-xs uppercase tracking-wide border-b border-blue-400/30 pb-1">{t('footer.portal_title')}</p>
            <ul className="space-y-1.5 text-xs">
              {[
                ['/', t('nav.home')],
                ['/features', t('nav.features')],
                ['/pricing', t('nav.pricing')],
                ['/about', t('nav.about')],
              ].map(([to, label]) => (
                <li key={to}><Link to={to} className="hover:text-white hover:underline transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold mb-2 text-xs uppercase tracking-wide border-b border-blue-400/30 pb-1">{t('footer.services_title')}</p>
            <ul className="space-y-1.5 text-xs">
              {[
                ['/scan', t('footer.verify_doc')],
                ['/auth', t('footer.citizen_login')],
                ['/register', t('footer.new_registration')],
                ['/help', t('footer.help_support')],
              ].map(([to, label]) => (
                <li key={to}><Link to={to} className="hover:text-white hover:underline transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold mb-2 text-xs uppercase tracking-wide border-b border-blue-400/30 pb-1">{t('footer.contact_title')}</p>
            <ul className="space-y-1.5 text-xs text-blue-200">
              <li>{t('footer.email')}</li>
              <li>{t('footer.toll_free')}</li>
              <li>{t('footer.hours')}</li>
              <li>{t('footer.timing')}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-900/40 text-[11px] text-blue-200">
          <div className="container mx-auto max-w-7xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <p className="text-blue-300">Best viewed on modern browsers · {t('footer.standards')}</p>
          </div>
        </div>

        {/* Tricolor bottom strip */}
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </footer>
    </div>
  );
}

/* ── GovPageHeader — official page header banner ── */
export function GovPageHeader({ title, subtitle, breadcrumb }: {
  title: string; subtitle?: string; breadcrumb?: string;
}) {
  return (
    <section className="bg-[#003580] text-white">
      <div className="container mx-auto max-w-7xl px-4 py-5">
        {breadcrumb && (
          <p className="text-[11px] text-blue-200 mb-1 tracking-widest uppercase">{breadcrumb}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-blue-200 mt-1 text-sm max-w-3xl">{subtitle}</p>}
      </div>
      <div className="h-px bg-[#FF6200]/60" />
    </section>
  );
}

/* ── GovCard — official bordered card ── */
export function GovCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#cdd3da] rounded-sm shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ── GovSectionHeader — blue left-border section title ── */
export function GovSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-l-4 border-[#003580] pl-3 mb-4">
      <h2 className="font-bold text-[#003580] text-base">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
