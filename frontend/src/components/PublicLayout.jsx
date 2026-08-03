import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Toaster } from 'sonner';

const PublicLayout = () => {
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
