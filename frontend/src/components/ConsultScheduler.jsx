import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';

const pad = (n) => String(n).padStart(2, '0');
const formatDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatTime12h = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${(h % 12) || 12}:${pad(m)} ${ampm}`;
};

/**
 * Reusable phone consult scheduler.
 * Props:
 *   value: { date: 'YYYY-MM-DD', time: 'HH:MM' } | null
 *   onChange({ date, time })
 *   maxDays (default = availability.advance_booking_days, else 60)
 */
export const ConsultScheduler = ({ value, onChange }) => {
  const [availability, setAvailability] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    api.get('/availability').then(r => setAvailability(r.data));
  }, []);

  const maxDays = availability?.advance_booking_days || 60;

  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= maxDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [maxDays]);

  useEffect(() => {
    if (!value?.date) { setSlots([]); return; }
    setLoadingSlots(true);
    api.get('/availability/slots', { params: { date: value.date, consultation_type: 'phone' } })
      .then(r => setSlots(r.data.slots || []))
      .finally(() => setLoadingSlots(false));
  }, [value?.date]);

  const pickDate = (d) => onChange({ date: d, time: '' });
  const pickTime = (t) => onChange({ date: value.date, time: t });

  return (
    <div className="space-y-6" data-testid="consult-scheduler">
      <div>
        <p className="eyebrow mb-3">PICK A DATE</p>
        <div className="flex gap-2 overflow-x-auto pb-2" data-testid="consult-calendar">
          {days.map(d => {
            const val = formatDateInput(d);
            const isBlackout = (availability?.blackout_dates || []).includes(val);
            return (
              <button
                key={val}
                type="button"
                disabled={isBlackout}
                onClick={() => pickDate(val)}
                className={`shrink-0 rounded-2xl border p-3 min-w-[74px] text-center transition-all ${value?.date === val ? 'bg-[color:var(--brand-sage)] text-white border-[color:var(--brand-sage)]' : 'bg-white border-[color:var(--brand-border)]'} ${isBlackout ? 'opacity-30 cursor-not-allowed' : 'hover:border-[color:var(--brand-sage)]'}`}
                data-testid={`consult-day-${val}`}
              >
                <p className="text-xs uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                <p className="font-serif text-2xl leading-none mt-1">{d.getDate()}</p>
                <p className="text-xs mt-1">{d.toLocaleDateString('en-US', { month: 'short' })}</p>
              </button>
            );
          })}
        </div>
      </div>

      {value?.date && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow mb-3">PICK A TIME</p>
          {loadingSlots ? (
            <p className="text-[color:var(--brand-text-muted)] text-sm">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="text-[color:var(--brand-text-muted)] text-sm" data-testid="consult-no-slots">No availability that day — try another.</p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="consult-slots">
              {slots.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickTime(s)}
                  className={`chip ${value?.time === s ? 'selected' : ''}`}
                  data-testid={`consult-time-${s}`}
                >
                  {formatTime12h(s)}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {value?.date && value?.time && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-[color:var(--brand-sage-tint)] p-4 flex items-start gap-3" data-testid="consult-selected-preview">
          <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage)] text-white flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
          <div>
            <p className="font-medium">You'll be called on:</p>
            <p className="text-[color:var(--brand-text-muted)]">
              {new Date(value.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {' '}at{' '}
              <strong>{formatTime12h(value.time)}</strong>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
