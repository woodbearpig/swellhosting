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
        <div className="flex justify-center mb-8">
          <Logo size={140} />
        </div>

        <div className="eyebrow mb-4">{site?.coming_soon_eyebrow || 'SOMETHING BEAUTIFUL IS COMING'}</div>

        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-[-0.02em]">
          {site?.coming_soon_title || 'We\u2019re styling something dreamy.'}
        </h1>

        <p className="font-script text-5xl text-[color:var(--brand-sage-deep)] mt-4">
          {site?.coming_soon_script || 'stay tuned'}
        </p>

        <p className="mt-6 text-lg text-[color:var(--brand-text-muted)] max-w-lg mx-auto leading-relaxed">
          {site?.coming_soon_message || 'A boutique event styling studio launching soon in Los Angeles \u2014 custom balloon installations, thoughtful florals, and dreamy details for weddings, showers, birthdays, and brand moments.'}
        </p>

        {site?.coming_soon_launch_date && (
          <div className="mt-6 inline-flex items-center gap-2 badge-soft !text-sm">
            <CalIcon className="h-4 w-4" /> Launching {site.coming_soon_launch_date}
          </div>
        )}

        {/* Newsletter */}
        <form onSubmit={subscribe} className="mt-10 max-w-md mx-auto flex flex-col sm:flex-row gap-2" data-testid="coming-soon-newsletter">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-cream flex-1 text-center sm:text-left"
            data-testid="coming-soon-email"
          />
          <button disabled={busy} className="btn-primary" data-testid="coming-soon-submit">
            <Sparkles className="h-4 w-4" /> Notify me
          </button>
        </form>

        {/* Contact links */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-[color:var(--brand-text-muted)]">
          {site?.contact_email && (
            <a href={`mailto:${site.contact_email}`} className="inline-flex items-center gap-2 link-underline">
              <Mail className="h-4 w-4" /> {site.contact_email}
            </a>
          )}
          {site?.contact_phone && (
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" /> {site.contact_phone}
            </span>
          )}
          {site?.instagram_url && (
            <a href={site.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 link-underline">
              <Instagram className="h-4 w-4" /> Follow along
            </a>
          )}
        </div>

        <p className="mt-16 text-xs text-[color:var(--brand-text-muted)] opacity-70">
          © {new Date().getFullYear()} swell design + media · Los Angeles
        </p>

        {/* Discreet admin link so business can still log in during maintenance */}
        <Link to="/admin/login" className="absolute top-4 right-4 text-xs opacity-40 hover:opacity-100 link-underline" data-testid="coming-soon-admin-link">
          admin
        </Link>
      </motion.div>
    </div>
  );
};

export default ComingSoonPage;
