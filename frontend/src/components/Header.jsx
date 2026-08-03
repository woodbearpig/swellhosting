import { NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/blog', label: 'Journal' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header className="public-header">
      <div className="container-narrow flex items-center justify-between h-16 sm:h-20">
        <Link to="/" data-testid="header-logo-link" className="flex items-center">
          <Logo size={44} />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`header-nav-${n.label.toLowerCase()}`}
              className={({ isActive }) => `text-sm font-medium link-underline ${isActive ? 'text-[color:var(--brand-sage-deep)]' : 'text-[color:var(--brand-text)]'}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            data-testid="header-theme-toggle"
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--brand-border)] bg-white/70 hover:bg-white dark:bg-transparent"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/inquire" data-testid="header-inquire-cta" className="hidden sm:inline-flex btn-primary">
            Start inquiry
          </Link>
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
        <div className="lg:hidden border-t border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] dark:bg-transparent">
          <div className="container-narrow py-4 flex flex-col gap-2">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `py-2 text-base ${isActive ? 'text-[color:var(--brand-sage-deep)]' : ''}`}
                data-testid={`mobile-nav-${n.label.toLowerCase()}`}
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/inquire" onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">Start inquiry</Link>
            <button onClick={toggle} className="btn-secondary mt-2 w-full">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
