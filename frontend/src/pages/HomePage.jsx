import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Heart, Calendar, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';
import { SectionHeader } from '@/components/SectionEyebrow';
import { InstagramFeed } from '@/components/InstagramFeed';

const fadeInUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const HomePage = () => {
  const { site } = useSite();
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);

  const defaultSteps = [
    { title: 'Inquiry', description: 'Tell us about your event via our smart form.' },
    { title: 'Design call', description: 'A relaxed conversation to align on the vision.' },
    { title: 'Proposal', description: 'A tailored proposal with pricing + palette.' },
    { title: 'Install', description: 'We handle the build, delivery, and on-site setup.' },
    { title: 'Enjoy', description: "You show up and take it all in. That's it." },
  ];
  const processSteps = (Array.isArray(site?.home_process_steps) && site.home_process_steps.length > 0)
    ? site.home_process_steps
    : defaultSteps;

  useEffect(() => {
    (async () => {
      try {
        const [s, g, t, f] = await Promise.all([
          api.get('/services'),
          api.get('/gallery', { params: { featured: true } }),
          api.get('/testimonials', { params: { featured: true } }),
          api.get('/faqs'),
        ]);
        setServices(s.data.slice(0, 6));
        setGallery(g.data.slice(0, 6));
        setTestimonials(t.data.slice(0, 3));
        setFaqs(f.data.slice(0, 4));
      } catch (e) { /* noop */ }
    })();
  }, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden" data-testid="home-hero-section">
        <div className="hero-wash absolute inset-0 -z-10" aria-hidden />
        <div className="watercolor-noise absolute inset-0 -z-10 opacity-60" aria-hidden />
        <div className="blob b-peach" style={{ width: 220, height: 220, top: -40, left: -60 }} />
        <div className="blob b-sage" style={{ width: 180, height: 180, bottom: -30, right: 40 }} />

        <div className="container-narrow pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <motion.div className="lg:col-span-7" {...fadeInUp}>
            <div className="eyebrow mb-4">{site?.hero_eyebrow || 'LOS ANGELES • BALLOON INSTALLATIONS • EVENT STYLING'}</div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-[-0.02em]">
              {site?.hero_headline || 'Dreamy balloon installations for celebrations that feel like you.'}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[color:var(--brand-text-muted)] max-w-xl leading-relaxed">
              {site?.hero_subhead || 'Custom design, thoughtful details, and a calm process — from inquiry to install.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={site?.hero_primary_cta_href || '/inquire'} className="btn-primary" data-testid="home-hero-primary-cta">
                {site?.hero_primary_cta_label || 'Start your inquiry'} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={site?.hero_secondary_cta_href || '/gallery'} className="btn-secondary" data-testid="home-hero-secondary-cta">
                {site?.hero_secondary_cta_label || 'View the gallery'}
              </Link>
            </div>
            {site?.hero_badges_active !== false && Array.isArray(site?.hero_badges) && site.hero_badges.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-2" data-testid="home-hero-badges">
                {site.hero_badges.map((b, i) => (
                  <span key={`${b}-${i}`} className="badge-soft">{b}</span>
                ))}
              </div>
            )}
            {site?.hero_badges_active !== false && !Array.isArray(site?.hero_badges) && (
              <div className="mt-8 flex flex-wrap items-center gap-2" data-testid="home-hero-badges">
                <span className="badge-soft">Fully custom</span>
                <span className="badge-soft">On-site install</span>
                <span className="badge-soft">LA + surrounding</span>
              </div>
            )}
          </motion.div>

          <motion.div className="lg:col-span-5" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="relative">
              <div className="rounded-[2rem] overflow-hidden lift-shadow aspect-[4/5] bg-[color:var(--brand-surface-2)]">
                <img src={site?.hero_image_url || 'https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85'} alt="Editorial event styling by swell design + media" className="h-full w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -left-6 card-cream p-4 hidden sm:block">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-[color:var(--brand-gold)]" fill="currentColor" />
                  <span className="font-medium">5.0</span>
                  <span className="text-[color:var(--brand-text-muted)]">from every client, always</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROMO */}
      {site?.promo_active && (
        <motion.section {...fadeInUp} className="container-narrow -mt-4 mb-4">
          <div className="card-cream p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="home-promo-banner">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-[color:var(--brand-sage-deep)] mt-1 shrink-0" />
              <div>
                <p className="font-serif text-xl leading-tight">{site.promo_title}</p>
                <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">{site.promo_text}</p>
              </div>
            </div>
            <Link to={site.promo_cta_href || '/inquire'} className="btn-primary shrink-0">{site.promo_cta_label || 'Learn more'}</Link>
          </div>
        </motion.section>
      )}

      {/* SERVICES */}
      {site?.home_services_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-services-section">
        <motion.div {...fadeInUp}>
          <SectionHeader eyebrow={site?.home_services_eyebrow || 'WHAT WE DO'} title={site?.home_services_title || 'Designed for the moments that matter'} subtitle={site?.home_services_subtitle || 'We style celebrations end-to-end — from balloons to florals, backdrops to signage.'} />
        </motion.div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="home-services-grid">
          {services.map((s, i) => (
            <motion.div key={s.id} {...fadeInUp} transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16,1,0.3,1] }}>
              <Link to={`/services/${s.slug}`} className="group block card-cream overflow-hidden" data-testid={`home-service-card-${s.slug}`}>
                <div className="aspect-[4/3] overflow-hidden bg-[color:var(--brand-surface-2)]">
                  <img src={s.hero_image_url} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
                <div className="p-5">
                  <p className="font-serif text-xl leading-tight">{s.title}</p>
                  <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 line-clamp-2">{s.short_description}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-[color:var(--brand-sage-deep)] font-medium">{s.price_from ? `From ${s.price_from}` : 'Custom quote'}</span>
                    <span className="inline-flex items-center gap-1 text-[color:var(--brand-text)]">Explore <ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
      )}

      {/* GALLERY PREVIEW */}
      {site?.home_gallery_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-gallery-section">
        <motion.div {...fadeInUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <SectionHeader eyebrow={site?.home_gallery_eyebrow || 'RECENT WORK'} title={site?.home_gallery_title || "Moments we've styled"} subtitle={site?.home_gallery_subtitle || "A glimpse into the celebrations we've been lucky to design."} />
          <Link to="/gallery" className="btn-secondary self-start">Full gallery <ArrowRight className="h-4 w-4" /></Link>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="home-gallery-preview">
          {gallery.map((g, i) => (
            <motion.div key={g.id} {...fadeInUp} transition={{ duration: 0.6, delay: i * 0.04 }} className="gallery-image aspect-square">
              <img src={g.image_url} alt={g.title || 'Event styling'} className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </div>
      </section>
      )}

      {/* INSTAGRAM FEED (only renders if configured) */}
      <InstagramFeed />


      {/* PROCESS */}
      {site?.home_process_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-process-section">
        <motion.div {...fadeInUp}>
          <SectionHeader eyebrow={site?.home_process_eyebrow || 'THE PROCESS'} title={site?.home_process_title || 'A calm, collaborative process'} subtitle={site?.home_process_subtitle || 'No overwhelm, no cookie-cutter kits — just thoughtful design from first inquiry to install.'} />
        </motion.div>
        <ol className={`mt-10 grid grid-cols-1 gap-4 ${processSteps.length >= 5 ? 'md:grid-cols-5' : processSteps.length === 4 ? 'md:grid-cols-4' : processSteps.length === 3 ? 'md:grid-cols-3' : processSteps.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`} data-testid="home-process-timeline">
          {processSteps.map((step, idx) => (
            <li key={`${step.title}-${idx}`} className="card-cream p-5">
              <div className="h-9 w-9 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center font-medium mb-3">{idx + 1}</div>
              <p className="font-serif text-lg">{step.title}</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mt-1.5">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      )}

      {/* TESTIMONIALS */}
      {site?.home_testimonials_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-testimonials-section">
        <motion.div {...fadeInUp}><SectionHeader eyebrow={site?.home_testimonials_eyebrow || 'KIND WORDS'} title={site?.home_testimonials_title || 'Loved by families & brands'} /></motion.div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <motion.figure key={t.id} {...fadeInUp} className="card-cream p-6" data-testid="home-testimonial-card">
              <div className="flex items-center gap-1 text-[color:var(--brand-gold)] mb-2">
                {Array.from({ length: t.rating }).map((_, i) => (<Star key={i} className="h-4 w-4" fill="currentColor" />))}
              </div>
              <blockquote className="font-serif text-lg leading-snug italic">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm"><span className="font-medium">{t.name}</span>{t.event_type && (<span className="text-[color:var(--brand-text-muted)]"> · {t.event_type}</span>)}</figcaption>
            </motion.figure>
          ))}
        </div>
      </section>
      )}

      {/* MEET THE DESIGNER */}
      {site?.home_designer_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-designer-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fadeInUp} className="rounded-[2rem] overflow-hidden aspect-[5/6] bg-[color:var(--brand-surface-2)] lift-shadow">
            <img src={site?.about_image_url || 'https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85'} alt="Meet the designer" className="h-full w-full object-cover" />
          </motion.div>
          <motion.div {...fadeInUp}>
            <div className="eyebrow mb-3">MEET THE DESIGNER</div>
            <h2 className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-4">{site?.designer_name || 'Meet the designer'}</h2>
            <p className="text-base sm:text-lg text-[color:var(--brand-text-muted)] leading-relaxed">{site?.designer_bio}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/about" className="btn-secondary">Read the story</Link>
              <Link to="/inquire" className="btn-primary"><Calendar className="h-4 w-4" /> Start your inquiry</Link>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* FAQ PREVIEW */}
      {site?.home_faq_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-faq-section">
        <motion.div {...fadeInUp}><SectionHeader eyebrow={site?.home_faq_eyebrow || 'COMMON QUESTIONS'} title={site?.home_faq_title || 'Good things to know'} /></motion.div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="home-faq-preview">
          {faqs.map((f) => (
            <div key={f.id} className="card-cream p-5">
              <p className="font-serif text-lg">{f.question}</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-6"><Link to="/faq" className="link-underline text-sm">All FAQ →</Link></div>
      </section>
      )}

      {/* CTA */}
      {site?.home_final_cta_active !== false && (
      <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-final-cta-section">
        <motion.div {...fadeInUp} className="relative overflow-hidden card-cream p-8 sm:p-14 text-center">
          <div className="blob b-rose" style={{ width: 220, height: 220, top: -40, right: -40 }} />
          <div className="blob b-sage" style={{ width: 180, height: 180, bottom: -30, left: -30 }} />
          <Heart className="h-6 w-6 mx-auto text-[color:var(--brand-rose)]" />
          <h2 className="font-serif text-3xl sm:text-4xl mt-3">Ready to plan something dreamy?</h2>
          <p className="text-[color:var(--brand-text-muted)] max-w-lg mx-auto mt-3">Take two minutes to share your vision. We'll be in touch within 1–2 business days.</p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/inquire" className="btn-primary" data-testid="home-cta-inquire">Start your inquiry <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/inquire" className="btn-secondary">Start your inquiry</Link>
          </div>
        </motion.div>
      </section>
      )}
    </div>
  );
};

export default HomePage;
