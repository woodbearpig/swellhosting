import { useEffect, useMemo, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Trash2, ExternalLink, Star, AlertTriangle, Facebook } from 'lucide-react';
import { useSiteAdminData, PageHeader, ToggleRow, TextField, TextArea } from './_shared';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { FONT_PRESETS } from '@/context/FontContext';

/** All font options across serif/sans/script — for the hero-specific
 *  overrides which can pick anything regardless of role. */
const ALL_FONT_OPTIONS = [
  { group: 'Serif / display', items: FONT_PRESETS.serif },
  { group: 'Sans / body',     items: FONT_PRESETS.sans  },
  { group: 'Script / accent', items: (FONT_PRESETS.script || []).filter(p => p.id !== 'none') },
];

const SectionCard = memo(function SectionCard({ title, children, subtitle }) {
  return (
    <div className="card-cream p-6 space-y-4">
      <div>
        <p className="font-serif text-xl">{title}</p>
        {subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
});

const EyebrowTitleSubtitleRow = memo(function EyebrowTitleSubtitleRow({ prefix, data, set }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data[`${prefix}_eyebrow`] || ''} onCommit={v => set({ [`${prefix}_eyebrow`]: v })} /></div>
      <div><label className="eyebrow block mb-1">TITLE</label><TextField value={data[`${prefix}_title`] || ''} onCommit={v => set({ [`${prefix}_title`]: v })} /></div>
      <div><label className="eyebrow block mb-1">SUBTITLE</label><TextField value={data[`${prefix}_subtitle`] || ''} onCommit={v => set({ [`${prefix}_subtitle`]: v })} /></div>
    </div>
  );
});

/**
 * ColorSwatchField — hex color input with a live native color picker and
 * a "Reset" button that clears the override back to the theme default.
 * Uses local state so typing hex doesn't stutter; commits on blur or change.
 */
const ColorSwatchField = memo(function ColorSwatchField({ label, hint, value, onChange, testId }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  const isValidHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(local);
  const displayColor = isValidHex ? local : (value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#ffffff');
  return (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 rounded-lg border border-[color:var(--brand-border)] shrink-0 cursor-pointer overflow-hidden"
          style={{ backgroundColor: value ? displayColor : 'transparent', backgroundImage: value ? 'none' : 'repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 12px 12px' }}
          title={value ? 'Change color' : 'No color set — using theme default'}
        >
          <input
            type="color"
            value={displayColor}
            onChange={e => { setLocal(e.target.value); onChange(e.target.value); }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            data-testid={testId ? `${testId}-picker` : undefined}
          />
        </label>
        <input
          type="text"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => { if (local !== (value || '')) onChange(local); }}
          placeholder="#111111 or leave blank for default"
          className="input-cream !h-9 flex-1 font-mono text-sm"
          data-testid={testId ? `${testId}-text` : undefined}
        />
        {(value || local) && (
          <button
            type="button"
            onClick={() => { setLocal(''); onChange(''); }}
            className="text-xs px-2 py-1 rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] shrink-0"
            title="Clear override (use theme default)"
            data-testid={testId ? `${testId}-reset` : undefined}
          >
            Reset
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">{hint}</p>}
    </div>
  );
});

/**
 * HeroColorsPanel — collapsible group of color pickers for headline, subhead,
 * eyebrow, and both CTA buttons. Empty values mean "use theme default" — this
 * is important for owners who don't want to touch these controls.
 */
const HeroColorsPanel = memo(function HeroColorsPanel({ data, set }) {
  const [open, setOpen] = useState(false);
  const mode = data.hero_layout_mode || 'split';
  return (
    <div className="border-t border-[color:var(--brand-border)] pt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left group"
        data-testid="admin-hero-colors-toggle"
      >
        <div>
          <p className="eyebrow">HERO TEXT &amp; BUTTON COLORS</p>
          <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">
            {mode === 'full_bleed'
              ? 'Tune contrast for the photo background — pick a headline color that pops against your hero image.'
              : 'Optional overrides for the split hero. Leave blank to use the brand theme colors.'}
          </p>
        </div>
        <span className="text-sm text-[color:var(--brand-sage-deep)] group-hover:underline shrink-0 ml-3">{open ? 'Hide' : 'Customize colors'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorSwatchField
              label="HEADLINE COLOR"
              value={data.hero_headline_color || ''}
              onChange={v => set({ hero_headline_color: v })}
              testId="admin-hero-headline-color"
              hint={mode === 'full_bleed' ? 'Default: cream on the darkened photo.' : 'Default: brand dark text.'}
            />
            <ColorSwatchField
              label="SUBHEAD COLOR"
              value={data.hero_subhead_color || ''}
              onChange={v => set({ hero_subhead_color: v })}
              testId="admin-hero-subhead-color"
            />
            <ColorSwatchField
              label="EYEBROW COLOR"
              value={data.hero_eyebrow_color || ''}
              onChange={v => set({ hero_eyebrow_color: v })}
              testId="admin-hero-eyebrow-color"
              hint="The small UPPERCASE label above the headline."
            />
          </div>
          <div className="pt-3 border-t border-dashed border-[color:var(--brand-border)]">
            <p className="eyebrow mb-2">PRIMARY BUTTON</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorSwatchField label="BACKGROUND" value={data.hero_primary_btn_bg || ''} onChange={v => set({ hero_primary_btn_bg: v })} testId="admin-hero-primary-btn-bg" />
              <ColorSwatchField label="TEXT COLOR" value={data.hero_primary_btn_text || ''} onChange={v => set({ hero_primary_btn_text: v })} testId="admin-hero-primary-btn-text" />
            </div>
          </div>
          <div className="pt-3 border-t border-dashed border-[color:var(--brand-border)]">
            <p className="eyebrow mb-2">SECONDARY BUTTON</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorSwatchField label="BACKGROUND" value={data.hero_secondary_btn_bg || ''} onChange={v => set({ hero_secondary_btn_bg: v })} testId="admin-hero-secondary-btn-bg" hint={mode === 'full_bleed' ? 'Default: translucent white overlay.' : undefined} />
              <ColorSwatchField label="TEXT COLOR" value={data.hero_secondary_btn_text || ''} onChange={v => set({ hero_secondary_btn_text: v })} testId="admin-hero-secondary-btn-text" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * HeroFontsPanel — dedicated font pickers for the three text elements in the
 * hero (eyebrow, headline, subtitle) so the owner can pick a dramatic display
 * font just for the hero without affecting section headings or body copy
 * across the rest of the site. Empty value = fall back to the site-wide font.
 */
const HeroFontsPanel = memo(function HeroFontsPanel({ data, set }) {
  const [open, setOpen] = useState(false);
  const Picker = ({ label, hint, value, onChange, testId, previewText, sample }) => (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      <select
        className="input-cream !h-9 text-sm w-full"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        data-testid={testId}
      >
        <option value="">— Use site default —</option>
        {ALL_FONT_OPTIONS.map(group => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">{hint}</p>}
      {value && (
        <p
          className="mt-2 text-lg"
          style={{
            fontFamily: (() => {
              for (const g of ALL_FONT_OPTIONS) {
                const hit = g.items.find(x => x.id === value);
                if (hit) return hit.family;
              }
              return 'inherit';
            })(),
          }}
        >
          {sample || previewText}
        </p>
      )}
    </div>
  );
  return (
    <div className="border-t border-[color:var(--brand-border)] pt-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left group"
        data-testid="admin-hero-fonts-toggle"
      >
        <div>
          <p className="eyebrow">HERO FONTS</p>
          <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">
            Pick a dramatic display font just for the hero — leave blank to keep it matching the rest of the site.
          </p>
        </div>
        <span className="text-sm text-[color:var(--brand-sage-deep)] group-hover:underline shrink-0 ml-3">{open ? 'Hide' : 'Customize hero fonts'}</span>
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Picker
            label="EYEBROW FONT"
            testId="admin-hero-eyebrow-font"
            value={data.hero_eyebrow_font_id}
            onChange={v => set({ hero_eyebrow_font_id: v })}
            hint="The small UPPERCASE label above the headline."
            sample={data.hero_eyebrow || 'SWELLDESIGNLA.COM'}
          />
          <Picker
            label="HEADLINE FONT"
            testId="admin-hero-headline-font"
            value={data.hero_headline_font_id}
            onChange={v => set({ hero_headline_font_id: v })}
            hint="The big statement across the hero photo."
            sample={data.hero_headline || 'Where your vision comes to life.'}
          />
          <Picker
            label="SUBTITLE FONT"
            testId="admin-hero-subhead-font"
            value={data.hero_subhead_font_id}
            onChange={v => set({ hero_subhead_font_id: v })}
            hint="The tagline underneath the headline."
            sample={data.hero_subhead || 'Custom design, thoughtful details, and a calm process.'}
          />
        </div>
      )}
    </div>
  );
});
const RecentWorkPreview = memo(function RecentWorkPreview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/gallery');
      setItems(r.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleFeatured = async (item) => {
    await api.put(`/admin/gallery/${item.id}`, { ...item, featured: !item.featured });
    load();
  };

  const featured = items.filter(i => i.featured).slice(0, 6);
  const notFeatured = items.filter(i => !i.featured);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[color:var(--brand-text-muted)]">These 6 images show in the “Recent Work” strip on your homepage. Feature or unfeature portfolio items below — or manage the full portfolio for reordering, titles, and categories.</p>
        <Link to="/admin/portfolio" className="btn-secondary !h-8 text-xs" data-testid="admin-home-portfolio-link">Manage full portfolio <ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>

      {loading && <p className="text-sm text-[color:var(--brand-text-muted)]">Loading portfolio…</p>}

      {!loading && (
        <>
          <p className="eyebrow">SHOWING NOW ({featured.length}/6)</p>
          {featured.length === 0 && (
            <div className="card-cream p-4 text-sm text-[color:var(--brand-text-muted)]">No featured items yet. Star some images below and they'll appear on the homepage.</div>
          )}
          {featured.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {featured.map(f => (
                <button key={f.id} type="button" onClick={() => toggleFeatured(f)} title="Click to remove from homepage" className="group relative aspect-square rounded-xl overflow-hidden bg-[color:var(--brand-surface-2)]" data-testid={`admin-home-featured-${f.id}`}>
                  <img src={publicUrl(f.image_url)} alt={f.title || ''} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] uppercase tracking-wider text-white font-medium">Remove</span>
                  </div>
                  <Star className="absolute top-1 right-1 h-3.5 w-3.5 fill-[color:var(--brand-sage-deep)] text-[color:var(--brand-sage-deep)] drop-shadow" />
                </button>
              ))}
            </div>
          )}

          {notFeatured.length > 0 && (
            <>
              <p className="eyebrow mt-4">PROMOTE ANY OF THESE</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {notFeatured.slice(0, 16).map(item => (
                  <button key={item.id} type="button" onClick={() => toggleFeatured(item)} title="Click to feature on homepage" className="group relative aspect-square rounded-xl overflow-hidden bg-[color:var(--brand-surface-2)] opacity-70 hover:opacity-100" data-testid={`admin-home-promote-${item.id}`}>
                    <img src={publicUrl(item.image_url)} alt={item.title || ''} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Star className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
              {notFeatured.length > 16 && (
                <p className="text-xs text-[color:var(--brand-text-muted)]">… and {notFeatured.length - 16} more — <Link to="/admin/portfolio" className="link-underline">manage all in portfolio</Link>.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
});

/**
 * ELFSIGHT_TEMPLATE — the exact Elfsight embed snippet shape. The App ID
 * is a placeholder; the owner replaces it with the ID from their Elfsight
 * dashboard. Kept as a constant so we can offer a one-click "load the
 * template" button in the admin, so nothing has to be memorized.
 */
const ELFSIGHT_TEMPLATE = `<script src="https://static.elfsight.com/platform/platform.js" async></script>
<div class="elfsight-app-YOUR-APP-ID-HERE" data-elfsight-app-lazy></div>`;

const WIDGET_POSITIONS = [
  { value: 'after-hero', label: 'After the hero (very top)' },
  { value: 'after-services', label: 'After the services grid' },
  { value: 'after-portfolio', label: 'After the Recent Work portfolio' },
  { value: 'after-backdrops', label: 'After the Backdrops section' },
  { value: 'after-testimonials', label: 'After the Testimonials (recommended)' },
  { value: 'after-designer', label: 'After the Meet the Designer bio' },
  { value: 'after-faq', label: 'After the FAQ preview' },
  { value: 'before-cta', label: 'Right before the final CTA (bottom)' },
];

/**
 * EmbedWidgetCard — admin editor for the pasteable homepage widget
 * (Elfsight Facebook feed, Google Reviews, POWr, or ANY third-party
 * embed). Snippet is stored raw and rendered via <EmbedWidget />,
 * which safely hoists <script src="…"> tags into <head>.
 *
 * Design notes:
 *   • Section is section-visibility-toggle driven (home_widget_active).
 *   • The paste box carries a very visible security warning because
 *     the content is executed on the live site.
 *   • Owner can one-click load a template for the most common case
 *     (Elfsight Facebook feed) so nothing has to be memorized.
 */
const EmbedWidgetCard = memo(function EmbedWidgetCard({ data, set }) {
  const active = !!data.home_widget_active;
  const snippet = data.home_widget_snippet || '';
  const loadTemplate = () => {
    if (snippet.trim() && !window.confirm('Replace your current snippet with the Elfsight Facebook feed template?')) return;
    set({ home_widget_snippet: ELFSIGHT_TEMPLATE });
  };
  const clearSnippet = () => {
    if (!window.confirm('Clear the widget snippet? The section will show the placeholder until you paste new code.')) return;
    set({ home_widget_snippet: '' });
  };

  return (
    <div className={`card-cream p-6 space-y-4 ${active ? '' : 'opacity-80'}`} data-testid="admin-home-widget-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-serif text-xl flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
            Facebook feed / embed widget
          </p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
            Paste any Elfsight, POWr, Tagembed, or third-party embed snippet and it will render on the homepage. Use it for a Facebook feed, Google Reviews, event calendar, or anything else.
          </p>
        </div>
        <ToggleRow
          label={active ? 'Section on' : 'Section off'}
          checked={active}
          onChange={v => set({ home_widget_active: v })}
          testId="admin-home-widget-toggle"
        />
      </div>

      {active && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">EYEBROW</label>
              <TextField
                value={data.home_widget_eyebrow || ''}
                onCommit={v => set({ home_widget_eyebrow: v })}
                placeholder="FOLLOW ALONG"
                data-testid="admin-home-widget-eyebrow"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1">HEADING</label>
              <TextField
                value={data.home_widget_heading || ''}
                onCommit={v => set({ home_widget_heading: v })}
                placeholder="See our latest work on Facebook"
                data-testid="admin-home-widget-heading"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="eyebrow block mb-1">SUBHEADING (optional)</label>
              <TextField
                value={data.home_widget_subheading || ''}
                onCommit={v => set({ home_widget_subheading: v })}
                placeholder="A short sentence under the heading — leave blank to hide."
                data-testid="admin-home-widget-subheading"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="eyebrow block mb-1">POSITION ON HOMEPAGE</label>
              <select
                className="input-cream"
                value={data.home_widget_position || 'after-testimonials'}
                onChange={e => set({ home_widget_position: e.target.value })}
                data-testid="admin-home-widget-position"
              >
                {WIDGET_POSITIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-[color:var(--brand-border)] pt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-[color:var(--brand-blush-tint)] p-3">
              <AlertTriangle className="h-4 w-4 text-[color:var(--brand-text)] mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                <strong>Only paste code from trusted sources — this runs live on your site.</strong>{' '}
                Elfsight, POWr, and other reputable widget providers are safe. Never paste code from a stranger, forum, or email you don't recognize.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <label className="eyebrow">WIDGET CODE SNIPPET</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={loadTemplate}
                    className="btn-secondary !h-8 text-xs"
                    data-testid="admin-home-widget-load-template"
                  >
                    <Facebook className="h-3.5 w-3.5" /> Load Elfsight template
                  </button>
                  {snippet && (
                    <button
                      type="button"
                      onClick={clearSnippet}
                      className="btn-secondary !h-8 text-xs text-red-600"
                      data-testid="admin-home-widget-clear"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <TextArea
                rows={6}
                value={snippet}
                onCommit={v => set({ home_widget_snippet: v })}
                placeholder={'Paste the full snippet from Elfsight here, e.g.\n<script src="https://static.elfsight.com/..." async></script>\n<div class="elfsight-app-xxxx" data-elfsight-app-lazy></div>'}
                className="font-mono text-xs"
                data-testid="admin-home-widget-snippet"
              />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1.5">
                Leave blank to show a "widget will appear here" placeholder on the homepage — useful while you're still setting things up.
              </p>
            </div>

            <div className="rounded-xl bg-[color:var(--brand-sage-tint)]/40 p-3 text-xs text-[color:var(--brand-text-muted)] leading-relaxed">
              <p className="font-medium text-[color:var(--brand-text)] mb-1">How to get your Elfsight snippet:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Sign up at <a href="https://elfsight.com" target="_blank" rel="noreferrer" className="link-underline">elfsight.com</a> and pick "Facebook Feed"</li>
                <li>Connect your Facebook Page and customize the look</li>
                <li>Click "Add to website" → copy the code that starts with <code>&lt;script src=…</code></li>
                <li>Paste it into the box above and hit Save</li>
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

/**
 * ValuePillarsCard — dedicated editor for the Canva-style "Value pillars"
 * homepage section. Gives the owner a large multi-line textarea for each
 * pillar body (this is the main friction point on the generic teaser card,
 * which only had short subtitle inputs).
 *
 * Layout mirrors the public output: eyebrow / big headline / tagline on the
 * left, an ordered repeatable list of {title, body} on the right. The headline
 * hint calls out the *asterisk-emphasis* trick so the owner can recreate her
 * "long-lasting pieces" italic accent without any code knowledge.
 */
const ValuePillarsCard = memo(function ValuePillarsCard({ data, set }) {
  const items = Array.isArray(data.home_pillars_items) ? data.home_pillars_items : [];
  const active = !!data.home_pillars_active;

  const updateItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    set({ home_pillars_items: next });
  };
  const addItem = () => set({ home_pillars_items: [...items, { title: 'New pillar', body: '' }] });
  const removeItem = (idx) => set({ home_pillars_items: items.filter((_, i) => i !== idx) });
  const swapItems = (a, b) => {
    if (a < 0 || b < 0 || a >= items.length || b >= items.length) return;
    const next = [...items];
    [next[a], next[b]] = [next[b], next[a]];
    set({ home_pillars_items: next });
  };

  return (
    <div className={`card-cream p-6 space-y-5 ${active ? '' : 'opacity-70'}`} data-testid="admin-home-pillars-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-serif text-xl">Value pillars (narrative section)</p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-0.5 max-w-2xl">
            A magazine-style block for the homepage: one big italic-accent headline on the left, and long-form value blocks on the right.
            {!active && ' Turn it on above to make this section appear on your homepage.'}
          </p>
        </div>
        {!active && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-[color:var(--brand-surface-2)] text-[color:var(--brand-text-muted)]">Currently hidden on public site</span>
        )}
      </div>

      <div>
        <label className="eyebrow block mb-1">EYEBROW (small uppercase label above headline)</label>
        <TextField
          value={data.home_pillars_eyebrow || ''}
          onCommit={v => set({ home_pillars_eyebrow: v })}
          placeholder="e.g. OUR PROMISE"
          data-testid="admin-home-pillars-eyebrow"
        />
      </div>

      <div>
        <label className="eyebrow block mb-1">HEADLINE (left column)</label>
        <TextArea
          rows={3}
          value={data.home_pillars_headline || ''}
          onCommit={v => set({ home_pillars_headline: v })}
          placeholder="e.g. We create *long-lasting pieces* that make a difference"
          data-testid="admin-home-pillars-headline"
        />
        <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">
          <b>Tip:</b> wrap any words in <code className="font-mono text-[11px] px-1 rounded bg-white border border-[color:var(--brand-border)]">*asterisks*</code> to render them in italic serif (matches the accent style in your Canva reference).
        </p>
      </div>

      <div>
        <label className="eyebrow block mb-1">TAGLINE (small line under headline — optional)</label>
        <TextField
          value={data.home_pillars_tagline || ''}
          onCommit={v => set({ home_pillars_tagline: v })}
          placeholder="e.g. We take pride in our products."
          data-testid="admin-home-pillars-tagline"
        />
      </div>

      <div className="border-t border-[color:var(--brand-border)] pt-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="eyebrow">PILLARS (right column)</p>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">Each pillar has a short title and a longer paragraph. Add as many as you like.</p>
          </div>
          <button type="button" className="btn-secondary !h-8 text-xs" onClick={addItem} data-testid="admin-home-pillar-add">
            <Plus className="h-3.5 w-3.5" /> Add pillar
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--brand-border)] p-6 text-center">
            <p className="text-sm font-medium">No pillars yet</p>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Add your first pillar to describe what makes your work special.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={idx} className="card-cream p-4 space-y-3" data-testid={`admin-home-pillar-${idx}`}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium shrink-0">{idx + 1}</div>
                  <TextField
                    className="!h-9 flex-1 font-serif text-base"
                    value={it.title || ''}
                    onCommit={v => updateItem(idx, { title: v })}
                    placeholder="Pillar title (e.g. Sustainable and Durable)"
                    data-testid={`admin-home-pillar-title-${idx}`}
                  />
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === 0} onClick={() => swapItems(idx - 1, idx)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === items.length - 1} onClick={() => swapItems(idx, idx + 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => removeItem(idx)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <TextArea
                  rows={5}
                  value={it.body || ''}
                  onCommit={v => updateItem(idx, { body: v })}
                  placeholder="A longer paragraph describing this pillar. Feel free to be descriptive — this section is designed for meaningful copy."
                  data-testid={`admin-home-pillar-body-${idx}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});



const AdminHomePage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  const badges = Array.isArray(data.hero_badges) ? data.hero_badges : [];
  const swapBadges = (a, b) => { const next = [...badges]; [next[a], next[b]] = [next[b], next[a]]; set({ hero_badges: next }); };
  const swapSteps = (a, b) => { const next = [...(data.home_process_steps || [])]; [next[a], next[b]] = [next[b], next[a]]; set({ home_process_steps: next }); };

  return (
    <div className="space-y-6" data-testid="admin-home-page">
      <PageHeader
        eyebrow="PAGE"
        title="Home page"
        subtitle="Everything visitors see on your homepage: hero, sections, Recent Work, Instagram feed, process timeline."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-home-save"
      />

      <SectionCard title="Hero" subtitle="The big top banner — headline, subhead, buttons, and image.">
        <div className="rounded-xl border border-[color:var(--brand-border)] p-4 space-y-3 bg-[color:var(--brand-surface-2)]/40" data-testid="admin-hero-layout-mode">
          <p className="eyebrow">LAYOUT STYLE</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`card-cream p-3 cursor-pointer transition-colors ${(data.hero_layout_mode || 'split') === 'split' ? 'ring-2 ring-[color:var(--brand-sage-deep)]' : ''}`}>
              <div className="flex items-start gap-3">
                <input type="radio" name="hero_layout_mode" value="split" checked={(data.hero_layout_mode || 'split') === 'split'} onChange={() => set({ hero_layout_mode: 'split' })} className="mt-1" data-testid="admin-hero-mode-split" />
                <div>
                  <p className="font-medium">Split hero (default)</p>
                  <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">Headline & buttons on the left, portrait photo on the right — the current style.</p>
                </div>
              </div>
            </label>
            <label className={`card-cream p-3 cursor-pointer transition-colors ${data.hero_layout_mode === 'full_bleed' ? 'ring-2 ring-[color:var(--brand-sage-deep)]' : ''}`}>
              <div className="flex items-start gap-3">
                <input type="radio" name="hero_layout_mode" value="full_bleed" checked={data.hero_layout_mode === 'full_bleed'} onChange={() => set({ hero_layout_mode: 'full_bleed' })} className="mt-1" data-testid="admin-hero-mode-fullbleed" />
                <div>
                  <p className="font-medium">Full-width background</p>
                  <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">Photo fills the top of the page; centered cream headline overlaid with a soft dark gradient for legibility.</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.hero_eyebrow || ''} onCommit={v => set({ hero_eyebrow: v })} /></div>
        </div>
        <div><label className="eyebrow block mb-1">HEADLINE</label><TextArea rows={2} value={data.hero_headline || ''} onCommit={v => set({ hero_headline: v })} /></div>
        <div><label className="eyebrow block mb-1">SUBHEAD</label><TextArea rows={3} value={data.hero_subhead || ''} onCommit={v => set({ hero_subhead: v })} /></div>
        <div>
          <label className="eyebrow block mb-1">HERO IMAGE {(data.hero_layout_mode || 'split') === 'split' ? '(portrait, shown on the right)' : '(fallback if no background image is set)'}</label>
          {data.hero_image_url && <img src={publicUrl(data.hero_image_url)} alt="hero" className="h-32 w-auto rounded-lg mb-2" />}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ hero_image_url: r.url }); } }} />
            <MediaPickerButton testId="media-picker-hero" onSelect={url => set({ hero_image_url: url })} />
          </div>
          <TextField className="mt-2" value={data.hero_image_url || ''} onCommit={v => set({ hero_image_url: v })} />
        </div>

        {data.hero_layout_mode === 'full_bleed' && (
          <div className="rounded-xl border border-[color:var(--brand-border)] p-4 space-y-3 bg-[color:var(--brand-sage-tint)]/30" data-testid="admin-hero-fullbleed-controls">
            <p className="eyebrow">FULL-WIDTH BACKGROUND</p>
            <div>
              <label className="eyebrow block mb-1">BACKGROUND IMAGE (wide landscape works best)</label>
              {data.hero_background_image_url && <img src={publicUrl(data.hero_background_image_url)} alt="background" className="h-32 w-auto rounded-lg mb-2" />}
              <div className="flex items-center gap-2 flex-wrap">
                <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ hero_background_image_url: r.url }); } }} />
                <MediaPickerButton testId="media-picker-hero-bg" onSelect={url => set({ hero_background_image_url: url })} />
                {data.hero_background_image_url && <button type="button" onClick={() => set({ hero_background_image_url: '' })} className="text-red-600 text-xs">Remove</button>}
              </div>
              <TextField className="mt-2" value={data.hero_background_image_url || ''} onCommit={v => set({ hero_background_image_url: v })} placeholder="Or paste an image URL" />
            </div>
            <div>
              <label className="eyebrow block mb-1">OVERLAY DARKENING ({Math.round((data.hero_overlay_intensity ?? 0.45) * 100)}%)</label>
              <input
                type="range"
                min="0" max="0.8" step="0.05"
                value={data.hero_overlay_intensity ?? 0.45}
                onChange={e => set({ hero_overlay_intensity: parseFloat(e.target.value) })}
                className="w-full accent-[color:var(--brand-sage-deep)]"
                data-testid="admin-hero-overlay"
              />
              <p className="text-xs text-[color:var(--brand-text-muted)]">Softens the photo so the cream headline stays legible. 45% is a good default.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">PRIMARY CTA LABEL</label><TextField value={data.hero_primary_cta_label || ''} onCommit={v => set({ hero_primary_cta_label: v })} /></div>
          <div><label className="eyebrow block mb-1">PRIMARY CTA LINK</label><TextField value={data.hero_primary_cta_href || ''} onCommit={v => set({ hero_primary_cta_href: v })} /></div>
          <div><label className="eyebrow block mb-1">SECONDARY CTA LABEL</label><TextField value={data.hero_secondary_cta_label || ''} onCommit={v => set({ hero_secondary_cta_label: v })} /></div>
          <div><label className="eyebrow block mb-1">SECONDARY CTA LINK</label><TextField value={data.hero_secondary_cta_href || ''} onCommit={v => set({ hero_secondary_cta_href: v })} /></div>
        </div>

        <HeroColorsPanel data={data} set={set} />

        <HeroFontsPanel data={data} set={set} />

        <div className="border-t border-[color:var(--brand-border)] pt-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="eyebrow">HERO BADGES</p>
            <button type="button" className="btn-secondary !h-8 text-xs" onClick={() => set({ hero_badges: [...badges, 'New badge'] })}><Plus className="h-3.5 w-3.5" /> Add badge</button>
          </div>
          <ToggleRow label="Show hero badges" hint="Turn off to hide the whole row of chips." checked={data.hero_badges_active !== false} onChange={v => set({ hero_badges_active: v })} />
          {badges.map((badge, idx) => (
            <div key={idx} className="card-cream p-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium">{idx + 1}</div>
              <TextField className="!h-9 flex-1" value={badge} onCommit={v => { const next = [...badges]; next[idx] = v; set({ hero_badges: next }); }} placeholder="Badge text" />
              <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === 0} onClick={() => swapBadges(idx - 1, idx)}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === badges.length - 1} onClick={() => swapBadges(idx, idx + 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => set({ hero_badges: badges.filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Section visibility" subtitle="Toggle any full section on or off.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="Value pillars (narrative)" hint="Big italic-accent headline + long-form value blocks. See section below." checked={!!data.home_pillars_active} onChange={v => set({ home_pillars_active: v })} />
          <ToggleRow label="Services grid (home section)" hint="The 6-service grid on the home page only. Toggle it off to hide the ‘What we do (Services teaser)’ block below." checked={data.home_services_active !== false} onChange={v => set({ home_services_active: v })} />
          <ToggleRow label="Recent Work preview" hint="Portfolio strip linking to /portfolio." checked={data.home_gallery_active !== false} onChange={v => set({ home_gallery_active: v })} />
          <ToggleRow label="Instagram feed" hint="Live IG posts strip." checked={data.home_instagram_active !== false} onChange={v => set({ home_instagram_active: v })} />
          <ToggleRow label="Facebook feed / embed widget" hint="Elfsight or any pasted embed snippet." checked={!!data.home_widget_active} onChange={v => set({ home_widget_active: v })} />
          <ToggleRow label="Process timeline" hint="Numbered step boxes." checked={data.home_process_active !== false} onChange={v => set({ home_process_active: v })} />
          <ToggleRow label="Testimonials" hint="Client reviews." checked={data.home_testimonials_active !== false} onChange={v => set({ home_testimonials_active: v })} />
          <ToggleRow label="Backdrops" hint="Featured backdrops section linking to /backdrops." checked={data.home_backdrops_active !== false} onChange={v => set({ home_backdrops_active: v })} />
          <ToggleRow label="Meet the designer" hint="Bio + photo block." checked={data.home_designer_active !== false} onChange={v => set({ home_designer_active: v })} />
          <ToggleRow label="FAQ preview" hint="Common questions with link to full FAQ." checked={data.home_faq_active !== false} onChange={v => set({ home_faq_active: v })} />
          <ToggleRow label="Final call-to-action" hint="Closing card near the footer." checked={data.home_final_cta_active !== false} onChange={v => set({ home_final_cta_active: v })} />
        </div>
        <div className="mt-4 pt-4 border-t border-[color:var(--brand-border)]">
          <p className="eyebrow mb-2">SITE-WIDE</p>
          <div className="space-y-3">
            <ToggleRow
              label="Services page (whole site)"
              hint="Governs the standalone /services page and the ‘Services’ item in the header & footer nav. Turn OFF to hide services entirely site-wide — your section text and services list are preserved for whenever you're ready."
              checked={data.services_page_active !== false}
              onChange={v => set({ services_page_active: v })}
            />
            <ToggleRow
              label="Blog (whole site)"
              hint="Off by default. Governs the /blog page, individual /blog/:slug posts, and the ‘Blog’ item in the header & footer. Most owners keep this off and let their IG feed be their blog — flip it on anytime; your posts are preserved."
              checked={data.blog_page_active === true}
              onChange={v => set({ blog_page_active: v })}
            />
            <ToggleRow
              label="FAQ page (whole site)"
              hint="Off by default. Governs the /faq page and the ‘FAQ’ item in the header & footer. Turn ON once your questions are ready; the homepage FAQ preview is a separate toggle above."
              checked={data.faq_page_active === true}
              onChange={v => set({ faq_page_active: v })}
            />
          </div>
        </div>
      </SectionCard>

      <ValuePillarsCard data={data} set={set} />

      {data.home_services_active !== false ? (
        <SectionCard title="What we do (Services teaser)" subtitle="Eyebrow, title, and subtitle for the services grid on the home page.">
          <EyebrowTitleSubtitleRow prefix="home_services" data={data} set={set} />
        </SectionCard>
      ) : (
        <div className="card-cream p-6 opacity-60" data-testid="admin-services-teaser-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-lg">What we do (Services teaser)</p>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[color:var(--brand-surface-2)] text-[color:var(--brand-text-muted)]">Currently hidden</span>
          </div>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">
            The Services grid is turned off in Section visibility above, so this editor is hidden. Turn the toggle back on to edit these fields.
          </p>
        </div>
      )}

      <SectionCard title="Recent Work" subtitle="Eyebrow, title, subtitle — plus which portfolio items appear.">
        <EyebrowTitleSubtitleRow prefix="home_gallery" data={data} set={set} />
        <div className="border-t border-[color:var(--brand-border)] pt-4">
          <RecentWorkPreview />
        </div>
      </SectionCard>

      <SectionCard title="Instagram feed" subtitle="Latest posts strip. Auto-hides if not connected.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.home_instagram_eyebrow || ''} onCommit={v => set({ home_instagram_eyebrow: v })} placeholder="LATEST FROM INSTAGRAM" data-testid="admin-ig-eyebrow" /></div>
          <div><label className="eyebrow block mb-1">TITLE</label><TextField value={data.home_instagram_title || ''} onCommit={v => set({ home_instagram_title: v })} placeholder="Follow along" data-testid="admin-ig-title" /></div>
          <div><label className="eyebrow block mb-1">SUBTITLE (optional)</label><TextField value={data.home_instagram_subtitle || ''} onCommit={v => set({ home_instagram_subtitle: v })} placeholder="(leave blank to hide)" data-testid="admin-ig-subtitle" /></div>
          <div>
            <label className="eyebrow block mb-1">POSTS TO SHOW</label>
            <select className="input-cream" value={data.home_instagram_count || 12} onChange={e => set({ home_instagram_count: Number(e.target.value) })} data-testid="admin-ig-count">
              {[6, 8, 12, 18, 24].map(n => <option key={n} value={n}>{n} posts</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-[color:var(--brand-text-muted)]">The “@ handle” button in the top-right uses your <strong>Instagram URL</strong> from <Link to="/admin/social-contact" className="link-underline">Contact &amp; social</Link>.</p>
      </SectionCard>

      <EmbedWidgetCard data={data} set={set} />

      <SectionCard title="The Process (timeline)" subtitle="The 5 numbered step boxes shown mid-page.">
        <EyebrowTitleSubtitleRow prefix="home_process" data={data} set={set} />
        <div className="border-t border-[color:var(--brand-border)] pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="eyebrow">TIMELINE STEPS</p>
            <button type="button" className="btn-secondary !h-8 text-xs" onClick={() => set({ home_process_steps: [...(data.home_process_steps || []), { title: 'New step', description: '' }] })}><Plus className="h-3.5 w-3.5" /> Add step</button>
          </div>
          <div className="space-y-2">
            {(data.home_process_steps || []).map((step, idx) => (
              <div key={idx} className="card-cream p-3 grid grid-cols-1 md:grid-cols-[auto_1fr_2fr_auto] gap-2 items-start">
                <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium">{idx + 1}</div>
                <TextField className="!h-9" placeholder="Title" value={step.title || ''} onCommit={v => { const next = [...data.home_process_steps]; next[idx] = { ...next[idx], title: v }; set({ home_process_steps: next }); }} />
                <TextField className="!h-9" placeholder="Description" value={step.description || ''} onCommit={v => { const next = [...data.home_process_steps]; next[idx] = { ...next[idx], description: v }; set({ home_process_steps: next }); }} />
                <div className="flex gap-1">
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === 0} onClick={() => swapSteps(idx - 1, idx)}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === (data.home_process_steps || []).length - 1} onClick={() => swapSteps(idx, idx + 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => set({ home_process_steps: data.home_process_steps.filter((_, i) => i !== idx) })}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Testimonials heading">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.home_testimonials_eyebrow || ''} onCommit={v => set({ home_testimonials_eyebrow: v })} /></div>
          <div><label className="eyebrow block mb-1">TITLE</label><TextField value={data.home_testimonials_title || ''} onCommit={v => set({ home_testimonials_title: v })} /></div>
        </div>
        <p className="text-xs text-[color:var(--brand-text-muted)]">Only <strong>featured</strong> reviews with status <em>Approved</em> appear here. Manage in <Link to="/admin/testimonials" className="link-underline">Content → Testimonials</Link>.</p>
      </SectionCard>

      <SectionCard title="Backdrops heading" subtitle="A catalog strip on the homepage — only shows if there are featured backdrops.">
        <EyebrowTitleSubtitleRow prefix="home_backdrops" data={data} set={set} />
        <p className="text-xs text-[color:var(--brand-text-muted)]">Add & feature backdrops in <Link to="/admin/backdrops" className="link-underline">Content → Backdrops</Link>. Only ones marked <em>Featured</em> appear on the homepage.</p>
      </SectionCard>

      <SectionCard title="FAQ heading">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.home_faq_eyebrow || ''} onCommit={v => set({ home_faq_eyebrow: v })} /></div>
          <div><label className="eyebrow block mb-1">TITLE</label><TextField value={data.home_faq_title || ''} onCommit={v => set({ home_faq_title: v })} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Final call-to-action" subtitle="The soft-pink closing card at the very bottom of the homepage — the last thing every visitor sees before the footer.">
        <div className="grid grid-cols-1 gap-3">
          <ToggleRow
            label="Show heart icon"
            hint="The little heart above the headline. Turn off for a cleaner look."
            checked={data.home_final_cta_show_heart !== false}
            onChange={v => set({ home_final_cta_show_heart: v })}
          />
          <div>
            <label className="eyebrow block mb-1">EYEBROW (optional)</label>
            <TextField value={data.home_final_cta_eyebrow || ''} onCommit={v => set({ home_final_cta_eyebrow: v })} placeholder="e.g. LET'S CONNECT" />
          </div>
          <div>
            <label className="eyebrow block mb-1">HEADLINE</label>
            <TextField value={data.home_final_cta_title || ''} onCommit={v => set({ home_final_cta_title: v })} placeholder="Ready to plan something dreamy?" />
          </div>
          <div>
            <label className="eyebrow block mb-1">SUBTITLE</label>
            <TextArea
              rows={2}
              value={data.home_final_cta_subtitle || ''}
              onCommit={v => set({ home_final_cta_subtitle: v })}
              placeholder="Take two minutes to share your vision. We'll be in touch within 1–2 business days."
            />
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Blank lines preserved as paragraph breaks. Leave blank to hide.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">PRIMARY BUTTON — LABEL</label>
              <TextField value={data.home_final_cta_primary_label || ''} onCommit={v => set({ home_final_cta_primary_label: v })} placeholder="Start your inquiry" />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Leave blank to hide the primary button.</p>
            </div>
            <div>
              <label className="eyebrow block mb-1">PRIMARY BUTTON — LINK</label>
              <TextField value={data.home_final_cta_primary_href || ''} onCommit={v => set({ home_final_cta_primary_href: v })} placeholder="/inquire" />
            </div>
            <div>
              <label className="eyebrow block mb-1">SECONDARY BUTTON — LABEL</label>
              <TextField value={data.home_final_cta_secondary_label || ''} onCommit={v => set({ home_final_cta_secondary_label: v })} placeholder="See the portfolio (optional)" />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Leave blank to hide the secondary button.</p>
            </div>
            <div>
              <label className="eyebrow block mb-1">SECONDARY BUTTON — LINK</label>
              <TextField value={data.home_final_cta_secondary_href || ''} onCommit={v => set({ home_final_cta_secondary_href: v })} placeholder="/portfolio" />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Meet the designer" subtitle="The bio block on the homepage with photo + call-to-action buttons.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <label className="eyebrow block mb-1">PHOTO</label>
            <div className="rounded-xl overflow-hidden aspect-[5/6] bg-[color:var(--brand-surface-2)] mb-2 border border-[color:var(--brand-border)]">
              {(data.designer_image_url || data.about_image_url) ? (
                <img src={publicUrl(data.designer_image_url || data.about_image_url)} alt="designer preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[color:var(--brand-text-muted)]">No photo yet</div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="btn-secondary text-xs cursor-pointer">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ designer_image_url: r.url }); } }} />
              </label>
              <MediaPickerButton testId="designer-image-picker" onSelect={url => set({ designer_image_url: url })} />
              {data.designer_image_url && (
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)]"
                  onClick={() => set({ designer_image_url: '' })}
                  title="Clear this photo and fall back to the About page image"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-2">Optional. If left blank, the photo from Admin → About page is used automatically.</p>
            <div className="mt-3">
              <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Layout</label>
              <select
                className="input-cream !h-9 text-sm w-full"
                value={data.designer_image_layout || 'side'}
                onChange={e => set({ designer_image_layout: e.target.value })}
                data-testid="admin-designer-image-layout"
              >
                <option value="side">Beside the text (side by side)</option>
                <option value="stacked">Above the text (full width) — best for wide photos</option>
                <option value="sticky">Beside the text, follows scroll (sticky)</option>
              </select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Ratio</label>
                <select
                  className="input-cream !h-9 text-sm"
                  value={data.designer_image_aspect || 'portrait'}
                  onChange={e => set({ designer_image_aspect: e.target.value })}
                  data-testid="admin-designer-image-aspect"
                >
                  <option value="portrait">Portrait (5:6)</option>
                  <option value="landscape">Landscape (4:3)</option>
                  <option value="wide">Wide (2:1)</option>
                  <option value="square">Square (1:1)</option>
                  <option value="auto">Auto (use image's own)</option>
                  <option value="fill">Fill (match text height)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Fit</label>
                <select
                  className="input-cream !h-9 text-sm"
                  value={data.designer_image_fit || 'cover'}
                  onChange={e => set({ designer_image_fit: e.target.value })}
                  data-testid="admin-designer-image-fit"
                >
                  <option value="cover">Fill (crops to frame)</option>
                  <option value="contain">Fit (show whole photo)</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-[color:var(--brand-text-muted)] mt-2 leading-snug">
              <b>Wide diptych photo?</b> Pick <em>Above the text (full width)</em> as the Layout with <em>Auto</em> ratio — both halves stay visible, no whitespace, no cropping.
            </p>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="eyebrow block mb-1">EYEBROW</label>
                <TextField value={data.designer_eyebrow || ''} onCommit={v => set({ designer_eyebrow: v })} placeholder="MEET THE DESIGNER" />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow block mb-1">NAME / HEADLINE</label>
                <TextField value={data.designer_name || ''} onCommit={v => set({ designer_name: v })} placeholder="Meet the designer" />
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1">BIO</label>
              <TextArea
                rows={5}
                value={data.designer_bio || ''}
                onCommit={v => set({ designer_bio: v })}
                placeholder="A short paragraph about you and your craft."
              />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Blank lines preserved as paragraph breaks.</p>
            </div>
            <div>
              <label className="eyebrow block mb-1">SIGNATURE (OPTIONAL)</label>
              <TextField
                value={data.designer_signature || ''}
                onCommit={v => set({ designer_signature: v })}
                placeholder="— Sam"
              />
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Rendered under the bio in the hand-lettered script font for a personal touch. Leave blank to hide.</p>
            </div>
            <div className="pt-3 border-t border-dashed border-[color:var(--brand-border)]">
              <p className="eyebrow mb-2">CALL-TO-ACTION BUTTONS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1 text-[color:var(--brand-text-muted)]">Primary button label</label>
                  <TextField value={data.designer_cta_primary_label || ''} onCommit={v => set({ designer_cta_primary_label: v })} placeholder="Start your inquiry" />
                </div>
                <div>
                  <label className="text-xs block mb-1 text-[color:var(--brand-text-muted)]">Primary button link</label>
                  <TextField value={data.designer_cta_primary_href || ''} onCommit={v => set({ designer_cta_primary_href: v })} placeholder="/inquire" />
                </div>
                <div>
                  <label className="text-xs block mb-1 text-[color:var(--brand-text-muted)]">Secondary button label</label>
                  <TextField value={data.designer_cta_secondary_label || ''} onCommit={v => set({ designer_cta_secondary_label: v })} placeholder="Read the story" />
                </div>
                <div>
                  <label className="text-xs block mb-1 text-[color:var(--brand-text-muted)]">Secondary button link</label>
                  <TextField value={data.designer_cta_secondary_href || ''} onCommit={v => set({ designer_cta_secondary_href: v })} placeholder="/about" />
                </div>
              </div>
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-2">Leave a label blank to hide that button.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Promo banner" subtitle="Optional highlight bar on the homepage.">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!data.promo_active} onChange={e => set({ promo_active: e.target.checked })} /> Show promo banner on homepage</label>
        <div><label className="eyebrow block mb-1">TITLE</label><TextField value={data.promo_title || ''} onCommit={v => set({ promo_title: v })} /></div>
        <div><label className="eyebrow block mb-1">TEXT</label><TextArea rows={2} value={data.promo_text || ''} onCommit={v => set({ promo_text: v })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">CTA LABEL</label><TextField value={data.promo_cta_label || ''} onCommit={v => set({ promo_cta_label: v })} /></div>
          <div><label className="eyebrow block mb-1">CTA LINK</label><TextField value={data.promo_cta_href || ''} onCommit={v => set({ promo_cta_href: v })} /></div>
        </div>
      </SectionCard>
    </div>
  );
};

export default AdminHomePage;
