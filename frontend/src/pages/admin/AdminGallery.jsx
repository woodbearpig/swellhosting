import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Upload, CheckSquare, Square, Tag, ChevronDown } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';

const CATEGORIES = ['weddings', 'birthdays', 'corporate', 'showers', 'holidays', 'grand-openings', 'other'];
const prettyCategory = (c) => (c || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

/**
 * BulkUploadDialog — opens when the owner clicks "Bulk upload". Lets her pick
 * a target category (and optionally the "featured" flag) FIRST, then choose
 * the files. This avoids the previous behavior where every bulk upload was
 * silently defaulted to "weddings" — a real papercut for a photographer
 * uploading dozens of shots for a birthday or corporate event.
 */
const BulkUploadDialog = ({ onClose, onComplete }) => {
  const [category, setCategory] = useState('weddings');
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
              {CATEGORIES.map(c => <option key={c} value={c}>{prettyCategory(c)}</option>)}
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
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | one of CATEGORIES
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef(null);

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

  const openNew = () => setEditing({ image_url: '', title: '', category: tab === 'all' ? 'weddings' : tab, featured: false, order: 0, tags: [] });

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

  const filtered = useMemo(() => (
    tab === 'all' ? items : items.filter(g => (g.category || 'other') === tab)
  ), [items, tab]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const cat of CATEGORIES) c[cat] = items.filter(g => (g.category || 'other') === cat).length;
    return c;
  }, [items]);

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
      toast.success(`Moved ${ids.length} photo${ids.length === 1 ? '' : 's'} to ${prettyCategory(category)}`);
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

  const tabs = [{ id: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ id: c, label: prettyCategory(c) }))];

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
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      role="menuitem"
                      onClick={() => bulkChangeCategory(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--brand-sage-tint)] border-b border-[color:var(--brand-border)] last:border-b-0"
                      data-testid={`admin-gallery-bulk-category-${c}`}
                    >
                      {prettyCategory(c)}
                    </button>
                  ))}
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
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">{tab === 'all' ? 'Add your first photo above.' : `No photos tagged “${prettyCategory(tab)}” yet.`}</p>
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
                    <span className="badge-soft">{prettyCategory(g.category)}</span>
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
                <select className="input-cream" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{prettyCategory(c)}</option>)}
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
