import { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Palette as PaletteIcon, Trash2, Plus, ArrowUp, ArrowDown, Calendar, Image as ImageIcon, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getPaletteSync } from 'colorthief';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';
import { applyPalette } from '@/context/PaletteContext';

const MONTHS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
  { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
  { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
];

const daysInMonth = (m) => new Date(2024, m, 0).getDate(); // leap year for Feb-safe cap

const Swatch = ({ hex, size = 24 }) => (
  <span className="inline-block rounded-full border border-black/10" style={{ background: hex, width: size, height: size }} />
);

const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
const relLum = ([r, g, b]) => {
  const l = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const mix = (rgbA, rgbB, w) => rgbA.map((a, i) => Math.round(a * (1 - w) + rgbB[i] * w));

/** Extract a palette of 12 branded color keys from a ColorThief RGB palette. */
const buildPaletteFromImage = (rgbPalette) => {
  if (!rgbPalette || rgbPalette.length === 0) return null;
  // Sort by luminance (light -> dark)
  const sorted = [...rgbPalette].sort((a, b) => relLum(b) - relLum(a));
  const lightest = sorted[0];
  const darkest = sorted[sorted.length - 1];
  const mids = sorted.slice(1, -1);

  // Pick chromatic colors: highest saturation among mids
  const sat = ([r, g, b]) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
  };
  const chromatic = [...mids].sort((a, b) => sat(b) - sat(a));
  const primary = chromatic[0] || mids[0] || lightest;
  const secondary = chromatic[1] || mids[1] || primary;
  const tertiary = chromatic[2] || mids[2] || primary;
  const accent = chromatic[3] || tertiary;

  const white = [255, 255, 255];
  const black = [0, 0, 0];

  const colors = {
    'cream': rgbToHex(mix(lightest, white, 0.5)),
    'surface-2': rgbToHex(mix(lightest, white, 0.2)),
    'border': rgbToHex(mix(lightest, black, 0.2)),
    'text': rgbToHex(mix(darkest, black, 0.4)),
    'text-muted': rgbToHex(mix(darkest, white, 0.35)),
    'sage': rgbToHex(primary),
    'sage-deep': rgbToHex(mix(primary, black, 0.3)),
    'sage-tint': rgbToHex(mix(primary, white, 0.7)),
    'rose': rgbToHex(secondary),
    'coral': rgbToHex(tertiary),
    'peach': rgbToHex(mix(tertiary, white, 0.4)),
    'blush-tint': rgbToHex(mix(secondary, white, 0.6)),
    'gold': rgbToHex(accent),
  };
  return colors;
};

const PaletteCard = ({ palette, active, onActivate, onPreview, onDelete, canDelete }) => (
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

    <div className="mt-3 rounded-xl overflow-hidden h-16 flex" style={{ background: palette.colors.cream || '#fff' }}>
      {['sage', 'rose', 'coral', 'peach', 'gold', 'sage-deep'].map(k => (
        palette.colors[k] ? <div key={k} className="flex-1" style={{ background: palette.colors[k] }} /> : null
      ))}
    </div>

    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {['sage', 'rose', 'peach', 'gold'].map(k => palette.colors[k] && <Swatch key={k} hex={palette.colors[k]} size={16} />)}
      </div>
      <div className="flex items-center gap-1">
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${palette.name}"?`)) onDelete(palette); }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
            data-testid={`palette-delete-${palette.id}`}
            aria-label="Delete palette"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onActivate(palette); }}
          className={active ? 'btn-secondary text-xs !h-8' : 'btn-primary text-xs !h-8'}
          data-testid={`palette-activate-${palette.id}`}
        >
          {active ? 'Active' : 'Apply'}
        </button>
      </div>
    </div>
  </motion.div>
);

/** Card that opens the "Create palette from photo" workflow. */
const PhotoUploadCard = ({ onCreated, allPalettes }) => {
  const inputRef = useRef(null);
  const imgRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [name, setName] = useState('');
  const [mood, setMood] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setPreviewUrl(''); setExtracted(null); setName(''); setMood(''); };

  const onFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const runExtraction = () => {
    try {
      const img = imgRef.current;
      if (!img) return;
      const rgbPalette = getPaletteSync(img, 8);
      const colors = buildPaletteFromImage(rgbPalette);
      if (!colors) throw new Error('Could not extract colors');
      setExtracted(colors);
      if (!name) setName('Custom palette');
    } catch (e) {
      console.error(e);
      toast.error('Could not extract colors from that image. Try another photo.');
    }
  };

  const save = async () => {
    if (!extracted) return;
    if (!name.trim()) { toast.error('Please give your palette a name'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/admin/palettes/custom', { name: name.trim(), mood: mood.trim(), colors: extracted });
      toast.success(`Saved "${data.name}" — you can apply it any time.`);
      onCreated(data);
      reset();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save palette');
    } finally { setBusy(false); }
  };

  return (
    <div className="card-cream p-4 sm:p-5 border-2 border-dashed border-[color:var(--brand-border)]" data-testid="palette-from-photo-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--brand-blush-tint)] flex items-center justify-center shrink-0">
          <ImageIcon className="h-5 w-5 text-[color:var(--brand-coral)]" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-lg">Create a palette from a photo</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">Upload any inspiration photo (a dress, a flower arrangement, a sunset) and we'll turn its colors into a reusable site theme.</p>
        </div>
      </div>

      {!previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 w-full h-32 rounded-xl border-2 border-dashed border-[color:var(--brand-border)] flex items-center justify-center text-sm text-[color:var(--brand-text-muted)] hover:bg-[color:var(--brand-sage-tint)]/40 transition-colors"
          data-testid="palette-from-photo-upload-btn"
        >
          Click to choose an image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0])}
        data-testid="palette-from-photo-file-input"
      />

      {previewUrl && (
        <div className="mt-4 space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-[color:var(--brand-surface-2)]">
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Palette source"
              crossOrigin="anonymous"
              onLoad={runExtraction}
              className="w-full max-h-64 object-cover"
              data-testid="palette-from-photo-preview"
            />
            <button
              type="button"
              onClick={reset}
              className="absolute top-2 right-2 h-8 w-8 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white"
              aria-label="Remove image"
            ><X className="h-4 w-4" /></button>
          </div>

          {extracted && (
            <>
              <div className="rounded-xl overflow-hidden h-14 flex" style={{ background: extracted.cream }}>
                {['sage', 'rose', 'coral', 'peach', 'gold', 'sage-deep'].map(k => (
                  <div key={k} className="flex-1" style={{ background: extracted[k] }} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="input-cream !h-9"
                  placeholder="Palette name (e.g. Emma's Bouquet)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  data-testid="palette-from-photo-name"
                />
                <input
                  className="input-cream !h-9"
                  placeholder="Optional mood (e.g. Soft, romantic)"
                  value={mood}
                  onChange={e => setMood(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-primary text-sm !h-9"
                  onClick={() => applyPalette({ colors: extracted })}
                >Preview on site</button>
                <button
                  type="button"
                  className="btn-primary text-sm !h-9"
                  disabled={busy}
                  onClick={save}
                  data-testid="palette-from-photo-save"
                ><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save palette'}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Card for a single palette-schedule rule with inline edit fields. */
const ScheduleRow = ({ rule, palettes, onChange, onDelete, onMoveUp, onMoveDown, canUp, canDown, isActive }) => {
  const startMax = daysInMonth(rule.start_month || 1);
  const endMax = daysInMonth(rule.end_month || 1);
  return (
    <div className={`card-cream p-3 space-y-2 ${isActive ? 'ring-2 ring-[color:var(--brand-sage)]' : ''}`} data-testid={`schedule-row-${rule.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${isActive ? 'bg-[color:var(--brand-sage)] text-white' : 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]'}`}>
          <Calendar className="h-4 w-4" />
        </div>
        <input
          className="input-cream !h-9 flex-1 min-w-[160px]"
          placeholder="Rule name (e.g. Halloween season)"
          value={rule.label || ''}
          onChange={e => onChange({ ...rule, label: e.target.value })}
          data-testid={`schedule-${rule.id}-label`}
        />
        <select
          className="input-cream !h-9 min-w-[160px]"
          value={rule.palette_id || 'signature'}
          onChange={e => onChange({ ...rule, palette_id: e.target.value })}
          data-testid={`schedule-${rule.id}-palette`}
        >
          {palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={rule.enabled !== false} onChange={e => onChange({ ...rule, enabled: e.target.checked })} />
          <span>Enabled</span>
        </label>
        <div className="flex gap-1">
          <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canUp} onClick={onMoveUp} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canDown} onClick={onMoveDown} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={onDelete} aria-label="Delete" data-testid={`schedule-${rule.id}-delete`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <p className="eyebrow mb-1">STARTS</p>
          <div className="flex gap-2">
            <select className="input-cream !h-9 flex-1" value={rule.start_month || 1} onChange={e => onChange({ ...rule, start_month: parseInt(e.target.value, 10) })}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select className="input-cream !h-9 w-20" value={rule.start_day || 1} onChange={e => onChange({ ...rule, start_day: parseInt(e.target.value, 10) })}>
              {Array.from({ length: startMax }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-1">ENDS</p>
          <div className="flex gap-2">
            <select className="input-cream !h-9 flex-1" value={rule.end_month || 1} onChange={e => onChange({ ...rule, end_month: parseInt(e.target.value, 10) })}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select className="input-cream !h-9 w-20" value={rule.end_day || 1} onChange={e => onChange({ ...rule, end_day: parseInt(e.target.value, 10) })}>
              {Array.from({ length: endMax }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-1">TYPE</p>
          <select
            className="input-cream !h-9"
            value={rule.repeats_yearly === false ? 'oneoff' : 'yearly'}
            onChange={e => {
              const yearly = e.target.value === 'yearly';
              onChange({ ...rule, repeats_yearly: yearly, year: yearly ? null : (rule.year || new Date().getFullYear()) });
            }}
          >
            <option value="yearly">Every year</option>
            <option value="oneoff">One-off</option>
          </select>
        </div>
      </div>

      {rule.repeats_yearly === false && (
        <div className="pl-10">
          <p className="eyebrow mb-1">YEAR</p>
          <input
            type="number"
            className="input-cream !h-9 w-32"
            value={rule.year || new Date().getFullYear()}
            onChange={e => onChange({ ...rule, year: parseInt(e.target.value, 10) || null })}
          />
        </div>
      )}
    </div>
  );
};

export const AdminPalettes = () => {
  const { site, refresh } = useSite();
  const [data, setData] = useState(null);
  const [activeId, setActiveId] = useState(site?.active_palette_id || 'signature');
  const [filter, setFilter] = useState('all');
  const [schedules, setSchedules] = useState([]);
  const [schedulesDirty, setSchedulesDirty] = useState(false);
  const [savingSchedules, setSavingSchedules] = useState(false);

  const loadPalettes = () => api.get('/palettes').then(r => setData(r.data));

  useEffect(() => { loadPalettes(); }, []);
  useEffect(() => { if (site?.active_palette_id) setActiveId(site.active_palette_id); }, [site?.active_palette_id]);

  useEffect(() => {
    api.get('/admin/palettes/schedules').then(r => setSchedules(r.data.schedules || []));
  }, []);

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
      toast.success(`Applied "${palette.name}" — the site is now themed for this palette.`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to apply palette'); }
  };

  const deleteCustom = async (palette) => {
    try {
      await api.delete(`/admin/palettes/custom/${palette.id}`);
      toast.success(`Deleted "${palette.name}"`);
      loadPalettes();
      await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  const onCreatedFromPhoto = () => { loadPalettes(); };

  // Schedule operations
  const updateSchedule = (idx, next) => {
    const list = [...schedules];
    list[idx] = next;
    setSchedules(list);
    setSchedulesDirty(true);
  };
  const removeSchedule = (idx) => { setSchedules(schedules.filter((_, i) => i !== idx)); setSchedulesDirty(true); };
  const moveSchedule = (idx, dir) => {
    const list = [...schedules];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    setSchedules(list);
    setSchedulesDirty(true);
  };
  const addSchedule = () => {
    const rule = {
      id: `sch-${Date.now()}`,
      label: 'New schedule',
      enabled: true,
      palette_id: data?.palettes?.[0]?.id || 'signature',
      start_month: 10, start_day: 15, end_month: 11, end_day: 1,
      repeats_yearly: true,
      year: null,
    };
    setSchedules([...schedules, rule]);
    setSchedulesDirty(true);
  };
  const saveSchedules = async () => {
    setSavingSchedules(true);
    try {
      await api.put('/admin/palettes/schedules', { schedules });
      toast.success('Schedules saved — palettes will now switch automatically on those dates.');
      setSchedulesDirty(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save schedules');
    } finally { setSavingSchedules(false); }
  };

  // Determine which schedule (if any) is currently active
  const activeScheduleId = useMemo(() => {
    const today = new Date();
    const md = [today.getMonth() + 1, today.getDate()];
    for (const rule of schedules) {
      if (rule.enabled === false) continue;
      const s = [rule.start_month, rule.start_day];
      const e = [rule.end_month, rule.end_day];
      const cmp = (a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
      if (cmp(s, e) <= 0) {
        if (cmp(s, md) <= 0 && cmp(md, e) <= 0) {
          if (rule.repeats_yearly === false) {
            if (rule.year === today.getFullYear()) return rule.id;
          } else return rule.id;
        }
      } else {
        // wrap
        if (cmp(s, md) <= 0 || cmp(md, e) <= 0) {
          if (rule.repeats_yearly === false) {
            if (rule.year === today.getFullYear()) return rule.id;
          } else return rule.id;
        }
      }
    }
    return null;
  }, [schedules]);

  if (!data) return <p>Loading palettes…</p>;

  return (
    <div className="space-y-10" data-testid="admin-palettes-page">
      <div>
        <p className="eyebrow">CONTENT</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Palettes</h1>
        <p className="text-[color:var(--brand-text-muted)] mt-2">Change the site's color theme in one click, schedule seasonal switches, or create a custom palette from a photo.</p>
      </div>

      {/* PALETTE PICKER */}
      <section className="space-y-4">
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
          {(filter === 'all' || filter === 'custom') && (
            <PhotoUploadCard onCreated={onCreatedFromPhoto} allPalettes={data.palettes} />
          )}
          {filtered.map(p => (
            <PaletteCard
              key={p.id}
              palette={p}
              active={p.id === activeId}
              onActivate={activate}
              onPreview={preview}
              onDelete={deleteCustom}
              canDelete={p.is_preset === false || p.category === 'custom'}
            />
          ))}
        </div>
      </section>

      {/* SCHEDULES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="eyebrow">AUTOMATION</p>
            <h2 className="font-serif text-2xl sm:text-3xl mt-1">Season auto-switch</h2>
            <p className="text-[color:var(--brand-text-muted)] mt-1 text-sm">Schedule palettes to activate automatically on set dates — e.g. Halloween Oct 15 → Nov 1, or Christmas Dec 1 → Dec 26.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={addSchedule} data-testid="schedule-add"><Plus className="h-4 w-4" /> Add schedule</button>
            <button className="btn-primary" onClick={saveSchedules} disabled={!schedulesDirty || savingSchedules} data-testid="schedule-save"><Save className="h-4 w-4" /> {savingSchedules ? 'Saving…' : 'Save schedules'}</button>
          </div>
        </div>

        {activeScheduleId && (
          <div className="rounded-2xl bg-[color:var(--brand-sage-tint)] p-4 text-sm flex items-start gap-3">
            <Calendar className="h-5 w-5 mt-0.5 text-[color:var(--brand-sage-deep)]" />
            <div>
              <p className="font-medium">A schedule is currently active</p>
              <p className="text-[color:var(--brand-text-muted)]">The site is themed by the highlighted rule below. It overrides your manually applied palette until it ends.</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {schedules.map((rule, idx) => (
            <ScheduleRow
              key={rule.id}
              rule={rule}
              palettes={data.palettes}
              isActive={activeScheduleId === rule.id}
              onChange={next => updateSchedule(idx, next)}
              onDelete={() => removeSchedule(idx)}
              onMoveUp={() => moveSchedule(idx, -1)}
              onMoveDown={() => moveSchedule(idx, +1)}
              canUp={idx > 0}
              canDown={idx < schedules.length - 1}
            />
          ))}
          {schedules.length === 0 && (
            <p className="text-sm text-[color:var(--brand-text-muted)] italic">No schedules yet. Click "Add schedule" to set your first automatic switch.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminPalettes;
