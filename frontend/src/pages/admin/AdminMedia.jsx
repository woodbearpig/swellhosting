import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Upload, Trash2, Tag as TagIcon, X, Copy, Check } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';

const AssetCard = ({ asset, selected, onSelect, onDelete, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const copyUrl = () => { navigator.clipboard.writeText(asset.url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-[color:var(--brand-surface-2)] aspect-square cursor-pointer transition-all ${selected ? 'ring-4 ring-[color:var(--brand-sage)]' : 'hover:ring-2 hover:ring-[color:var(--brand-sage-tint)]'}`}
      onClick={onSelect}
      data-testid={`media-asset-${asset.id}`}
    >
      <img src={publicUrl(asset.url)} alt={asset.alt_text || asset.filename} loading="lazy" className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{asset.filename}</p>
        {asset.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {asset.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">{t}</span>)}
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white" title="Edit" data-testid={`media-edit-${asset.id}`}><TagIcon className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); copyUrl(); }} className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white" title="Copy URL">
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${asset.filename}?`)) onDelete(asset); }} className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-red-600" title="Delete" data-testid={`media-delete-${asset.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};

const EditAssetModal = ({ asset, onClose, onSave }) => {
  const [alt, setAlt] = useState(asset?.alt_text || '');
  const [tags, setTags] = useState((asset?.tags || []).join(', '));
  if (!asset) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[color:var(--brand-cream)] rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <p className="font-serif text-xl">Edit media</p>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <img src={publicUrl(asset.url)} alt="" className="w-full rounded-xl mb-4 max-h-64 object-contain bg-[color:var(--brand-surface-2)]" />
        <div className="space-y-3">
          <div>
            <label className="eyebrow block mb-1">ALT TEXT (SCREEN-READER DESCRIPTION)</label>
            <input className="input-cream" value={alt} onChange={e => setAlt(e.target.value)} placeholder="e.g. Blush balloon garland at wedding" />
          </div>
          <div>
            <label className="eyebrow block mb-1">TAGS (COMMA-SEPARATED)</label>
            <input className="input-cream" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. wedding, garland, blush" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ alt_text: alt, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })}>Save</button>
        </div>
      </div>
    </div>
  );
};

const AdminMedia = ({ pickerMode = false, onPick = null, onClose = null }) => {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/admin/media', { params: { q, tag } }).then(r => { setItems(r.data); setLoading(false); });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, tag]);

  const allTags = [...new Set(items.flatMap(i => i.tags || []))].sort();

  const handleUpload = async (files) => {
    setUploading(true);
    try {
      for (const f of files) { await uploadFile(f); }
      toast.success(`Uploaded ${files.length} file(s).`);
      load();
    } catch (e) { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const handleDelete = async (asset) => {
    try { await api.delete(`/admin/media/${asset.id}`); toast.success('Deleted.'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const handleSave = async (patch) => {
    try {
      await api.patch(`/admin/media/${editing.id}`, patch);
      toast.success('Saved.');
      setEditing(null);
      load();
    } catch (e) { toast.error('Save failed'); }
  };

  const handleAssetClick = (asset) => {
    if (pickerMode && onPick) { onPick(asset); return; }
    setSelectedId(asset.id === selectedId ? null : asset.id);
  };

  return (
    <div className={pickerMode ? 'space-y-4' : 'space-y-6'} data-testid="admin-media-page">
      {!pickerMode && (
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Media library</h1>
          <p className="text-[color:var(--brand-text-muted)] mt-2">All uploaded images in one place. Drag or click below to upload — files are auto-compressed and available on every image field across the site.</p>
        </div>
      )}

      {/* Upload zone */}
      <label
        className="flex items-center justify-center gap-2 py-8 border-2 border-dashed border-[color:var(--brand-border)] rounded-2xl cursor-pointer hover:bg-[color:var(--brand-sage-tint)]/40 transition-colors"
        data-testid="media-upload-zone"
      >
        <Upload className="h-4 w-4" />
        <span className="text-sm">{uploading ? 'Uploading…' : 'Click or drop images here to upload'}</span>
        <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(Array.from(e.target.files || []))} />
      </label>

      {/* Search + tag filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--brand-text-muted)]" />
          <input className="input-cream pl-9" placeholder="Search filenames / alt text…" value={q} onChange={e => setQ(e.target.value)} data-testid="media-search" />
        </div>
        <select className="input-cream max-w-[200px]" value={tag} onChange={e => setTag(e.target.value)} data-testid="media-tag-filter">
          <option value="">All tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-[color:var(--brand-text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[color:var(--brand-text-muted)]">
          <p>No media yet. Upload your first image above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="media-grid">
          {items.map(a => (
            <AssetCard
              key={a.id}
              asset={a}
              selected={a.id === selectedId}
              onSelect={() => handleAssetClick(a)}
              onDelete={handleDelete}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {editing && <EditAssetModal asset={editing} onClose={() => setEditing(null)} onSave={handleSave} />}

      {pickerMode && (
        <div className="flex justify-end gap-2 pt-3 border-t border-[color:var(--brand-border)]">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default AdminMedia;
