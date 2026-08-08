import { useEffect, useState, useCallback, useRef, memo as reactMemo } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

/**
 * useSiteAdminData — shared hook for every admin page that edits SiteContent.
 *
 * Perf notes:
 *  - Reuses `site` from SiteContext instead of re-fetching on every mount.
 *    This makes route navigation between admin pages feel instant.
 *  - `set()` uses a functional updater so React can batch changes without
 *    the enclosing hook needing to re-render every keystroke.
 *  - On save, PUTs the local snapshot to /admin/site-content (backend $set
 *    merges partial fields so unrelated pages keep their data).
 */
export const useSiteAdminData = () => {
  const { site, refresh } = useSite();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const seededRef = useRef(false);

  // Seed local state from context once. Subsequent site refreshes (e.g. after
  // save) do NOT overwrite un-saved edits, but if the user hasn't touched
  // anything we keep in sync with the source of truth.
  useEffect(() => {
    if (!site) return;
    if (!seededRef.current) {
      setData(site);
      seededRef.current = true;
    } else if (!dirty) {
      // Silent sync from context when nothing is dirty
      setData(site);
    }
  }, [site, dirty]);

  const set = useCallback((patch) => {
    setDirty(true);
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      // Read latest data at save-time (avoids stale-closure re-creates of `save`)
      setData(current => {
        (async () => {
          try {
            await api.put('/admin/site-content', current);
            await refresh();
            setDirty(false);
            toast.success('Saved');
          } catch (e) {
            toast.error(e?.response?.data?.detail || 'Save failed');
          } finally {
            setSaving(false);
          }
        })();
        return current;
      });
    } catch (e) {
      setSaving(false);
    }
  }, [refresh]);

  return { data, set, save, saving, dirty };
};

// Shared UI atoms
export const ToggleRow = ({ label, checked, onChange, hint, testId }) => (
  <label className="flex items-center justify-between gap-3 card-cream p-3 cursor-pointer hover:bg-[color:var(--brand-sage-tint)]/40 transition-colors" data-testid={testId}>
    <div className="flex-1">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">{hint}</p>}
    </div>
    <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[color:var(--brand-sage)]' : 'bg-[color:var(--brand-border)]'}`}>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
  </label>
);

export const PageHeader = ({ eyebrow, title, subtitle, saving, dirty, onSave, saveTestId }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-serif text-3xl sm:text-4xl mt-1">{title}</h1>
      {subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    <button
      onClick={onSave}
      disabled={saving || !dirty}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid={saveTestId || 'admin-page-save'}
    >
      {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
    </button>
  </div>
);

/**
 * TextField / TextArea — locally-controlled inputs that only commit to the
 * parent state on blur (or debounced 500ms).
 *
 * WHY: The admin pages hold a single big `data` object in state. If every
 * keystroke bubbled up, the whole page tree would reconcile on each key press
 * (which felt laggy). These inputs keep the typing responsive by owning
 * their own state and only pushing the final value up when the user leaves
 * the field.
 */
const _makeInput = (Tag) => reactMemo(function LocalInput({ value, onCommit, className = '', ...rest }) {
  const [local, setLocal] = useState(value ?? '');
  const [focused, setFocused] = useState(false);

  // Sync from parent when NOT focused (avoids clobbering current input)
  useEffect(() => {
    if (!focused) setLocal(value ?? '');
  }, [value, focused]);

  return (
    <Tag
      {...rest}
      className={`input-cream ${Tag === 'textarea' ? 'textarea-cream' : ''} ${className}`}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        if (local !== (value ?? '')) onCommit(local);
      }}
    />
  );
});

export const TextField = _makeInput('input');
export const TextArea = _makeInput('textarea');

