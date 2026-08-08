import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Frame, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { api, publicUrl, uploadFile } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';

export const AdminBackdrops = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

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
  const remove = async (id) => { if (!window.confirm('Delete this backdrop?')) return; await api.delete(`/admin/backdrops/${id}`); toast.success('Deleted'); load(); };

  const move = async (idx, delta) => {
    const next = [...items];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    try { await api.post('/admin/backdrops/reorder', { order: next.map(b => b.id) }); }
    catch { toast.error('Reorder failed'); load(); }
  };

  return (
    <div className="space-y-6" data-testid="admin-backdrops-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Backdrops</h1>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">Your catalog of reusable structures. Featured ones show on the homepage; all appear on <code>/backdrops</code>.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ name: '', subtitle: '', description: '', image_url: '', price_from: '', featured: false, active: true })} data-testid="admin-backdrops-new"><Plus className="h-4 w-4" /> New backdrop</button>
      </div>

      {items.length === 0 ? (
        <div className="card-cream p-8 text-center">
          <Frame className="h-8 w-8 mx-auto text-[color:var(--brand-text-muted)] mb-2" />
          <p className="font-serif text-lg">No backdrops yet.</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">Add your first backdrop — e.g. “Trio Rounded Arch”, “Celebration Station”, “Hoop”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b, idx) => (
            <div key={b.id} className="card-cream overflow-hidden" data-testid={`admin-backdrop-card-${b.id}`}>
              <div className="aspect-[3/4] bg-[color:var(--brand-surface-2)]">
                {b.image_url ? (
                  <img src={publicUrl(b.image_url)} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[color:var(--brand-text-muted)]"><Frame className="h-10 w-10" /></div>
                )}
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
                <div className="mt-3 flex items-center gap-1">
                  <button onClick={() => setEditing(b)} className="link-underline text-sm">Edit</button>
                  <div className="ml-auto flex gap-1">
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" onClick={() => move(idx, +1)} disabled={idx === items.length - 1} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => remove(b.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <BackdropEditor value={editing} setValue={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
};

const BackdropEditor = ({ value, setValue, onSave, onClose }) => {
  const setImage = (url) => setValue({ ...value, image_url: url });
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[color:var(--brand-cream)] w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="admin-backdrop-editor">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl">{value.id ? 'Edit' : 'New'} backdrop</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="eyebrow block mb-1">NAME</label>
            <input className="input-cream" placeholder="e.g. Trio Rounded Arch" value={value.name || ''} onChange={e => setValue({ ...value, name: e.target.value })} data-testid="admin-backdrop-name" />
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
