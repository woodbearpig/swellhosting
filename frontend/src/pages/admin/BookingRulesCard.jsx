import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, CalendarClock } from 'lucide-react';
import { api } from '@/lib/api';

const NumberSelect = ({ value, onChange, options, label, testId }) => (
  <div>
    <label className="eyebrow block mb-1">{label}</label>
    <select className="input-cream" value={value} onChange={e => onChange(parseInt(e.target.value, 10))} data-testid={testId}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const BookingRulesCard = () => {
  const [av, setAv] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/availability').then(r => setAv(r.data)); }, []);

  const set = (patch) => { setAv(prev => ({ ...prev, ...patch })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/availability', av);
      setDirty(false);
      toast.success('Booking rules saved.');
    } catch (e) { toast.error('Could not save booking rules'); } finally { setSaving(false); }
  };

  if (!av) return null;

  return (
    <div className="card-cream p-6 space-y-4" data-testid="admin-booking-rules-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--brand-sage-tint)] flex items-center justify-center shrink-0">
          <CalendarClock className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl">Booking rules</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">Booking window, minimum notice, buffer, and daily limits for the phone consultation step.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberSelect
          label="HOW FAR IN ADVANCE"
          testId="rule-advance-days"
          value={av.advance_booking_days || 60}
          onChange={v => set({ advance_booking_days: v })}
          options={[
            { value: 14, label: '2 weeks' },
            { value: 30, label: '1 month' },
            { value: 60, label: '2 months (default)' },
            { value: 90, label: '3 months' },
            { value: 180, label: '6 months' },
            { value: 365, label: '1 year' },
          ]}
        />
        <NumberSelect
          label="MINIMUM LEAD TIME"
          testId="rule-lead-hours"
          value={av.minimum_lead_hours || 2}
          onChange={v => set({ minimum_lead_hours: v })}
          options={[
            { value: 1, label: '1 hour' },
            { value: 2, label: '2 hours (default)' },
            { value: 12, label: '12 hours' },
            { value: 24, label: '1 day' },
            { value: 48, label: '2 days' },
            { value: 72, label: '3 days' },
          ]}
        />
        <NumberSelect
          label="MAX CONSULTS PER DAY"
          testId="rule-daily-max"
          value={av.daily_max_consults || 6}
          onChange={v => set({ daily_max_consults: v })}
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 6, label: '6 (default)' },
            { value: 8, label: '8' },
            { value: 12, label: '12' },
          ]}
        />
        <NumberSelect
          label="BUFFER BETWEEN CALLS"
          testId="rule-buffer"
          value={av.buffer_minutes || 15}
          onChange={v => set({ buffer_minutes: v })}
          options={[
            { value: 0, label: 'No buffer' },
            { value: 15, label: '15 min (default)' },
            { value: 30, label: '30 min' },
            { value: 45, label: '45 min' },
            { value: 60, label: '1 hour' },
          ]}
        />
        <NumberSelect
          label="CONSULT DURATION"
          testId="rule-duration"
          value={av.consult_duration_minutes || 30}
          onChange={v => set({ consult_duration_minutes: v })}
          options={[
            { value: 15, label: '15 min' },
            { value: 30, label: '30 min (default)' },
            { value: 45, label: '45 min' },
            { value: 60, label: '60 min' },
          ]}
        />
        <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--brand-border)] p-3 cursor-pointer" data-testid="rule-block-sundays-wrap">
          <input
            type="checkbox"
            checked={av.block_sundays !== false}
            onChange={e => set({ block_sundays: e.target.checked })}
            data-testid="rule-block-sundays"
          />
          <div>
            <p className="font-medium">Block Sundays</p>
            <p className="text-xs text-[color:var(--brand-text-muted)]">No consult bookings on Sundays.</p>
          </div>
        </label>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={!dirty || saving} data-testid="rule-save">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
};

export default BookingRulesCard;
