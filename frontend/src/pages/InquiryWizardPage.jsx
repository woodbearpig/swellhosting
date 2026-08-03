import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, uploadFile, publicUrl } from '@/lib/api';

const STORAGE_KEY = 'swell_inquiry_draft_v1';

const EVENT_TYPES = [
  { key: 'wedding', label: 'Wedding' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'baby_shower', label: 'Baby shower' },
  { key: 'bridal_shower', label: 'Bridal shower' },
  { key: 'grand_opening', label: 'Grand opening' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'other', label: 'Other / not sure' },
];

const SERVICES = [
  { key: 'balloon_garland', label: 'Balloon garland' },
  { key: 'balloon_arch', label: 'Balloon arch' },
  { key: 'balloon_wall', label: 'Balloon wall / backdrop' },
  { key: 'columns', label: 'Balloon columns' },
  { key: 'ceiling', label: 'Ceiling balloons' },
  { key: 'organic_install', label: 'Organic install' },
  { key: 'photo_backdrop', label: 'Photo backdrop' },
  { key: 'centerpieces', label: 'Centerpieces' },
  { key: 'florals', label: 'Florals' },
  { key: 'custom_signs', label: 'Custom signage' },
  { key: 'dessert_table', label: 'Dessert table' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'custom', label: 'Something else' },
];

const COLORS = ['blush', 'sage', 'terracotta', 'cream', 'gold', 'sand', 'dusty blue', 'lavender', 'burgundy', 'black', 'white', 'coral'];

const BUDGETS = [
  '$500 – $1,000',
  '$1,000 – $2,500',
  '$2,500 – $5,000',
  '$5,000 – $10,000',
  '$10,000+',
  'Flexible — open to suggestions',
];

const DEFAULT = {
  event_type: '',
  client_name: '', client_email: '', client_phone: '', preferred_contact: 'email',
  event_date: '', event_backup_date: '', event_start_time: '', event_end_time: '',
  venue_name: '', venue_address: '', indoor_outdoor: '',
  guest_count: '', theme: '', color_palette: [], budget_range: '', must_haves: '',
  services_needed: [], service_details: {},
  inspiration_notes: '', inspiration_links: [''], upload_urls: [],
  venue_details: { loading_dock: false, elevator: false, parking: '', power: false, wind_exposure: false },
  extra: {},
};

const STEPS = [
  { key: 'event_type', title: 'What are we celebrating?' },
  { key: 'about_you', title: 'About you' },
  { key: 'event_details', title: 'Event details' },
  { key: 'style', title: 'Style & palette' },
  { key: 'services', title: 'What you\u2019re dreaming of' },
  { key: 'inspiration', title: 'Inspiration' },
  { key: 'logistics', title: 'Venue & logistics' },
  { key: 'review', title: 'Review & submit' },
];

const InquiryWizardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
    } catch (_) {}
    return DEFAULT;
  });
  const [step, setStep] = useState(0);
  const [savedAt, setSavedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedAt(new Date());
    }, 700);
    return () => clearTimeout(t);
  }, [data]);

  const setField = (patch) => setData((d) => ({ ...d, ...patch }));
  const toggleInList = (key, value) => setData((d) => {
    const cur = new Set(d[key] || []);
    if (cur.has(value)) cur.delete(value); else cur.add(value);
    return { ...d, [key]: Array.from(cur) };
  });

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  const canNext = () => {
    const s = STEPS[step].key;
    if (s === 'event_type') return !!data.event_type;
    if (s === 'about_you') return !!data.client_name && !!data.client_email;
    if (s === 'event_details') return true;
    if (s === 'style') return true;
    if (s === 'services') return (data.services_needed || []).length > 0;
    if (s === 'inspiration') return true;
    if (s === 'logistics') return true;
    return true;
  };

  const goNext = () => {
    if (!canNext()) { toast.error('Please complete this step first.'); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };
  const goPrev = () => { if (step > 0) setStep(s => s - 1); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...data };
      payload.inspiration_links = (payload.inspiration_links || []).filter(Boolean);
      await api.post('/inquiries', payload);
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      toast.success('Inquiry received — check your email!');
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (submitted) return (
    <div className="container-narrow py-24 text-center" data-testid="inquiry-submitted">
      <Sparkles className="mx-auto h-8 w-8 text-[color:var(--brand-sage-deep)]" />
      <p className="font-script text-5xl text-[color:var(--brand-sage-deep)] mt-2">thank you</p>
      <h1 className="font-serif text-4xl mt-2">We received your inquiry.</h1>
      <p className="text-[color:var(--brand-text-muted)] max-w-lg mx-auto mt-3">A confirmation is on its way to your email. We'll be in touch within 1–2 business days with next steps.</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={() => navigate('/')} className="btn-secondary">Back home</button>
        <button onClick={() => navigate('/book')} className="btn-primary">Book a consultation</button>
      </div>
    </div>
  );

  return (
    <div className="container-narrow py-10 sm:py-14 max-w-3xl mx-auto" data-testid="inquiry-wizard">
      <p className="eyebrow">STEP {step + 1} of {STEPS.length}</p>
      <h1 className="font-serif text-3xl sm:text-4xl mt-1 leading-tight">{STEPS[step].title}</h1>
      <div className="wizard-progress-track mt-5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} data-testid="inquiry-progress-bar">
        <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="text-xs text-[color:var(--brand-text-muted)] mt-2" data-testid="inquiry-save-status-text">
        {savedAt ? `Saved · ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-saving…'}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }} className="mt-8 space-y-6">

          {STEPS[step].key === 'event_type' && (
            <div data-testid="inquiry-event-type-step">
              <p className="text-[color:var(--brand-text-muted)] mb-4">Choose the closest fit — we'll ask a few tailored questions after this.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENT_TYPES.map(t => (
                  <button key={t.key} onClick={() => setField({ event_type: t.key })} className={`chip !h-auto !py-3 ${data.event_type === t.key ? 'selected' : ''}`} data-testid={`inquiry-event-${t.key}`}>{t.label}</button>
                ))}
              </div>
            </div>
          )}

          {STEPS[step].key === 'about_you' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="eyebrow block mb-2">FULL NAME</label><input className="input-cream" value={data.client_name} onChange={e => setField({ client_name: e.target.value })} data-testid="inquiry-name" required /></div>
                <div><label className="eyebrow block mb-2">EMAIL</label><input type="email" className="input-cream" value={data.client_email} onChange={e => setField({ client_email: e.target.value })} data-testid="inquiry-email" required /></div>
                <div><label className="eyebrow block mb-2">PHONE</label><input className="input-cream" value={data.client_phone} onChange={e => setField({ client_phone: e.target.value })} data-testid="inquiry-phone" /></div>
                <div>
                  <label className="eyebrow block mb-2">PREFERRED CONTACT</label>
                  <select className="input-cream" value={data.preferred_contact} onChange={e => setField({ preferred_contact: e.target.value })} data-testid="inquiry-preferred-contact">
                    <option value="email">Email</option>
                    <option value="phone">Phone call</option>
                    <option value="text">Text message</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {STEPS[step].key === 'event_details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="eyebrow block mb-2">EVENT DATE</label><input type="date" className="input-cream" value={data.event_date || ''} onChange={e => setField({ event_date: e.target.value })} data-testid="inquiry-event-date" /></div>
                <div><label className="eyebrow block mb-2">BACKUP DATE (optional)</label><input type="date" className="input-cream" value={data.event_backup_date || ''} onChange={e => setField({ event_backup_date: e.target.value })} /></div>
                <div><label className="eyebrow block mb-2">START TIME</label><input type="time" className="input-cream" value={data.event_start_time || ''} onChange={e => setField({ event_start_time: e.target.value })} /></div>
                <div><label className="eyebrow block mb-2">END TIME</label><input type="time" className="input-cream" value={data.event_end_time || ''} onChange={e => setField({ event_end_time: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">VENUE NAME</label><input className="input-cream" value={data.venue_name} onChange={e => setField({ venue_name: e.target.value })} placeholder="e.g. Private residence, The Fig House" /></div>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">VENUE ADDRESS</label><input className="input-cream" value={data.venue_address} onChange={e => setField({ venue_address: e.target.value })} /></div>
                <div>
                  <label className="eyebrow block mb-2">INDOOR / OUTDOOR</label>
                  <select className="input-cream" value={data.indoor_outdoor} onChange={e => setField({ indoor_outdoor: e.target.value })}>
                    <option value="">Choose…</option>
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="both">Both</option>
                    <option value="unsure">Not sure yet</option>
                  </select>
                </div>
                <div><label className="eyebrow block mb-2">GUEST COUNT</label><input className="input-cream" value={data.guest_count} onChange={e => setField({ guest_count: e.target.value })} placeholder="Approx" /></div>
              </div>

              {/* Conditional event-type sub-questions */}
              {data.event_type === 'wedding' && (
                <div className="card-cream p-4 space-y-3">
                  <p className="eyebrow">WEDDING DETAILS</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-sm block mb-1">Ceremony, reception, or both?</label>
                      <select className="input-cream" value={data.extra.wedding_scope || ''} onChange={e => setField({ extra: { ...data.extra, wedding_scope: e.target.value } })}>
                        <option value="">Choose…</option><option>Ceremony</option><option>Reception</option><option>Both</option>
                      </select></div>
                    <div><label className="text-sm block mb-1">Working with a planner?</label>
                      <input className="input-cream" value={data.extra.wedding_planner || ''} onChange={e => setField({ extra: { ...data.extra, wedding_planner: e.target.value } })} placeholder="Planner name / no planner" /></div>
                    <div className="sm:col-span-2"><label className="text-sm block mb-1">Would you like florals with your balloons?</label>
                      <select className="input-cream" value={data.extra.wedding_florals || ''} onChange={e => setField({ extra: { ...data.extra, wedding_florals: e.target.value } })}>
                        <option value="">Choose…</option><option>Yes</option><option>No</option><option>Open to suggestions</option>
                      </select></div>
                  </div>
                </div>
              )}
              {data.event_type === 'birthday' && (
                <div className="card-cream p-4 space-y-3">
                  <p className="eyebrow">BIRTHDAY DETAILS</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-sm block mb-1">Age / milestone</label>
                      <input className="input-cream" value={data.extra.birthday_age || ''} onChange={e => setField({ extra: { ...data.extra, birthday_age: e.target.value } })} placeholder="e.g. 1st, Sweet 16, 40th" /></div>
                    <div><label className="text-sm block mb-1">Theme (if any)</label>
                      <input className="input-cream" value={data.extra.birthday_theme || ''} onChange={e => setField({ extra: { ...data.extra, birthday_theme: e.target.value } })} placeholder="e.g. Pastel garden, Retro 80s" /></div>
                  </div>
                </div>
              )}
              {data.event_type === 'corporate' && (
                <div className="card-cream p-4 space-y-3">
                  <p className="eyebrow">CORPORATE DETAILS</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-sm block mb-1">Company / brand</label>
                      <input className="input-cream" value={data.extra.corporate_brand || ''} onChange={e => setField({ extra: { ...data.extra, corporate_brand: e.target.value } })} /></div>
                    <div><label className="text-sm block mb-1">COI (Certificate of Insurance) required?</label>
                      <select className="input-cream" value={data.extra.corporate_coi || ''} onChange={e => setField({ extra: { ...data.extra, corporate_coi: e.target.value } })}>
                        <option value="">Choose…</option><option>Yes</option><option>No</option><option>Not sure</option>
                      </select></div>
                    <div className="sm:col-span-2"><label className="text-sm block mb-1">Brand colors / hex codes</label>
                      <input className="input-cream" value={data.extra.corporate_colors || ''} onChange={e => setField({ extra: { ...data.extra, corporate_colors: e.target.value } })} placeholder="e.g. #F6E6E4, sage, gold" /></div>
                  </div>
                </div>
              )}
              {(data.event_type === 'baby_shower' || data.event_type === 'bridal_shower') && (
                <div className="card-cream p-4 space-y-3">
                  <p className="eyebrow">SHOWER DETAILS</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-sm block mb-1">Guest of honor</label>
                      <input className="input-cream" value={data.extra.honoree || ''} onChange={e => setField({ extra: { ...data.extra, honoree: e.target.value } })} /></div>
                    <div><label className="text-sm block mb-1">Vibe</label>
                      <input className="input-cream" value={data.extra.shower_vibe || ''} onChange={e => setField({ extra: { ...data.extra, shower_vibe: e.target.value } })} placeholder="e.g. soft & neutral, garden brunch" /></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {STEPS[step].key === 'style' && (
            <div className="space-y-4">
              <div><label className="eyebrow block mb-2">THEME / VIBE</label><input className="input-cream" value={data.theme} onChange={e => setField({ theme: e.target.value })} placeholder="e.g. Boho garden, modern minimal, pastel dream" /></div>
              <div>
                <label className="eyebrow block mb-2">COLOR PALETTE</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => toggleInList('color_palette', c)} className={`chip ${data.color_palette?.includes(c) ? 'selected' : ''}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-2">BUDGET</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BUDGETS.map(b => (
                    <button key={b} onClick={() => setField({ budget_range: b })} className={`chip ${data.budget_range === b ? 'selected' : ''}`}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {STEPS[step].key === 'services' && (
            <div className="space-y-4">
              <p className="text-[color:var(--brand-text-muted)]">Select everything you're considering — we'll help you narrow it down after we chat.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICES.map(s => (
                  <button key={s.key} onClick={() => toggleInList('services_needed', s.key)} className={`chip !h-auto !py-2.5 ${data.services_needed?.includes(s.key) ? 'selected' : ''}`} data-testid={`inquiry-service-${s.key}`}>{s.label}</button>
                ))}
              </div>

              {(data.services_needed || []).includes('balloon_garland') && (
                <div className="card-cream p-4 space-y-3">
                  <p className="eyebrow">BALLOON GARLAND OPTIONS</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-sm block mb-1">Approx length</label>
                      <input className="input-cream" value={data.service_details.garland_length || ''} onChange={e => setField({ service_details: { ...data.service_details, garland_length: e.target.value } })} placeholder="e.g. 8 ft, 12 ft" /></div>
                    <div><label className="text-sm block mb-1">Style</label>
                      <select className="input-cream" value={data.service_details.garland_style || ''} onChange={e => setField({ service_details: { ...data.service_details, garland_style: e.target.value } })}>
                        <option value="">Choose…</option><option>Organic (asymmetric)</option><option>Classic (uniform)</option><option>Not sure</option>
                      </select></div>
                  </div>
                </div>
              )}
              {(data.services_needed || []).includes('custom') && (
                <div className="card-cream p-4">
                  <p className="eyebrow mb-2">TELL US MORE</p>
                  <textarea className="input-cream textarea-cream" rows={3} value={data.service_details.custom_notes || ''} onChange={e => setField({ service_details: { ...data.service_details, custom_notes: e.target.value } })} placeholder="What are you dreaming of?" />
                </div>
              )}
            </div>
          )}

          {STEPS[step].key === 'inspiration' && (
            <div className="space-y-4">
              <div>
                <label className="eyebrow block mb-2">NOTES</label>
                <textarea className="input-cream textarea-cream" rows={4} value={data.inspiration_notes} onChange={e => setField({ inspiration_notes: e.target.value })} placeholder="Anything you'd love us to know — words that describe the feel, must-haves, anything you're avoiding." />
              </div>
              <div>
                <label className="eyebrow block mb-2">INSPIRATION LINKS (Pinterest, Instagram, etc.)</label>
                {(data.inspiration_links || ['']).map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="input-cream flex-1" value={link} onChange={e => {
                      const next = [...(data.inspiration_links || [''])]; next[i] = e.target.value; setField({ inspiration_links: next });
                    }} placeholder="https://…" />
                    <button className="btn-secondary !px-3" onClick={() => { const next = (data.inspiration_links || []).filter((_, idx) => idx !== i); setField({ inspiration_links: next.length ? next : [''] }); }}><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button className="btn-secondary" onClick={() => setField({ inspiration_links: [...(data.inspiration_links || []), ''] })}>+ Add link</button>
              </div>
              <div>
                <label className="eyebrow block mb-2">UPLOAD REFERENCE PHOTOS</label>
                <div className="rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)] p-5 text-center">
                  <Upload className="h-6 w-6 mx-auto text-[color:var(--brand-sage-deep)]" />
                  <p className="text-sm mt-2 text-[color:var(--brand-text-muted)]">Drop images or click to upload. PNG, JPG, WEBP, HEIC.</p>
                  <input
                    type="file" accept="image/*" multiple className="hidden" id="inquiry-file-upload"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      const urls = [];
                      for (const f of files) {
                        try { const r = await uploadFile(f); urls.push(r.url); } catch (_) { toast.error(`Failed to upload ${f.name}`); }
                      }
                      setField({ upload_urls: [...(data.upload_urls || []), ...urls] });
                      toast.success(`${urls.length} file${urls.length === 1 ? '' : 's'} uploaded`);
                    }} data-testid="inquiry-file-upload"
                  />
                  <label htmlFor="inquiry-file-upload" className="btn-primary mt-4 inline-flex cursor-pointer">Choose files</label>
                </div>
                {data.upload_urls?.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
                    {data.upload_urls.map((u, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[color:var(--brand-surface-2)]">
                        <img src={publicUrl(u)} alt="upload" className="h-full w-full object-cover" />
                        <button onClick={() => setField({ upload_urls: data.upload_urls.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-black/60 text-white h-6 w-6 rounded-full flex items-center justify-center"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {STEPS[step].key === 'logistics' && (
            <div className="space-y-4">
              <p className="text-[color:var(--brand-text-muted)]">Optional — helps us plan install day. You can leave anything blank if you're not sure.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="card-cream p-4 flex items-center justify-between cursor-pointer"><span>Loading dock available</span><input type="checkbox" checked={!!data.venue_details.loading_dock} onChange={e => setField({ venue_details: { ...data.venue_details, loading_dock: e.target.checked } })} /></label>
                <label className="card-cream p-4 flex items-center justify-between cursor-pointer"><span>Elevator access</span><input type="checkbox" checked={!!data.venue_details.elevator} onChange={e => setField({ venue_details: { ...data.venue_details, elevator: e.target.checked } })} /></label>
                <label className="card-cream p-4 flex items-center justify-between cursor-pointer"><span>Power available on-site</span><input type="checkbox" checked={!!data.venue_details.power} onChange={e => setField({ venue_details: { ...data.venue_details, power: e.target.checked } })} /></label>
                <label className="card-cream p-4 flex items-center justify-between cursor-pointer"><span>Outdoor / wind exposure</span><input type="checkbox" checked={!!data.venue_details.wind_exposure} onChange={e => setField({ venue_details: { ...data.venue_details, wind_exposure: e.target.checked } })} /></label>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">PARKING NOTES</label><input className="input-cream" value={data.venue_details.parking || ''} onChange={e => setField({ venue_details: { ...data.venue_details, parking: e.target.value } })} /></div>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">MUST-HAVES / NON-NEGOTIABLES</label><textarea className="input-cream textarea-cream" rows={3} value={data.must_haves} onChange={e => setField({ must_haves: e.target.value })} /></div>
              </div>
            </div>
          )}

          {STEPS[step].key === 'review' && (
            <div className="space-y-4">
              <p className="text-[color:var(--brand-text-muted)]">Quick review before you submit — you can go back and edit anything.</p>
              <div className="card-cream p-5 space-y-3 text-sm">
                <div><span className="eyebrow mr-2">EVENT</span>{data.event_type || '—'}{data.event_date ? ` on ${data.event_date}` : ''}</div>
                <div><span className="eyebrow mr-2">YOU</span>{data.client_name || '—'} · {data.client_email || '—'}{data.client_phone ? ` · ${data.client_phone}` : ''}</div>
                <div><span className="eyebrow mr-2">VENUE</span>{data.venue_name || 'TBD'}{data.venue_address ? ` · ${data.venue_address}` : ''}</div>
                <div><span className="eyebrow mr-2">STYLE</span>{data.theme || '—'} · {(data.color_palette || []).join(', ') || 'palette open'}</div>
                <div><span className="eyebrow mr-2">BUDGET</span>{data.budget_range || 'open'}</div>
                <div><span className="eyebrow mr-2">SERVICES</span>{(data.services_needed || []).join(', ') || '—'}</div>
                <div><span className="eyebrow mr-2">UPLOADS</span>{(data.upload_urls || []).length} photo{(data.upload_urls || []).length === 1 ? '' : 's'}</div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button onClick={goPrev} disabled={step === 0} className="btn-secondary disabled:opacity-40" data-testid="inquiry-back-step-button"><ArrowLeft className="h-4 w-4" /> Back</button>
        {step < STEPS.length - 1 ? (
          <button onClick={goNext} className="btn-primary" data-testid="inquiry-next-step-button">Continue <ArrowRight className="h-4 w-4" /></button>
        ) : (
          <button onClick={submit} disabled={submitting} className="btn-primary" data-testid="inquiry-submit-button"><CheckCircle2 className="h-4 w-4" /> {submitting ? 'Sending…' : 'Submit inquiry'}</button>
        )}
      </div>
    </div>
  );
};

export default InquiryWizardPage;
