import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

const DAYS = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' }, { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' }, { key: 'sun', label: 'Sunday' },
];

export const AdminConsultations = () => {
  const [tab, setTab] = useState('upcoming');
  const [items, setItems] = useState([]);
  const [av, setAv] = useState(null);
  const [blackoutInput, setBlackoutInput] = useState('');

  const load = async () => {
    const [c, a] = await Promise.all([api.get('/admin/consultations'), api.get('/availability')]);
    setItems(c.data); setAv(a.data);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter(i => i.date >= today);
  const past = items.filter(i => i.date < today);

  const updateAv = async (patch) => {
    const { data } = await api.put('/admin/availability', { ...av, ...patch });
    setAv(data);
    toast.success('Availability saved');
  };

  const setWeeklyRanges = (dayKey, ranges) => updateAv({ weekly: { ...av.weekly, [dayKey]: ranges } });

  const addBlackout = () => {
    if (!blackoutInput) return;
    const next = Array.from(new Set([...(av.blackout_dates || []), blackoutInput])).sort();
    updateAv({ blackout_dates: next });
    setBlackoutInput('');
  };
  const removeBlackout = (d) => updateAv({ blackout_dates: (av.blackout_dates || []).filter(x => x !== d) });

  const deleteConsult = async (id) => {
    if (!window.confirm('Delete this consultation?')) return;
    await api.delete(`/admin/consultations/${id}`);
    setItems(items.filter(i => i.id !== id));
    toast.success('Deleted');
  };

  const updateStatus = async (id, status) => {
    await api.put(`/admin/consultations/${id}`, { status });
    setItems(items.map(i => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <div className="space-y-6" data-testid="admin-consultations-page">
      <div>
        <p className="eyebrow">CONSULTATIONS</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Consultations & availability</h1>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('upcoming')} className={`chip ${tab === 'upcoming' ? 'selected' : ''}`}>Upcoming ({upcoming.length})</button>
        <button onClick={() => setTab('past')} className={`chip ${tab === 'past' ? 'selected' : ''}`}>Past ({past.length})</button>
        <button onClick={() => setTab('availability')} className={`chip ${tab === 'availability' ? 'selected' : ''}`}>Availability</button>
      </div>

      {tab !== 'availability' && (
        <div className="card-cream overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] text-xs uppercase text-[color:var(--brand-text-muted)]">
            <div className="col-span-3">Client</div>
            <div className="col-span-3">When</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {(tab === 'upcoming' ? upcoming : past).map(c => (
            <div key={c.id} className="grid grid-cols-12 px-4 py-3 border-b border-[color:var(--brand-border)] items-center">
              <div className="col-span-3"><p className="font-medium">{c.client_name}</p><p className="text-xs text-[color:var(--brand-text-muted)]">{c.client_email}</p></div>
              <div className="col-span-3 text-sm">{c.date} at {c.time}</div>
              <div className="col-span-2 text-sm">{c.consultation_type.replace('_', ' ')}</div>
              <div className="col-span-2">
                <select className="input-cream !h-9 text-sm" value={c.status} onChange={e => updateStatus(c.id, e.target.value)}>
                  <option>scheduled</option><option>completed</option><option>cancelled</option><option>no_show</option>
                </select>
              </div>
              <div className="col-span-2 text-right"><button onClick={() => deleteConsult(c.id)} className="text-red-600 text-sm inline-flex items-center gap-1"><Trash2 className="h-4 w-4" /> Delete</button></div>
            </div>
          ))}
          {((tab === 'upcoming' ? upcoming : past).length === 0) && <p className="px-4 py-10 text-center text-[color:var(--brand-text-muted)]">Nothing here yet.</p>}
        </div>
      )}

      {tab === 'availability' && av && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-cream p-5">
            <p className="font-serif text-xl mb-3">Weekly hours</p>
            {DAYS.map(d => (
              <div key={d.key} className="py-3 border-b border-[color:var(--brand-border)] last:border-b-0">
                <p className="font-medium mb-2">{d.label}</p>
                {(av.weekly[d.key] || []).map((rg, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input type="time" className="input-cream !h-9 text-sm" value={rg.start} onChange={e => { const next = [...av.weekly[d.key]]; next[idx] = { ...rg, start: e.target.value }; setWeeklyRanges(d.key, next); }} />
                    <span>–</span>
                    <input type="time" className="input-cream !h-9 text-sm" value={rg.end} onChange={e => { const next = [...av.weekly[d.key]]; next[idx] = { ...rg, end: e.target.value }; setWeeklyRanges(d.key, next); }} />
                    <button onClick={() => setWeeklyRanges(d.key, av.weekly[d.key].filter((_, i) => i !== idx))} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => setWeeklyRanges(d.key, [...(av.weekly[d.key] || []), { start: '10:00', end: '17:00' }])} className="text-sm link-underline">+ Add hours</button>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div className="card-cream p-5">
              <p className="font-serif text-xl mb-3">Blackout dates</p>
              <div className="flex gap-2 mb-3">
                <input type="date" className="input-cream" value={blackoutInput} onChange={e => setBlackoutInput(e.target.value)} />
                <button onClick={addBlackout} className="btn-primary">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(av.blackout_dates || []).map(d => (
                  <span key={d} className="chip !cursor-default">{d} <button onClick={() => removeBlackout(d)}><Trash2 className="h-3 w-3" /></button></span>
                ))}
                {(av.blackout_dates || []).length === 0 && <p className="text-sm text-[color:var(--brand-text-muted)]">No blackout dates.</p>}
              </div>
            </div>
            <div className="card-cream p-5">
              <p className="font-serif text-xl mb-3">Slot preferences</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="eyebrow block mb-1">SLOT (MIN)</label><input type="number" className="input-cream" value={av.slot_minutes} onChange={e => setAv({ ...av, slot_minutes: parseInt(e.target.value || '30', 10) })} onBlur={() => updateAv({ slot_minutes: av.slot_minutes })} /></div>
                <div><label className="eyebrow block mb-1">BUFFER (MIN)</label><input type="number" className="input-cream" value={av.buffer_minutes} onChange={e => setAv({ ...av, buffer_minutes: parseInt(e.target.value || '15', 10) })} onBlur={() => updateAv({ buffer_minutes: av.buffer_minutes })} /></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsultations;
