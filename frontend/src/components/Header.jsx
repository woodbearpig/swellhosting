import { NavLink, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { useSite } from '@/context/SiteContext';

const DEFAULT_NAV = [
  { id: 'nav-services', label: 'Services', href: '/services', visible: true, new_tab: false },
  { id: 'nav-gallery', label: 'Gallery', href: '/gallery', visible: true, new_tab: false },
  { id: 'nav-about', label: 'About', href: '/about', visible: true, new_tab: false },
  { id: 'nav-testimonials', label: 'Testimonials', href: '/testimonials', visible: true, new_tab: false },
  { id: 'nav-blog', label: 'Blog', href: '/blog', visible: true, new_tab: false },
  { id: 'nav-faq', label: 'FAQ', href: '/faq', visible: true, new_tab: false },
  { id: 'nav-contact', label: 'Contact', href: '/contact', visible: true, new_tab: false },
];

const isExternal = (href) => {
  if (!href) return false;
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
};

const testId = (label) => `header-nav-${(label || 'link').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** Renders a single nav item, either as an internal <NavLink> or external <a>. */
const NavItem = ({ item, mobile = false, onClick }) => {
  const external = isExternal(item.href) || item.new_tab;
  const desktopBase = 'text-sm font-medium link-underline';
  const mobileBase = 'py-2 text-base';
  const cls = mobile ? mobileBase : desktopBase;

  if (external) {
    return (
      <a
        href={item.href}
        target={item.new_tab ? '_blank' : undefined}
        rel={item.new_tab ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        className={`${cls} text-[color:var(--brand-text)]`}
        data-testid={mobile ? `mobile-${testId(item.label)}` : testId(item.label)}
      >
        {item.label}
      </a>
    );
  }
  return (
    <NavLink
      to={item.href || '/'}
      onClick={onClick}
      className={({ isActive }) => `${cls} ${isActive ? 'text-[color:var(--brand-sage-deep)]' : 'text-[color:var(--brand-text)]'}`}
      data-testid={mobile ? `mobile-${testId(item.label)}` : testId(item.label)}
    >
      {item.label}
    </NavLink>
  );
};

export const Header = () => {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { site } = useSite();

  const navItems = useMemo(() => {
    const configured = Array.isArray(site?.header_nav_items) && site.header_nav_items.length > 0
      ? site.header_nav_items
      : DEFAULT_NAV;
    const servicesDisabled = site?.services_page_active === false;
    const blogDisabled = site?.blog_page_active === false;
    return configured.filter(n => {
      if (!n || n.visible === false || !n.label || !n.href) return false;
      // Hide any nav item pointing to /services (or a sub-route) when the
      // owner has disabled the Services page site-wide.
      if (servicesDisabled && typeof n.href === 'string' && n.href.startsWith('/services')) return false;
      // Same for /blog.
      if (blogDisabled && typeof n.href === 'string' && n.href.startsWith('/blog')) return false;
      return true;
    });
  }, [site?.header_nav_items, site?.services_page_active, site?.blog_page_active]);

  const showLogo = site?.header_show_logo !== false;
  const showThemeToggle = site?.header_show_theme_toggle !== false;
  const showInquireCta = site?.header_show_inquire_cta !== false;

  return (
    <header className="public-header" data-testid="site-header">
      <div className="container-narrow flex items-center justify-between h-16 sm:h-20">
        {showLogo ? (
          <Link to="/" data-testid="header-logo-link" className="flex items-center">
            <Logo size={44} />
          </Link>
        ) : (
          <span aria-hidden="true" className="w-11" />
        )}

        <nav className="hidden lg:flex items-center gap-7" data-testid="header-desktop-nav">
          {navItems.map(n => <NavItem key={n.id || n.href} item={n} />)}
        </nav>

        <div className="flex items-center gap-2">
          {showThemeToggle && (
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              data-testid="header-theme-toggle"
              className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--brand-border)] bg-white/70 hover:bg-white dark:bg-transparent"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          {showInquireCta && (
            <Link to="/inquire" data-testid="header-inquire-cta" className="hidden sm:inline-flex btn-primary">
              Start inquiry
            </Link>
          )}
          <button
            className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-full border border-[color:var(--brand-border)]"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
            data-testid="header-mobile-menu-toggle"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] dark:bg-transparent" data-testid="header-mobile-nav">
          <div className="container-narrow py-4 flex flex-col gap-2">
            {navItems.map(n => <NavItem key={n.id || n.href} item={n} mobile onClick={() => setOpen(false)} />)}
            {showInquireCta && (
              <Link to="/inquire" onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">Start inquiry</Link>
            )}
            {showThemeToggle && (
              <button onClick={toggle} className="btn-secondary mt-2 w-full">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
