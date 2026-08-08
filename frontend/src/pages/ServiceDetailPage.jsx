import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const ServiceDetailPage = () => {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/services/${slug}`).then(r => setService(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return (
    <div className="container-narrow py-24 text-center">
      <h1 className="font-serif text-3xl">Service not found</h1>
      <Link to="/services" className="btn-secondary mt-6 inline-flex">View all services</Link>
    </div>
  );
  if (!service) return <div className="container-narrow py-24">Loading…</div>;

  return (
    <div data-testid="service-detail-page">
      <section className="relative overflow-hidden">
        <div className="hero-wash absolute inset-0 -z-10" aria-hidden />
        <div className="container-narrow pt-14 pb-10 lg:pt-20 lg:pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="eyebrow mb-3">SERVICE</div>
            <h1 className="font-serif text-4xl lg:text-5xl leading-[1.05]">{service.title}</h1>
            <p className="font-script text-2xl text-[color:var(--brand-rose)] mt-2">{service.subtitle}</p>
            <p className="text-base text-[color:var(--brand-text-muted)] mt-5 leading-relaxed max-w-lg">{service.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/inquire" className="btn-primary" data-testid="service-inquire-cta">Start an inquiry <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/inquire" className="btn-secondary">Start your inquiry</Link>
              {service.price_from && <span className="badge-soft">From {service.price_from}</span>}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }} className="rounded-[2rem] overflow-hidden aspect-[4/5] bg-[color:var(--brand-surface-2)] lift-shadow">
            <img src={service.hero_image_url} alt={service.title} className="h-full w-full object-cover" />
          </motion.div>
        </div>
      </section>

      {service.features?.length > 0 && (
        <section className="container-narrow py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {service.features.map((f) => (
              <div key={f} className="card-cream p-4 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-1 text-[color:var(--brand-sage-deep)]" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {service.packages?.length > 0 && (
        <section className="container-narrow py-10">
          <h2 className="font-serif text-3xl mb-6">Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {service.packages.map((p) => (
              <div key={p.id || p.name} className="card-cream p-6 flex flex-col">
                <p className="font-serif text-2xl">{p.name}</p>
                {p.price_from && <p className="text-sm text-[color:var(--brand-sage-deep)] font-medium mt-1">From {p.price_from}</p>}
                <p className="text-sm text-[color:var(--brand-text-muted)] mt-3 leading-relaxed">{p.description}</p>
                {p.features?.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm">
                    {p.features.map((ft) => (
                      <li key={ft} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[color:var(--brand-sage-deep)]" /> {ft}</li>
                    ))}
                  </ul>
                )}
                <Link to="/inquire" className="btn-primary mt-6 self-start">Inquire</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {service.images?.length > 0 && (
        <section className="container-narrow py-10">
          <h2 className="font-serif text-3xl mb-6">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {service.images.map((src, i) => (
              <div key={i} className="gallery-image aspect-square"><img src={src} alt={service.title} className="h-full w-full object-cover" /></div>
            ))}
          </div>
        </section>
      )}

      {service.faqs?.length > 0 && (
        <section className="container-narrow py-10">
          <h2 className="font-serif text-3xl mb-6">Good to know</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.faqs.map((f) => (
              <div key={f.id || f.question} className="card-cream p-5">
                <p className="font-serif text-lg">{f.question}</p>
                <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-narrow py-16 text-center">
        <h2 className="font-serif text-3xl">Let's plan yours.</h2>
        <p className="text-[color:var(--brand-text-muted)] max-w-xl mx-auto mt-3">Share your vision in a quick smart inquiry — we'll get back to you within 1–2 business days.</p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/inquire" className="btn-primary">Start your inquiry</Link>
          <Link to="/portfolio" className="btn-secondary">See the gallery</Link>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetailPage;
