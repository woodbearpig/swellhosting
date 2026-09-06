import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import { api, publicUrl } from '@/lib/api';
import { SectionHeader } from '@/components/SectionEyebrow';
import { useSite } from '@/context/SiteContext';
import { TestimonialCard } from '@/pages/BackdropsAndReviews';

export const AboutPage = () => {
  const { site } = useSite();
  const showImage = site?.about_show_image !== false;
  const showDesigner = site?.about_show_designer !== false;
  const showCtas = site?.about_show_ctas !== false;
  const aspect = site?.about_image_aspect || 'portrait';
  const layout = site?.about_image_layout || 'side';
  const aspectClass = {
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[4/3]',
    wide: 'aspect-[2/1]',
    square: 'aspect-square',
    auto: '',
    fill: '',
  }[aspect] || 'aspect-[4/5]';
  const useFill = aspect === 'fill' && layout === 'side';
  const isContain = site?.about_image_fit === 'contain';
  const fitClass = isContain ? 'object-contain' : 'object-cover';
  const bgClass = isContain ? '' : 'bg-[color:var(--brand-surface-2)]';
  const isSticky = layout === 'sticky';
  const isStacked = layout === 'stacked';

  const TextBlock = (
    <div>
      <p className="font-script text-4xl text-[color:var(--brand-sage-deep)] mb-2">a warm welcome</p>
      <p className="text-base sm:text-lg text-[color:var(--brand-text-muted)] leading-relaxed whitespace-pre-line">{site?.about_full}</p>
      {showDesigner && (
        <div data-testid="about-designer-block">
          <p className="font-serif text-2xl mt-8">{site?.designer_name}</p>
          <p className="text-base text-[color:var(--brand-text-muted)] mt-2 leading-relaxed whitespace-pre-line">{site?.designer_bio}</p>
        </div>
      )}
      {showCtas && (
        <div className="mt-6 flex flex-wrap gap-3" data-testid="about-ctas-block">
          <Link to="/inquire" className="btn-primary">Start your inquiry</Link>
          <Link to="/portfolio" className="btn-secondary">See the work</Link>
        </div>
      )}
    </div>
  );

  const ImageBlock = showImage ? (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-[2rem] overflow-hidden ${bgClass} lift-shadow ${isStacked && (aspect === 'auto' || aspect === 'fill') ? '' : aspectClass} ${useFill ? 'lg:h-full lg:aspect-auto min-h-[420px]' : ''} ${isSticky ? 'lg:sticky lg:top-24 self-start' : ''}`}
      data-testid="about-image-block"
    >
      <img
        src={publicUrl(site?.about_image_url)}
        alt="About swell design + media"
        className={`w-full ${isStacked && (aspect === 'auto' || aspect === 'fill') ? 'h-auto block' : `h-full ${fitClass}`}`}
      />
    </motion.div>
  ) : null;

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="about-page">
      <SectionHeader
        eyebrow={site?.about_page_eyebrow ?? 'ABOUT'}
        title={site?.about_page_title || 'About swell design + media'}
        subtitle={site?.about_page_subtitle ?? 'A boutique LA-based studio dedicated to thoughtful, custom event styling.'}
      />
      {isStacked ? (
        <div className="mt-10 space-y-10">
          {ImageBlock}
          <div className="max-w-3xl">{TextBlock}</div>
        </div>
      ) : (
        <div className={`mt-10 grid grid-cols-1 gap-10 ${showImage ? 'lg:grid-cols-2' : ''} ${useFill ? 'lg:items-stretch items-center' : 'items-start lg:items-center'}`}>
          {ImageBlock}
          {TextBlock}
        </div>
      )}
    </div>
  );
};

export const TestimonialsPage = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/testimonials').then(r => setItems(r.data)); }, []);
  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="testimonials-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <SectionHeader eyebrow="TESTIMONIALS" title="What people are saying" subtitle="A few kind notes from clients we're grateful to have styled for." />
        <Link to="/leave-a-review" className="btn-primary self-start" data-testid="testimonials-leave-review-cta">
          <MessageSquarePlus className="h-4 w-4" /> Share your experience
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-[color:var(--brand-text-muted)] py-16">No reviews yet — be the first to <Link to="/leave-a-review" className="link-underline">share yours</Link>.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t) => <TestimonialCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
};

export const FAQPage = () => {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  useEffect(() => { api.get('/faqs').then(r => setItems(r.data)); }, []);

  const categories = Array.from(new Set(items.map(i => i.category || 'General')));

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="faq-page">
      <SectionHeader eyebrow="FAQ" title="Frequently asked" subtitle="Everything you might want to know before we chat." />
      <div className="mt-10 space-y-10">
        {categories.map((c) => (
          <div key={c}>
            <p className="eyebrow mb-3">{c}</p>
            <div className="divide-y divide-[color:var(--brand-border)] card-cream">
              {items.filter(i => (i.category || 'General') === c).map((f) => (
                <button key={f.id} onClick={() => setOpenId(openId === f.id ? null : f.id)} className="w-full text-left px-5 py-4 hover:bg-[color:var(--brand-surface-2)]/50" data-testid={`faq-item-${f.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-lg">{f.question}</p>
                    <span className="text-2xl leading-none text-[color:var(--brand-sage-deep)]">{openId === f.id ? '–' : '+'}</span>
                  </div>
                  {openId === f.id && <p className="text-sm text-[color:var(--brand-text-muted)] mt-3 leading-relaxed">{f.answer}</p>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
