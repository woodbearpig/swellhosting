import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

export const AdminFAQs = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/faqs').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/faqs/${editing.id}`, editing);
      else await api.post('/admin/faqs', editing);
      toast.success('Saved'); setEditing(null); load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => { if (!window.confirm('Delete?')) return; await api.delete(`/admin/faqs/${id}`); load(); toast.success('Deleted'); };

  return (
    <div className="space-y-6" data-testid="admin-faqs-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">FAQs</h1></div>
        <button className="btn-primary" onClick={() => setEditing({ category: 'General', question: '', answer: '', order: 0 })}><Plus className="h-4 w-4" /> New FAQ</button>
      </div>
      <div className="card-cream overflow-hidden">
        {items.map(f => (
          <div key={f.id} className="px-4 py-3 border-b border-[color:var(--brand-border)] flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium">{f.question}</p>
              <p className="text-xs text-[color:var(--brand-text-muted)]">{f.category} · order {f.order || 0}</p>
            </div>
            <button onClick={() => setEditing(f)} className="link-underline text-sm">Edit</button>
            <button onClick={() => remove(f.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-2xl">{editing.id ? 'Edit' : 'New'} FAQ</h2><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <input className="input-cream" placeholder="Category" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} />
              <input className="input-cream" placeholder="Question" value={editing.question} onChange={e => setEditing({ ...editing, question: e.target.value })} />
              <textarea className="input-cream textarea-cream" rows={4} placeholder="Answer" value={editing.answer} onChange={e => setEditing({ ...editing, answer: e.target.value })} />
              <input type="number" className="input-cream" placeholder="Order" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value || '0', 10) })} />
            </div>
            <div className="mt-4 flex justify-end gap-3"><button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button onClick={save} className="btn-primary">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;
