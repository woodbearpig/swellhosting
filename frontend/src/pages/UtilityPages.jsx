import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="container-narrow py-24 text-center" data-testid="notfound-page">
    <p className="font-script text-5xl text-[color:var(--brand-sage-deep)]">oh no</p>
    <h1 className="font-serif text-4xl mt-2">We couldn't find that page.</h1>
    <p className="text-[color:var(--brand-text-muted)] mt-3">The link may be broken, or the page may have moved.</p>
    <div className="mt-6 flex items-center justify-center gap-3"><Link to="/" className="btn-primary">Back home</Link><Link to="/gallery" className="btn-secondary">Browse the gallery</Link></div>
  </div>
);

export const PrivacyPage = () => (
  <div className="container-narrow py-14 sm:py-20 max-w-3xl mx-auto" data-testid="privacy-page">
    <h1 className="font-serif text-4xl">Privacy Policy</h1>
    <div className="prose max-w-none mt-6 space-y-4 text-[color:var(--brand-text-muted)] leading-relaxed">
      <p>swell design + media respects your privacy. We collect only the information you voluntarily provide through inquiries and consultations — your name, contact details, event details, and any inspiration you choose to share — in order to design a proposal and communicate with you about your event.</p>
      <p>We never sell your information. We may use it to reach out about your inquiry, send confirmations, and share seasonal offers if you opt in to our newsletter. You can request removal of your information at any time by emailing us.</p>
      <p>This policy may be updated periodically. For questions, please contact us.</p>
    </div>
  </div>
);

export const TermsPage = () => (
  <div className="container-narrow py-14 sm:py-20 max-w-3xl mx-auto" data-testid="terms-page">
    <h1 className="font-serif text-4xl">Terms of Service</h1>
    <div className="prose max-w-none mt-6 space-y-4 text-[color:var(--brand-text-muted)] leading-relaxed">
      <p>By submitting an inquiry or booking a consultation, you agree to the following: any proposals and quotes are valid for 14 days; a 50% non-refundable retainer is required to secure your event date; balance is due one week prior to your event; on-site changes and add-ons may be subject to additional fees.</p>
      <p>Balloon products are decor items and, while high quality, cannot be guaranteed to last indefinitely. Outdoor installations are subject to weather. We will always advise the best plan for your venue and conditions.</p>
      <p>For custom terms, please refer to your signed proposal.</p>
    </div>
  </div>
);
