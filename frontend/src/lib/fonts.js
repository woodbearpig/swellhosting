/**
 * Curated Google Fonts presets. Each entry has:
 *  - id: stored in site content
 *  - name: display label
 *  - family: value for CSS `font-family`
 *  - google: query fragment for Google Fonts URL (see FONT_PRESETS_URL builder)
 *  - preview (optional): descriptor shown under the option in the picker
 */

export const FONT_PRESETS = {
  // Serif / display fonts (used for headlines)
  serif: [
    { id: 'cormorant', name: 'Cormorant Garamond', family: "'Cormorant Garamond', ui-serif, Georgia, serif", google: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400', preview: 'Elegant editorial serif (default)' },
    { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', ui-serif, Georgia, serif", google: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400', preview: 'Bold magazine-style serif' },
    { id: 'fraunces', name: 'Fraunces', family: 'Fraunces, ui-serif, Georgia, serif', google: 'Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700', preview: 'Modern serif with personality' },
    { id: 'dmserif', name: 'DM Serif Display', family: "'DM Serif Display', ui-serif, Georgia, serif", google: 'DM+Serif+Display:ital@0;1', preview: 'Dramatic high-contrast serif' },
    { id: 'crimson', name: 'Crimson Text', family: "'Crimson Text', ui-serif, Georgia, serif", google: 'Crimson+Text:ital,wght@0,400;0,600;0,700;1,400', preview: 'Book-quality reading serif' },
    { id: 'lora', name: 'Lora', family: 'Lora, ui-serif, Georgia, serif', google: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400', preview: 'Warm, calligraphic serif' },
    { id: 'fredoka', name: 'Fredoka', family: 'Fredoka, ui-sans-serif, sans-serif', google: 'Fredoka:wght@400;500;600;700', preview: 'Rounded playful display' },
    { id: 'poppins-display', name: 'Poppins (bold)', family: 'Poppins, ui-sans-serif, sans-serif', google: 'Poppins:wght@400;500;600;700;800', preview: 'Modern geometric display' },
  ],

  // Body / interface fonts
  sans: [
    { id: 'manrope', name: 'Manrope', family: 'Manrope, ui-sans-serif, system-ui, sans-serif', google: 'Manrope:wght@300;400;500;600;700', preview: 'Clean geometric sans (default)' },
    { id: 'inter', name: 'Inter', family: 'Inter, ui-sans-serif, system-ui, sans-serif', google: 'Inter:wght@300;400;500;600;700', preview: 'Neutral & versatile' },
    { id: 'figtree', name: 'Figtree', family: 'Figtree, ui-sans-serif, system-ui, sans-serif', google: 'Figtree:wght@300;400;500;600;700', preview: 'Friendly & rounded' },
    { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, ui-sans-serif, system-ui, sans-serif', google: 'Montserrat:wght@300;400;500;600;700', preview: 'Modern & confident' },
    { id: 'dmsans', name: 'DM Sans', family: "'DM Sans', ui-sans-serif, system-ui, sans-serif", google: 'DM+Sans:wght@300;400;500;600;700', preview: 'Rounded & minimal' },
    { id: 'nunito', name: 'Nunito', family: 'Nunito, ui-sans-serif, system-ui, sans-serif', google: 'Nunito:wght@300;400;500;600;700', preview: 'Soft & approachable' },
    { id: 'worksans', name: 'Work Sans', family: "'Work Sans', ui-sans-serif, system-ui, sans-serif", google: 'Work+Sans:wght@300;400;500;600;700', preview: 'Balanced & readable' },
    { id: 'plusjakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", google: 'Plus+Jakarta+Sans:wght@300;400;500;600;700', preview: 'Refined & modern' },
  ],

  // Script / accent fonts (used in the small "a warm welcome" / hero flourishes)
  script: [
    { id: 'allura', name: 'Allura', family: 'Allura, cursive', google: 'Allura', preview: 'Formal wedding script (default)' },
    { id: 'dancing', name: 'Dancing Script', family: "'Dancing Script', cursive", google: 'Dancing+Script:wght@400;600;700', preview: 'Casual flowing script' },
    { id: 'greatvibes', name: 'Great Vibes', family: "'Great Vibes', cursive", google: 'Great+Vibes', preview: 'Elegant & ornate' },
    { id: 'parisienne', name: 'Parisienne', family: 'Parisienne, cursive', google: 'Parisienne', preview: 'Delicate & romantic' },
    { id: 'sacramento', name: 'Sacramento', family: 'Sacramento, cursive', google: 'Sacramento', preview: 'Thin modern script' },
    { id: 'pinyon', name: 'Pinyon Script', family: "'Pinyon Script', cursive", google: 'Pinyon+Script', preview: 'Ultra-thin classic' },
    { id: 'petitformal', name: 'Petit Formal Script', family: "'Petit Formal Script', cursive", google: 'Petit+Formal+Script', preview: 'Vintage engraved feel' },
    { id: 'none', name: '— None —', family: 'inherit', google: '', preview: 'Disable script accents' },
  ],
};

/** Look up a preset by id, falling back to the first preset in that category. */
export const getFontPreset = (category, id) => {
  const list = FONT_PRESETS[category] || [];
  return list.find(p => p.id === id) || list[0];
};

/** Build a single Google Fonts URL for the selected serif/sans/script combo. */
export const buildFontsUrl = ({ serifId, sansId, scriptId }) => {
  const s = getFontPreset('serif', serifId);
  const b = getFontPreset('sans', sansId);
  const c = getFontPreset('script', scriptId);
  const families = [s.google, b.google, c.google].filter(Boolean);
  if (families.length === 0) return '';
  return 'https://fonts.googleapis.com/css2?' + families.map(f => `family=${f}`).join('&') + '&display=swap';
};
