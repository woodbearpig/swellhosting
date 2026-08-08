import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Upload } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';

const CATEGORIES = ['weddings', 'birthdays', 'corporate', 'showers', 'holidays', 'grand-openings', 'other'];

export const AdminGallery = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/gallery').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ image_url: '', title: '', category: 'weddings', featured: false, order: 0, tags: [] });

  const save = async () => {
    if (!editing.image_url) { toast.error('Image required'); return; }
    try {
      if (editing.id) await api.put(`/admin/gallery/${editing.id}`, editing);
      else await api.post('/admin/gallery', editing);
      toast.success('Saved');
      setEditing(null); load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await api.delete(`/admin/gallery/${id}`);
    load(); toast.success('Deleted');
  };

  const bulkUpload = async (files) => {
    for (const f of Array.from(files)) {
      try {
        const r = await uploadFile(f);
        await api.post('/admin/gallery', { image_url: r.url, category: 'weddings', title: f.name });
      } catch (_) { toast.error(`Failed ${f.name}`); }
    }
    load(); toast.success('Uploaded');
  };

  return (
    <div className="space-y-6" data-testid="admin-gallery-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Portfolio</h1><p className="text-sm text-[color:var(--brand-text-muted)] mt-1">Curated photos of finished events. Featured items also appear on the homepage.</p></div>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer"><Upload className="h-4 w-4" /> Bulk upload <input type="file" accept="image/*" multiple hidden onChange={e => bulkUpload(e.target.files || [])} /></label>
          <button className="btn-primary" onClick={openNew}><Plus className="h-4 w-4" /> Add photo</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(g => (
          <div key={g.id} className="card-cream overflow-hidden group">
            <div className="aspect-square overflow-hidden bg-[color:var(--brand-surface-2)]"><img src={publicUrl(g.image_url)} alt={g.title} className="w-full h-full object-cover" /></div>
            <div className="p-3">
              <p className="font-medium text-sm truncate">{g.title || 'Untitled'}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="badge-soft">{g.category}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(g)} className="text-sm link-underline">Edit</button>
                  <button onClick={() => remove(g.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-2xl">{editing.id ? 'Edit photo' : 'Add photo'}</h2><button onClick={() => setEditing(null)}><X /></button></div>
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
              <div><label className="eyebrow block mb-1">CATEGORY</label><select className="input-cream" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="flex items-center gap-2"><input id="gal-featured" type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /><label htmlFor="gal-featured" className="text-sm">Featured (shows on home page)</label></div>
            </div>
            <div className="mt-4 flex justify-end gap-3"><button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button onClick={save} className="btn-primary">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
