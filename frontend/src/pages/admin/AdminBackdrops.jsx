import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Frame, Sparkles, ArrowUp, ArrowDown, Eye, EyeOff, ChevronDown, CheckSquare, Square, Tag, FileText } from 'lucide-react';
import { api, publicUrl, uploadFile } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { useSite } from '@/context/SiteContext';

/**
 * BackdropsPageCopyCard — edits the copy shown at the top of the public
 * /backdrops page (NOT the small homepage strip; that lives under Admin →
 * Home page → "Backdrops heading"). Split into two collapsible groups:
 * one for the Backdrops section header, one for the Designs section header.
 * Uses local state per field so typing feels instant, commits on blur.
 */
const CopyField = ({ label, hint, value, onCommit, placeholder, textarea }) => {
  const [local, setLocal] = useState(value || '');
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(value || ''); }, [value, focused]);
  const commit = () => { setFocused(false); if ((local || '') !== (value || '')) onCommit(local); };
  return (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      {textarea ? (
        <textarea
          className="input-cream textarea-cream"
          rows={3}
          value={local}
          placeholder={placeholder}
          onChange={e => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commit}
        />
      ) : (
        <input
          className="input-cream"
          value={local}
          placeholder={placeholder}
          onChange={e => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      )}
      {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">{hint}</p>}
    </div>
  );
};

const BackdropsPageCopyCard = () => {
  const { site, refresh } = useSite();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      await api.put('/admin/site-content', patch);
      await refresh();
      toast.success('Saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const showHeader = site?.backdrops_page_show_header !== false;
  const showDesigns = site?.backdrops_page_show_designs !== false;

  return (
    <div className="card-cream p-5" data-testid="admin-backdrops-page-copy-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left"
        data-testid="admin-backdrops-page-copy-toggle"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[color:var(--brand-sage-deep)]" />
          <div>
            <p className="font-serif text-lg leading-tight">Public /backdrops page copy</p>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">Headers, taglines, and section toggles for the /backdrops page.</p>
          </div>
        </div>
        <span className="text-sm text-[color:var(--brand-sage-deep)] shrink-0 ml-3">{open ? 'Hide' : 'Edit copy'}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="eyebrow">BACKDROPS SECTION HEADER</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeader}
                  onChange={e => save({ backdrops_page_show_header: e.target.checked })}
                  disabled={saving}
                  data-testid="admin-backdrops-page-show-header"
                />
                <span>Show this header on the page</span>
              </label>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${showHeader ? '' : 'opacity-50'}`}>
              <CopyField label="EYEBROW" value={site?.backdrops_page_eyebrow || ''} placeholder="BUILDING BLOCKS" onCommit={v => save({ backdrops_page_eyebrow: v })} />
              <CopyField label="TITLE" value={site?.backdrops_page_title || ''} placeholder="Backdrops" onCommit={v => save({ backdrops_page_title: v })} />
            </div>
            <div className={showHeader ? '' : 'opacity-50'}>
              <CopyField
                label="SUBTITLE"
                textarea
                value={site?.backdrops_page_subtitle || ''}
                placeholder="Our reusable structures — the anchor of every install."
                onCommit={v => save({ backdrops_page_subtitle: v })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[color:var(--brand-border)]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="eyebrow">DESIGNS SECTION HEADER (SAME PAGE, BELOW BACKDROPS)</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDesigns}
                  onChange={e => save({ backdrops_page_show_designs: e.target.checked })}
                  disabled={saving}
                  data-testid="admin-backdrops-page-show-designs"
                />
                <span>Show the Designs section</span>
              </label>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${showDesigns ? '' : 'opacity-50'}`}>
              <CopyField label="EYEBROW" value={site?.backdrops_page_designs_eyebrow || ''} placeholder="COMPLETE LOOKS" onCommit={v => save({ backdrops_page_designs_eyebrow: v })} />
              <CopyField label="TITLE" value={site?.backdrops_page_designs_title || ''} placeholder="Designs" onCommit={v => save({ backdrops_page_designs_title: v })} />
            </div>
            <div className={showDesigns ? '' : 'opacity-50'}>
              <CopyField
                label="SUBTITLE"
                textarea
                value={site?.backdrops_page_designs_subtitle || ''}
                placeholder="Fully-styled setups combining florals, balloons, and signage — themed and ready to go."
                onCommit={v => save({ backdrops_page_designs_subtitle: v })}
              />
            </div>
            <p className="text-xs text-[color:var(--brand-text-muted)]">The Designs section only appears if at least one item is marked as <b>Design</b> below.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminBackdrops = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('all'); // 'all' | 'backdrop' | 'design'
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const onDocClick = (e) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) setNewMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const startNew = (kind) => {
    setNewMenuOpen(false);
    setEditing({ name: '', subtitle: '', description: '', image_url: '', price_from: '', featured: false, active: true, kind });
  };

  const load = async () => {
    try {
      const { data } = await api.get('/admin/backdrops');
      setItems(data);
    } catch { toast.error('Failed to load'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (!editing.name || !editing.name.trim()) { toast.error('Name is required'); return; }
      if (editing.id) await api.put(`/admin/backdrops/${editing.id}`, editing);
      else await api.post('/admin/backdrops', { ...editing, order: items.length });
      toast.success('Saved'); setEditing(null); load();
    } catch { toast.error('Save failed'); }
  };
  const remove = async (id) => { if (!window.confirm('Delete this item?')) return; await api.delete(`/admin/backdrops/${id}`); toast.success('Deleted'); load(); };

  const move = async (idx, delta) => {
    const next = [...items];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    try { await api.post('/admin/backdrops/reorder', { order: next.map(b => b.id) }); }
    catch { toast.error('Reorder failed'); load(); }
  };

  const kindOf = (b) => b.kind || 'backdrop';
  const filtered = useMemo(() => (
    tab === 'all' ? items : items.filter(b => kindOf(b) === tab)
  ), [items, tab]);
  const counts = {
    all: items.length,
    backdrop: items.filter(b => kindOf(b) === 'backdrop').length,
    design: items.filter(b => kindOf(b) === 'design').length,
  };
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'backdrop', label: 'Backdrops' },
    { id: 'design', label: 'Designs' },
  ];

  // -------- Selection helpers --------
  const enterSelect = () => { setSelectMode(true); setSelected(new Set()); };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = filtered.length > 0 && filtered.every(b => selected.has(b.id));
  const toggleAllVisible = () => {
    setSelected(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach(b => next.delete(b.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach(b => next.add(b.id));
      return next;
    });
  };
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} item${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      await api.post('/admin/backdrops/bulk-delete', { ids });
      toast.success(`Deleted ${ids.length}`);
      exitSelect();
      load();
    } catch { toast.error('Bulk delete failed'); }
  };
  const bulkSetKind = async (kind) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await api.post('/admin/backdrops/bulk-update', { ids, patch: { kind } });
      toast.success(`Set ${ids.length} to ${kind}`);
      exitSelect();
      load();
    } catch { toast.error('Bulk update failed'); }
  };
  const bulkSetActive = async (active) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await api.post('/admin/backdrops/bulk-update', { ids, patch: { active } });
      toast.success(`${active ? 'Shown' : 'Hidden'} ${ids.length}`);
      exitSelect();
      load();
    } catch { toast.error('Bulk update failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-backdrops-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Backdrops &amp; Designs</h1>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">
            <b>Backdrops</b> are reusable structures (e.g. Trio Rounded Arch, Hoop).
            <b> Designs</b> are complete themed setups (palette + florals + balloons together).
            Both share the same form; the public site groups them into separate sections.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!selectMode ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={enterSelect}
                disabled={items.length === 0}
                data-testid="admin-backdrops-select-mode"
                title="Select multiple items for bulk actions"
              >
                <CheckSquare className="h-4 w-4" /> Select
              </button>
              <div className="relative" ref={newMenuRef}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setNewMenuOpen(o => !o)}
                  data-testid="admin-backdrops-new"
                  aria-haspopup="menu"
                  aria-expanded={newMenuOpen}
                >
                  <Plus className="h-4 w-4" /> New… <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {newMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 z-50 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] shadow-lg overflow-hidden"
                    role="menu"
                    data-testid="admin-backdrops-new-menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startNew('backdrop')}
                      className="w-full text-left px-3 py-3 hover:bg-[color:var(--brand-sage-tint)] border-b border-[color:var(--brand-border)] transition-colors"
                      data-testid="admin-backdrops-new-backdrop"
                    >
                      <div className="flex items-center gap-2">
                        <Frame className="h-4 w-4 text-[color:var(--brand-sage-deep)]" />
                        <div>
                          <p className="font-medium text-sm">New backdrop</p>
                          <p className="text-xs text-[color:var(--brand-text-muted)]">A reusable structure (arch, hoop…)</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startNew('design')}
                      className="w-full text-left px-3 py-3 hover:bg-[color:var(--brand-blush-tint)] transition-colors"
                      data-testid="admin-backdrops-new-design"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[color:var(--brand-coral)]" />
                        <div>
                          <p className="font-medium text-sm">New design</p>
                          <p className="text-xs text-[color:var(--brand-text-muted)]">A complete themed setup</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button type="button" className="btn-secondary" onClick={exitSelect} data-testid="admin-backdrops-select-cancel">Cancel</button>
          )}
        </div>
      </div>

      <BackdropsPageCopyCard />


      <div className="flex items-center gap-1 border-b border-[color:var(--brand-border)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'text-[color:var(--brand-text)] font-medium border-b-2 border-[color:var(--brand-sage-deep)] -mb-px'
                : 'text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)]'
            }`}
            data-testid={`admin-backdrops-tab-${t.id}`}
          >
            {t.label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-[color:var(--brand-surface-2)]">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {selectMode && (
        <div className="sticky top-0 z-20 -mx-2 px-2 py-3 bg-[color:var(--brand-cream)]/95 backdrop-blur border-b border-[color:var(--brand-border)] flex items-center justify-between flex-wrap gap-3" data-testid="admin-backdrops-selection-toolbar">
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleAllVisible} className="inline-flex items-center gap-2 text-sm font-medium hover:text-[color:var(--brand-sage-deep)]" data-testid="admin-backdrops-select-all">
              {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-[color:var(--brand-sage-deep)]" /> : <Square className="h-4 w-4" />}
              {allVisibleSelected ? 'Deselect all' : `Select all ${filtered.length}`}
            </button>
            <span className="text-sm text-[color:var(--brand-text-muted)]">{selected.size} selected</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className="btn-secondary text-sm" onClick={() => bulkSetKind('backdrop')} disabled={selected.size === 0} data-testid="admin-backdrops-bulk-kind-backdrop">
              <Frame className="h-3.5 w-3.5" /> Mark as backdrop
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => bulkSetKind('design')} disabled={selected.size === 0} data-testid="admin-backdrops-bulk-kind-design">
              <Sparkles className="h-3.5 w-3.5" /> Mark as design
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => bulkSetActive(true)} disabled={selected.size === 0}>Show</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => bulkSetActive(false)} disabled={selected.size === 0}>Hide</button>
            <button type="button" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-40" onClick={bulkDelete} disabled={selected.size === 0} data-testid="admin-backdrops-bulk-delete">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card-cream p-8 text-center">
          <Frame className="h-8 w-8 mx-auto text-[color:var(--brand-text-muted)] mb-2" />
          <p className="font-serif text-lg">Nothing here yet.</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">{tab === 'design' ? 'Add your first design — a complete themed look.' : tab === 'backdrop' ? 'Add your first backdrop — e.g. "Trio Rounded Arch".' : 'Add backdrops or designs with the button above.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b, idx) => {
            const isSelected = selected.has(b.id);
            return (
            <div key={b.id} className={`card-cream overflow-hidden relative transition-all ${isSelected ? 'ring-2 ring-[color:var(--brand-sage-deep)]' : ''}`} data-testid={`admin-backdrop-card-${b.id}`}>
              {selectMode && (
                <button
                  type="button"
                  onClick={() => toggleOne(b.id)}
                  className="absolute inset-0 z-10 flex items-start justify-start p-2 cursor-pointer group/select"
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  data-testid={`admin-backdrop-select-${b.id}`}
                >
                  <span className={`h-7 w-7 rounded-md flex items-center justify-center border-2 shadow-sm transition-colors ${isSelected ? 'bg-[color:var(--brand-sage-deep)] border-[color:var(--brand-sage-deep)] text-white' : 'bg-white/90 border-white/90 group-hover/select:bg-white'}`}>
                    {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-60" />}
                  </span>
                </button>
              )}
              <div className="aspect-[3/4] bg-[color:var(--brand-surface-2)] relative">
                {b.image_url ? (
                  <img src={publicUrl(b.image_url)} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[color:var(--brand-text-muted)]"><Frame className="h-10 w-10" /></div>
                )}
                <span className={`absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${kindOf(b) === 'design' ? 'bg-[color:var(--brand-blush-tint)] text-[color:var(--brand-coral)]' : 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]'}`}>
                  {kindOf(b)}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-lg leading-tight">{b.name}</p>
                    {b.subtitle && <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">{b.subtitle}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {b.featured && <span className="badge-soft text-[10px]">Featured</span>}
                    {b.active === false && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">Hidden</span>}
                  </div>
                </div>
                {!selectMode && (
                  <div className="mt-3 flex items-center gap-1">
                    <button onClick={() => setEditing(b)} className="link-underline text-sm">Edit</button>
                    <div className="ml-auto flex gap-1">
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" onClick={() => move(items.indexOf(b), -1)} disabled={items.indexOf(b) === 0} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" onClick={() => move(items.indexOf(b), +1)} disabled={items.indexOf(b) === items.length - 1} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => remove(b.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {editing && <BackdropEditor value={editing} setValue={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
};

const BackdropEditor = ({ value, setValue, onSave, onClose }) => {
  const setImage = (url) => setValue({ ...value, image_url: url });
  const kind = value.kind || 'backdrop';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[color:var(--brand-cream)] w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="admin-backdrop-editor">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl">{value.id ? 'Edit' : 'New'} {kind}</h2>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="eyebrow block mb-1">TYPE</label>
            <div className="grid grid-cols-2 gap-2" data-testid="admin-backdrop-kind-toggle">
              <button
                type="button"
                onClick={() => setValue({ ...value, kind: 'backdrop' })}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${kind === 'backdrop' ? 'border-[color:var(--brand-sage-deep)] bg-[color:var(--brand-sage-tint)]/40 ring-2 ring-[color:var(--brand-sage-deep)]' : 'border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)]/20'}`}
                data-testid="admin-backdrop-kind-backdrop"
              >
                <Frame className="h-4 w-4 text-[color:var(--brand-sage-deep)] shrink-0" />
                <div>
                  <p className="font-medium text-sm">Backdrop</p>
                  <p className="text-[11px] text-[color:var(--brand-text-muted)]">Reusable structure</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setValue({ ...value, kind: 'design' })}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${kind === 'design' ? 'border-[color:var(--brand-coral)] bg-[color:var(--brand-blush-tint)]/50 ring-2 ring-[color:var(--brand-coral)]' : 'border-[color:var(--brand-border)] hover:bg-[color:var(--brand-blush-tint)]/20'}`}
                data-testid="admin-backdrop-kind-design"
              >
                <Sparkles className="h-4 w-4 text-[color:var(--brand-coral)] shrink-0" />
                <div>
                  <p className="font-medium text-sm">Design</p>
                  <p className="text-[11px] text-[color:var(--brand-text-muted)]">Complete themed setup</p>
                </div>
              </button>
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1">NAME</label>
            <input className="input-cream" placeholder={kind === 'design' ? 'e.g. Boho Pampas Dream' : 'e.g. Trio Rounded Arch'} value={value.name || ''} onChange={e => setValue({ ...value, name: e.target.value })} data-testid="admin-backdrop-name" />
          </div>
          <div>
            <label className="eyebrow block mb-1">SUBTITLE / SHORT NOTE (optional)</label>
            <input className="input-cream" placeholder="e.g. can fit 160 champagne flutes" value={value.subtitle || ''} onChange={e => setValue({ ...value, subtitle: e.target.value })} />
          </div>
          <div>
            <label className="eyebrow block mb-1">DESCRIPTION (optional)</label>
            <textarea className="input-cream textarea-cream" rows={3} value={value.description || ''} onChange={e => setValue({ ...value, description: e.target.value })} placeholder="When to use, dimensions, styling notes…" />
          </div>
          <div>
            <label className="eyebrow block mb-1">PHOTO</label>
            {value.image_url && <img src={publicUrl(value.image_url)} alt="preview" className="h-40 w-auto rounded-lg mb-2" />}
            <div className="flex items-center gap-2 flex-wrap">
              <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { try { const r = await uploadFile(f); setImage(r.url); } catch { toast.error('Upload failed'); } } }} />
              <MediaPickerButton testId="media-picker-backdrop" onSelect={setImage} />
              {value.image_url && <button type="button" onClick={() => setImage('')} className="text-red-600 text-xs">Remove</button>}
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1">STARTING PRICE (optional)</label>
            <input className="input-cream" placeholder="e.g. $450" value={value.price_from || ''} onChange={e => setValue({ ...value, price_from: e.target.value })} />
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!value.featured} onChange={e => setValue({ ...value, featured: e.target.checked })} />
              <span className="text-sm">Featured on homepage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={value.active !== false} onChange={e => setValue({ ...value, active: e.target.checked })} />
              <span className="text-sm">Visible on public site</span>
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} className="btn-primary" data-testid="admin-backdrop-save">Save</button>
        </div>
      </div>
    </div>
  );
};

export default AdminBackdrops;
