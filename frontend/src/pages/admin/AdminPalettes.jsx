import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Palette as PaletteIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';
import { applyPalette } from '@/context/PaletteContext';

const Swatch = ({ hex, size = 24 }) => (
  <span className="inline-block rounded-full border border-black/10" style={{ background: hex, width: size, height: size }} />
);

const PaletteCard = ({ palette, active, onActivate, onPreview }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`card-cream p-4 relative cursor-pointer transition-all ${active ? 'ring-2 ring-[color:var(--brand-sage)] shadow-lg' : 'hover:shadow-md'}`}
    onMouseEnter={() => onPreview(palette)}
    data-testid={`palette-card-${palette.id}`}
  >
    {active && (<div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[color:var(--brand-sage)] text-white flex items-center justify-center"><Check className="h-3.5 w-3.5" /></div>)}
    <p className="font-serif text-lg leading-tight">{palette.name}</p>
    {palette.mood && <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">{palette.mood}</p>}

    {/* Big preview strip */}
    <div
      className="mt-3 rounded-xl overflow-hidden h-16 flex"
      style={{ background: palette.colors.cream || '#fff' }}
    >
      {['sage', 'rose', 'coral', 'peach', 'gold', 'sage-deep'].map(k => (
        palette.colors[k] ? <div key={k} className="flex-1" style={{ background: palette.colors[k] }} /> : null
      ))}
    </div>

    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {['sage', 'rose', 'peach', 'gold'].map(k => palette.colors[k] && <Swatch key={k} hex={palette.colors[k]} size={16} />)}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onActivate(palette); }}
        className={active ? 'btn-secondary text-xs !h-8' : 'btn-primary text-xs !h-8'}
        data-testid={`palette-activate-${palette.id}`}
      >
        {active ? 'Active' : 'Apply'}
      </button>
    </div>
  </motion.div>
);

export const AdminPalettes = () => {
  const { site, refresh } = useSite();
  const [data, setData] = useState(null);
  const [activeId, setActiveId] = useState(site?.active_palette_id || 'signature');
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.get('/palettes').then(r => setData(r.data)); }, []);
  useEffect(() => { if (site?.active_palette_id) setActiveId(site.active_palette_id); }, [site?.active_palette_id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.palettes;
    return data.palettes.filter(p => p.category === filter);
  }, [data, filter]);

  const preview = (palette) => applyPalette(palette);

  const activate = async (palette) => {
    try {
      await api.put('/admin/palettes/active', { palette_id: palette.id });
      setActiveId(palette.id);
      applyPalette(palette);
      await refresh();
      toast.success(`Applied “${palette.name}” — the site is now themed for this palette.`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to apply palette'); }
  };

  if (!data) return <p>Loading palettes…</p>;

  return (
    <div className="space-y-6" data-testid="admin-palettes-page">
      <div>
        <p className="eyebrow">CONTENT</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Palettes</h1>
        <p className="text-[color:var(--brand-text-muted)] mt-2">Change the site’s color theme in one click. Great for switching to seasonal or holiday looks throughout the year.</p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="palette-category-filters">
        <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'selected' : ''}`}>All</button>
        {data.categories.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} className={`chip ${filter === c.key ? 'selected' : ''}`} data-testid={`palette-filter-${c.key}`}>{c.label}</button>
        ))}
      </div>

      <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm flex items-start gap-3">
        <PaletteIcon className="h-5 w-5 mt-0.5" />
        <div>
          <p className="font-medium">Hover to preview · click Apply to save</p>
          <p className="text-[color:var(--brand-text-muted)]">Hover any palette to see how the site looks in that theme. Click <em>Apply</em> to make it the site's active theme. Changes are visible to all visitors immediately.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <PaletteCard key={p.id} palette={p} active={p.id === activeId} onActivate={activate} onPreview={preview} />
        ))}
      </div>
    </div>
  );
};

export default AdminPalettes;
