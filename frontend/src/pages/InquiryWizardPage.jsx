import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X, Sparkles, Plus, Phone, PhoneOff, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { ConsultScheduler } from '@/components/ConsultScheduler';

const STORAGE_KEY = 'swell_inquiry_draft_v2';

// -------------------- Field renderer helpers --------------------
const initialValueFor = (field) => {
  switch (field.type) {
    case 'chips_multi': return [];
    case 'chips_single':
    case 'select':
    case 'radio': return '';
    case 'checkbox': return false;
    case 'number': return '';
    case 'links_list': return [''];
    case 'file_upload': return [];
    case 'backdrops': return [];
    default: return '';
  }
};

const isEmpty = (v) => v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (Array.isArray(v) && v.every(x => !x || (typeof x === 'string' && !x.trim())));

// Determine whether a field should be shown to the user, based on its
// optional `conditional` rule. Simple mode: show only if `values[cond.field]`
// equals `cond.equals`. For array-valued fields (chips_multi) we also treat
// the presence of the value inside the array as a match.
const isFieldVisible = (field, values) => {
  const cond = field?.conditional;
  if (!cond || !cond.field || cond.equals === undefined || cond.equals === null || cond.equals === '') {
    return true;
  }
  const other = values ? values[cond.field] : undefined;
  if (Array.isArray(other)) return other.includes(cond.equals);
  return other === cond.equals;
};

// -------------------- Individual field components --------------------
const ChipsField = ({ field, value, onChange, multi }) => {
  const selected = multi ? (value || []) : value;
  const toggle = (v) => {
    if (multi) {
      const set = new Set(selected);
      set.has(v) ? set.delete(v) : set.add(v);
      onChange([...set]);
    } else {
      onChange(selected === v ? '' : v);
    }
  };
  return (
    <div className="flex flex-wrap gap-2" data-testid={`field-${field.id}-chips`}>
      {(field.options || []).map(opt => {
        const isOn = multi ? (selected || []).includes(opt.value) : selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`chip ${isOn ? 'selected' : ''}`}
            data-testid={`field-${field.id}-chip-${opt.value}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const LinksListField = ({ field, value, onChange }) => {
  const links = Array.isArray(value) && value.length ? value : [''];
  return (
    <div className="space-y-2" data-testid={`field-${field.id}-links`}>
      {links.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="input-cream flex-1"
            value={v}
            onChange={e => { const next = [...links]; next[i] = e.target.value; onChange(next); }}
            placeholder="https://…"
          />
          <button type="button" className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => onChange(links.filter((_, j) => j !== i))} aria-label="Remove"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" className="btn-secondary text-xs !h-8" onClick={() => onChange([...links, ''])}>
        <Plus className="h-3.5 w-3.5" /> Add another link
      </button>
    </div>
  );
};

const FileUploadField = ({ field, value, onChange }) => {
  const urls = Array.isArray(value) ? value : [];
  const [uploading, setUploading] = useState(false);
  const upload = async (files) => {
    setUploading(true);
    try {
      const next = [...urls];
      for (const f of files) {
        const r = await uploadFile(f);
        next.push(r.url);
      }
      onChange(next);
    } catch (e) {
      toast.error('Upload failed. Try a smaller file or a different format.');
    } finally { setUploading(false); }
  };
  return (
    <div data-testid={`field-${field.id}-uploads`}>
      <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-[color:var(--brand-border)] rounded-2xl cursor-pointer hover:bg-[color:var(--brand-sage-tint)]/40 transition-colors">
        <Upload className="h-4 w-4" />
        <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload photos'}</span>
        <input type="file" multiple accept="image/*" className="hidden" onChange={e => upload(Array.from(e.target.files || []))} />
      </label>
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((u, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[color:var(--brand-surface-2)]">
              <img src={publicUrl(u)} alt="Inspiration" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-6 w-6 inline-flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BackdropsPicker = ({ field, value, onChange }) => {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const r = await api.get('/backdrops');
        if (ok) setItems(r.data || []);
      } catch { /* empty */ }
    })();
    return () => { ok = false; };
  }, []);
  const selected = Array.isArray(value) ? value : [];
  const toggle = (name) => {
    if (selected.includes(name)) onChange(selected.filter(n => n !== name));
    else onChange([...selected, name]);
  };
  if (items.length === 0) return <p className="text-sm text-[color:var(--brand-text-muted)] italic">No backdrops posted yet — feel free to skip.</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid={`field-${field.id}`}>
      {items.map(b => {
        const isSelected = selected.includes(b.name);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => toggle(b.name)}
            className={`text-left rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-[color:var(--brand-sage-deep)] ring-2 ring-[color:var(--brand-sage-tint)]' : 'border-transparent hover:border-[color:var(--brand-border)]'}`}
            data-testid={`backdrop-option-${b.id}`}
          >
            <div className="aspect-[3/4] bg-[color:var(--brand-surface-2)] relative">
              {b.image_url ? (
                <img src={publicUrl(b.image_url)} alt={b.name} className="w-full h-full object-cover" />
              ) : null}
              {isSelected && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[color:var(--brand-sage-deep)] text-white flex items-center justify-center text-xs">✓</div>
              )}
            </div>
            <div className="p-2">
              <p className="font-serif text-sm leading-tight">{b.name}</p>
              {b.subtitle && <p className="text-[10px] text-[color:var(--brand-text-muted)] mt-0.5">{b.subtitle}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

const renderField = (field, value, onChange) => {
  switch (field.type) {
    case 'chips_single':
      return <ChipsField field={field} value={value} onChange={onChange} multi={false} />;
    case 'chips_multi':
      return <ChipsField field={field} value={value} onChange={onChange} multi={true} />;
    case 'text':
      return <input className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} data-testid={`field-${field.id}`} />;
    case 'email':
      return <input type="email" className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'you@email.com'} data-testid={`field-${field.id}`} />;
    case 'phone':
      return <input type="tel" className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} data-testid={`field-${field.id}`} />;
    case 'textarea':
      return <textarea rows={4} className="input-cream textarea-cream" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} data-testid={`field-${field.id}`} />;
    case 'date':
      return <input type="date" className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} data-testid={`field-${field.id}`} />;
    case 'time':
      return <input type="time" className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} data-testid={`field-${field.id}`} />;
    case 'number':
      return <input type="number" className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} data-testid={`field-${field.id}`} />;
    case 'select':
      return (
        <select className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} data-testid={`field-${field.id}`}>
          <option value="">— Please choose —</option>
          {(field.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-2" data-testid={`field-${field.id}`}>
          {(field.options || []).map(o => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={field.id} checked={value === o.value} onChange={() => onChange(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer" data-testid={`field-${field.id}`}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
          <span>{field.placeholder || 'Yes'}</span>
        </label>
      );
    case 'links_list':
      return <LinksListField field={field} value={value} onChange={onChange} />;
    case 'file_upload':
      return <FileUploadField field={field} value={value} onChange={onChange} />;
    case 'backdrops':
      return <BackdropsPicker field={field} value={value} onChange={onChange} />;
    case 'section_note':
      return null;
    default:
      return <input className="input-cream" value={value || ''} onChange={e => onChange(e.target.value)} />;
  }
};

// -------------------- Main wizard --------------------
const InquiryWizardPage = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const isPreview = search.get('preview') === '1';

  const [schema, setSchema] = useState(null);
  const [values, setValues] = useState({});
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Consult step state — a "virtual" step appended after the schema's own steps
  const [consultChoice, setConsultChoice] = useState(null); // null | 'schedule' | 'skip'
  const [consultDT, setConsultDT] = useState({ date: '', time: '' });
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Load schema
  useEffect(() => {
    api.get('/inquiry-form').then(r => {
      // Add PHONE-REQUIRED enforcement: force client_phone.required to true when found in schema
      const enforcedSchema = JSON.parse(JSON.stringify(r.data));
      for (const step of (enforcedSchema.steps || [])) {
        for (const f of (step.fields || [])) {
          if (f.id === 'client_phone') {
            f.required = true;
            f.label = f.label?.replace(/\s*\(optional\)/i, '') || 'Phone';
          }
        }
      }
      setSchema(enforcedSchema);
      // Initialize values with defaults for each field
      const initial = {};
      for (const step of (enforcedSchema.steps || [])) {
        for (const f of (step.fields || [])) {
          initial[f.id] = initialValueFor(f);
        }
      }
      // Merge saved draft (not in preview mode)
      if (!isPreview) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) Object.assign(initial, JSON.parse(raw));
        } catch (_) {}
      }
      setValues(initial);
    });
  }, [isPreview]);

  // Save draft
  useEffect(() => {
    if (!schema || isPreview) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch (_) {}
  }, [values, schema, isPreview]);

  const schemaSteps = schema?.steps || [];
  const totalSteps = schemaSteps.length + 1; // +1 for consult step
  const isConsultStep = stepIdx === totalSteps - 1;
  const step = isConsultStep ? null : schemaSteps[stepIdx];
  const progress = totalSteps ? Math.round(((stepIdx + 1) / totalSteps) * 100) : 0;

  const setValue = (fieldId, v) => setValues(prev => ({ ...prev, [fieldId]: v }));

  const missing = useMemo(() => {
    if (!step) return [];
    return (step.fields || []).filter(f =>
      f.required && f.type !== 'section_note' && isFieldVisible(f, values) && isEmpty(values[f.id])
    );
  }, [step, values]);

  const next = () => {
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(m => m.label).join(', ')}`);
      return;
    }
    setStepIdx(i => Math.min(i + 1, totalSteps - 1));
  };
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  const doSubmit = async (skipConsult = false) => {
    if (isPreview) {
      toast.info("Preview mode — submissions aren't saved.");
      setDone(true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...values, source: 'wizard' };
      if (!skipConsult && consultChoice === 'schedule' && consultDT.date && consultDT.time) {
        payload.consult_date = consultDT.date;
        payload.consult_time = consultDT.time;
      }
      await api.post('/inquiries', payload);
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally { setSubmitting(false); setShowSkipConfirm(false); }
  };

  const attemptSubmit = () => {
    if (consultChoice === 'schedule') {
      if (!consultDT.date || !consultDT.time) {
        toast.error('Please pick a date and time — or choose "Submit without phone consultation".');
        return;
      }
      doSubmit(false);
    } else if (consultChoice === 'skip') {
      setShowSkipConfirm(true);
    } else {
      toast.error('Please choose whether to schedule a phone consultation or submit without one.');
    }
  };

  if (!schema) return <div className="container-narrow py-20"><p>Loading…</p></div>;

  if (done) {
    const hasConsult = consultChoice === 'schedule' && consultDT.date && consultDT.time;
    const consultDateStr = hasConsult
      ? new Date(consultDT.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : '';
    const [h, m] = hasConsult ? consultDT.time.split(':').map(Number) : [0, 0];
    const consultTimeStr = hasConsult ? `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : '';
    return (
      <div className="container-narrow py-20 sm:py-28" data-testid="inquiry-success">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-cream p-8 sm:p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-[color:var(--brand-sage-deep)]" />
          <h1 className="font-serif text-3xl sm:text-4xl mt-4">{isPreview ? 'Preview complete' : 'Inquiry received — thank you!'}</h1>
          <p className="text-[color:var(--brand-text-muted)] mt-3 max-w-lg mx-auto">
            {isPreview
              ? "This is how visitors will see the confirmation screen once they submit."
              : "We received your inquiry and will be in touch within 1–2 business days."}
          </p>
          {hasConsult && !isPreview && (
            <div className="mt-6 mx-auto max-w-md rounded-2xl bg-[color:var(--brand-sage-tint)] p-5" data-testid="inquiry-success-consult-details">
              <p className="font-medium">📞 Your call is scheduled</p>
              <p className="text-[color:var(--brand-text-muted)] mt-1">{consultDateStr} at <strong>{consultTimeStr}</strong></p>
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-2">You'll get a confirmation email with a calendar invite.</p>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <button className="btn-primary" onClick={() => navigate('/gallery')}>Browse the gallery</button>
            <button className="btn-secondary" onClick={() => { setDone(false); setStepIdx(0); setConsultChoice(null); setConsultDT({ date: '', time: '' }); }}>{isPreview ? 'Restart preview' : 'Start another inquiry'}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="inquiry-wizard-page">
      {isPreview && (
        <div className="mb-6 rounded-2xl bg-[color:var(--brand-blush-tint)] p-3 text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Preview mode — nothing you enter here will be saved.
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2 text-sm">
          <p className="eyebrow">STEP {stepIdx + 1} OF {totalSteps}</p>
          <p className="text-[color:var(--brand-text-muted)]">{progress}%</p>
        </div>
        <div className="h-1.5 rounded-full bg-[color:var(--brand-surface-2)] overflow-hidden">
          <motion.div className="h-full bg-[color:var(--brand-sage)]" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isConsultStep ? '__consult__' : step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="card-cream p-6 sm:p-10"
        >
          {isConsultStep ? (
            <>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl leading-tight">One last thing</h1>
                <p className="text-[color:var(--brand-text-muted)] mt-2">Would you like to schedule a quick phone consultation? It's the best way for us to get on the same page fast.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="consult-choice-cards">
                <button
                  type="button"
                  onClick={() => setConsultChoice('schedule')}
                  className={`card-cream p-5 text-left transition-all ${consultChoice === 'schedule' ? 'ring-2 ring-[color:var(--brand-sage)] shadow-lg' : 'hover:shadow-md'}`}
                  data-testid="consult-choice-schedule"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[color:var(--brand-sage-tint)] flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
                    </div>
                    <div>
                      <p className="font-serif text-lg">Schedule a phone consultation</p>
                      <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">Pick a day and time — we'll call you.</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setConsultChoice('skip')}
                  className={`card-cream p-5 text-left transition-all ${consultChoice === 'skip' ? 'ring-2 ring-[color:var(--brand-coral)] shadow-lg' : 'hover:shadow-md'}`}
                  data-testid="consult-choice-skip"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-[color:var(--brand-blush-tint)] flex items-center justify-center shrink-0">
                      <PhoneOff className="h-5 w-5 text-[color:var(--brand-coral)]" />
                    </div>
                    <div>
                      <p className="font-serif text-lg">Submit inquiry without phone consultation</p>
                      <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">We'll reach out to schedule if needed.</p>
                    </div>
                  </div>
                </button>
              </div>

              {consultChoice === 'schedule' && (
                <div className="mt-8">
                  <ConsultScheduler value={consultDT} onChange={setConsultDT} />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl leading-tight">{step.title}</h1>
                {step.description && <p className="text-[color:var(--brand-text-muted)] mt-2">{step.description}</p>}
              </div>

              <div className="mt-6 space-y-6">
                {(step.fields || []).filter(f => isFieldVisible(f, values)).map(field => (
                  <div key={field.id} data-testid={`field-wrap-${field.id}`}>
                    {field.type === 'section_note' ? (
                      <div className="rounded-xl bg-[color:var(--brand-sage-tint)]/50 p-4">
                        {field.label && <p className="font-serif text-lg mb-1">{field.label}</p>}
                        {field.help && <p className="text-sm text-[color:var(--brand-text-muted)]">{field.help}</p>}
                      </div>
                    ) : (
                      <>
                        <label className="eyebrow block mb-2">
                          {field.label}{field.required && <span className="text-[color:var(--brand-coral)] ml-1">*</span>}
                        </label>
                        {renderField(field, values[field.id], v => setValue(field.id, v))}
                        {field.help && field.type !== 'text' && field.type !== 'email' && field.type !== 'phone' && (
                          <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">{field.help}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={prev} disabled={stepIdx === 0} data-testid="wizard-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {isConsultStep ? (
          <button type="button" className="btn-primary" onClick={attemptSubmit} disabled={submitting || !consultChoice} data-testid="wizard-submit">
            {submitting ? 'Submitting…' : (isPreview ? 'Finish preview' : 'Submit inquiry')} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={next} data-testid="wizard-next">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Skip-consult confirmation modal */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSkipConfirm(false)}
            data-testid="skip-consult-modal"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[color:var(--brand-cream)] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-[color:var(--brand-blush-tint)] flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-[color:var(--brand-coral)]" />
                </div>
                <div>
                  <p className="font-serif text-xl leading-tight">Are you sure?</p>
                  <p className="text-sm text-[color:var(--brand-text-muted)] mt-2">A phone consultation may still be required by swell design + media to finalize your booking. We'll reach out to schedule if needed.</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowSkipConfirm(false)} data-testid="skip-modal-back">Back</button>
                <button type="button" className="btn-primary" onClick={() => doSubmit(true)} disabled={submitting} data-testid="skip-modal-confirm">
                  {submitting ? 'Submitting…' : 'Yes, submit without consult'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InquiryWizardPage;
