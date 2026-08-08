import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight, MessageSquarePlus, ChevronRight, Frame } from 'lucide-react';
import { api, publicUrl, uploadFile } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

/** TestimonialCard — Canva-style: tall event photo on top, stars, name, quote. */
export const TestimonialCard = ({ t }) => {
  const initials = (t.name || '').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'S';
  return (
    <motion.figure {...fadeInUp} className="card-cream overflow-hidden flex flex-col" data-testid="testimonial-card">
      {t.photo_url ? (
        <div className="aspect-[3/4] bg-[color:var(--brand-surface-2)]">
          <img src={publicUrl(t.photo_url)} alt={`${t.name} event`} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-[color:var(--brand-sage-tint)] to-[color:var(--brand-blush-tint)]">
          <span className="font-serif text-6xl text-[color:var(--brand-sage-deep)] opacity-70">{initials}</span>
        </div>
      )}
      <figcaption className="p-6 flex flex-col grow">
        <div className="flex items-center gap-0.5 text-[color:var(--brand-gold)] mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4" fill={i < (t.rating || 5) ? 'currentColor' : 'none'} strokeWidth={1.5} />
          ))}
        </div>
        <p className="font-serif text-lg leading-tight mb-2">{t.name}</p>
        <blockquote className="text-sm text-[color:var(--brand-text-muted)] leading-relaxed grow">{t.quote}</blockquote>
        {t.event_type && <p className="text-xs text-[color:var(--brand-text-muted)] mt-3 uppercase tracking-wider">{t.event_type}</p>}
      </figcaption>
    </motion.figure>
  );
};

/** BackdropCard — Canva-style tall card with photo + name + subtitle. */
export const BackdropCard = ({ b }) => (
  <motion.div {...fadeInUp} className="card-cream overflow-hidden flex flex-col" data-testid="backdrop-card">
    <div className="aspect-[3/4] bg-[color:var(--brand-surface-2)]">
      {b.image_url ? (
        <img src={publicUrl(b.image_url)} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[color:var(--brand-text-muted)]"><Frame className="h-12 w-12" /></div>
      )}
    </div>
    <div className="p-5 grow">
      <p className="font-serif text-xl leading-tight">{b.name}</p>
      {b.subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">{b.subtitle}</p>}
      {b.description && <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 leading-relaxed">{b.description}</p>}
      {b.price_from && <p className="text-xs uppercase tracking-wider text-[color:var(--brand-sage-deep)] mt-3">From {b.price_from}</p>}
    </div>
  </motion.div>
);

/** Public /backdrops page */
export const BackdropsPage = () => {
  const { site } = useSite();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/backdrops').then(r => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="backdrops-page">
      {site?.backdrops_page_show_header !== false && (
        <section className="container-narrow pt-14 sm:pt-20 pb-8">
          <p className="eyebrow">{site?.backdrops_page_eyebrow || 'BUILDING BLOCKS'}</p>
          <h1 className="font-serif text-4xl sm:text-5xl mt-2 max-w-2xl">{site?.backdrops_page_title || 'Backdrops'}</h1>
          <p className="mt-4 text-[color:var(--brand-text-muted)] max-w-2xl leading-relaxed">
            {site?.backdrops_page_subtitle || 'Our reusable structures — the anchor of every install. Add florals, balloons, and signage to make each one yours.'}
          </p>
        </section>
      )}

      {site?.backdrops_page_show_grid !== false && (
        <section className="container-narrow pb-16 sm:pb-24">
          {items.length === 0 ? (
            <p className="text-center text-[color:var(--brand-text-muted)] py-16">No backdrops posted yet. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(b => <BackdropCard key={b.id} b={b} />)}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-[color:var(--brand-text-muted)] mb-4">Love a backdrop? Mention it in your inquiry.</p>
            <Link to="/inquire" className="btn-primary" data-testid="backdrops-inquire-cta">
              Start your inquiry <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

/** Public /leave-a-review page */
export const LeaveReviewPage = () => {
  const { site } = useSite();
  const [form, setForm] = useState({ name: '', reviewer_email: '', event_type: '', rating: 5, quote: '', photo_url: '', website: '' /* honeypot */ });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const onPhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.quote.trim()) { return; }
    setBusy(true);
    try {
      let photo_url = '';
      if (photoFile) {
        try {
          const uploaded = await uploadFile(photoFile);
          photo_url = uploaded.url || '';
        } catch { /* photo optional */ }
      }
      await api.post('/testimonials/submit', { ...form, photo_url });
      setSubmitted(true);
    } catch (err) {
      // Show a light error but don't block the honeypot silent-success behavior
      alert('Sorry — something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="container-narrow py-20 text-center" data-testid="leave-review-thanks">
        <div className="card-cream p-10 max-w-xl mx-auto">
          <div className="h-14 w-14 mx-auto rounded-full bg-[color:var(--brand-sage-tint)] flex items-center justify-center mb-4">
            <MessageSquarePlus className="h-7 w-7 text-[color:var(--brand-sage-deep)]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl">Thank you.</h1>
          <p className="mt-3 text-[color:var(--brand-text-muted)] leading-relaxed">
            Your review has been submitted for approval. It’ll appear on the site once we’ve had a moment to review it. We appreciate you taking the time.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="btn-secondary">Back to home</Link>
            <Link to="/testimonials" className="btn-primary">See other reviews <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="leave-review-page">
      <div className="max-w-2xl mx-auto">
        <p className="eyebrow">SHARE YOUR EXPERIENCE</p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">Leave a review</h1>
        <p className="mt-4 text-[color:var(--brand-text-muted)] leading-relaxed">
          If we’ve been lucky enough to design your celebration, we’d love to hear about it. Reviews are moderated before they appear on the site.
        </p>

        <form onSubmit={submit} className="mt-8 card-cream p-6 sm:p-8 space-y-4">
          {/* honeypot — hidden from humans, filled by bots */}
          <input type="text" name="website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] w-1 h-1 opacity-0" aria-hidden />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">YOUR NAME *</label>
              <input required className="input-cream" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="review-name" />
            </div>
            <div>
              <label className="eyebrow block mb-1">EMAIL *</label>
              <input required type="email" className="input-cream" value={form.reviewer_email} onChange={e => setForm({ ...form, reviewer_email: e.target.value })} placeholder="So we can reach out if needed" data-testid="review-email" />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Never shown publicly.</p>
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1">EVENT TYPE (optional)</label>
            <input className="input-cream" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} placeholder="Wedding, birthday, corporate…" />
          </div>

          <div>
            <label className="eyebrow block mb-2">YOUR RATING</label>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className="h-9 w-9 inline-flex items-center justify-center transition-transform hover:scale-110"
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  data-testid={`review-star-${n}`}
                >
                  <Star className={`h-7 w-7 ${n <= form.rating ? 'text-[color:var(--brand-gold)]' : 'text-[color:var(--brand-text-muted)]'}`} fill={n <= form.rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1">YOUR REVIEW *</label>
            <textarea required rows={5} className="input-cream textarea-cream" value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} placeholder="Tell us about the design, the process, the day itself…" data-testid="review-quote" />
          </div>

          <div>
            <label className="eyebrow block mb-1">PHOTO FROM YOUR EVENT (optional)</label>
            {photoPreview && <img src={photoPreview} alt="preview" className="h-32 w-auto rounded-lg mb-2" />}
            <input type="file" accept="image/*" onChange={onPhotoChange} data-testid="review-photo" />
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">One photo. JPG or PNG.</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" disabled={busy} className="btn-primary" data-testid="review-submit">
              {busy ? 'Sending…' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BackdropsPage;
