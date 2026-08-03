import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { useSite } from '@/context/SiteContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const Footer = () => {
  const { site } = useSite();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await api.post('/newsletter', { email });
      toast.success('Thank you for subscribing!');
      setEmail('');
    } catch (_) {
      toast.error('Please enter a valid email');
    } finally { setBusy(false); }
  };

  return (
    <footer className="public-footer mt-20">
      <div className="container-narrow py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <Logo size={50} />
          <p className="mt-4 text-sm text-[color:var(--brand-text-muted)] leading-relaxed max-w-xs">
            {site?.footer_blurb || 'Custom event styling & balloon installations. Los Angeles.'}
          </p>
        </div>

        <div>
          <p className="eyebrow mb-3">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services" className="link-underline">Services</Link></li>
            <li><Link to="/gallery" className="link-underline">Gallery</Link></li>
            <li><Link to="/about" className="link-underline">About</Link></li>
            <li><Link to="/blog" className="link-underline">Journal</Link></li>
            <li><Link to="/faq" className="link-underline">FAQ</Link></li>
            <li><Link to="/contact" className="link-underline">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">Get in touch</p>
          <ul className="space-y-3 text-sm text-[color:var(--brand-text-muted)]">
            {site?.contact_email && (<li className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href={`mailto:${site.contact_email}`} className="link-underline">{site.contact_email}</a></li>)}
            {site?.contact_phone && (<li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {site.contact_phone}</li>)}
            {site?.contact_location && (<li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {site.contact_location}</li>)}
            {site?.contact_hours && (<li className="pl-6">{site.contact_hours}</li>)}
          </ul>
          <div className="flex items-center gap-3 mt-4">
            {site?.instagram_url && (<a href={site.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)]"><Instagram className="h-4 w-4" /></a>)}
            {site?.facebook_url && (<a href={site.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)]"><Facebook className="h-4 w-4" /></a>)}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">{site?.newsletter_title || 'Stay in the loop'}</p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mb-3">
            {site?.newsletter_subtitle || 'Seasonal offers, styling tips, and behind-the-scenes.'}
          </p>
          <form onSubmit={subscribe} className="flex gap-2" data-testid="footer-newsletter-form">
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-cream flex-1"
              data-testid="footer-newsletter-email"
            />
            <button disabled={busy} className="btn-primary" data-testid="footer-newsletter-submit">Join</button>
          </form>
        </div>
      </div>

      <div className="border-t border-[color:var(--brand-border)]">
        <div className="container-narrow py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[color:var(--brand-text-muted)]">
          <p>© {new Date().getFullYear()} swell design + media. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="link-underline">Privacy</Link>
            <Link to="/terms" className="link-underline">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
