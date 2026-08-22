import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useSiteAdminData, PageHeader, ToggleRow, TextField, TextArea } from './_shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * PreviewLinkCard — surfaces the secret preview token stored on SiteContent
 * as a copy-friendly URL and gives the admin a one-click "Regenerate" that
 * invalidates any previously-shared preview links.
 *
 * Fetches the token from an admin-only endpoint (the public /site-content
 * response strips it, otherwise anyone could bypass Coming Soon just by
 * inspecting the JSON payload).
 */
const PreviewLinkCard = () => {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [token, setToken] = useState('');

  const previewUrl = token
    ? `${window.location.origin}/?preview=${encodeURIComponent(token)}`
    : '';

  // One-time fetch of the current admin-only preview token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/admin/preview-token');
        if (!cancelled) setToken((data?.preview_token || '').trim());
      } catch (e) {
        // Non-fatal — admin will just see the "Generate" state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const doRegenerate = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post('/admin/preview/regenerate');
      setToken((res?.preview_token || '').trim());
      toast.success(token ? 'Preview link regenerated' : 'Preview link generated');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not regenerate preview link');
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const copy = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      toast.success('Preview link copied to clipboard');
    } catch (_) {
      toast.error('Could not copy — please select the link and copy manually');
    }
  };

  return (
    <div className="card-cream p-6 space-y-3" data-testid="admin-preview-link-card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-serif text-xl flex items-center gap-2"><Eye className="h-5 w-5" /> Preview link</p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
            Share this link with the client (or use it yourself) to see the real site while Coming Soon mode is on. The public still sees Coming Soon — only people with this exact link can bypass it.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--brand-text-muted)]" data-testid="admin-preview-link-loading">Loading preview link…</p>
      ) : previewUrl ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] p-2 flex-wrap sm:flex-nowrap">
            <input
              readOnly
              value={previewUrl}
              onFocus={e => e.target.select()}
              className="flex-1 min-w-0 bg-transparent px-2 py-1 text-sm font-mono truncate"
              data-testid="admin-preview-link-url"
            />
            <button
              type="button"
              onClick={copy}
              className="btn-secondary text-sm !h-9 whitespace-nowrap"
              data-testid="admin-preview-link-copy"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-sm !h-9 whitespace-nowrap"
              data-testid="admin-preview-link-open"
              title="Open in a new tab"
            >
              <ExternalLink className="h-4 w-4" /> Open
            </a>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={busy}
                className="text-xs text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-sage-deep)] hover:underline inline-flex items-center gap-1"
                data-testid="admin-preview-link-regenerate"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate link (invalidates any previously-shared URL)
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="admin-preview-link-regenerate-confirm">
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate preview link?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anyone who already has the current link will lose access. You'll need to reshare the new link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Keep current link</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); doRegenerate(); }}
                  disabled={busy}
                  className="bg-[color:var(--brand-sage-deep)] hover:opacity-90 text-white"
                  data-testid="admin-preview-link-regenerate-confirm-yes"
                >
                  {busy ? 'Rotating…' : 'Yes, regenerate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <button
          type="button"
          onClick={doRegenerate}
          disabled={busy}
          className="btn-primary"
          data-testid="admin-preview-link-generate"
        >
          <RefreshCw className="h-4 w-4" /> {busy ? 'Generating…' : 'Generate preview link'}
        </button>
      )}
    </div>
  );
};

const AdminComingSoonPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-coming-soon-page">
      <PageHeader
        eyebrow="PAGE"
        title="Coming soon"
        subtitle="Turn the public site into a coming-soon landing page. Admin stays accessible."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-coming-soon-save"
      />

      <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm">
        <p className="font-medium mb-1">⚠️ Coming Soon mode</p>
        <p className="text-[color:var(--brand-text-muted)]">When enabled, all public pages are hidden and replaced with a Coming Soon page. Your admin panel remains fully accessible at <code>/admin/login</code>.</p>
      </div>

      <label className="flex items-center gap-3 card-cream p-4 cursor-pointer">
        <input type="checkbox" className="h-5 w-5" checked={!!data.coming_soon_active} onChange={e => set({ coming_soon_active: e.target.checked })} data-testid="admin-coming-soon-toggle" />
        <div>
          <p className="font-medium">Show Coming Soon page instead of the site</p>
          <p className="text-xs text-[color:var(--brand-text-muted)]">Public visitors see only the coming-soon page.</p>
        </div>
      </label>

      <PreviewLinkCard />

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Page content</p>
        <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.coming_soon_eyebrow || ''} onCommit={v => set({ coming_soon_eyebrow: v })} placeholder="SOMETHING BEAUTIFUL IS COMING" /></div>
        <div><label className="eyebrow block mb-1">HEADLINE</label><TextArea rows={2} value={data.coming_soon_title || ''} onCommit={v => set({ coming_soon_title: v })} placeholder="Leave blank to hide" /></div>
        <div><label className="eyebrow block mb-1">SCRIPT ACCENT (handwritten line)</label><TextField value={data.coming_soon_script || ''} onCommit={v => set({ coming_soon_script: v })} placeholder="e.g. stay tuned" /></div>
        <div><label className="eyebrow block mb-1">MESSAGE</label><TextArea rows={4} value={data.coming_soon_message || ''} onCommit={v => set({ coming_soon_message: v })} /></div>
        <div><label className="eyebrow block mb-1">LAUNCH DATE BADGE (optional)</label><TextField value={data.coming_soon_launch_date || ''} onCommit={v => set({ coming_soon_launch_date: v })} placeholder="e.g. Fall 2026" /></div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Show / hide elements</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="Logo" checked={data.coming_soon_show_logo !== false} onChange={v => set({ coming_soon_show_logo: v })} />
          <ToggleRow label="Newsletter signup form" checked={data.coming_soon_show_newsletter !== false} onChange={v => set({ coming_soon_show_newsletter: v })} />
          <ToggleRow label="Email link" checked={data.coming_soon_show_email !== false} onChange={v => set({ coming_soon_show_email: v })} />
          <ToggleRow label="Phone number" checked={data.coming_soon_show_phone !== false} onChange={v => set({ coming_soon_show_phone: v })} />
          <ToggleRow label="Instagram link" checked={data.coming_soon_show_instagram !== false} onChange={v => set({ coming_soon_show_instagram: v })} />
          <ToggleRow label="Footer / copyright" checked={data.coming_soon_show_footer !== false} onChange={v => set({ coming_soon_show_footer: v })} />
          <ToggleRow label="Discreet admin link" checked={data.coming_soon_show_admin_link !== false} onChange={v => set({ coming_soon_show_admin_link: v })} />
        </div>
      </div>

      {data.coming_soon_show_newsletter !== false && (
        <div className="card-cream p-6 space-y-3">
          <p className="font-serif text-xl">Newsletter form</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="eyebrow block mb-1">INPUT PLACEHOLDER</label><TextField value={data.coming_soon_newsletter_placeholder || ''} onCommit={v => set({ coming_soon_newsletter_placeholder: v })} placeholder="you@email.com" /></div>
            <div><label className="eyebrow block mb-1">BUTTON LABEL</label><TextField value={data.coming_soon_newsletter_button || ''} onCommit={v => set({ coming_soon_newsletter_button: v })} placeholder="Notify me" /></div>
          </div>
        </div>
      )}

      <div className="card-cream p-6 space-y-3">
        <p className="font-serif text-xl">Contact overrides</p>
        <p className="text-sm text-[color:var(--brand-text-muted)]">Blank fields inherit from Contact &amp; social. Fill any to override just here.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EMAIL OVERRIDE</label><TextField value={data.coming_soon_email_override || ''} onCommit={v => set({ coming_soon_email_override: v })} placeholder={`(defaults to ${data.contact_email || 'contact email'})`} /></div>
          <div><label className="eyebrow block mb-1">PHONE OVERRIDE</label><TextField value={data.coming_soon_phone_override || ''} onCommit={v => set({ coming_soon_phone_override: v })} placeholder={`(defaults to ${data.contact_phone || 'contact phone'})`} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM URL OVERRIDE</label><TextField value={data.coming_soon_instagram_override || ''} onCommit={v => set({ coming_soon_instagram_override: v })} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM LINK LABEL</label><TextField value={data.coming_soon_instagram_label || ''} onCommit={v => set({ coming_soon_instagram_label: v })} placeholder="Follow along" /></div>
        </div>
      </div>

      {data.coming_soon_show_footer !== false && (
        <div className="card-cream p-6 space-y-3">
          <p className="font-serif text-xl">Footer text</p>
          <TextField value={data.coming_soon_footer_text || ''} onCommit={v => set({ coming_soon_footer_text: v })} placeholder="(auto-generated if blank)" />
        </div>
      )}
    </div>
  );
};

export default AdminComingSoonPage;
