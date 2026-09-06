import { useSite } from '@/context/SiteContext';

/**
 * Logo — renders the brand as either an uploaded image (if `logo_url` is set)
 * or the text wordmark fallback ("swell design + media").
 *
 * `responsive` (used in the public Header/Footer) makes the wordmark grow
 * gracefully from mobile → desktop via clamp(), and honors the admin-set
 * `logo_text_scale` multiplier. Because it's real text, it stays perfectly
 * crisp at any size. Other placements (admin, coming-soon) keep a fixed size.
 */
export const Logo = ({ className = '', asImage = true, size = 44, responsive = false }) => {
  const { site } = useSite();
  const logoUrl = site?.logo_url;
  const scale = Math.max(0.6, Math.min(2.5, Number(site?.logo_text_scale) || 1));

  if (asImage && logoUrl) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={logoUrl}
          alt="swell design + media"
          style={{ height: responsive ? size * scale : size, width: 'auto' }}
          className="object-contain"
        />
      </div>
    );
  }

  if (responsive) {
    // Mobile stays at the original size (clamp min); desktop scales up.
    // The admin `logo_text_scale` multiplies the whole thing.
    const swellSize = `calc(${scale} * clamp(1.875rem, 1.05rem + 1.7vw, 3rem))`;
    const subSize = `calc(${scale} * clamp(0.85rem, 0.62rem + 0.45vw, 1.15rem))`;
    return (
      <div className={`flex items-baseline gap-1.5 ${className}`}>
        <span className="font-script leading-none text-[color:var(--brand-sage-deep)]" style={{ fontSize: swellSize }}>swell</span>
        <span className="font-serif tracking-wide text-[color:var(--brand-text-muted)]" style={{ fontSize: subSize }}>design + media</span>
      </div>
    );
  }

  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span className="font-script text-3xl leading-none text-[color:var(--brand-sage-deep)]">swell</span>
      <span className="font-serif text-sm tracking-wide text-[color:var(--brand-text-muted)]">design + media</span>
    </div>
  );
};
