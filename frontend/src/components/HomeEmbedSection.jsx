import { motion } from 'framer-motion';
import { Facebook } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { EmbedWidget, WidgetPlaceholder } from '@/components/EmbedWidget';

const fadeInUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

/**
 * HomeEmbedSection — a homepage slot that renders the admin-configured
 * embed widget (Elfsight Facebook feed, etc.) only when ALL of:
 *   1. `home_widget_active` is true (section toggled on)
 *   2. `home_widget_snippet` is non-empty on the PUBLIC site
 *      (safety net so the "widget will appear here" placeholder can
 *      never accidentally leak to real visitors — placeholder is
 *      only shown when previewing via the ?preview=<token> bypass)
 *   3. `home_widget_position` matches the `at` prop of this instance
 *
 * We instantiate this component at every candidate slot in HomePage.jsx
 * (after-hero, after-services, etc.) and let the site content decide
 * which slot actually renders — the others quietly return null.
 */
export const HomeEmbedSection = ({ at }) => {
  const { site } = useSite();
  if (!site?.home_widget_active) return null;
  const position = site?.home_widget_position || 'after-testimonials';
  if (position !== at) return null;

  const eyebrow = (site?.home_widget_eyebrow || '').trim();
  const heading = (site?.home_widget_heading || '').trim();
  const subheading = (site?.home_widget_subheading || '').trim();
  const snippet = (site?.home_widget_snippet || '').trim();
  const ctaLabel = (site?.home_widget_cta_label || 'Follow on Facebook').trim();
  const ctaUrl = (site?.home_widget_cta_url || '').trim();
  // Default true when the field is missing (back-compat with old docs).
  const showHeader = site?.home_widget_show_header !== false;
  const showBand = site?.home_widget_band !== false;
  const hasLeftText = showHeader && (eyebrow || heading || subheading);

  // Are we viewing via a preview link (client review) or as public? Preview
  // sessions get the placeholder so the client can visualize placement even
  // before a snippet exists; real public visitors NEVER see the placeholder.
  const isPreviewSession = (() => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return false;
    try { return sessionStorage.getItem('sw_preview_ok') === '1'; } catch (_) { return false; }
  })();

  // Safety net: on the public site, an empty snippet means "nothing to show" —
  // hide the entire section. The placeholder is only useful during preview.
  if (!snippet && !isPreviewSession) return null;

  const widget = snippet
    ? <EmbedWidget snippet={snippet} />
    : <WidgetPlaceholder label="Facebook feed will appear here" />;

  // If there's no side content at all, fall back to a simple centered widget.
  const hasSideColumn = hasLeftText || !!ctaUrl;

  return (
    <section
      className={`py-14 sm:py-18 lg:py-24 ${showBand ? 'bg-[color:var(--brand-sage-tint)]' : ''}`}
      data-testid="home-embed-widget-section"
      data-widget-position={at}
    >
      <div className="max-w-6xl mx-auto px-6">
        {hasSideColumn ? (
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left — heading + call to action */}
            <motion.div {...fadeInUp} className="text-center lg:text-left">
              {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
              {heading && (
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-[-0.01em]">
                  {heading}
                </h2>
              )}
              {subheading && (
                <p className="mt-4 text-[color:var(--brand-text-muted)] leading-relaxed max-w-md mx-auto lg:mx-0">
                  {subheading}
                </p>
              )}
              {ctaUrl && (
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-7 inline-flex"
                  data-testid="home-widget-cta"
                >
                  <Facebook className="h-4 w-4" /> {ctaLabel}
                </a>
              )}
            </motion.div>
            {/* Right — the (now responsive) widget, kept to a comfortable width */}
            <motion.div {...fadeInUp} className="w-full flex justify-center lg:justify-end">
              <div className="w-full max-w-[560px]">{widget}</div>
            </motion.div>
          </div>
        ) : (
          <motion.div {...fadeInUp} className="w-full flex justify-center">
            <div className="w-full max-w-[560px]">{widget}</div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default HomeEmbedSection;
