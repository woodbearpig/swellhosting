import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Instagram, Mail, Phone, Calendar as CalIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSite } from '@/context/SiteContext';
import { Logo } from '@/components/Logo';
import { api } from '@/lib/api';

const ComingSoonPage = () => {
  const { site } = useSite();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await api.post('/newsletter', { email, source: 'coming_soon' });
      toast.success("Thanks! We'll let you know when we're live.");
      setEmail('');
    } catch (_) { toast.error('Please enter a valid email'); }
    finally { setBusy(false); }
  };

  if (!site) return null;

  // Resolve display values with override → fallback logic. Empty overrides fall through to main site fields.
  const emailValue = (site.coming_soon_email_override || site.contact_email || '').trim();
  const phoneValue = (site.coming_soon_phone_override || site.contact_phone || '').trim();
  const instagramValue = (site.coming_soon_instagram_override || site.instagram_url || '').trim();

  const showEmail = site.coming_soon_show_email !== false && !!emailValue;
  const showPhone = site.coming_soon_show_phone !== false && !!phoneValue;
  const showInstagram = site.coming_soon_show_instagram !== false && !!instagramValue;
  const showContactRow = showEmail || showPhone || showInstagram;

  const footerText = (site.coming_soon_footer_text || '').trim();
  const autoFooter = `© ${new Date().getFullYear()} ${site.business_name || 'swell design + media'} · ${site.contact_location || 'Los Angeles'}`;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[color:var(--brand-cream)] px-4 py-16" data-testid="coming-soon-page">
      <div className="hero-wash absolute inset-0" aria-hidden />
      <div className="watercolor-noise absolute inset-0 opacity-60" aria-hidden />
      <div className="blob b-peach" style={{ width: 320, height: 320, top: -80, left: -80 }} />
      <div className="blob b-rose" style={{ width: 260, height: 260, top: '30%', right: -80 }} />
      <div className="blob b-sage" style={{ width: 300, height: 300, bottom: -100, left: '40%' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-2xl mx-auto text-center"
      >
        {site.coming_soon_show_logo !== false && (
          <div className="flex justify-center mb-8" data-testid="coming-soon-logo">
            <Logo size={140} />
          </div>
        )}

        {(site.coming_soon_eyebrow || '').trim() && (
          <div className="eyebrow mb-4" data-testid="coming-soon-eyebrow">{site.coming_soon_eyebrow}</div>
        )}

        {(site.coming_soon_title || '').trim() && (
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-[-0.02em]" data-testid="coming-soon-title">
            {site.coming_soon_title}
          </h1>
        )}

        {(site.coming_soon_script || '').trim() && (
          <p className="font-script text-5xl text-[color:var(--brand-sage-deep)] mt-4" data-testid="coming-soon-script">
            {site.coming_soon_script}
          </p>
        )}

        {(site.coming_soon_message || '').trim() && (
          <p className="mt-6 text-lg text-[color:var(--brand-text-muted)] max-w-lg mx-auto leading-relaxed" data-testid="coming-soon-message">
            {site.coming_soon_message}
          </p>
        )}

        {(site.coming_soon_launch_date || '').trim() && (
          <div className="mt-6 inline-flex items-center gap-2 badge-soft !text-sm" data-testid="coming-soon-launch-date">
            <CalIcon className="h-4 w-4" /> Launching {site.coming_soon_launch_date}
          </div>
        )}

        {site.coming_soon_show_newsletter !== false && (
          <form onSubmit={subscribe} className="mt-10 max-w-md mx-auto flex flex-col sm:flex-row gap-2" data-testid="coming-soon-newsletter">
            <input
              type="email"
              placeholder={site.coming_soon_newsletter_placeholder || 'you@email.com'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-cream flex-1 text-center sm:text-left"
              data-testid="coming-soon-email"
            />
            <button disabled={busy} className="btn-primary" data-testid="coming-soon-submit">
              <Sparkles className="h-4 w-4" /> {site.coming_soon_newsletter_button || 'Notify me'}
            </button>
          </form>
        )}

        {showContactRow && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-[color:var(--brand-text-muted)]" data-testid="coming-soon-contact-row">
            {showEmail && (
              <a href={`mailto:${emailValue}`} className="inline-flex items-center gap-2 link-underline" data-testid="coming-soon-contact-email">
                <Mail className="h-4 w-4" /> {emailValue}
              </a>
            )}
            {showPhone && (
              <span className="inline-flex items-center gap-2" data-testid="coming-soon-contact-phone">
                <Phone className="h-4 w-4" /> {phoneValue}
              </span>
            )}
            {showInstagram && (
              <a href={instagramValue} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 link-underline" data-testid="coming-soon-contact-instagram">
                <Instagram className="h-4 w-4" /> {site.coming_soon_instagram_label || 'Follow along'}
              </a>
            )}
          </div>
        )}

        {site.coming_soon_show_footer !== false && (footerText || autoFooter) && (
          <p className="mt-16 text-xs text-[color:var(--brand-text-muted)] opacity-70" data-testid="coming-soon-footer">
            {footerText || autoFooter}
          </p>
        )}

        {site.coming_soon_show_admin_link !== false && (
          <Link to="/admin/login" className="absolute top-4 right-4 text-xs opacity-40 hover:opacity-100 link-underline" data-testid="coming-soon-admin-link">
            admin
          </Link>
        )}
      </motion.div>
    </div>
  );
};

export default ComingSoonPage;
