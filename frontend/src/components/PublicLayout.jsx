import { useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Toaster, toast } from 'sonner';
import { useSite } from '@/context/SiteContext';
import ComingSoonPage from '@/pages/ComingSoonPage';
import ScrollToTop from '@/components/ScrollToTop';
import { Eye } from 'lucide-react';
import { api } from '@/lib/api';

const PREVIEW_STORAGE_KEY = 'sw_preview_ok';

/**
 * Neutral cream splash shown before the site content JSON is loaded.
 * This eliminates the "flash of full site" that briefly appeared before
 * a Coming Soon mode swap on slow connections. No logo/text — just brand cream.
 */
const InitialSplash = () => (
  <div
    aria-hidden="true"
    data-testid="site-initial-splash"
    className="fixed inset-0 z-[9999] bg-[color:var(--brand-cream)] dark:bg-[color:#141312]"
  />
);

/**
 * Small floating pill shown on public pages when the viewer is authorized
 * via a preview token. Reminds them the public still sees Coming Soon and
 * gives them a quick way to exit preview.
 */
const PreviewBanner = () => {
  const exit = () => {
    try { sessionStorage.removeItem(PREVIEW_STORAGE_KEY); } catch (_) {}
    // Drop the ?preview=... from the URL, then reload.
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  };
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 rounded-full pl-4 pr-2 py-2 bg-[color:var(--brand-sage-deep)] text-[color:var(--brand-cream)] shadow-lg text-xs sm:text-sm"
      data-testid="preview-mode-banner"
    >
      <Eye className="h-4 w-4 shrink-0" />
      <span>Preview mode · the public still sees Coming Soon</span>
      <button
        onClick={exit}
        className="ml-1 h-7 px-3 rounded-full bg-white/15 hover:bg-white/25 transition-colors font-medium"
        data-testid="preview-mode-exit"
      >
        Exit preview
      </button>
    </div>
  );
};

const PublicLayout = () => {
  const { site } = useSite();
  const [searchParams] = useSearchParams();
  // `null`  = not checked yet
  // `true`  = has valid preview token
  // `false` = does not (default state)
  const [previewOk, setPreviewOk] = useState(() => {
    try { return sessionStorage.getItem(PREVIEW_STORAGE_KEY) === '1'; } catch (_) { return false; }
  });

  // If ?preview=<token> is present, validate it once against the backend.
  // On success we set a session flag so navigating between pages keeps
  // preview mode active without re-hitting the API. On failure we silently
  // drop it — the visitor just sees the normal Coming Soon page.
  useEffect(() => {
    const token = searchParams.get('preview');
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/preview/verify', { token });
        if (cancelled) return;
        if (res.data?.ok) {
          try { sessionStorage.setItem(PREVIEW_STORAGE_KEY, '1'); } catch (_) {}
          setPreviewOk(true);
        } else {
          toast.error('That preview link is expired or invalid.');
        }
      } catch (_) {
        // Silent — network error shouldn't reveal that preview exists.
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);

  // While site content is still loading, hold the render behind a neutral splash.
  if (site === null) {
    return <InitialSplash />;
  }

  // Coming Soon curtain — but ONLY if the viewer isn't in an authorized
  // preview session. Admin routes bypass this layout entirely.
  if (site?.coming_soon_active && !previewOk) {
    return (
      <div className="min-h-screen bg-[color:var(--brand-cream)] dark:bg-[color:#141312] text-[color:var(--brand-text)] dark:text-[color:#F4EFE8]">
        <ComingSoonPage />
        <Toaster position="top-center" richColors closeButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--brand-cream)] dark:bg-[color:#141312] text-[color:var(--brand-text)] dark:text-[color:#F4EFE8]">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-center" richColors closeButton />
      {site?.coming_soon_active && previewOk && <PreviewBanner />}
    </div>
  );
};

export default PublicLayout;
