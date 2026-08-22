import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Scale, Save, Eye, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

/**
 * AdminLegalPages — dedicated admin editor for the two static legal pages
 * (/terms and /privacy). Uses local state per field with an explicit "Save"
 * button per page so long-form legal copy doesn't try to auto-save on every
 * keystroke (which would feel laggy on long documents).
 *
 * The body field accepts a tiny markdown subset the public page understands:
 *   - Blank lines separate paragraphs
 *   - Lines starting with "- " become bullet items
 *   - **bold** spans inside a line render bold
 * A short cheatsheet is shown next to the textarea so the owner can format
 * her Canva-imported copy without leaving the admin.
 */
const FORMATTING_HINT = (
  <div className="rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)] p-3 text-xs text-[color:var(--brand-text-muted)] space-y-1">
    <p className="font-medium text-[color:var(--brand-text)] mb-1">Formatting quick reference</p>
    <p>• Leave a <b>blank line</b> between paragraphs.</p>
    <p>• Start a line with <code className="font-mono px-1 rounded bg-white border border-[color:var(--brand-border)]">- </code> to make a bullet point.</p>
    <p>• Wrap words in <code className="font-mono px-1 rounded bg-white border border-[color:var(--brand-border)]">**asterisks**</code> to make them <b>bold</b>.</p>
  </div>
);

const LegalPageEditor = ({ id, publicPath, label, initial, onSave }) => {
  const [local, setLocal] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(initial); setDirty(false); }, [initial]);

  const setField = (patch) => { setLocal(p => ({ ...p, ...patch })); setDirty(true); };
  const doSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
      toast.success(`${label} saved`);
      setDirty(false);
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card-cream p-6 space-y-4" data-testid={`admin-legal-${id}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[color:var(--brand-sage-deep)]" />
          <p className="font-serif text-xl">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={publicPath}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
            data-testid={`admin-legal-${id}-preview`}
            title="Open the public page in a new tab"
          >
            <Eye className="h-3.5 w-3.5" /> Preview <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            type="button"
            onClick={doSave}
            disabled={!dirty || saving}
            className="btn-primary text-sm disabled:opacity-40"
            data-testid={`admin-legal-${id}-save`}
          >
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="eyebrow block mb-1">EYEBROW (OPTIONAL)</label>
          <input
            className="input-cream"
            placeholder="e.g. LEGAL"
            value={local.eyebrow || ''}
            onChange={e => setField({ eyebrow: e.target.value })}
            data-testid={`admin-legal-${id}-eyebrow`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="eyebrow block mb-1">TITLE</label>
          <input
            className="input-cream"
            value={local.title || ''}
            onChange={e => setField({ title: e.target.value })}
            data-testid={`admin-legal-${id}-title`}
          />
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-1">LAST UPDATED (OPTIONAL)</label>
        <input
          className="input-cream max-w-xs"
          placeholder="e.g. Updated Oct 2025"
          value={local.updated || ''}
          onChange={e => setField({ updated: e.target.value })}
          data-testid={`admin-legal-${id}-updated`}
        />
        <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Small italic line under the title. Blank hides it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="eyebrow block mb-1">BODY</label>
          <textarea
            className="input-cream textarea-cream font-mono text-sm"
            rows={18}
            value={local.body || ''}
            onChange={e => setField({ body: e.target.value })}
            data-testid={`admin-legal-${id}-body`}
          />
        </div>
        <div className="space-y-3">
          {FORMATTING_HINT}
          <div className="rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] p-3 text-xs">
            <p className="font-medium mb-1">Tips</p>
            <p className="text-[color:var(--brand-text-muted)]">Paste directly from Canva — line breaks and blank lines will be preserved. Use <b>Preview</b> to see how it looks on the public page.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminLegalPages = () => {
  const { site, refresh } = useSite();

  const saveTerms = async (v) => {
    await api.put('/admin/site-content', {
      terms_page_eyebrow: v.eyebrow || '',
      terms_page_title: v.title || '',
      terms_page_body: v.body || '',
      terms_page_updated_at: v.updated || '',
    });
    await refresh();
  };
  const savePrivacy = async (v) => {
    await api.put('/admin/site-content', {
      privacy_page_eyebrow: v.eyebrow || '',
      privacy_page_title: v.title || '',
      privacy_page_body: v.body || '',
      privacy_page_updated_at: v.updated || '',
    });
    await refresh();
  };

  const termsInitial = {
    eyebrow: site?.terms_page_eyebrow || '',
    title: site?.terms_page_title || '',
    body: site?.terms_page_body || '',
    updated: site?.terms_page_updated_at || '',
  };
  const privacyInitial = {
    eyebrow: site?.privacy_page_eyebrow || '',
    title: site?.privacy_page_title || '',
    body: site?.privacy_page_body || '',
    updated: site?.privacy_page_updated_at || '',
  };

  return (
    <div className="space-y-6" data-testid="admin-legal-pages">
      <div>
        <p className="eyebrow">SITE CHROME</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Legal pages</h1>
        <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
          Edit the Terms + Conditions and Privacy Policy pages linked from the footer. Both use the same simple formatting: blank lines for paragraphs, <code className="font-mono text-[11px] px-1 rounded bg-white border border-[color:var(--brand-border)]">- </code> for bullets, and <code className="font-mono text-[11px] px-1 rounded bg-white border border-[color:var(--brand-border)]">**bold**</code> for emphasis.
        </p>
      </div>

      <LegalPageEditor
        id="terms"
        publicPath="/terms"
        label="Terms + Conditions"
        initial={termsInitial}
        onSave={saveTerms}
      />

      <LegalPageEditor
        id="privacy"
        publicPath="/privacy"
        label="Privacy Policy"
        initial={privacyInitial}
        onSave={savePrivacy}
      />
    </div>
  );
};

export default AdminLegalPages;
