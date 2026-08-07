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
  const [activeTag, setActiveTag] = useState('all');

  useEffect(() => { api.get('/blog').then(r => setPosts(r.data)); }, []);

  // Collect unique, sorted tags across all posts
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).sort();

  const filtered = activeTag === 'all'
    ? posts
    : posts.filter(p => (p.tags || []).includes(activeTag));

  // Reorder so featured posts get first-position priority in the grid.
  // Non-featured tiles keep their date order after the featured ones.
  const ordered = [...filtered].sort((a, b) => {
    if (!!a.featured === !!b.featured) return 0;
    return a.featured ? -1 : 1;
  });

  return (
    <div className="py-14 sm:py-20" data-testid="blog-list-page">
      <div className="container-narrow">
        <SectionHeader eyebrow="BLOG" title="Notes from the studio" subtitle="Styling tips, planning stories, and inspiration." />

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2" data-testid="blog-tag-filters">
            <TagPill label="All" active={activeTag === 'all'} onClick={() => setActiveTag('all')} testId="blog-tag-all" />
            {allTags.map(t => (
              <TagPill key={t} label={t} active={activeTag === t} onClick={() => setActiveTag(t)} testId={`blog-tag-${t}`} />
            ))}
          </div>
        )}
      </div>

      {/* Instagram-style edge-to-edge grid */}
      <div className="mt-10 px-2 sm:px-6 lg:px-10">
        {ordered.length === 0 && (
          <p className="text-center text-[color:var(--brand-text-muted)] py-16">
            No posts yet{activeTag !== 'all' ? ` for "${activeTag}"` : ''}.
          </p>
        )}
        {ordered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 max-w-6xl mx-auto">
            {ordered.map((p, i) => (
              <BlogTile key={p.id} post={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TagPill = ({ label, active, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
      active
        ? 'bg-[color:var(--brand-sage-deep)] text-white'
        : 'bg-[color:var(--brand-surface-2)] text-[color:var(--brand-text)] hover:bg-[color:var(--brand-sage-tint)]'
    }`}
  >
    {label}
  </button>
);

const BlogTile = ({ post, index }) => (
  <motion.article
    initial={{ opacity: 0, scale: 0.98 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: Math.min(index * 0.03, 0.4) }}
    className={post.featured ? 'col-span-2 row-span-2' : ''}
  >
    <Link
      to={`/blog/${post.slug}`}
      className="group relative block aspect-square overflow-hidden bg-[color:var(--brand-surface-2)] rounded-sm sm:rounded-md"
      data-testid={`blog-tile-${post.slug}`}
    >
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt={post.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-[color:var(--brand-text-muted)] text-sm p-4 text-center font-serif">
          {post.title}
        </div>
      )}

      {/* Hover / focus overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 sm:p-5">
        <p className="font-serif text-white text-lg sm:text-xl leading-tight drop-shadow">
          {post.title}
        </p>
        {post.excerpt && (
          <p className="text-white/85 text-xs sm:text-sm mt-1 line-clamp-2">{post.excerpt}</p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {post.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] uppercase tracking-wider text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Featured badge (always visible on featured tiles) */}
      {post.featured && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
            <Star className="h-3 w-3 fill-white" /> Featured
          </span>
        </div>
      )}
    </Link>
  </motion.article>
);


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
      <p className="eyebrow mb-3">BLOG</p>
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
