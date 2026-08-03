import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Toaster } from 'sonner';
import { useSite } from '@/context/SiteContext';
import ComingSoonPage from '@/pages/ComingSoonPage';

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

const PublicLayout = () => {
  const { site } = useSite();

  // While site content is still loading, hold the render behind a neutral splash.
  // Prevents flashing the full public site for a split-second before Coming Soon mode swaps in.
  if (site === null) {
    return <InitialSplash />;
  }

  // If coming-soon is active, show only the coming-soon page for all public routes.
  // Admin routes bypass this layout entirely, so admin login still works.
  if (site?.coming_soon_active) {
    return (
      <div className="min-h-screen bg-[color:var(--brand-cream)] dark:bg-[color:#141312] text-[color:var(--brand-text)] dark:text-[color:#F4EFE8]">
        <ComingSoonPage />
        <Toaster position="top-center" richColors closeButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--brand-cream)] dark:bg-[color:#141312] text-[color:var(--brand-text)] dark:text-[color:#F4EFE8]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
};

export default PublicLayout;
