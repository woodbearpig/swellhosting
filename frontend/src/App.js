import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';

import PublicLayout from '@/components/PublicLayout';
import { SiteProvider } from '@/context/SiteContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { PaletteProvider } from '@/context/PaletteContext';
import { FontProvider } from '@/context/FontContext';

import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import ServiceDetailPage from '@/pages/ServiceDetailPage';
import GalleryPage from '@/pages/GalleryPage';
import ContactPage from '@/pages/ContactPage';
import InquiryWizardPage from '@/pages/InquiryWizardPage';
import { AboutPage, TestimonialsPage, FAQPage, BlogListPage, BlogDetailPage } from '@/pages/StaticPages';
import { BackdropsPage, LeaveReviewPage } from '@/pages/BackdropsAndReviews';
import { NotFoundPage, PrivacyPage, TermsPage } from '@/pages/UtilityPages';

import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import { AdminInquiriesList, AdminInquiryDetail } from '@/pages/admin/AdminInquiries';
import { AdminClientsList, AdminClientDetail } from '@/pages/admin/AdminClients';
import AdminConsultations from '@/pages/admin/AdminConsultations';
import AdminServices from '@/pages/admin/AdminServices';
import AdminGallery from '@/pages/admin/AdminGallery';
import AdminTestimonials from '@/pages/admin/AdminTestimonials';
import AdminBackdrops from '@/pages/admin/AdminBackdrops';
import AdminFAQs from '@/pages/admin/AdminFAQs';
import AdminBlog from '@/pages/admin/AdminBlog';
import AdminHomePage from '@/pages/admin/site/AdminHomePage';
import AdminBrandPage from '@/pages/admin/site/AdminBrandPage';
import AdminAboutPage from '@/pages/admin/site/AdminAboutPage';
import AdminHeaderNavPage from '@/pages/admin/site/AdminHeaderNavPage';
import AdminFooterPage from '@/pages/admin/site/AdminFooterPage';
import AdminSocialContactPage from '@/pages/admin/site/AdminSocialContactPage';
import AdminComingSoonPage from '@/pages/admin/site/AdminComingSoonPage';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminIntegrations from '@/pages/admin/AdminIntegrations';
import AdminPalettes from '@/pages/admin/AdminPalettes';
import AdminInquiryForm from '@/pages/admin/AdminInquiryForm';
import AdminMedia from '@/pages/admin/AdminMedia';
import AdminLegalPages from '@/pages/admin/AdminLegalPages';
import { useSite } from '@/context/SiteContext';

/**
 * ServicesGuard — wraps the /services and /services/:slug routes so that
 * they redirect to the home page when the owner has disabled the Services
 * page globally in Admin → Home page → Section visibility. Keeps their config
 * intact; flipping the toggle back on immediately restores the URLs.
 */
const ServicesGuard = ({ children }) => {
  const { site } = useSite();
  if (site && site.services_page_active === false) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * BlogGuard — same pattern for the /blog and /blog/:slug routes. Off by
 * default because most owners either don't blog at all or use their IG feed
 * as their "blog". Flipping `blog_page_active` on brings back the routes,
 * header nav item, and footer link automatically.
 */
const BlogGuard = ({ children }) => {
  const { site } = useSite();
  if (site && site.blog_page_active === false) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * FaqGuard — same pattern for /faq. Off by default; the client will populate
 * Q&As when she's ready. Homepage FAQ preview section is governed separately.
 */
const FaqGuard = ({ children }) => {
  const { site } = useSite();
  if (site && site.faq_page_active === false) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteProvider>
          <PaletteProvider>
          <FontProvider>
          <div className="App">
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/services" element={<ServicesGuard><ServicesPage /></ServicesGuard>} />
                  <Route path="/services/:slug" element={<ServicesGuard><ServiceDetailPage /></ServicesGuard>} />
                  <Route path="/portfolio" element={<GalleryPage />} />
                  <Route path="/gallery" element={<Navigate to="/portfolio" replace />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/testimonials" element={<TestimonialsPage />} />
                  <Route path="/leave-a-review" element={<LeaveReviewPage />} />
                  <Route path="/backdrops" element={<BackdropsPage />} />
                  <Route path="/faq" element={<FaqGuard><FAQPage /></FaqGuard>} />
                  <Route path="/blog" element={<BlogGuard><BlogListPage /></BlogGuard>} />
                  <Route path="/blog/:slug" element={<BlogGuard><BlogDetailPage /></BlogGuard>} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/inquire" element={<InquiryWizardPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="inquiries" element={<AdminInquiriesList />} />
                  <Route path="inquiries/:id" element={<AdminInquiryDetail />} />
                  <Route path="clients" element={<AdminClientsList />} />
                  <Route path="clients/:id" element={<AdminClientDetail />} />
                  <Route path="consultations" element={<AdminConsultations />} />
                  <Route path="services" element={<AdminServices />} />
                  <Route path="backdrops" element={<AdminBackdrops />} />
                  <Route path="portfolio" element={<AdminGallery />} />
                  <Route path="gallery" element={<Navigate to="/admin/portfolio" replace />} />
                  <Route path="testimonials" element={<AdminTestimonials />} />
                  <Route path="faqs" element={<AdminFAQs />} />
                  <Route path="blog" element={<AdminBlog />} />
                  {/* Split site content pages (formerly /admin/site-content) */}
                  <Route path="home" element={<AdminHomePage />} />
                  <Route path="brand" element={<AdminBrandPage />} />
                  <Route path="about" element={<AdminAboutPage />} />
                  <Route path="nav" element={<AdminHeaderNavPage />} />
                  <Route path="footer" element={<AdminFooterPage />} />
                  <Route path="social-contact" element={<AdminSocialContactPage />} />
                  <Route path="coming-soon" element={<AdminComingSoonPage />} />
                  {/* Back-compat: old /admin/site-content redirects to /admin/home */}
                  <Route path="site-content" element={<Navigate to="/admin/home" replace />} />
                  <Route path="inquiry-form" element={<AdminInquiryForm />} />
                  <Route path="media" element={<AdminMedia />} />
                  <Route path="legal" element={<AdminLegalPages />} />
                  <Route path="palettes" element={<AdminPalettes />} />
                  <Route path="integrations" element={<AdminIntegrations />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </div>
          </FontProvider>
          </PaletteProvider>
        </SiteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
