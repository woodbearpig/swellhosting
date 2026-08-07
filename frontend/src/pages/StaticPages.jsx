import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/SectionEyebrow';
import { useSite } from '@/context/SiteContext';

export const AboutPage = () => {
  const { site } = useSite();
  const showImage = site?.about_show_image !== false;
  const showDesigner = site?.about_show_designer !== false;
  const showCtas = site?.about_show_ctas !== false;
  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="about-page">
      <SectionHeader eyebrow="ABOUT" title="About swell design + media" subtitle="A boutique LA-based studio dedicated to thoughtful, custom event styling." />
      <div className={`mt-10 grid grid-cols-1 gap-10 items-center ${showImage ? 'lg:grid-cols-2' : ''}`}>
        {showImage && (
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-[2rem] overflow-hidden aspect-[4/5] bg-[color:var(--brand-surface-2)] lift-shadow" data-testid="about-image-block">
          <img src={site?.about_image_url} alt="About swell design + media" className="h-full w-full object-cover" />
        </motion.div>
        )}
        <div>
          <p className="font-script text-4xl text-[color:var(--brand-sage-deep)] mb-2">a warm welcome</p>
          <p className="text-base sm:text-lg text-[color:var(--brand-text-muted)] leading-relaxed">{site?.about_full}</p>
          {showDesigner && (
            <div data-testid="about-designer-block">
              <p className="font-serif text-2xl mt-8">{site?.designer_name}</p>
              <p className="text-base text-[color:var(--brand-text-muted)] mt-2 leading-relaxed">{site?.designer_bio}</p>
            </div>
          )}
          {showCtas && (
            <div className="mt-6 flex flex-wrap gap-3" data-testid="about-ctas-block">
              <Link to="/inquire" className="btn-primary">Start your inquiry</Link>
              <Link to="/gallery" className="btn-secondary">See the work</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TestimonialsPage = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/testimonials').then(r => setItems(r.data)); }, []);
  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="testimonials-page">
      <SectionHeader eyebrow="TESTIMONIALS" title="What people are saying" subtitle="A few kind notes from clients we're grateful to have styled for." />
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((t) => (
          <motion.figure key={t.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-cream p-6" data-testid="testimonial-card">
            <div className="flex items-center gap-1 text-[color:var(--brand-gold)] mb-2">
              {Array.from({ length: t.rating }).map((_, i) => (<Star key={i} className="h-4 w-4" fill="currentColor" />))}
            </div>
            <blockquote className="font-serif text-lg leading-snug italic">“{t.quote}”</blockquote>
            <figcaption className="mt-4 text-sm"><span className="font-medium">{t.name}</span>{t.event_type && (<span className="text-[color:var(--brand-text-muted)]"> · {t.event_type}</span>)}</figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
};

export const FAQPage = () => {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  useEffect(() => { api.get('/faqs').then(r => setItems(r.data)); }, []);

  const categories = Array.from(new Set(items.map(i => i.category || 'General')));

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="faq-page">
      <SectionHeader eyebrow="FAQ" title="Frequently asked" subtitle="Everything you might want to know before we chat." />
      <div className="mt-10 space-y-10">
        {categories.map((c) => (
          <div key={c}>
            <p className="eyebrow mb-3">{c}</p>
            <div className="divide-y divide-[color:var(--brand-border)] card-cream">
              {items.filter(i => (i.category || 'General') === c).map((f) => (
                <button key={f.id} onClick={() => setOpenId(openId === f.id ? null : f.id)} className="w-full text-left px-5 py-4 hover:bg-[color:var(--brand-surface-2)]/50" data-testid={`faq-item-${f.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-lg">{f.question}</p>
                    <span className="text-2xl leading-none text-[color:var(--brand-sage-deep)]">{openId === f.id ? '–' : '+'}</span>
                  </div>
                  {openId === f.id && <p className="text-sm text-[color:var(--brand-text-muted)] mt-3 leading-relaxed">{f.answer}</p>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get('/blog').then(r => setPosts(r.data)); }, []);
  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="blog-list-page">
      <SectionHeader eyebrow="JOURNAL" title="Notes from the studio" subtitle="Styling tips, planning stories, and inspiration." />
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p, i) => (
          <motion.article key={p.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <Link to={`/blog/${p.slug}`} className="group block card-cream overflow-hidden" data-testid={`blog-card-${p.slug}`}>
              <div className="aspect-[4/3] overflow-hidden bg-[color:var(--brand-surface-2)]">
                <img src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-5">
                <p className="font-serif text-xl leading-tight">{p.title}</p>
                <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 line-clamp-2">{p.excerpt}</p>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </div>
  );
};

import { useParams } from 'react-router-dom';
export const BlogDetailPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => { api.get(`/blog/${slug}`).then(r => setPost(r.data)).catch(() => setNotFound(true)); }, [slug]);
  if (notFound) return <div className="container-narrow py-20 text-center"><h1 className="font-serif text-3xl">Post not found</h1></div>;
  if (!post) return <div className="container-narrow py-20">Loading…</div>;
  return (
    <article className="container-narrow py-14 sm:py-20 max-w-3xl mx-auto" data-testid="blog-detail-page">
      <p className="eyebrow mb-3">JOURNAL</p>
      <h1 className="font-serif text-4xl sm:text-5xl leading-[1.05]">{post.title}</h1>
      <p className="text-[color:var(--brand-text-muted)] mt-3">{post.excerpt}</p>
      {post.cover_image_url && (
        <div className="rounded-[2rem] overflow-hidden aspect-[16/9] my-8 bg-[color:var(--brand-surface-2)]">
          <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}
      {/* Content: if it looks like HTML (contains a tag), render as HTML; else render preserving newlines. */}
      {/^\s*<(p|h[1-6]|ul|ol|blockquote|img|figure|hr|div)/i.test(post.content || '') ? (
        <div
          className="tiptap-content prose max-w-none text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />
      ) : (
        <div className="prose max-w-none text-base leading-relaxed whitespace-pre-line">{post.content}</div>
      )}
    </article>
  );
};
