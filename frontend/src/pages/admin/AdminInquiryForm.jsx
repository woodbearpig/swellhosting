import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Eye, RotateCcw, X, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';

const FIELD_TYPES = [
  { value: 'chips_single', label: 'Bubble buttons (pick one)', hasOptions: true },
  { value: 'chips_multi', label: 'Bubble buttons (pick many)', hasOptions: true },
  { value: 'text', label: 'Short text', hasOptions: false },
  { value: 'textarea', label: 'Long text', hasOptions: false },
  { value: 'email', label: 'Email', hasOptions: false },
  { value: 'phone', label: 'Phone', hasOptions: false },
  { value: 'date', label: 'Date', hasOptions: false },
  { value: 'time', label: 'Time', hasOptions: false },
  { value: 'number', label: 'Number', hasOptions: false },
  { value: 'select', label: 'Dropdown', hasOptions: true },
  { value: 'radio', label: 'Radio group', hasOptions: true },
  { value: 'checkbox', label: 'Single checkbox (yes/no)', hasOptions: false },
  { value: 'links_list', label: 'Inspiration links list', hasOptions: false },
  { value: 'file_upload', label: 'Photo upload', hasOptions: false },
  { value: 'section_note', label: 'Help paragraph (no input)', hasOptions: false },
];

// Field types whose value can drive a conditional (must have discrete options)
const TRIGGER_TYPES = new Set(['chips_single', 'chips_multi', 'select', 'radio']);

const RESERVED_IDS = new Set([
  'client_name', 'client_email', 'client_phone', 'preferred_contact',
  'event_type', 'event_date', 'event_backup_date', 'event_start_time', 'event_end_time',
  'venue_name', 'venue_address', 'indoor_outdoor',
  'guest_count', 'theme', 'color_palette', 'budget_range', 'must_haves',
  'services_needed', 'inspiration_notes', 'inspiration_links', 'upload_urls',
]);

const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '_').replace(/^_|_$/g, '') || 'field';

const OptionsEditor = ({ options = [], onChange }) => (
  <div className="space-y-1 pl-2 border-l-2 border-[color:var(--brand-border)]">
    <div className="flex items-center justify-between">
      <p className="eyebrow">OPTIONS</p>
      <button type="button" className="text-xs link-underline" onClick={() => onChange([...(options || []), { value: `option_${(options || []).length + 1}`, label: 'New option' }])}>
        + Add option
      </button>
    </div>
    {(options || []).map((opt, i) => (
      <div key={i} className="flex items-center gap-2">
        <input
          className="input-cream !h-8 text-sm flex-1"
          value={opt.label}
          onChange={e => {
            const next = [...options];
            next[i] = { ...next[i], label: e.target.value, value: opt.value || slugify(e.target.value) };
            onChange(next);
          }}
          placeholder="Label shown to visitors"
        />
        <button type="button" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50" onClick={() => onChange(options.filter((_, j) => j !== i))} aria-label="Remove option">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ))}
    {(!options || options.length === 0) && (
      <p className="text-xs text-[color:var(--brand-text-muted)] italic">No options yet.</p>
    )}
  </div>
);

// ConditionalEditor — lets the admin say "show this field only if [trigger] equals [value]"
// availableTriggers: array of { id, label, options } for all option-based fields that appear
// BEFORE the current field in the schema (so the value is already collected when we evaluate).
const ConditionalEditor = ({ field, availableTriggers, onChange }) => {
  const cond = field.conditional || null;
  const active = !!cond;
  const trigger = active ? availableTriggers.find(t => t.id === cond.field) : null;

  const enable = () => {
    // pick the first available trigger by default
    const first = availableTriggers[0];
    if (!first) return;
    onChange({
      ...field,
      conditional: {
        field: first.id,
        equals: first.options?.[0]?.value || '',
      },
    });
  };

  const disable = () => {
    const next = { ...field };
    delete next.conditional;
    onChange(next);
  };

  if (availableTriggers.length === 0) {
    return (
      <div className="pl-2 border-l-2 border-[color:var(--brand-border)]">
        <p className="eyebrow">SHOW ONLY IF…</p>
        <p className="text-xs text-[color:var(--brand-text-muted)] italic mt-1">
          Add a bubble/dropdown/radio field earlier in the form to unlock conditional rules.
        </p>
      </div>
    );
  }

  return (
    <div className="pl-2 border-l-2 border-[color:var(--brand-border)] space-y-2">
      <div className="flex items-center justify-between">
        <p className="eyebrow">SHOW ONLY IF…</p>
        {active ? (
          <button
            type="button"
            className="text-xs link-underline text-red-600"
            onClick={disable}
            data-testid={`field-${field.id}-conditional-clear`}
          >
            <X className="h-3 w-3 inline" /> Clear rule
          </button>
        ) : (
          <button
            type="button"
            className="text-xs link-underline"
            onClick={enable}
            data-testid={`field-${field.id}-conditional-add`}
          >
            + Add conditional rule
          </button>
        )}
      </div>

      {active && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <select
            className="input-cream !h-9 text-sm"
            value={cond.field}
            onChange={e => {
              const newTrigger = availableTriggers.find(t => t.id === e.target.value);
              onChange({
                ...field,
                conditional: {
                  field: e.target.value,
                  equals: newTrigger?.options?.[0]?.value || '',
                },
              });
            }}
            data-testid={`field-${field.id}-conditional-field`}
          >
            {availableTriggers.map(t => (
              <option key={t.id} value={t.id}>{t.label || t.id}</option>
            ))}
          </select>
          <span className="text-sm text-[color:var(--brand-text-muted)] text-center px-1">equals</span>
          <select
            className="input-cream !h-9 text-sm"
            value={cond.equals || ''}
            onChange={e => onChange({
              ...field,
              conditional: { ...cond, equals: e.target.value },
            })}
            data-testid={`field-${field.id}-conditional-value`}
          >
            {(trigger?.options || []).map(o => (
              <option key={o.value} value={o.value}>{o.label || o.value}</option>
            ))}
            {(!trigger?.options || trigger.options.length === 0) && (
              <option value="">— that field has no options —</option>
            )}
          </select>
        </div>
      )}

      {active && trigger && (
        <p className="text-[11px] text-[color:var(--brand-text-muted)]">
          Field is hidden until visitors pick <b>{(trigger.options || []).find(o => o.value === cond.equals)?.label || cond.equals}</b> for <b>{trigger.label || trigger.id}</b>.
        </p>
      )}
    </div>
  );
};

const FieldEditor = ({ field, onChange, onDelete, onMoveUp, onMoveDown, canUp, canDown, index, availableTriggers = [] }) => {
  const meta = FIELD_TYPES.find(t => t.value === field.type) || FIELD_TYPES[0];
  const isReserved = RESERVED_IDS.has(field.id);
  return (
    <div className="card-cream p-3 space-y-2" data-testid={`field-${field.id}`}>
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-2 text-[color:var(--brand-text-muted)]" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-2">
          <input
            className="input-cream !h-9"
            value={field.label || ''}
            onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="Field label (shown to visitors)"
          />
          <select
            className="input-cream !h-9"
            value={field.type}
            onChange={e => onChange({ ...field, type: e.target.value })}
          >
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canUp} onClick={onMoveUp} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canDown} onClick={onMoveDown} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={onDelete} aria-label="Delete field" data-testid={`field-${field.id}-delete`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="pl-6 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <p className="eyebrow mb-1">FIELD ID</p>
          <input
            className="input-cream !h-9 text-xs font-mono"
            value={field.id || ''}
            onChange={e => onChange({ ...field, id: slugify(e.target.value) })}
            disabled={isReserved}
            title={isReserved ? 'Reserved field id (maps to core inquiry data)' : 'Used to save the answer'}
          />
          {isReserved && <p className="text-[10px] text-[color:var(--brand-sage-deep)] mt-1">Reserved — maps to core CRM data.</p>}
        </div>
        <div className="md:col-span-2">
          <p className="eyebrow mb-1">HELP / PLACEHOLDER</p>
          <input
            className="input-cream !h-9"
            value={field.help || field.placeholder || ''}
            onChange={e => onChange({ ...field, help: e.target.value, placeholder: e.target.value })}
            placeholder="Optional guidance shown under the field"
          />
        </div>
      </div>

      {field.type !== 'section_note' && (
        <div className="pl-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!field.required} onChange={e => onChange({ ...field, required: e.target.checked })} />
            <span>Required</span>
          </label>
        </div>
      )}

      {meta.hasOptions && (
        <div className="pl-6">
          <OptionsEditor options={field.options} onChange={opts => onChange({ ...field, options: opts })} />
        </div>
      )}

      {field.type !== 'section_note' && (
        <div className="pl-6">
          <ConditionalEditor
            field={field}
            availableTriggers={availableTriggers}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
};

const StepCard = ({ step, index, expanded, onToggle, onChange, onDelete, onMoveUp, onMoveDown, canUp, canDown, triggersForField }) => (
  <div className="border border-[color:var(--brand-border)] rounded-2xl bg-white/40 overflow-hidden" data-testid={`step-${step.id}`}>
    <div className="flex items-center gap-2 px-4 py-3 bg-[color:var(--brand-surface-2)]">
      <button type="button" onClick={onToggle} className="h-8 w-8 inline-flex items-center justify-center" aria-label="Toggle step">
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium">{index + 1}</div>
      <input
        className="input-cream !h-9 flex-1 !bg-white"
        value={step.title || ''}
        onChange={e => onChange({ ...step, title: e.target.value })}
        placeholder="Step title"
        data-testid={`step-${step.id}-title`}
      />
      <div className="flex gap-1">
        <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canUp} onClick={onMoveUp} aria-label="Move step up"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={!canDown} onClick={onMoveDown} aria-label="Move step down"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={onDelete} aria-label="Delete step" data-testid={`step-${step.id}-delete`}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>

    {expanded && (
      <div className="p-4 space-y-3">
        <div>
          <p className="eyebrow mb-1">STEP DESCRIPTION</p>
          <textarea
            className="input-cream textarea-cream"
            rows={2}
            value={step.description || ''}
            onChange={e => onChange({ ...step, description: e.target.value })}
            placeholder="Short guidance shown below the title"
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="eyebrow">FIELDS</p>
          <button
            type="button"
            className="btn-secondary text-xs !h-8"
            onClick={() => {
              const newField = { id: `field_${Date.now().toString(36)}`, type: 'text', label: 'New field', required: false };
              onChange({ ...step, fields: [...(step.fields || []), newField] });
            }}
            data-testid={`step-${step.id}-add-field`}
          ><Plus className="h-3.5 w-3.5" /> Add field</button>
        </div>

        <div className="space-y-2">
          {(step.fields || []).map((field, fi) => (
            <FieldEditor
              key={field.id + fi}
              field={field}
              index={fi}
              canUp={fi > 0}
              canDown={fi < step.fields.length - 1}
              availableTriggers={triggersForField ? triggersForField(field.id) : []}
              onChange={next => {
                const list = [...step.fields];
                list[fi] = next;
                onChange({ ...step, fields: list });
              }}
              onDelete={() => onChange({ ...step, fields: step.fields.filter((_, i) => i !== fi) })}
              onMoveUp={() => {
                const list = [...step.fields];
                [list[fi - 1], list[fi]] = [list[fi], list[fi - 1]];
                onChange({ ...step, fields: list });
              }}
              onMoveDown={() => {
                const list = [...step.fields];
                [list[fi], list[fi + 1]] = [list[fi + 1], list[fi]];
                onChange({ ...step, fields: list });
              }}
            />
          ))}
          {(!step.fields || step.fields.length === 0) && (
            <p className="text-sm text-[color:var(--brand-text-muted)] italic pl-2">No fields yet.</p>
          )}
        </div>
      </div>
    )}
  </div>
);

export const AdminInquiryForm = () => {
  const [schema, setSchema] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/inquiry-form').then(r => {
      setSchema(r.data);
      // Expand the first step by default
      if (r.data?.steps?.length) setExpanded({ [r.data.steps[0].id]: true });
    });
  }, []);

  const updateStep = (idx, next) => {
    const steps = [...schema.steps];
    steps[idx] = next;
    setSchema({ ...schema, steps });
    setDirty(true);
  };
  const deleteStep = (idx) => {
    if (!window.confirm('Delete this step and all its fields?')) return;
    setSchema({ ...schema, steps: schema.steps.filter((_, i) => i !== idx) });
    setDirty(true);
  };
  const moveStep = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= schema.steps.length) return;
    const steps = [...schema.steps];
    [steps[idx], steps[j]] = [steps[j], steps[idx]];
    setSchema({ ...schema, steps });
    setDirty(true);
  };
  const addStep = () => {
    const id = `step-${Date.now().toString(36)}`;
    const step = { id, title: 'New step', description: '', fields: [] };
    setSchema({ ...schema, steps: [...schema.steps, step] });
    setExpanded(e => ({ ...e, [id]: true }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/inquiry-form', schema);
      setSchema(data);
      setDirty(false);
      toast.success('Inquiry form saved — visitors will see your changes immediately.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save form');
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!window.confirm('Reset the form back to the default 8-step template? Your customizations will be lost.')) return;
    try {
      const { data } = await api.post('/admin/inquiry-form/reset');
      setSchema(data);
      setDirty(false);
      toast.success('Form reset to default template.');
    } catch (e) { toast.error('Could not reset form'); }
  };

  if (!schema) return <p>Loading form…</p>;

  // Given a target field id, return the list of trigger candidates:
  // all option-based fields that appear BEFORE it in the schema.
  // Guarantees no circular references and that the trigger's value
  // will already be set by the time we evaluate the conditional.
  const triggersForField = (targetFieldId) => {
    const out = [];
    for (const s of schema.steps || []) {
      for (const f of s.fields || []) {
        if (f.id === targetFieldId) return out;
        if (TRIGGER_TYPES.has(f.type) && (f.options || []).length > 0) {
          out.push({ id: f.id, label: f.label || f.id, options: f.options });
        }
      }
    }
    return out;
  };

  return (
    <div className="space-y-6" data-testid="admin-inquiry-form-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h1 className="font-serif text-3xl sm:text-4xl mt-1">Inquiry form</h1>
          <p className="text-[color:var(--brand-text-muted)] mt-2 max-w-2xl">Build the multi-step form visitors fill out. Add or remove entire steps, edit field labels, and customize the bubble-shaped choice options. Anything you build here becomes the live form immediately after saving.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/inquire?preview=1" target="_blank" className="btn-secondary" data-testid="inquiry-form-preview">
            <Eye className="h-4 w-4" /> Preview form
          </Link>
          <button type="button" className="btn-secondary" onClick={reset} data-testid="inquiry-form-reset">
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving} data-testid="inquiry-form-save">
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm">
        <p className="font-medium mb-1">Two tips before you start</p>
        <p className="text-[color:var(--brand-text-muted)]"><strong>Bubble buttons</strong> (the chip-style choices visitors love) come from field types <em>Bubble buttons (pick one)</em> and <em>Bubble buttons (pick many)</em>. And any field can now use <strong>"Show only if…"</strong> to appear only when a previous bubble/dropdown/radio choice matches — great for tailoring the form to different event types.</p>
      </div>

      <div className="space-y-3" data-testid="inquiry-form-steps-list">
        {schema.steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            expanded={!!expanded[step.id]}
            onToggle={() => setExpanded(e => ({ ...e, [step.id]: !e[step.id] }))}
            onChange={next => updateStep(idx, next)}
            onDelete={() => deleteStep(idx)}
            onMoveUp={() => moveStep(idx, -1)}
            onMoveDown={() => moveStep(idx, +1)}
            canUp={idx > 0}
            canDown={idx < schema.steps.length - 1}
            triggersForField={triggersForField}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <button type="button" className="btn-secondary" onClick={addStep} data-testid="inquiry-form-add-step">
          <Plus className="h-4 w-4" /> Add step
        </button>
      </div>
    </div>
  );
};

export default AdminInquiryForm;
