import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X, Star, Check, XCircle, Clock, MessageSquare, User as UserIcon, Mail } from 'lucide-react';
import { api, publicUrl, uploadFile } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { formatDate } from '@/lib/utils';

const StarRow = ({ n }) => (
  <div className="flex items-center gap-0.5 text-[color:var(--brand-gold)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className="h-3.5 w-3.5" fill={i < n ? 'currentColor' : 'none'} strokeWidth={1.5} />
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const s = status || 'approved';
  const styles = {
    approved: 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]',
    pending:  'bg-[color:var(--brand-blush-tint)] text-[color:var(--brand-coral)]',
    rejected: 'bg-red-100 text-red-700',
  }[s] || 'bg-neutral-200 text-neutral-600';
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${styles}`}>{s}</span>;
};

export const AdminTestimonials = () => {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [editing, setEditing] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/testimonials');
      setItems(data);
      const p = data.filter(t => (t.status || 'approved') === 'pending').length;
      setPendingCount(p);
    } catch { toast.error('Failed to load'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/testimonials/${editing.id}`, editing);
      else await api.post('/admin/testimonials', editing);
      toast.success('Saved'); setEditing(null); load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => { if (!window.confirm('Delete?')) return; await api.delete(`/admin/testimonials/${id}`); load(); toast.success('Deleted'); };
  const approve = async (id) => { await api.post(`/admin/testimonials/${id}/approve`); toast.success('Approved & published'); load(); };
  const reject  = async (id) => { await api.post(`/admin/testimonials/${id}/reject`);  toast.success('Rejected — hidden from site'); load(); };

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter(t => (t.status || 'approved') === tab);
  }, [items, tab]);

  const tabs = [
    { id: 'all',      label: 'All',      count: items.length },
    { id: 'pending',  label: 'Pending',  count: items.filter(t => (t.status||'approved')==='pending').length,  emphasize: pendingCount > 0 },
    { id: 'approved', label: 'Approved', count: items.filter(t => (t.status||'approved')==='approved').length },
    { id: 'rejected', label: 'Rejected', count: items.filter(t => (t.status||'approved')==='rejected').length },
  ];

  return (
    <div className="space-y-6" data-testid="admin-testimonials-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Testimonials & reviews</h1>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">Add reviews manually or approve customer submissions.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ name: '', event_type: '', quote: '', rating: 5, featured: false, photo_url: '', status: 'approved' })} data-testid="admin-testimonials-new"><Plus className="h-4 w-4" /> New</button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[color:var(--brand-border)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm relative transition-colors ${
              tab === t.id
                ? 'text-[color:var(--brand-text)] font-medium border-b-2 border-[color:var(--brand-sage-deep)] -mb-px'
                : 'text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)]'
            }`}
            data-testid={`admin-testimonials-tab-${t.id}`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${t.emphasize ? 'bg-[color:var(--brand-coral)] text-white' : 'bg-[color:var(--brand-surface-2)]'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-cream p-8 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-[color:var(--brand-text-muted)] mb-2" />
          <p className="font-serif text-lg">Nothing to show here yet.</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">{tab === 'pending' ? 'Customer submissions will appear here for approval.' : 'Add your first testimonial with the button above.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="card-cream p-5" data-testid={`admin-testimonial-card-${t.id}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <StarRow n={t.rating || 5} />
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  {t.featured && <span className="badge-soft text-[10px]">Featured</span>}
                </div>
              </div>
              {t.photo_url && (
                <img src={publicUrl(t.photo_url)} alt={t.name} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <p className="font-serif italic leading-relaxed">“{t.quote}”</p>
              <div className="mt-3 text-sm space-y-0.5">
                <p><span className="font-medium">{t.name}</span> {t.event_type && <span className="text-[color:var(--brand-text-muted)]">· {t.event_type}</span>}</p>
                {t.reviewer_email && (
                  <p className="text-xs text-[color:var(--brand-text-muted)] flex items-center gap-1"><Mail className="h-3 w-3" /> {t.reviewer_email}</p>
                )}
                <p className="text-xs text-[color:var(--brand-text-muted)]"><Clock className="h-3 w-3 inline mr-1" />{t.created_at ? formatDate(t.created_at) : ''}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(t.status || 'approved') === 'pending' && (
                  <>
                    <button onClick={() => approve(t.id)} className="btn-primary !h-8 text-xs" data-testid={`admin-testimonial-approve-${t.id}`}><Check className="h-3.5 w-3.5" /> Approve</button>
                    <button onClick={() => reject(t.id)} className="btn-secondary !h-8 text-xs" data-testid={`admin-testimonial-reject-${t.id}`}><XCircle className="h-3.5 w-3.5" /> Reject</button>
                  </>
                )}
                <button onClick={() => setEditing(t)} className="link-underline text-sm">Edit</button>
                <button onClick={() => remove(t.id)} className="text-red-600 text-sm ml-auto" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <TestimonialEditor value={editing} setValue={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
};

const TestimonialEditor = ({ value, setValue, onSave, onClose }) => {
  const setPhoto = (url) => setValue({ ...value, photo_url: url });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[color:var(--brand-cream)] w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="admin-testimonial-editor">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl">{value.id ? 'Edit' : 'New'} testimonial</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">NAME</label>
              <input className="input-cream" placeholder="Reviewer name" value={value.name || ''} onChange={e => setValue({ ...value, name: e.target.value })} data-testid="admin-testimonial-name" />
            </div>
            <div>
              <label className="eyebrow block mb-1">EVENT TYPE</label>
              <input className="input-cream" placeholder="Birthday, Wedding…" value={value.event_type || ''} onChange={e => setValue({ ...value, event_type: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1">QUOTE</label>
            <textarea className="input-cream textarea-cream" rows={4} value={value.quote || ''} onChange={e => setValue({ ...value, quote: e.target.value })} data-testid="admin-testimonial-quote" />
          </div>

          <div>
            <label className="eyebrow block mb-1">PHOTO (optional — event photo)</label>
            {value.photo_url && <img src={publicUrl(value.photo_url)} alt="preview" className="h-32 w-auto rounded-lg mb-2" />}
            <div className="flex items-center gap-2 flex-wrap">
              <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { try { const r = await uploadFile(f); setPhoto(r.url); } catch { toast.error('Upload failed'); } } }} />
              <MediaPickerButton testId="media-picker-testimonial" onSelect={setPhoto} />
              {value.photo_url && <button type="button" onClick={() => setPhoto('')} className="text-red-600 text-xs">Remove</button>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="eyebrow block mb-1">RATING</label>
              <input type="number" min={1} max={5} className="input-cream w-full" value={value.rating || 5} onChange={e => setValue({ ...value, rating: parseInt(e.target.value || '5', 10) })} />
            </div>
            <div>
              <label className="eyebrow block mb-1">STATUS</label>
              <select className="input-cream w-full" value={value.status || 'approved'} onChange={e => setValue({ ...value, status: e.target.value })}>
                <option value="approved">Approved (public)</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected (hidden)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 cursor-pointer">
                <input type="checkbox" checked={!!value.featured} onChange={e => setValue({ ...value, featured: e.target.checked })} />
                <span className="text-sm">Featured (homepage)</span>
              </label>
            </div>
          </div>

          {value.reviewer_email && (
            <div className="rounded-lg bg-[color:var(--brand-surface-2)] p-3 text-xs text-[color:var(--brand-text-muted)]">
              <UserIcon className="h-3 w-3 inline mr-1" />Submitted by: <strong>{value.reviewer_email}</strong> (private — never shown publicly)
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} className="btn-primary" data-testid="admin-testimonial-save">Save</button>
        </div>
      </div>
    </div>
  );
};

export default AdminTestimonials;
