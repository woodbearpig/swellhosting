import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * TurnstileWidget — Cloudflare Turnstile (Managed mode) for public forms + login.
 *
 * Self-contained: it loads Cloudflare's script on demand, fetches the PUBLIC
 * site key from the backend (/api/public-config), and renders the widget. It
 * reports the verification token back up via `onToken`.
 *
 * Graceful disable: if Turnstile isn't configured on the backend, the widget
 * renders nothing and immediately calls onToken('__disabled__') so the parent
 * form is never blocked. Parents should treat a non-empty token (including the
 * '__disabled__' sentinel) as "ready", and send `null` to the API when disabled.
 *
 * Sentinel handling helper (use in parents):
 *   const tokenForApi = (t) => (t && t !== '__disabled__') ? t : null;
 */
export const DISABLED = '__disabled__';
export const tokenForApi = (t) => (t && t !== DISABLED ? t : null);

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let _configPromise = null;
function fetchTurnstileConfig() {
  if (!_configPromise) {
    _configPromise = api
      .get('/public-config')
      .then((r) => r.data)
      .catch(() => ({ turnstile_site_key: '', turnstile_enabled: false }));
  }
  return _configPromise;
}

function ensureScript() {
  if (typeof window === 'undefined') return;
  if (window.turnstile || document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.src = SCRIPT_SRC;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

export const TurnstileWidget = ({ onToken, action = 'inquiry', className = '' }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const settledRef = useRef(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [siteKey, setSiteKey] = useState('');

  // Wrap every token report so we know the widget has "settled" at least once.
  const report = (val) => {
    if (val) settledRef.current = true;
    onTokenRef.current && onTokenRef.current(val);
  };

  // 1) Resolve config once; disable gracefully when not configured.
  useEffect(() => {
    let mounted = true;
    fetchTurnstileConfig().then((cfg) => {
      if (!mounted) return;
      if (cfg && cfg.turnstile_site_key) {
        ensureScript();
        setSiteKey(cfg.turnstile_site_key);
      } else {
        report(DISABLED);
      }
    });
    return () => { mounted = false; };
  }, []);

  // 2) Render the widget once the script + key are ready.
  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    let pollId;

    const render = () => {
      if (cancelled || !containerRef.current) return;
      if (!window.turnstile) {
        pollId = window.setTimeout(render, 80);
        return;
      }
      if (widgetIdRef.current) return; // already rendered
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (token) => report(token),
          'expired-callback': () => report(''),
          'error-callback': () => report(''),
        });
      } catch (_) {
        /* no-op — leave form usable */
      }
    };

    render();

    // Availability safeguard: if the challenge never settles within 15s (script
    // blocked, Cloudflare outage, etc.), release the form rather than trapping
    // the user. The backend still verifies any real token that IS provided.
    const safety = window.setTimeout(() => {
      if (!settledRef.current) report(DISABLED);
    }, 15000);

    return () => {
      cancelled = true;
      if (pollId) window.clearTimeout(pollId);
      window.clearTimeout(safety);
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch (_) { /* no-op */ }
      widgetIdRef.current = null;
    };
  }, [siteKey, action]);

  if (!siteKey) return null;
  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
};

export default TurnstileWidget;
