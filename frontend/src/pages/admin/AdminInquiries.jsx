import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
import { api, publicUrl } from '@/lib/api';
import { formatDate, eventTypeLabel, statusLabel } from '@/lib/utils';

const STATUSES = ['new', 'needs_follow_up', 'consult_scheduled', 'proposal_sent', 'booked', 'archived', 'lost'];

export const AdminInquiriesList = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/admin/inquiries', { params: filter !== 'all' ? { status: filter } : {} }).then(r => setItems(r.data));
  }, [filter]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/admin/inquiries.csv', { params, responseType: 'blob' });
      // Try to read filename from Content-Disposition, fall back to a sensible default
      let filename = 'swell-inquiries.csv';
      const cd = res.headers['content-disposition'] || res.headers['Content-Disposition'];
      if (cd) {
        const m = /filename\*?=(?:UTF-8''|)"?([^"]+)"?/i.exec(cd);
        if (m && m[1]) filename = decodeURIComponent(m[1]);
      }
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${items.length} ${items.length === 1 ? 'inquiry' : 'inquiries'}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-testid="admin-inquiries-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="eyebrow">INQUIRIES</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Inquiries</h1>
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || items.length === 0}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="admin-inquiries-export-csv"
          title={items.length === 0 ? 'No inquiries to export' : 'Download the current view as a CSV file'}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'selected' : ''}`}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? 'selected' : ''}`} data-testid={`inquiry-filter-${s}`}>{statusLabel(s)}</button>
        ))}
      </div>

      <div className="mt-6 card-cream overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] text-xs uppercase tracking-wider text-[color:var(--brand-text-muted)]">
          <div className="col-span-4">Client</div>
          <div className="col-span-2">Event</div>
          <div className="col-span-2">Received</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {items.length === 0 && <p className="px-4 py-10 text-center text-[color:var(--brand-text-muted)]">No inquiries yet.</p>}
        {items.map(i => (
          <Link key={i.id} to={`/admin/inquiries/${i.id}`} className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] hover:bg-[color:var(--brand-surface-2)] items-center" data-testid={`admin-inquiry-row-${i.id}`}>
            <div className="col-span-4"><p className="font-medium">{i.client_name || 'Anonymous'}</p><p className="text-xs text-[color:var(--brand-text-muted)]">{i.client_email}</p></div>
            <div className="col-span-2 text-sm">{eventTypeLabel(i.event_type) || '—'}</div>
            <div className="col-span-2 text-sm text-[color:var(--brand-text-muted)]">{formatDate(i.created_at)}</div>
            <div className="col-span-2"><span className="badge-soft">{statusLabel(i.status)}</span></div>
            <div className="col-span-2 text-right text-sm text-[color:var(--brand-sage-deep)]">Open →</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const AdminInquiryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [i, setI] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    api.get(`/admin/inquiries/${id}`).then(r => { setI(r.data); setNote(r.data.admin_notes || ''); });
  }, [id]);

  if (!i) return <p>Loading…</p>;

  const updateStatus = async (status) => {
    await api.put(`/admin/inquiries/${id}`, { status });
    setI({ ...i, status });
    toast.success('Status updated');
  };
  const saveNote = async () => {
    await api.put(`/admin/inquiries/${id}`, { admin_notes: note });
    toast.success('Note saved');
  };
  const remove = async () => {
    if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;
    await api.delete(`/admin/inquiries/${id}`);
    toast.success('Inquiry deleted');
    navigate('/admin/inquiries');
  };

  return (
    <div className="space-y-6" data-testid="admin-inquiry-detail">
      <div className="flex items-center justify-between">
        <Link to="/admin/inquiries" className="inline-flex items-center gap-2 text-sm link-underline"><ArrowLeft className="h-4 w-4" /> Back to inquiries</Link>
        <button onClick={remove} className="btn-secondary text-red-600" data-testid="admin-inquiry-delete"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
      <div>
        <p className="eyebrow">INQUIRY · {formatDate(i.created_at)}</p>
        <h1 className="font-serif text-3xl mt-1">{i.client_name || 'Anonymous'}</h1>
        <p className="text-[color:var(--brand-text-muted)]">{eventTypeLabel(i.event_type)} · {i.client_email}{i.client_phone ? ` · ${i.client_phone}` : ''}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-cream p-6">
            <p className="font-serif text-xl mb-4">Event details</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="eyebrow">Date</dt><dd>{i.event_date || '—'}{i.event_start_time ? ` · ${i.event_start_time}` : ''}</dd></div>
              <div><dt className="eyebrow">Backup date</dt><dd>{i.event_backup_date || '—'}</dd></div>
              <div><dt className="eyebrow">Venue</dt><dd>{i.venue_name || '—'}</dd></div>
              <div><dt className="eyebrow">Address</dt><dd>{i.venue_address || '—'}</dd></div>
              <div><dt className="eyebrow">Indoor/Outdoor</dt><dd>{i.indoor_outdoor || '—'}</dd></div>
              <div><dt className="eyebrow">Guest count</dt><dd>{i.guest_count || '—'}</dd></div>
              <div><dt className="eyebrow">Theme</dt><dd>{i.theme || '—'}</dd></div>
              <div><dt className="eyebrow">Budget</dt><dd>{i.budget_range || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="eyebrow">Palette</dt><dd>{(i.color_palette || []).join(', ') || '—'}</dd></div>
            </dl>
          </div>

          <div className="card-cream p-6">
            <p className="font-serif text-xl mb-3">Services requested</p>
            <div className="flex flex-wrap gap-2">{(i.services_needed || []).map(s => <span key={s} className="badge-soft">{s.replace('_', ' ')}</span>)}</div>
            {i.service_details && Object.keys(i.service_details).length > 0 && (
              <pre className="mt-4 text-xs bg-[color:var(--brand-surface-2)] p-3 rounded-lg overflow-auto">{JSON.stringify(i.service_details, null, 2)}</pre>
            )}
          </div>

          {(i.inspiration_notes || (i.inspiration_links || []).length > 0 || (i.upload_urls || []).length > 0) && (
            <div className="card-cream p-6">
              <p className="font-serif text-xl mb-3">Inspiration</p>
              {i.inspiration_notes && <p className="text-sm text-[color:var(--brand-text-muted)] whitespace-pre-line">{i.inspiration_notes}</p>}
              {(i.inspiration_links || []).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">{i.inspiration_links.map((l, idx) => <li key={idx}><a href={l} target="_blank" rel="noreferrer" className="link-underline">{l}</a></li>)}</ul>
              )}
              {(i.upload_urls || []).length > 0 && (
                <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
                  {i.upload_urls.map((u, idx) => <a key={idx} href={publicUrl(u)} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-[color:var(--brand-surface-2)]"><img src={publicUrl(u)} alt="ref" className="h-full w-full object-cover" /></a>)}
                </div>
              )}
            </div>
          )}

          {i.venue_details && Object.keys(i.venue_details).length > 0 && (
            <div className="card-cream p-6">
              <p className="font-serif text-xl mb-3">Venue & logistics</p>
              <pre className="text-xs bg-[color:var(--brand-surface-2)] p-3 rounded-lg overflow-auto">{JSON.stringify(i.venue_details, null, 2)}</pre>
            </div>
          )}
          {i.extra && Object.keys(i.extra).length > 0 && (
            <div className="card-cream p-6">
              <p className="font-serif text-xl mb-3">Event-specific details</p>
              <pre className="text-xs bg-[color:var(--brand-surface-2)] p-3 rounded-lg overflow-auto">{JSON.stringify(i.extra, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-cream p-5">
            <p className="eyebrow mb-2">STATUS</p>
            <select className="input-cream" value={i.status} onChange={e => updateStatus(e.target.value)} data-testid="admin-inquiry-status-select">
              {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </div>
          <div className="card-cream p-5">
            <p className="eyebrow mb-2">INTERNAL NOTES</p>
            <textarea className="input-cream textarea-cream" rows={5} value={note} onChange={e => setNote(e.target.value)} data-testid="admin-inquiry-notes" />
            <button onClick={saveNote} className="btn-primary mt-3 w-full" data-testid="admin-inquiry-save-note">Save note</button>
          </div>
        </div>
      </div>
    </div>
  );
};
