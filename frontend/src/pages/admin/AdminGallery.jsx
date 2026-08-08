import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Upload, CheckSquare, Square, Tag, ChevronDown, ChevronUp, GripVertical, Settings2, Save } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { useSite } from '@/context/SiteContext';

const prettyLabel = (s) => (s || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
// Kept for backwards compatibility on legacy items whose category doesn't
// appear in the current admin list — we still want the badge to read nicely.
const prettyCategory = (c) => prettyLabel(c);

/** Turn a human label into a stable, url-safe slug key. */
const slugify = (label) =>
  (label || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * BulkUploadDialog — opens when the owner clicks "Bulk upload". Lets her pick
 * a target category (and optionally the "featured" flag) FIRST, then choose
 * the files. This avoids the previous behavior where every bulk upload was
 * silently defaulted to "weddings" — a real papercut for a photographer
 * uploading dozens of shots for a birthday or corporate event.
 */
const BulkUploadDialog = ({ onClose, onComplete, categories }) => {
  const firstKey = categories[0]?.key || '';
  const [category, setCategory] = useState(firstKey);
  const [featured, setFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const fileRef = useRef(null);

  // Close on Escape when not uploading
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !uploading) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, uploading]);

  const handleFiles = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    setUploading(true);
    setProgress({ done: 0, total: arr.length, failed: 0 });
    let done = 0, failed = 0;
    for (const f of arr) {
      try {
        const r = await uploadFile(f);
        await api.post('/admin/gallery', {
          image_url: r.url,
          category,
          featured,
          title: f.name.replace(/\.[^.]+$/, ''),
        });
        done += 1;
      } catch {
        failed += 1;
      }
      setProgress({ done, total: arr.length, failed });
    }
    setUploading(false);
    if (failed === 0) toast.success(`Uploaded ${done} photo${done === 1 ? '' : 's'} to ${prettyCategory(category)}`);
    else if (done > 0) toast.warning(`Uploaded ${done} · ${failed} failed`);
    else toast.error('All uploads failed');
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !uploading && onClose()}>
      <div className="bg-[color:var(--brand-cream)] w-full max-w-lg rounded-2xl p-6" onClick={e => e.stopPropagation()} data-testid="admin-gallery-bulk-upload-dialog">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl">Bulk upload photos</h2>
          <button onClick={onClose} disabled={uploading} aria-label="Close"><X /></button>
        </div>
        <p className="text-sm text-[color:var(--brand-text-muted)] mb-4">
          Choose which category these photos belong to before uploading. All selected files will be tagged with this category.
        </p>
        <div className="space-y-4">
          <div>
            <label className="eyebrow block mb-1">CATEGORY <span className="text-red-500">*</span></label>
            <select
              className="input-cream"
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={uploading}
              data-testid="admin-gallery-bulk-upload-category"
            >
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              {categories.length === 0 && <option value="">No categories — add one first</option>}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={featured}
              onChange={e => setFeatured(e.target.checked)}
              disabled={uploading}
              data-testid="admin-gallery-bulk-upload-featured"
            />
            <span className="text-sm">Also mark all as <b>Featured</b> (shows on the homepage)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => handleFiles(e.target.files)}
          />
          {!uploading ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full btn-primary justify-center py-3"
              data-testid="admin-gallery-bulk-upload-choose"
            >
              <Upload className="h-4 w-4" /> Choose files to upload
            </button>
          ) : (
            <div className="rounded-xl border border-[color:var(--brand-border)] bg-white p-4 space-y-2" data-testid="admin-gallery-bulk-upload-progress">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading… {progress.done + progress.failed} / {progress.total}</span>
                {progress.failed > 0 && <span className="text-red-600 text-xs">{progress.failed} failed</span>}
              </div>
              <div className="h-2 bg-[color:var(--brand-surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[color:var(--brand-sage-deep)] transition-all duration-200"
                  style={{ width: `${Math.round(((progress.done + progress.failed) / Math.max(1, progress.total)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary" disabled={uploading}>{uploading ? 'Uploading…' : 'Close'}</button>
        </div>
      </div>
    </div>
  );
};

export const AdminGallery = () => {
  const { site, refresh: refreshSite } = useSite();
  const categories = useMemo(() => (site?.gallery_categories || []), [site]);
  const categoryKeys = useMemo(() => categories.map(c => c.key), [categories]);
  const labelForKey = (key) => categories.find(c => c.key === key)?.label || prettyLabel(key || 'Uncategorized');

  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'uncategorized' | one of categoryKeys
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef(null);

  // Local editable copy of the categories list – only committed to the
  // backend when the owner clicks "Save changes" in the Manage panel.
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState(null);            // null = clean, matches site
  const [savingCats, setSavingCats] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  useEffect(() => {
    // Sync the draft with the latest site data whenever it changes AND we're
    // not mid-edit (draft === null). This keeps two admin tabs in sync.
    if (draft === null && categories) return;
  }, [categories, draft]);
  const workingCats = draft || categories;

  const load = async () => {
    try {
      const { data } = await api.get('/gallery');
      setItems(data);
    } catch { toast.error('Failed to load'); }
  };
  useEffect(() => { load(); }, []);

  // Close the "Change category" menu when clicking outside.
  useEffect(() => {
    const onDoc = (e) => { if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target)) setBulkMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const openNew = () => setEditing({ image_url: '', title: '', category: tab === 'all' || tab === 'uncategorized' ? (categoryKeys[0] || '') : tab, featured: false, order: 0, tags: [] });

  const save = async () => {
    if (!editing.image_url) { toast.error('Image required'); return; }
    try {
      if (editing.id) await api.put(`/admin/gallery/${editing.id}`, editing);
      else await api.post('/admin/gallery', editing);
      toast.success('Saved');
      setEditing(null); load();
    } catch { toast.error('Save failed'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await api.delete(`/admin/gallery/${id}`);
    load(); toast.success('Deleted');
  };

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    if (tab === 'uncategorized') return items.filter(g => !categoryKeys.includes(g.category || ''));
    return items.filter(g => (g.category || '') === tab);
  }, [items, tab, categoryKeys]);

  const counts = useMemo(() => {
    const c = { all: items.length, uncategorized: 0 };
    for (const cat of categoryKeys) c[cat] = 0;
    for (const g of items) {
      const key = g.category || '';
      if (categoryKeys.includes(key)) c[key] = (c[key] || 0) + 1;
      else c.uncategorized += 1;
    }
    return c;
  }, [items, categoryKeys]);

  // -------- Selection helpers --------
  const enterSelect = () => { setSelectMode(true); setSelected(new Set()); };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBulkMenuOpen(false); };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = filtered.length > 0 && filtered.every(g => selected.has(g.id));
  const toggleAllVisible = () => {
    setSelected(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach(g => next.delete(g.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach(g => next.add(g.id));
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} photo${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      await api.post('/admin/gallery/bulk-delete', { ids });
      toast.success(`Deleted ${ids.length} photo${ids.length === 1 ? '' : 's'}`);
      exitSelect();
      load();
    } catch { toast.error('Bulk delete failed'); }
  };

  const bulkChangeCategory = async (category) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await api.post('/admin/gallery/bulk-update', { ids, patch: { category } });
      toast.success(`Moved ${ids.length} photo${ids.length === 1 ? '' : 's'} to ${labelForKey(category)}`);
      setBulkMenuOpen(false);
      exitSelect();
      load();
    } catch { toast.error('Bulk update failed'); }
  };

  const bulkToggleFeatured = async (featured) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await api.post('/admin/gallery/bulk-update', { ids, patch: { featured } });
      toast.success(`${featured ? 'Featured' : 'Unfeatured'} ${ids.length} photo${ids.length === 1 ? '' : 's'}`);
      exitSelect();
      load();
    } catch { toast.error('Bulk update failed'); }
  };

  const tabs = useMemo(() => {
    const base = [{ id: 'all', label: 'All' }, ...categories.map(c => ({ id: c.key, label: c.label }))];
    if (counts.uncategorized > 0) base.push({ id: 'uncategorized', label: 'Uncategorized' });
    return base;
  }, [categories, counts.uncategorized]);

  // -------- Manage categories helpers --------
  const startEditCats = () => { setDraft(categories.map(c => ({ ...c }))); setManageOpen(true); };
  const cancelEditCats = () => { setDraft(null); setNewCatLabel(''); setManageOpen(false); };
  const catsDirty = useMemo(() => {
    if (!draft) return false;
    if (draft.length !== categories.length) return true;
    return draft.some((c, i) => c.key !== categories[i]?.key || c.label !== categories[i]?.label);
  }, [draft, categories]);

  const updateCatLabel = (idx, label) => {
    setDraft(d => d.map((c, i) => i === idx ? { ...c, label } : c));
  };
  const removeCat = (idx) => {
    const cat = workingCats[idx];
    const used = items.filter(g => (g.category || '') === cat.key).length;
    const msg = used > 0
      ? `Remove "${cat.label}"? ${used} photo${used === 1 ? '' : 's'} currently in this category will become "Uncategorized" (they won't be deleted — you can re-tag them from the Portfolio grid).`
      : `Remove "${cat.label}"?`;
    if (!window.confirm(msg)) return;
    setDraft(prev => (prev || categories.map(c => ({ ...c }))).filter((_, i) => i !== idx));
  };
  const moveCat = (idx, dir) => {
    setDraft(prev => {
      const list = [...(prev || categories.map(c => ({ ...c })))];
      const j = idx + dir;
      if (j < 0 || j >= list.length) return list;
      [list[idx], list[j]] = [list[j], list[idx]];
      return list;
    });
  };
  const addCat = () => {
    const label = newCatLabel.trim();
    if (!label) return;
    const base = slugify(label);
    if (!base) { toast.error('Please use letters or numbers in the name'); return; }
    let key = base;
    let n = 2;
    const existingKeys = (draft || categories).map(c => c.key);
    while (existingKeys.includes(key)) { key = `${base}-${n++}`; }
    setDraft(prev => [...(prev || categories.map(c => ({ ...c }))), { key, label }]);
    setNewCatLabel('');
  };
  const saveCats = async () => {
    if (!draft) return;
    // Trim labels + drop rows with empty labels
    const cleaned = draft
      .map(c => ({ key: c.key, label: (c.label || '').trim() }))
      .filter(c => c.key && c.label);
    if (cleaned.length === 0) {
      if (!window.confirm('Save with zero categories? The filter row will be hidden on the public portfolio page.')) return;
    }
    setSavingCats(true);
    try {
      await api.put('/admin/site-content', { gallery_categories: cleaned });
      await refreshSite();
      setDraft(null);
      setNewCatLabel('');
      toast.success('Categories updated');
    } catch {
      toast.error('Could not save categories');
    } finally {
      setSavingCats(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-gallery-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Portfolio</h1>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
            Curated photos of finished events. Featured items also appear on the homepage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!selectMode ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (manageOpen ? cancelEditCats() : startEditCats())}
                data-testid="admin-gallery-manage-categories"
                title="Add, rename, remove or reorder the category filter bubbles"
              >
                <Settings2 className="h-4 w-4" /> {manageOpen ? 'Close' : 'Manage categories'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={enterSelect}
                disabled={items.length === 0}
                data-testid="admin-gallery-select-mode"
                title="Select multiple photos for bulk actions"
              >
                <CheckSquare className="h-4 w-4" /> Select
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowBulkUpload(true)}
                data-testid="admin-gallery-bulk-upload-open"
              >
                <Upload className="h-4 w-4" /> Bulk upload
              </button>
              <button className="btn-primary" onClick={openNew} data-testid="admin-gallery-new">
                <Plus className="h-4 w-4" /> Add photo
              </button>
            </>
          ) : (
            <button type="button" className="btn-secondary" onClick={exitSelect} data-testid="admin-gallery-select-cancel">Cancel</button>
          )}
        </div>
      </div>

      {/* Manage categories panel */}
      {manageOpen && (
        <div className="card-cream p-4 sm:p-5 space-y-3" data-testid="admin-gallery-manage-categories-panel">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-serif text-xl">Category bubbles</p>
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5 max-w-lg">
                These are the filter chips on the public <code>/portfolio</code> page and the dropdown when adding a photo. Rename, remove, reorder or add new ones. Nothing is deleted from your photos — items in a removed category simply become <em>Uncategorized</em> until you re-tag them.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {catsDirty && (
                <button type="button" className="btn-secondary text-sm !h-9" onClick={cancelEditCats}>
                  Discard
                </button>
              )}
              <button
                type="button"
                className="btn-primary text-sm !h-9"
                onClick={saveCats}
                disabled={!catsDirty || savingCats}
                data-testid="admin-gallery-categories-save"
              >
                <Save className="h-4 w-4" /> {savingCats ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="space-y-2" data-testid="admin-gallery-categories-list">
            {workingCats.length === 0 && (
              <p className="text-sm text-[color:var(--brand-text-muted)] italic px-2">No categories yet — add your first one below.</p>
            )}
            {workingCats.map((c, idx) => {
              const used = items.filter(g => (g.category || '') === c.key).length;
              return (
                <div
                  key={c.key}
                  className="flex items-center gap-2 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] p-2"
                  data-testid={`admin-gallery-category-row-${c.key}`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30"
                      onClick={() => moveCat(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                    ><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button
                      type="button"
                      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30"
                      onClick={() => moveCat(idx, +1)}
                      disabled={idx === workingCats.length - 1}
                      aria-label="Move down"
                    ><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <GripVertical className="h-4 w-4 text-[color:var(--brand-text-muted)] hidden sm:block" />
                  <input
                    className="input-cream !h-9 flex-1 min-w-[140px]"
                    value={c.label || ''}
                    onChange={e => updateCatLabel(idx, e.target.value)}
                    placeholder="Category name"
                    data-testid={`admin-gallery-category-label-${c.key}`}
                  />
                  <span className="text-[11px] px-2 py-1 rounded-full bg-[color:var(--brand-surface-2)] text-[color:var(--brand-text-muted)] whitespace-nowrap" title={`${used} photo${used === 1 ? '' : 's'} in this category`}>
                    {used} photo{used === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    onClick={() => removeCat(idx)}
                    aria-label={`Remove ${c.label}`}
                    data-testid={`admin-gallery-category-remove-${c.key}`}
                  ><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <input
              className="input-cream !h-9 flex-1 min-w-[180px] max-w-xs"
              placeholder="Add a new category (e.g. Anniversaries)"
              value={newCatLabel}
              onChange={e => setNewCatLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }}
              data-testid="admin-gallery-new-category-input"
            />
            <button
              type="button"
              className="btn-secondary text-sm !h-9"
              onClick={addCat}
              disabled={!newCatLabel.trim()}
              data-testid="admin-gallery-new-category-add"
            >
              <Plus className="h-4 w-4" /> Add category
            </button>
            {catsDirty && (
              <span className="text-xs text-[color:var(--brand-text-muted)]">
                Unsaved changes — click <b>Save changes</b> to publish.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex items-center gap-1 border-b border-[color:var(--brand-border)] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'text-[color:var(--brand-text)] font-medium border-b-2 border-[color:var(--brand-sage-deep)] -mb-px'
                : 'text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)]'
            }`}
            data-testid={`admin-gallery-tab-${t.id}`}
          >
            {t.label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-[color:var(--brand-surface-2)]">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Selection toolbar */}
      {selectMode && (
        <div className="sticky top-0 z-20 -mx-2 px-2 py-3 bg-[color:var(--brand-cream)]/95 backdrop-blur border-b border-[color:var(--brand-border)] flex items-center justify-between flex-wrap gap-3" data-testid="admin-gallery-selection-toolbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllVisible}
              className="inline-flex items-center gap-2 text-sm font-medium hover:text-[color:var(--brand-sage-deep)]"
              data-testid="admin-gallery-select-all"
            >
              {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-[color:var(--brand-sage-deep)]" /> : <Square className="h-4 w-4" />}
              {allVisibleSelected ? 'Deselect all' : `Select all ${filtered.length}`}
            </button>
            <span className="text-sm text-[color:var(--brand-text-muted)]" data-testid="admin-gallery-selected-count">
              {selected.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative" ref={bulkMenuRef}>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setBulkMenuOpen(o => !o)}
                disabled={selected.size === 0}
                data-testid="admin-gallery-bulk-category"
              >
                <Tag className="h-3.5 w-3.5" /> Change category <ChevronDown className="h-3 w-3" />
              </button>
              {bulkMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 z-30 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] shadow-lg overflow-hidden" role="menu" data-testid="admin-gallery-bulk-category-menu">
                  {categories.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      role="menuitem"
                      onClick={() => bulkChangeCategory(c.key)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--brand-sage-tint)] border-b border-[color:var(--brand-border)] last:border-b-0"
                      data-testid={`admin-gallery-bulk-category-${c.key}`}
                    >
                      {c.label}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <p className="px-3 py-3 text-xs text-[color:var(--brand-text-muted)]">No categories — add one first.</p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => bulkToggleFeatured(true)}
              disabled={selected.size === 0}
              data-testid="admin-gallery-bulk-feature"
            >
              Feature
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => bulkToggleFeatured(false)}
              disabled={selected.size === 0}
              data-testid="admin-gallery-bulk-unfeature"
            >
              Unfeature
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-40"
              onClick={bulkDelete}
              disabled={selected.size === 0}
              data-testid="admin-gallery-bulk-delete"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card-cream p-10 text-center">
          <p className="font-serif text-lg">Nothing here yet.</p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">{tab === 'all' ? 'Add your first photo above.' : `No photos in “${tab === 'uncategorized' ? 'Uncategorized' : labelForKey(tab)}” yet.`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(g => {
            const isSelected = selected.has(g.id);
            return (
              <div
                key={g.id}
                className={`card-cream overflow-hidden group relative transition-all ${isSelected ? 'ring-2 ring-[color:var(--brand-sage-deep)]' : ''}`}
                data-testid={`admin-gallery-card-${g.id}`}
              >
                {selectMode && (
                  <button
                    type="button"
                    onClick={() => toggleOne(g.id)}
                    className="absolute inset-0 z-10 flex items-start justify-start p-2 cursor-pointer group/select"
                    aria-label={isSelected ? 'Deselect' : 'Select'}
                    data-testid={`admin-gallery-select-${g.id}`}
                  >
                    <span className={`h-7 w-7 rounded-md flex items-center justify-center border-2 shadow-sm transition-colors ${isSelected ? 'bg-[color:var(--brand-sage-deep)] border-[color:var(--brand-sage-deep)] text-white' : 'bg-white/90 border-white/90 group-hover/select:bg-white'}`}>
                      {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-60" />}
                    </span>
                  </button>
                )}
                <div className="aspect-square overflow-hidden bg-[color:var(--brand-surface-2)]">
                  <img src={publicUrl(g.image_url)} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{g.title || 'Untitled'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="badge-soft">{labelForKey(g.category)}</span>
                    {!selectMode && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditing(g)} className="text-sm link-underline">Edit</button>
                        <button onClick={() => remove(g.id)} className="text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                    {g.featured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]">Featured</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          categories={categories}
          onClose={() => setShowBulkUpload(false)}
          onComplete={load}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl">{editing.id ? 'Edit photo' : 'Add photo'}</h2>
              <button onClick={() => setEditing(null)} aria-label="Close"><X /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="eyebrow block mb-1">IMAGE</label>
                {editing.image_url && <img src={publicUrl(editing.image_url)} alt="preview" className="h-32 w-full object-cover rounded-lg mb-2" />}
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); setEditing({ ...editing, image_url: r.url }); } }} />
                  <MediaPickerButton testId="media-picker-gallery" onSelect={url => setEditing({ ...editing, image_url: url })} />
                </div>
                <input className="input-cream mt-2" placeholder="Or paste URL" value={editing.image_url || ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
              </div>
              <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
              <div>
                <label className="eyebrow block mb-1">CATEGORY</label>
                <select className="input-cream" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                  {!categoryKeys.includes(editing.category || '') && (editing.category || '') !== '' && (
                    <option value={editing.category}>{prettyLabel(editing.category)} (removed)</option>
                  )}
                  {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  {categories.length === 0 && <option value="">— No categories yet —</option>}
                </select>
              </div>
              <div className="flex items-center gap-2"><input id="gal-featured" type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /><label htmlFor="gal-featured" className="text-sm">Featured (shows on home page)</label></div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button onClick={save} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
