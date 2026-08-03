import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Phone, Video, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/SectionEyebrow';

const TYPES = [
  { key: 'phone', label: 'Phone consult', icon: Phone },
  { key: 'video', label: 'Video consult', icon: Video },
  { key: 'in_person', label: 'In-person / site visit', icon: MapPin },
];

const pad = (n) => String(n).padStart(2, '0');
const formatDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const BookingPage = () => {
  const [availability, setAvailability] = useState(null);
  const [type, setType] = useState('phone');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_email: '', client_phone: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => { api.get('/availability').then(r => setAvailability(r.data)); }, []);

  // Build next 30 days
  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true); setSlot('');
    api.get('/availability/slots', { params: { date: selectedDate, consultation_type: type } })
      .then(r => setSlots(r.data.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, type]);

  const submit = async () => {
    if (!selectedDate || !slot) { toast.error('Please pick a date and time'); return; }
    if (!form.client_name || !form.client_email) { toast.error('Name and email are required'); return; }
    setBusy(true);
    try {
      const payload = { ...form, consultation_type: type, date: selectedDate, time: slot };
      const { data } = await api.post('/consultations', payload);
      setConfirmed({ ...payload, id: data.id });
      toast.success('Consultation booked!');
    } catch (e) {
      toast.error('Could not book — the slot may have just been taken. Try another time.');
    } finally { setBusy(false); }
  };

  if (confirmed) return (
    <div className="container-narrow py-24 text-center" data-testid="booking-confirmed">
      <CheckCircle2 className="mx-auto h-8 w-8 text-[color:var(--brand-sage-deep)]" />
      <p className="font-script text-5xl text-[color:var(--brand-sage-deep)] mt-2">see you soon</p>
      <h1 className="font-serif text-4xl mt-2">Your consult is confirmed.</h1>
      <p className="text-[color:var(--brand-text-muted)] mt-3">{TYPES.find(t => t.key === confirmed.consultation_type)?.label} · {confirmed.date} at {confirmed.time}</p>
      <p className="text-[color:var(--brand-text-muted)] mt-2">A confirmation email is on its way to {confirmed.client_email}.</p>
    </div>
  );

  return (
    <div className="container-narrow py-14 sm:py-20 max-w-4xl mx-auto" data-testid="booking-page">
      <SectionHeader eyebrow="BOOK A CONSULT" title="Let's chat" subtitle="A short, relaxed conversation to explore your vision. No commitment." />

      <div className="mt-10 space-y-8">
        <div>
          <p className="eyebrow mb-3">1. CONSULTATION TYPE</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setType(t.key)} className={`card-cream p-4 flex items-center gap-3 text-left ${type === t.key ? 'ring-2 ring-[color:var(--brand-sage)]' : ''}`} data-testid={`booking-type-${t.key}`}>
                  <Icon className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
                  <span className="font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-3">2. PICK A DATE</p>
          <div className="flex gap-2 overflow-x-auto pb-2" data-testid="booking-calendar">
            {days.map(d => {
              const val = formatDateInput(d);
              const isBlackout = (availability?.blackout_dates || []).includes(val);
              return (
                <button
                  key={val}
                  disabled={isBlackout}
                  onClick={() => setSelectedDate(val)}
                  className={`shrink-0 rounded-2xl border p-3 min-w-[74px] text-center ${selectedDate === val ? 'bg-[color:var(--brand-sage)] text-white border-[color:var(--brand-sage)]' : 'bg-white border-[color:var(--brand-border)]'} ${isBlackout ? 'opacity-30 cursor-not-allowed' : 'hover:border-[color:var(--brand-sage)]'}`}
                  data-testid={`booking-day-${val}`}
                >
                  <p className="text-xs uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className="font-serif text-2xl leading-none mt-1">{d.getDate()}</p>
                  <p className="text-xs mt-1">{d.toLocaleDateString('en-US', { month: 'short' })}</p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div>
            <p className="eyebrow mb-3">3. PICK A TIME</p>
            {loadingSlots ? <p className="text-[color:var(--brand-text-muted)] text-sm">Loading times…</p> : (
              slots.length === 0 ? <p className="text-[color:var(--brand-text-muted)] text-sm">No availability that day — try another.</p> : (
                <div className="flex flex-wrap gap-2" data-testid="booking-slots">
                  {slots.map(s => (
                    <button key={s} onClick={() => setSlot(s)} className={`chip ${slot === s ? 'selected' : ''}`} data-testid={`booking-time-slot-${s}`}>{s}</button>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {slot && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-cream p-6 space-y-4">
            <p className="eyebrow">4. YOUR DETAILS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="text-sm block mb-1">Name</label><input className="input-cream" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} data-testid="booking-name" /></div>
              <div><label className="text-sm block mb-1">Email</label><input type="email" className="input-cream" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} data-testid="booking-email" /></div>
              <div><label className="text-sm block mb-1">Phone</label><input className="input-cream" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} data-testid="booking-phone" /></div>
              <div className="sm:col-span-2"><label className="text-sm block mb-1">Anything to share ahead of time?</label><textarea className="input-cream textarea-cream" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} data-testid="booking-notes" /></div>
            </div>
            <button onClick={submit} disabled={busy} className="btn-primary" data-testid="booking-submit-button"><CalendarDays className="h-4 w-4" /> {busy ? 'Booking…' : 'Confirm booking'}</button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
