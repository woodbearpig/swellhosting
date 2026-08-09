import { useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { FONT_PRESETS, getFontPreset, buildFontsUrl } from '@/lib/fonts';

const LINK_ID = 'dynamic-google-fonts';
const HERO_LINK_ID = 'dynamic-hero-fonts';

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
 * Load Google Fonts for the *hero-only* font overrides (eyebrow, headline,
 * subtitle). We keep this in a separate <link> so the site-wide font can
 * change independently without re-fetching the hero fonts. Also exposes each
 * chosen family as a CSS variable so the hero markup can consume it
 * (--hero-headline-font etc.).
 */
export const applyHeroFonts = ({ headlineId, eyebrowId, subheadId }) => {
  // Find each preset. Empty string = "use the site default", so we clear
  // the CSS variable and let the element inherit its normal font-family.
  const findAcrossCategories = (id) => {
    if (!id) return null;
    for (const cat of ['serif', 'sans', 'script']) {
      const hit = (FONT_PRESETS[cat] || []).find(p => p.id === id);
      if (hit) return hit;
    }
    return null;
  };
  const h = findAcrossCategories(headlineId);
  const e = findAcrossCategories(eyebrowId);
  const s = findAcrossCategories(subheadId);

  // Combine all requested google fragments (dedup + skip empty)
  const fragments = Array.from(new Set([h?.google, e?.google, s?.google].filter(Boolean)));
  if (fragments.length > 0) {
    const url = 'https://fonts.googleapis.com/css2?' + fragments.map(f => `family=${f}`).join('&') + '&display=swap';
    let link = document.getElementById(HERO_LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = HERO_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }

  const root = document.documentElement;
  // Empty override = fall back to inherit (site-wide font kicks in).
  root.style.setProperty('--hero-headline-font', h ? h.family : 'inherit');
  root.style.setProperty('--hero-eyebrow-font',  e ? e.family : 'inherit');
  root.style.setProperty('--hero-subhead-font',  s ? s.family : 'inherit');
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

  useEffect(() => {
    if (!site) return;
    applyHeroFonts({
      headlineId: site.hero_headline_font_id || '',
      eyebrowId:  site.hero_eyebrow_font_id  || '',
      subheadId:  site.hero_subhead_font_id  || '',
    });
  }, [site?.hero_headline_font_id, site?.hero_eyebrow_font_id, site?.hero_subhead_font_id]);

  return children;
};

export { FONT_PRESETS };
