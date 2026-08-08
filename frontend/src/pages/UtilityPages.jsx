import { Link } from 'react-router-dom';
import { useSite } from '@/context/SiteContext';

export const NotFoundPage = () => (
  <div className="container-narrow py-24 text-center" data-testid="notfound-page">
    <p className="font-script text-5xl text-[color:var(--brand-sage-deep)]">oh no</p>
    <h1 className="font-serif text-4xl mt-2">We couldn't find that page.</h1>
    <p className="text-[color:var(--brand-text-muted)] mt-3">The link may be broken, or the page may have moved.</p>
    <div className="mt-6 flex items-center justify-center gap-3"><Link to="/" className="btn-primary">Back home</Link><Link to="/portfolio" className="btn-secondary">Browse the gallery</Link></div>
  </div>
);

/**
 * renderLegalBody — tiny markdown-lite renderer used by the Terms & Privacy
 * pages so the owner can format legal copy without writing HTML. Supported:
 *   - Blank lines separate paragraphs
 *   - Lines starting with "- " become bullet list items (grouped into one <ul>)
 *   - **bold** spans inside a line render bold
 * Anything more complex (tables, links) should be added on request; for
 * standard event-business legal pages this covers 95% of cases.
 */
const renderBoldSpans = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={i} className="text-[color:var(--brand-text)] font-medium">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
};

const LegalBody = ({ body }) => {
  if (!body) return null;
  const lines = String(body).split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  let bullets = [];
  const flushParagraph = () => {
    if (buffer.length) { blocks.push({ type: 'p', lines: buffer.slice() }); buffer = []; }
  };
  const flushBullets = () => {
    if (bullets.length) { blocks.push({ type: 'ul', items: bullets.slice() }); bullets = []; }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/,'');
    if (line.trim() === '') { flushParagraph(); flushBullets(); continue; }
    if (/^\s*-\s+/.test(line)) {
      flushParagraph();
      bullets.push(line.replace(/^\s*-\s+/, ''));
    } else {
      flushBullets();
      buffer.push(line);
    }
  }
  flushParagraph();
  flushBullets();

  return (
    <div className="prose max-w-none mt-8 space-y-5 text-[color:var(--brand-text-muted)] leading-relaxed" data-testid="legal-body">
      {blocks.map((b, i) => {
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-6 space-y-1.5">
              {b.items.map((it, j) => <li key={j}>{renderBoldSpans(it)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{b.lines.map((ln, j) => (<span key={j}>{renderBoldSpans(ln)}{j < b.lines.length - 1 ? <br /> : null}</span>))}</p>;
      })}
    </div>
  );
};

const LegalPage = ({ eyebrow, title, body, updated, testId }) => (
  <div className="container-narrow py-14 sm:py-20 max-w-3xl mx-auto" data-testid={testId}>
    {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
    <h1 className="font-serif text-4xl sm:text-5xl">{title}</h1>
    {updated && <p className="text-xs text-[color:var(--brand-text-muted)] mt-2 italic">{updated}</p>}
    <LegalBody body={body} />
  </div>
);

export const PrivacyPage = () => {
  const { site } = useSite();
  return (
    <LegalPage
      testId="privacy-page"
      eyebrow={site?.privacy_page_eyebrow}
      title={site?.privacy_page_title || 'Privacy Policy'}
      updated={site?.privacy_page_updated_at}
      body={site?.privacy_page_body}
    />
  );
};

export const TermsPage = () => {
  const { site } = useSite();
  return (
    <LegalPage
      testId="terms-page"
      eyebrow={site?.terms_page_eyebrow}
      title={site?.terms_page_title || 'Terms + Conditions'}
      updated={site?.terms_page_updated_at}
      body={site?.terms_page_body}
    />
  );
};
