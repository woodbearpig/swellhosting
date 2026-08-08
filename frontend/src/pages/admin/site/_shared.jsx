import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

/**
 * useSiteAdminData — shared hook for every admin page that edits SiteContent.
 *
 * Each admin route owns its own state slice (fetched fresh on mount) so that
 * editing on one page doesn't retain in-memory changes when navigating away.
 * On save, the full local snapshot is PUT to /admin/site-content — the backend
 * uses $set so unrelated fields are preserved.
 */
export const useSiteAdminData = () => {
  const { refresh } = useSite();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/site-content').then(r => {
      if (!cancelled) setData(r.data);
    });
    return () => { cancelled = true; };
  }, []);

  const set = useCallback((patch) => {
    setDirty(true);
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.put('/admin/site-content', data);
      refresh();
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
