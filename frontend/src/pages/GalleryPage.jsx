import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/SectionEyebrow';
import { useSite } from '@/context/SiteContext';

const GalleryPage = () => {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const { site } = useSite();
  const showHeader = site?.gallery_page_show_header !== false;
  const showFilters = site?.gallery_page_show_filters !== false;
  const showGrid = site?.gallery_page_show_grid !== false;

  // Categories are fully admin-managed via Admin → Portfolio → Manage
  // categories. We always prepend an "All" chip so visitors can see every
  // photo at once.
  const categories = useMemo(() => {
    const dynamic = (site?.gallery_categories || []).map(c => ({ key: c.key, label: c.label }));
    return [{ key: 'all', label: 'All' }, ...dynamic];
  }, [site?.gallery_categories]);

  useEffect(() => { api.get('/gallery').then(r => setItems(r.data)); }, []);

  const filtered = useMemo(() => (cat === 'all' ? items : items.filter(i => i.category === cat)), [items, cat]);

  const openIndex = (idx) => setLightbox(idx);
  const closeLightbox = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i === 0 ? filtered.length - 1 : i - 1));
  const next = () => setLightbox((i) => (i === filtered.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, filtered.length]);

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="gallery-page">
      {showHeader && (
        <SectionHeader eyebrow="GALLERY" title="A closer look at our work" subtitle="Filter by event type to explore recent installations." />
      )}

      {showFilters && categories.length > 1 && (
      <div className="mt-8 flex flex-wrap gap-2" data-testid="gallery-category-tabs">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`chip ${cat === c.key ? 'selected' : ''}`}
            data-testid={`gallery-tab-${c.key}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      )}

      {showGrid && (
      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="gallery-grid">
        {filtered.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.03 }}
            onClick={() => openIndex(i)}
            className="gallery-image aspect-square focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-sage)]"
            data-testid="gallery-image-card"
          >
            <img src={g.image_url} alt={g.title || 'Event styling'} loading="lazy" className="h-full w-full object-cover" />
          </motion.button>
        ))}
      </div>
      )}

      {showGrid && filtered.length === 0 && (
        <p className="text-center py-20 text-[color:var(--brand-text-muted)]">No photos in this category yet.</p>
      )}

      <AnimatePresence>
        {lightbox !== null && filtered[lightbox] && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeLightbox}
            data-testid="gallery-lightbox-dialog"
          >
            <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/90 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X /></button>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white/90 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronLeft /></button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-white/90 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><ChevronRight /></button>
            <motion.img
              key={filtered[lightbox].id}
              src={filtered[lightbox].image_url}
              alt={filtered[lightbox].title}
              className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;
