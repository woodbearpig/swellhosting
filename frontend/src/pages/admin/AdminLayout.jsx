import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Inbox, Users, CalendarClock, Boxes, Image, MessageSquare, HelpCircle, BookOpen, Settings, LogOut, Menu, X, Palette, Plug, Layout as LayoutIcon, FileText, FolderOpen, Home, Sparkles, User as UserIcon, Navigation, PanelBottom, AtSign, EyeOff, Frame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Toaster } from 'sonner';

const groups = [
  {
    label: 'Work',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
      { to: '/admin/clients', label: 'Clients', icon: Users },
      { to: '/admin/consultations', label: 'Scheduled calls', icon: CalendarClock },
    ],
  },
  {
    label: 'Pages',
    items: [
      { to: '/admin/home', label: 'Home page', icon: Home },
      { to: '/admin/about', label: 'About page', icon: UserIcon },
      { to: '/admin/coming-soon', label: 'Coming soon', icon: EyeOff },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/services', label: 'Services', icon: Boxes },
      { to: '/admin/backdrops', label: 'Backdrops & Designs', icon: Frame },
      { to: '/admin/portfolio', label: 'Portfolio', icon: Image },
      { to: '/admin/media', label: 'Media library', icon: FolderOpen },
      { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
      { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
      { to: '/admin/blog', label: 'Blog', icon: BookOpen },
      { to: '/admin/inquiry-form', label: 'Inquiry form', icon: FileText },
    ],
  },
  {
    label: 'Site chrome',
    items: [
      { to: '/admin/brand', label: 'Brand & fonts', icon: Sparkles },
      { to: '/admin/nav', label: 'Header & nav', icon: Navigation },
      { to: '/admin/footer', label: 'Footer', icon: PanelBottom },
      { to: '/admin/social-contact', label: 'Contact & social', icon: AtSign },
      { to: '/admin/palettes', label: 'Palettes', icon: Palette },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/integrations', label: 'Integrations', icon: Plug },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const AdminLayout = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Reset scroll and force page re-mount on every admin route change.
  // Using `key={location.pathname}` on the Outlet wrapper guarantees that
  // the previously-mounted admin page unmounts (releasing any stale local
  // state) and the new one mounts fresh — this defends against the rare
  // "URL updated but content unchanged" symptom reported in Chrome after
  // editing a field then navigating without saving.
  useEffect(() => {
    // Scroll main content region to top on route change (nice UX)
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { /* noop */ }
  }, [location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  return (
    <div className="min-h-screen bg-[color:var(--brand-cream)] dark:bg-[#141312] text-[color:var(--brand-text)] dark:text-[#F4EFE8]">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-[color:var(--brand-border)] bg-white/90 backdrop-blur">
        <button onClick={() => setOpen(true)} className="h-9 w-9 rounded-full inline-flex items-center justify-center border border-[color:var(--brand-border)]" data-testid="admin-sidebar-toggle"><Menu className="h-4 w-4" /></button>
        <Logo size={30} />
        <button onClick={handleLogout} className="h-9 w-9 rounded-full inline-flex items-center justify-center border border-[color:var(--brand-border)]"><LogOut className="h-4 w-4" /></button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`admin-sidebar shrink-0 lg:sticky lg:top-0 lg:h-screen fixed lg:relative inset-y-0 left-0 z-40 bg-[color:var(--brand-surface-2)] border-r border-[color:var(--brand-border)] transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} data-testid="admin-sidebar">
          <div className="px-5 py-5 flex items-center justify-between">
            <Logo size={40} />
            <button onClick={() => setOpen(false)} className="lg:hidden"><X className="h-5 w-5" /></button>
          </div>
          <nav className="px-3 pb-4 space-y-5 overflow-y-auto max-h-[calc(100vh-70px)]">
            {groups.map(g => (
              <div key={g.label}>
                <p className="eyebrow px-2 mb-1">{g.label}</p>
                {g.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-white text-[color:var(--brand-sage-deep)] font-medium shadow-sm' : 'text-[color:var(--brand-text)] hover:bg-white/60'}`} data-testid={`admin-nav-${item.label.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-')}`}>
                      <Icon className="h-4 w-4" /> {item.label}
                    </NavLink>
                  );
                })}
              </div>
            ))}
            <button onClick={handleLogout} className="w-full mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/60" data-testid="admin-logout-button">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </aside>

        {/* Content — key uses location.key so it changes on EVERY navigation
            event (even to the same pathname). This is the strongest possible
            defense against the "URL updated but content didn't" symptom by
            forcing the previously-mounted admin page to unmount cleanly on
            every route change. */}
        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10" key={location.key || location.pathname}>
          <Outlet />
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
};

export default AdminLayout;
