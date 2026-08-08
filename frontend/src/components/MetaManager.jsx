import { useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { publicUrl } from '@/lib/api';

/**
 * MetaManager — keeps <title>, favicon, and social-share meta tags in sync
 * with the admin-managed SiteContent. Runs whenever `site` changes.
 *
 * This is the single source of truth for how the site presents itself to
 * search engines and social platforms. Everything is admin-editable via
 * the "Share preview" section under Admin → About page.
 *
 * The static defaults live in /app/frontend/public/index.html so the site
 * still looks presentable on first paint (before React hydrates).
 */

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setIcon = (rel, href, sizes) => {
  if (!href) return;
  // Remove existing link with the same rel + sizes combination so browsers
  // reload the icon. We keep this narrow — we don't want to nuke the
  // stylesheet <link>s.
  const existing = document.head.querySelectorAll(`link[rel="${rel}"]`);
  existing.forEach(el => el.remove());
  const el = document.createElement('link');
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
  if (sizes) el.setAttribute('sizes', sizes);
  document.head.appendChild(el);
};

const MetaManager = () => {
  const { site } = useSite();

  useEffect(() => {
    if (!site) return;

    const brand   = (site.business_name || 'swell design + media').trim();
    const tagline = (site.tagline || '').trim();

    // ------- <title> -------
    const shareTitle = (site.share_title || '').trim() || `${brand}${tagline ? ' — ' + tagline : ''}`;
    if (document.title !== shareTitle) document.title = shareTitle;

    // ------- description -------
    const shareDesc = (site.share_description || '').trim() || tagline;
    upsertMeta('name', 'description', shareDesc);

    // ------- Open Graph -------
    const ogImage = site.share_image_url ? publicUrl(site.share_image_url) : '/og-default.jpg';
    upsertMeta('property', 'og:type',        'website');
    upsertMeta('property', 'og:site_name',   brand);
    upsertMeta('property', 'og:title',       shareTitle);
    upsertMeta('property', 'og:description', shareDesc);
    upsertMeta('property', 'og:image',       ogImage);

    // ------- Twitter card -------
    upsertMeta('name', 'twitter:card',        'summary_large_image');
    upsertMeta('name', 'twitter:title',       shareTitle);
    upsertMeta('name', 'twitter:description', shareDesc);
    upsertMeta('name', 'twitter:image',       ogImage);
    if (site.share_twitter_handle) {
      upsertMeta('name', 'twitter:site',    site.share_twitter_handle);
      upsertMeta('name', 'twitter:creator', site.share_twitter_handle);
    }

    // ------- Favicon override (if admin uploaded one) -------
    if (site.favicon_url) {
      const url = publicUrl(site.favicon_url);
      setIcon('icon', url, 'any');
      setIcon('apple-touch-icon', url, '180x180');
    }
  }, [site]);

  return null;
};

export default MetaManager;
