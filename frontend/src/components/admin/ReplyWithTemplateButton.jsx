import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mail, ChevronDown, X, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

/**
 * ReplyWithTemplateButton — dropdown of pre-written reply templates. On selection,
 * substitutes placeholders using the given inquiry, then opens a pre-filled Gmail
 * compose window in a new tab. The owner sends from within Gmail (preserving her
 * "Send as info@" identity + threading).
 *
 * Placeholders supported:
 *   {client_name}, {first_name}, {event_type}, {event_date}, {guest_count},
 *   {venue}, {business_name}
 *
 * Props:
 *   inquiry: the full Inquiry document (needs at least client_email; client_name recommended)
 *   size: 'default' | 'sm' — controls button size (sm for inquiries list rows)
 *   testId: base test id prefix
 */
export const ReplyWithTemplateButton = ({ inquiry, size = 'default', testId = 'reply-with-template' }) => {
  const { site } = useSite();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (templates !== null) return;
    setLoading(true);
    try {
      const { data } = await api.get('/admin/reply-templates');
      setTemplates(data || []);
    } catch (e) {
      toast.error('Could not load reply templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const substitute = (text, inq) => {
    if (!text) return '';
    const fullName = (inq.client_name || '').trim();
    const firstName = fullName.split(/\s+/)[0] || 'there';
    const map = {
      client_name: fullName || 'there',
      first_name: firstName,
      event_type: (inq.event_type || 'event').replace(/_/g, ' '),
      event_date: inq.event_date || '[the event date]',
      guest_count: inq.guest_count ? String(inq.guest_count) : '[guest count]',
      venue: inq.venue_name || '[the venue]',
      business_name: site?.business_name || 'swell design + media',
    };
    return text.replace(/\{(\w+)\}/g, (m, key) => (map[key] !== undefined ? map[key] : m));
  };

  const composeInGmail = (tpl) => {
    if (!inquiry?.client_email) {
      toast.error("This inquiry has no email address — can't compose a reply.");
      return;
    }
    const to = inquiry.client_email;
    const subject = substitute(tpl.subject, inquiry);
    const body = substitute(tpl.body, inquiry);
    // Gmail compose URL — opens in a new tab, pre-filled. She can pick the info@ sender
    // in Gmail's From dropdown (once she's completed the "Send as info@" setup).
    const url = 'https://mail.google.com/mail/?view=cm&fs=1'
      + `&to=${encodeURIComponent(to)}`
      + `&su=${encodeURIComponent(subject)}`
      + `&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const btnClass = size === 'sm'
    ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] hover:bg-[color:var(--brand-sage-deep)] hover:text-white transition-colors'
    : 'btn-secondary';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); load(); setOpen(v => !v); }}
        className={btnClass}
        data-testid={testId}
        title="Reply with a saved template — opens Gmail with the email pre-filled"
      >
        <Mail className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        {size === 'sm' ? 'Reply' : 'Reply with…'}
        <ChevronDown className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-cream)] shadow-lg overflow-hidden"
            data-testid={`${testId}-menu`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)]">
              <p className="text-xs uppercase tracking-wider text-[color:var(--brand-text-muted)]">Reply templates</p>
              <button onClick={() => setOpen(false)} className="text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)]"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && <p className="p-4 text-sm text-[color:var(--brand-text-muted)] italic">Loading…</p>}
              {!loading && (templates?.length ?? 0) === 0 && (
                <p className="p-4 text-sm text-[color:var(--brand-text-muted)] italic">
                  No templates yet. Create some in <b>Settings → Reply templates</b>.
                </p>
              )}
              {!loading && templates?.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => composeInGmail(tpl)}
                  className="w-full text-left px-3 py-3 hover:bg-[color:var(--brand-sage-tint)] border-b border-[color:var(--brand-border)] last:border-b-0 transition-colors"
                  data-testid={`${testId}-item-${tpl.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tpl.name}</p>
                      <p className="text-xs text-[color:var(--brand-text-muted)] truncate mt-0.5">{tpl.subject}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[color:var(--brand-text-muted)]" />
                  </div>
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)] text-[10px] text-[color:var(--brand-text-muted)] flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Opens Gmail with your reply pre-filled
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReplyWithTemplateButton;
