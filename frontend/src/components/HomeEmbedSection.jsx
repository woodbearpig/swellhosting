import { motion } from 'framer-motion';
import { useSite } from '@/context/SiteContext';
import { SectionHeader } from '@/components/SectionEyebrow';
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
  // Default true when the field is missing (back-compat with old docs).
  const showHeader = site?.home_widget_show_header !== false;

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

  return (
    <section
      className="container-narrow py-14 sm:py-18 lg:py-24"
      data-testid="home-embed-widget-section"
      data-widget-position={at}
    >
      {showHeader && (eyebrow || heading || subheading) && (
        <motion.div {...fadeInUp} className="mb-10">
          <SectionHeader eyebrow={eyebrow} title={heading} subtitle={subheading} />
        </motion.div>
      )}
      <motion.div {...fadeInUp}>
        {snippet ? (
          <EmbedWidget snippet={snippet} />
        ) : (
          <WidgetPlaceholder label="Facebook feed will appear here" />
        )}
      </motion.div>
    </section>
  );
};

export default HomeEmbedSection;
