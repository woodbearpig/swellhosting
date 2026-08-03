import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const CLIENT_STATUSES = ['lead', 'consult', 'proposal', 'booked', 'past', 'archived'];

export const AdminClientsList = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/admin/clients').then(r => setItems(r.data)); }, []);
  return (
    <div data-testid="admin-clients-page">
      <p className="eyebrow">CRM</p>
      <h1 className="font-serif text-3xl sm:text-4xl mt-1">Clients</h1>
      <div className="mt-6 card-cream overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] text-xs uppercase tracking-wider text-[color:var(--brand-text-muted)]">
          <div className="col-span-4">Name</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Last activity</div>
        </div>
        {items.length === 0 && <p className="px-4 py-10 text-center text-[color:var(--brand-text-muted)]">No clients yet.</p>}
        {items.map(c => (
          <Link key={c.id} to={`/admin/clients/${c.id}`} className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] hover:bg-[color:var(--brand-surface-2)]" data-testid={`client-row-${c.id}`}>
            <div className="col-span-4 font-medium">{c.name}</div>
            <div className="col-span-3 text-sm text-[color:var(--brand-text-muted)]">{c.email || c.phone || '—'}</div>
            <div className="col-span-2"><span className="badge-soft">{c.status}</span></div>
            <div className="col-span-3 text-sm text-[color:var(--brand-text-muted)]">{formatDate(c.updated_at)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const AdminClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  useEffect(() => { api.get(`/admin/clients/${id}`).then(r => setC(r.data)); }, [id]);
  if (!c) return <p>Loading…</p>;

  const update = async (patch) => {
    const { data } = await api.put(`/admin/clients/${id}`, patch);
    setC({ ...c, ...data });
    toast.success('Saved');
  };
  const remove = async () => {
    if (!window.confirm('Delete this client?')) return;
    await api.delete(`/admin/clients/${id}`);
    toast.success('Deleted');
    navigate('/admin/clients');
  };

  return (
    <div className="space-y-6" data-testid="admin-client-detail">
      <Link to="/admin/clients" className="inline-flex items-center gap-2 text-sm link-underline"><ArrowLeft className="h-4 w-4" /> Back to clients</Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">CLIENT</p>
          <h1 className="font-serif text-3xl mt-1">{c.name}</h1>
          <p className="text-[color:var(--brand-text-muted)]">{c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}</p>
        </div>
        <button onClick={remove} className="btn-secondary text-red-600"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-cream p-5">
            <p className="font-serif text-xl mb-3">Inquiries ({(c.inquiries || []).length})</p>
            <ul className="divide-y divide-[color:var(--brand-border)]">
              {(c.inquiries || []).map(i => (
                <li key={i.id}><Link to={`/admin/inquiries/${i.id}`} className="flex items-center justify-between py-2"><span>{(i.event_type || 'inquiry').replace('_', ' ')} · {formatDate(i.created_at)}</span><span className="badge-soft">{i.status}</span></Link></li>
              ))}
            </ul>
          </div>
          <div className="card-cream p-5">
            <p className="font-serif text-xl mb-3">Consultations ({(c.consultations || []).length})</p>
            <ul className="divide-y divide-[color:var(--brand-border)]">
              {(c.consultations || []).map(x => (
                <li key={x.id} className="flex items-center justify-between py-2"><span>{x.date} at {x.time} · {x.consultation_type}</span><span className="badge-soft">{x.status}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card-cream p-5">
            <p className="eyebrow mb-2">STATUS</p>
            <select className="input-cream" value={c.status} onChange={e => update({ status: e.target.value })}>
              {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="card-cream p-5">
            <p className="eyebrow mb-2">NOTES</p>
            <textarea className="input-cream textarea-cream" rows={5} value={c.notes || ''} onChange={e => setC({ ...c, notes: e.target.value })} onBlur={() => update({ notes: c.notes })} />
          </div>
        </div>
      </div>
    </div>
  );
};
