import { createContext, useContext, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

const PaletteContext = createContext({});

/** Apply a palette object (map of color-key -> hex) to document root as CSS variables. */
export const applyPalette = (palette) => {
  if (!palette || !palette.colors) return;
  const root = document.documentElement;
  Object.entries(palette.colors).forEach(([key, hex]) => {
    root.style.setProperty(`--brand-${key}`, hex);
  });
};

export const PaletteProvider = ({ children }) => {
  const { site } = useSite();

  useEffect(() => {
    // Fetch the active palette when site content is available (or independently)
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/palettes/active');
        if (!cancelled) applyPalette(data);
      } catch (_) { /* keep defaults */ }
    })();
    return () => { cancelled = true; };
  }, [site?.active_palette_id]);

  return <PaletteContext.Provider value={{}}>{children}</PaletteContext.Provider>;
};

export const usePalette = () => useContext(PaletteContext);
