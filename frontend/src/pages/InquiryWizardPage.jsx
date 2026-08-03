import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, uploadFile, publicUrl } from '@/lib/api';

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
    default: return '';
  }
};

const isEmpty = (v) => v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (Array.isArray(v) && v.every(x => !x || (typeof x === 'string' && !x.trim())));

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

  // Load schema
  useEffect(() => {
    api.get('/inquiry-form').then(r => {
      setSchema(r.data);
      // Initialize values with defaults for each field
      const initial = {};
      for (const step of (r.data.steps || [])) {
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

  const step = schema?.steps?.[stepIdx];
  const totalSteps = schema?.steps?.length || 0;
  const progress = totalSteps ? Math.round(((stepIdx + 1) / totalSteps) * 100) : 0;

  const setValue = (fieldId, v) => setValues(prev => ({ ...prev, [fieldId]: v }));

  const missing = useMemo(() => {
    if (!step) return [];
    return (step.fields || []).filter(f => f.required && f.type !== 'section_note' && isEmpty(values[f.id]));
  }, [step, values]);

  const next = () => {
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(m => m.label).join(', ')}`);
      return;
    }
    setStepIdx(i => Math.min(i + 1, totalSteps - 1));
  };
  const prev = () => setStepIdx(i => Math.max(0, i - 1));

  const submit = async () => {
    if (isPreview) {
      toast.info("Preview mode — submissions aren't saved.");
      setDone(true);
      return;
    }
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(m => m.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inquiries', { ...values, source: 'wizard' });
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (!schema) return <div className="container-narrow py-20"><p>Loading…</p></div>;

  if (done) {
    return (
      <div className="container-narrow py-20 sm:py-28" data-testid="inquiry-success">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-cream p-8 sm:p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-[color:var(--brand-sage-deep)]" />
          <h1 className="font-serif text-3xl sm:text-4xl mt-4">{isPreview ? 'Preview complete' : 'Inquiry received — thank you!'}</h1>
          <p className="text-[color:var(--brand-text-muted)] mt-3 max-w-lg mx-auto">
            {isPreview
              ? "This is how visitors will see the confirmation screen once they submit."
              : "We received your inquiry and will be in touch within 1–2 business days. Meanwhile, feel free to browse the gallery."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <button className="btn-primary" onClick={() => navigate('/gallery')}>Browse the gallery</button>
            <button className="btn-secondary" onClick={() => { setDone(false); setStepIdx(0); }}>{isPreview ? 'Restart preview' : 'Start another inquiry'}</button>
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
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="card-cream p-6 sm:p-10"
        >
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl leading-tight">{step.title}</h1>
            {step.description && <p className="text-[color:var(--brand-text-muted)] mt-2">{step.description}</p>}
          </div>

          <div className="mt-6 space-y-6">
            {(step.fields || []).map(field => (
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
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" className="btn-secondary" onClick={prev} disabled={stepIdx === 0} data-testid="wizard-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {stepIdx < totalSteps - 1 ? (
          <button type="button" className="btn-primary" onClick={next} data-testid="wizard-next">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={submit} disabled={submitting} data-testid="wizard-submit">
            {submitting ? 'Submitting…' : (isPreview ? 'Finish preview' : 'Submit inquiry')} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default InquiryWizardPage;
