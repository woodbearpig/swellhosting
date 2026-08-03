import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/SectionEyebrow';
import { useSite } from '@/context/SiteContext';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const { site } = useSite();
  const showHeader = site?.services_page_show_header !== false;
  const showGrid = site?.services_page_show_grid !== false;

  useEffect(() => { api.get('/services').then(r => setServices(r.data)); }, []);

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="services-page">
      {showHeader && (
        <SectionHeader eyebrow="OUR SERVICES" title="Custom event styling, made just for you" subtitle="Every service is designed and installed by our small in-house team. Explore what we offer, then reach out to build a package that fits your celebration." />
      )}
      {showGrid && (
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="services-grid">
        {services.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16,1,0.3,1] }}>
            <Link to={`/services/${s.slug}`} className="group grid grid-cols-1 sm:grid-cols-2 card-cream overflow-hidden" data-testid={`services-card-${s.slug}`}>
              <div className="aspect-[4/3] sm:aspect-auto sm:h-full overflow-hidden bg-[color:var(--brand-surface-2)]">
                <img src={s.hero_image_url} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-6 flex flex-col">
                <p className="font-serif text-2xl leading-tight">{s.title}</p>
                <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 leading-relaxed">{s.short_description || s.subtitle}</p>
                <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                  <span className="text-[color:var(--brand-sage-deep)] font-medium">{s.price_from ? `From ${s.price_from}` : 'Custom quote'}</span>
                  <span className="inline-flex items-center gap-1">View details <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
};

export default ServicesPage;
