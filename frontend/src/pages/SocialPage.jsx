import { motion } from 'framer-motion';
import { useSite } from '@/context/SiteContext';
import { EmbedWidget, WidgetPlaceholder } from '@/components/EmbedWidget';

/**
 * SocialPage — the dedicated Facebook page.
 *
 * Renders an admin-controlled heading + intro, then the Elfsight "Facebook
 * Feed" grid widget pasted into social_page_snippet. When the snippet is empty
 * it shows a friendly placeholder (visible in admin/preview) so the page is
 * never blank while the grid widget is being set up.
 *
 * Visibility is gated by social_page_active via <SocialGuard> in App.js, so
 * this component only assumes it should render its content.
 */
const SocialPage = () => {
  const { site } = useSite();
  const heading = (site?.social_page_heading || 'Follow us on Facebook').trim();
  const intro = (site?.social_page_intro || '').trim();
  const snippet = (site?.social_page_snippet || '').trim();

  return (
    <div className="py-16 sm:py-20 lg:py-24" data-testid="social-page">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="eyebrow mb-3">FOLLOW ALONG</div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-[-0.02em]">
            {heading}
          </h1>
          {intro && (
            <p className="mt-4 text-lg text-[color:var(--brand-text-muted)] leading-relaxed">
              {intro}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          {snippet ? (
            <EmbedWidget snippet={snippet} />
          ) : (
            <WidgetPlaceholder label="Your Facebook grid feed will appear here once the widget is added in the admin." />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SocialPage;
