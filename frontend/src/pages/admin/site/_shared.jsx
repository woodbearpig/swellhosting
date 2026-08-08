import { useEffect, useLayoutEffect, useState, useCallback, useRef, memo as reactMemo } from 'react';
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
 *
 * ROBUSTNESS FIX (2026-02): We now include `data` in the save callback's
 * dependency list so the closure ALWAYS captures the latest state. Previously
 * we relied on `dataRef.current` which is written via useEffect (async post-
 * commit). If the user typed in a TextField and clicked Save before the ref
 * was updated (possible with React 18 concurrent scheduling under load), the
 * save PUT the pre-typed snapshot back — silently reverting the new keystrokes.
 * useLayoutEffect for the ref belt-and-suspenders this further.
 */
export const useSiteAdminData = () => {
  const { site, refresh } = useSite();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const seededRef = useRef(false);
  const dataRef = useRef(null);

  // Keep dataRef in sync IMMEDIATELY after each commit (before any downstream
  // effect / event handler can read a stale snapshot). Using useLayoutEffect
  // guarantees this runs synchronously with the commit phase.
  useLayoutEffect(() => { dataRef.current = data; }, [data]);

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
    // Prefer the latest React state; fall back to the ref only if state hasn't
    // rendered yet (both should agree in practice, but this is defensive).
    const current = data || dataRef.current;
    if (!current) return;
    setSaving(true);
    try {
      const { data: saved } = await api.put('/admin/site-content', current);
      // Optimistically seed the local snapshot with the server's authoritative
      // response so the UI can't briefly "flash back" to an older value while
      // refresh() is round-tripping.
      if (saved) setData(saved);
      await refresh();
      setDirty(false);
      toast.success('Saved');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [data, refresh]);

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

export const PageHeader = ({ eyebrow, title, subtitle, saving, dirty, onSave, saveTestId }) => {
  // Warn user if they try to close the tab / hit the browser back button with
  // unsaved changes. In-app nav (React Router) doesn't fire this — that's
  // intentional; the *sticky* Save button below is the primary safety net.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <div
      className="sticky top-0 z-20 -mx-5 sm:-mx-8 lg:-mx-10 px-5 sm:px-8 lg:px-10 py-3 bg-[color:var(--brand-cream)]/95 backdrop-blur border-b border-[color:var(--brand-border)] flex items-start justify-between gap-4 flex-wrap"
      data-testid="admin-page-header"
    >
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {dirty && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-medium" data-testid="admin-unsaved-badge">
            Unsaved changes
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving || !dirty}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid={saveTestId || 'admin-page-save'}
        >
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
};

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

