import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Star } from 'lucide-react';
import { api } from '@/lib/api';

export const AdminTestimonials = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/testimonials').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/testimonials/${editing.id}`, editing);
      else await api.post('/admin/testimonials', editing);
      toast.success('Saved'); setEditing(null); load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => { if (!window.confirm('Delete?')) return; await api.delete(`/admin/testimonials/${id}`); load(); toast.success('Deleted'); };

  return (
    <div className="space-y-6" data-testid="admin-testimonials-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Testimonials</h1></div>
        <button className="btn-primary" onClick={() => setEditing({ name: '', event_type: '', quote: '', rating: 5, featured: false })}><Plus className="h-4 w-4" /> New</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(t => (
          <div key={t.id} className="card-cream p-5">
            <div className="flex items-center gap-1 text-[color:var(--brand-gold)] mb-2">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4" fill="currentColor" />)}</div>
            <p className="font-serif italic">“{t.quote}”</p>
            <p className="mt-3 text-sm"><span className="font-medium">{t.name}</span> · <span className="text-[color:var(--brand-text-muted)]">{t.event_type}</span> {t.featured && <span className="badge-soft ml-2">Featured</span>}</p>
            <div className="mt-3 flex gap-3"><button onClick={() => setEditing(t)} className="link-underline text-sm">Edit</button><button onClick={() => remove(t.id)} className="text-red-600 text-sm"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-2xl">{editing.id ? 'Edit' : 'New'} testimonial</h2><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <input className="input-cream" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="input-cream" placeholder="Event type" value={editing.event_type} onChange={e => setEditing({ ...editing, event_type: e.target.value })} />
              <textarea className="input-cream textarea-cream" rows={4} placeholder="Quote" value={editing.quote} onChange={e => setEditing({ ...editing, quote: e.target.value })} />
              <div className="flex items-center gap-3">
                <label className="text-sm">Rating</label>
                <input type="number" min={1} max={5} className="input-cream w-20" value={editing.rating} onChange={e => setEditing({ ...editing, rating: parseInt(e.target.value || '5', 10) })} />
                <label className="flex items-center gap-1 text-sm ml-auto"><input type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Featured</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3"><button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button onClick={save} className="btn-primary">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTestimonials;
