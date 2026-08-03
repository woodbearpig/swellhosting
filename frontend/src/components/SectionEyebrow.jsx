export const SectionEyebrow = ({ children, className = '' }) => (
  <span className={`eyebrow ${className}`}>{children}</span>
);

export const SectionHeader = ({ eyebrow, title, subtitle, align = 'left' }) => (
  <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
    {eyebrow && <div className="mb-3"><SectionEyebrow>{eyebrow}</SectionEyebrow></div>}
    <h2 className="font-serif text-3xl sm:text-4xl leading-[1.1] mb-3">{title}</h2>
    {subtitle && <p className="text-[color:var(--brand-text-muted)] text-base sm:text-lg leading-relaxed">{subtitle}</p>}
  </div>
);
