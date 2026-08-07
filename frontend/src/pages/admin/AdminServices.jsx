import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';

const emptyService = () => ({
  slug: '', title: '', subtitle: '', short_description: '', description: '',
  price_from: '', hero_image_url: '', images: [], features: [], packages: [], faqs: [],
  related_slugs: [], seo_title: '', seo_description: '', order: 0, published: true,
});

export const AdminServices = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/services').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/services/${editing.id}`, editing);
      else await api.post('/admin/services', editing);
      toast.success('Saved');
      setEditing(null);
      load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    await api.delete(`/admin/services/${id}`);
    load(); toast.success('Deleted');
  };

  const uploadHero = async (file) => {
    const r = await uploadFile(file);
    setEditing({ ...editing, hero_image_url: r.url });
  };
  const uploadGallery = async (file) => {
    const r = await uploadFile(file);
    setEditing({ ...editing, images: [...(editing.images || []), r.url] });
  };

  return (
    <div className="space-y-6" data-testid="admin-services-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Services</h1></div>
        <button className="btn-primary" onClick={() => setEditing(emptyService())} data-testid="admin-services-new"><Plus className="h-4 w-4" /> New service</button>
      </div>

      <div className="card-cream overflow-hidden">
        {items.length === 0 && <p className="p-8 text-center text-[color:var(--brand-text-muted)]">No services yet.</p>}
        {items.map(s => (
          <div key={s.id} className="grid grid-cols-12 items-center px-4 py-3 border-b border-[color:var(--brand-border)]">
            <div className="col-span-1 aspect-square rounded-lg overflow-hidden bg-[color:var(--brand-surface-2)]"><img src={s.hero_image_url} alt={s.title} className="w-full h-full object-cover" /></div>
            <div className="col-span-5 pl-4"><p className="font-medium">{s.title}</p><p className="text-xs text-[color:var(--brand-text-muted)]">/services/{s.slug}</p></div>
            <div className="col-span-2 text-sm">{s.price_from || '—'}</div>
            <div className="col-span-2 text-sm">{s.published ? <span className="badge-soft">Published</span> : <span className="chip">Draft</span>}</div>
            <div className="col-span-2 text-right space-x-2">
              <button onClick={() => setEditing(s)} className="link-underline text-sm" data-testid={`admin-services-edit-${s.slug}`}>Edit</button>
              <button onClick={() => remove(s.id)} className="text-red-600 text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-3xl rounded-2xl p-6 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl">{editing.id ? 'Edit service' : 'New service'}</h2>
              <button onClick={() => setEditing(null)}><X /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">SLUG</label><input className="input-cream" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-from-title" /></div>
              <div className="sm:col-span-2"><label className="eyebrow block mb-1">SUBTITLE</label><input className="input-cream" value={editing.subtitle} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="eyebrow block mb-1">SHORT DESCRIPTION</label><input className="input-cream" value={editing.short_description} onChange={e => setEditing({ ...editing, short_description: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="eyebrow block mb-1">DESCRIPTION</label><textarea className="input-cream textarea-cream" rows={4} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">PRICE FROM</label><input className="input-cream" value={editing.price_from || ''} onChange={e => setEditing({ ...editing, price_from: e.target.value })} placeholder="$450+" /></div>
              <div><label className="eyebrow block mb-1">ORDER</label><input type="number" className="input-cream" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value || '0', 10) })} /></div>
              <div className="sm:col-span-2">
                <label className="eyebrow block mb-1">HERO IMAGE</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {editing.hero_image_url && <img src={publicUrl(editing.hero_image_url)} alt="hero" className="h-16 w-24 object-cover rounded-lg" />}
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadHero(e.target.files[0])} />
                  <MediaPickerButton testId="media-picker-service-hero" onSelect={url => setEditing({ ...editing, hero_image_url: url })} />
                  <input className="input-cream flex-1 min-w-[200px]" value={editing.hero_image_url || ''} onChange={e => setEditing({ ...editing, hero_image_url: e.target.value })} placeholder="Or paste URL" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow block mb-1">FEATURES (comma-separated)</label>
                <input className="input-cream" value={(editing.features || []).join(', ')} onChange={e => setEditing({ ...editing, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
              </div>
              <div className="sm:col-span-2">
                <label className="eyebrow block mb-1">GALLERY IMAGES</label>
                <div className="flex flex-wrap gap-3 mb-2">
                  {(editing.images || []).map((u, i) => (
                    <div key={i} className="relative h-16 w-24"><img src={publicUrl(u)} alt="gal" className="h-full w-full object-cover rounded-lg" /><button onClick={() => setEditing({ ...editing, images: editing.images.filter((_, idx) => idx !== i) })} className="absolute -top-2 -right-2 bg-black/70 text-white h-5 w-5 rounded-full"><X className="h-3 w-3" /></button></div>
                  ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadGallery(e.target.files[0])} />
                  <MediaPickerButton
                    testId="media-picker-service-gallery"
                    onSelect={url => setEditing({ ...editing, images: [...(editing.images || []), url] })}
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <input id="published" type="checkbox" checked={editing.published !== false} onChange={e => setEditing({ ...editing, published: e.target.checked })} />
                <label htmlFor="published" className="text-sm">Published</label>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button onClick={save} className="btn-primary" data-testid="admin-services-save">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServices;
