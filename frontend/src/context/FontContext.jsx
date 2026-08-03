import { useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { FONT_PRESETS, getFontPreset, buildFontsUrl } from '@/lib/fonts';

const LINK_ID = 'dynamic-google-fonts';

/**
 * Apply a Google Fonts <link> to the document head + CSS variables to :root.
 * Exported so the admin Typography tab can call it with an un-saved preview.
 */
export const applyFonts = ({ serifId, sansId, scriptId }) => {
  const s = getFontPreset('serif', serifId);
  const b = getFontPreset('sans', sansId);
  const c = getFontPreset('script', scriptId);

  // Inject or update the <link>
  const url = buildFontsUrl({ serifId, sansId, scriptId });
  if (url) {
    let link = document.getElementById(LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }

  // Set CSS variables
  const root = document.documentElement;
  root.style.setProperty('--font-serif', s.family);
  root.style.setProperty('--font-sans', b.family);
  root.style.setProperty('--font-script', c.family);
};

/**
 * FontProvider — watches site content and applies the selected fonts.
 * No visible UI. Wrap this inside SiteProvider so `useSite()` works.
 */
export const FontProvider = ({ children }) => {
  const { site } = useSite();

  useEffect(() => {
    if (!site) return;
    applyFonts({
      serifId: site.font_serif_id || 'cormorant',
      sansId: site.font_sans_id || 'manrope',
      scriptId: site.font_script_id || 'allura',
    });
  }, [site?.font_serif_id, site?.font_sans_id, site?.font_script_id]);

  return children;
};

export { FONT_PRESETS };
