import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CLIENT_STATUSES = ['lead', 'consult', 'proposal', 'booked', 'past', 'archived'];

/**
 * Reusable in-app confirmation for deleting a client. Uses Shadcn AlertDialog
 * because native window.confirm() gets silently suppressed by some browsers
 * (iframed previews, mobile in-app browsers, popup blockers) — same fix we
 * applied to the inquiry delete button.
 */
const DeleteClientDialog = ({ client, onDeleted, trigger }) => {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const doDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/clients/${client.id}`);
      toast.success('Client deleted');
      setOpen(false);
      onDeleted && onDeleted(client.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not delete client');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent data-testid="admin-client-delete-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this client?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <b>{client.name || 'this client'}</b>{client.email ? <> (<span>{client.email}</span>)</> : null} from your CRM. Any linked inquiries stay in your inbox — only the client profile record is removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); doDelete(); }}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="admin-client-delete-confirm-yes"
          >
            {busy ? 'Deleting…' : 'Yes, delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

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
          <div className="col-span-2">Last activity</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {items.length === 0 && <p className="px-4 py-10 text-center text-[color:var(--brand-text-muted)]">No clients yet.</p>}
        {items.map(c => (
          <div key={c.id} className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] hover:bg-[color:var(--brand-surface-2)] items-center" data-testid={`client-row-${c.id}`}>
            <Link to={`/admin/clients/${c.id}`} className="col-span-4 font-medium truncate">{c.name}</Link>
            <Link to={`/admin/clients/${c.id}`} className="col-span-3 text-sm text-[color:var(--brand-text-muted)] truncate">{c.email || c.phone || '—'}</Link>
            <Link to={`/admin/clients/${c.id}`} className="col-span-2"><span className="badge-soft">{c.status}</span></Link>
            <Link to={`/admin/clients/${c.id}`} className="col-span-2 text-sm text-[color:var(--brand-text-muted)]">{formatDate(c.updated_at)}</Link>
            <div className="col-span-1 text-right">
              <DeleteClientDialog
                client={c}
                onDeleted={(deletedId) => setItems(items.filter(x => x.id !== deletedId))}
                trigger={
                  <button
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete client"
                    aria-label="Delete client"
                    data-testid={`admin-client-row-delete-${c.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </div>
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

  return (
    <div className="space-y-6" data-testid="admin-client-detail">
      <Link to="/admin/clients" className="inline-flex items-center gap-2 text-sm link-underline"><ArrowLeft className="h-4 w-4" /> Back to clients</Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">CLIENT</p>
          <h1 className="font-serif text-3xl mt-1">{c.name}</h1>
          <p className="text-[color:var(--brand-text-muted)]">{c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}</p>
        </div>
        <DeleteClientDialog
          client={c}
          onDeleted={() => navigate('/admin/clients')}
          trigger={
            <button className="btn-secondary text-red-600" data-testid="admin-client-delete">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          }
        />
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
