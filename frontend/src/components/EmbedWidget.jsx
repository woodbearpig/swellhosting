import { useEffect, useMemo, useRef } from 'react';

/**
 * EmbedWidget — safely renders a raw third-party embed snippet (Elfsight,
 * POWr, Tagembed, Google Maps, etc.) from an admin-controlled string.
 *
 * WHY this component exists:
 *   React strips <script> tags when you use dangerouslySetInnerHTML, so
 *   pasting an Elfsight snippet raw would only render the empty <div>
 *   placeholder and never load the widget library. This component parses
 *   the snippet, hoists any <script src="…"> into the <head> exactly once
 *   (deduped across mounts / route changes), and renders the remaining
 *   HTML in-place so the widget library can find its target DOM node.
 *
 * Security posture:
 *   The snippet ships from the admin panel (authenticated). Anyone with
 *   admin access can already change the whole site, so raw HTML/JS from
 *   that source is treated as trusted. The admin UI includes a very
 *   visible "only paste from trusted sources" warning.
 */
export const EmbedWidget = ({ snippet, className = '' }) => {
  const containerRef = useRef(null);

  // Parse the snippet ONCE per snippet-string. We extract:
  //   • scriptSrcs — external <script src="…"> URLs (loaded via <head>)
  //   • inlineScripts — <script>…</script> bodies (executed via new Function)
  //   • html — everything else, ready for dangerouslySetInnerHTML
  const { scriptSrcs, inlineScripts, html } = useMemo(() => {
    const raw = (snippet || '').trim();
    if (!raw) return { scriptSrcs: [], inlineScripts: [], html: '' };

    const srcs = [];
    const inline = [];
    // Match every <script …>…</script> block (including self-closing / no-body).
    // Capture the opening tag + inner text so we can decide src vs inline.
    const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    const cleaned = raw.replace(scriptRe, (_full, attrs, body) => {
      const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs || '');
      if (srcMatch && srcMatch[1]) {
        srcs.push(srcMatch[1]);
      } else if (body && body.trim()) {
        inline.push(body);
      }
      // Strip the <script> tag from the visible HTML either way.
      return '';
    });

    return { scriptSrcs: srcs, inlineScripts: inline, html: cleaned.trim() };
  }, [snippet]);

  // Inject external scripts into <head>, deduped by src. We intentionally
  // never remove them on unmount — most widget libraries (Elfsight included)
  // patch themselves onto window/document and can't be safely re-loaded.
  useEffect(() => {
    if (!scriptSrcs.length) return;
    scriptSrcs.forEach((src) => {
      const already = document.querySelector(`script[data-embed-widget-src="${CSS.escape(src)}"]`);
      if (already) {
        // If the script already loaded, some widget libraries expose a
        // re-scan hook. Elfsight in particular reads new .elfsight-app-* divs
        // automatically via a MutationObserver, so we don't need to poke it.
        return;
      }
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.setAttribute('data-embed-widget-src', src);
      document.head.appendChild(el);
    });
  }, [scriptSrcs]);

  // Execute inline scripts (rare — most modern widgets use external src).
  // We do this AFTER the HTML has rendered so any DOM the script expects
  // is present. Wrapped in try/catch so a bad paste can't take down the page.
  useEffect(() => {
    if (!inlineScripts.length) return;
    // Small delay to let the injected HTML mount + external libs boot.
    const t = setTimeout(() => {
      inlineScripts.forEach((code) => {
        try {
          // eslint-disable-next-line no-new-func
          new Function(code)();
        } catch (e) {
          // Silent — this is admin-authored content, they'll see the
          // widget not appearing and can fix the paste.
          if (typeof console !== 'undefined') {
            console.warn('[EmbedWidget] inline script failed:', e?.message);
          }
        }
      });
    }, 50);
    return () => clearTimeout(t);
  }, [inlineScripts]);

  if (!html && !scriptSrcs.length && !inlineScripts.length) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="embed-widget"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * WidgetPlaceholder — friendly preview card shown when the widget section
 * is toggled ON but the admin hasn't pasted a real snippet yet. Lets the
 * owner (and their client) see WHERE the widget will appear before
 * committing to a provider.
 */
export const WidgetPlaceholder = ({ label = 'Widget will appear here' }) => (
  <div
    data-testid="embed-widget-placeholder"
    className="rounded-2xl border-2 border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)]/40 p-10 sm:p-14 text-center"
  >
    <p className="text-sm text-[color:var(--brand-text-muted)] mb-1">📘</p>
    <p className="font-serif text-lg text-[color:var(--brand-text)]">{label}</p>
    <p className="text-xs text-[color:var(--brand-text-muted)] mt-2 max-w-md mx-auto">
      Paste your embed snippet in the admin panel (Home → Facebook feed / widget) to replace this placeholder with the live widget.
    </p>
  </div>
);

export default EmbedWidget;
