import { useEffect, useState } from 'react';
import { Instagram, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

const extractHandle = (url) => {
  if (!url) return '';
  try {
    // Match /handle/ or /handle at the end of an Instagram URL
    const m = url.match(/instagram\.com\/([^/?#]+)/i);
    if (m && m[1]) return '@' + m[1];
  } catch { /* ignore */ }
  return '';
};

export const InstagramFeed = () => {
  const { site } = useSite();
  const [posts, setPosts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/instagram/feed').then(r => { setPosts(r.data || []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  // Admin can hide the whole section via toggle
  if (site?.home_instagram_active === false) return null;
  if (!loaded || posts.length === 0) return null;

  const eyebrow = site?.home_instagram_eyebrow || 'LATEST FROM INSTAGRAM';
  const title = site?.home_instagram_title || 'Follow along';
  const subtitle = site?.home_instagram_subtitle || '';
  const count = Math.max(6, Math.min(24, Number(site?.home_instagram_count) || 12));
  const igUrl = site?.instagram_url || 'https://instagram.com';
  const handle = extractHandle(site?.instagram_url) || '';

  return (
    <section className="container-narrow py-14 sm:py-18 lg:py-24" data-testid="home-instagram-feed">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2 flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> {eyebrow}</div>
          <h2 className="font-serif text-3xl sm:text-4xl leading-[1.1]">{title}</h2>
          {subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-2 max-w-xl">{subtitle}</p>}
        </div>
        <a href={igUrl} target="_blank" rel="noreferrer" className="btn-secondary self-start">
          <Instagram className="h-4 w-4" /> {handle || 'Instagram'} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {posts.slice(0, count).map((p) => (
          <a
            key={p.id}
            href={p.permalink || '#'}
            target="_blank"
            rel="noreferrer"
            className="gallery-image aspect-square block relative group"
            data-testid="instagram-post"
          >
            {p.media_type === 'VIDEO' ? (
              <>
                <img src={p.thumbnail_url || p.media_url} alt={p.caption?.slice(0, 60) || 'Instagram video'} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-[color:var(--brand-sage-deep)] border-y-[6px] border-y-transparent ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <img src={p.media_url} alt={p.caption?.slice(0, 60) || 'Instagram post'} className="h-full w-full object-cover" loading="lazy" />
            )}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity">
              <Instagram className="h-6 w-6 text-white" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
