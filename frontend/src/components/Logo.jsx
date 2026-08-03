import { useSite } from '@/context/SiteContext';

export const Logo = ({ className = '', asImage = true, size = 44 }) => {
  const { site } = useSite();
  const logoUrl = site?.logo_url;
  if (asImage && logoUrl) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={logoUrl}
          alt="swell design + media"
          style={{ height: size, width: 'auto' }}
          className="object-contain"
        />
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
