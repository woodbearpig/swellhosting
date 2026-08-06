import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import AdminFAQs from '@/pages/admin/AdminFAQs';
import AdminBlog from '@/pages/admin/AdminBlog';
import AdminSiteContent from '@/pages/admin/AdminSiteContent';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminIntegrations from '@/pages/admin/AdminIntegrations';
import AdminPalettes from '@/pages/admin/AdminPalettes';
import AdminInquiryForm from '@/pages/admin/AdminInquiryForm';
import AdminMedia from '@/pages/admin/AdminMedia';

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
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/services/:slug" element={<ServiceDetailPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/testimonials" element={<TestimonialsPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:slug" element={<BlogDetailPage />} />
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
                  <Route path="gallery" element={<AdminGallery />} />
                  <Route path="testimonials" element={<AdminTestimonials />} />
                  <Route path="faqs" element={<AdminFAQs />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="site-content" element={<AdminSiteContent />} />
                  <Route path="inquiry-form" element={<AdminInquiryForm />} />
                  <Route path="media" element={<AdminMedia />} />
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
