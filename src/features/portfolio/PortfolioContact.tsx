import type { Portfolio } from './model';
import { safeWebUrl } from './model';
export function PortfolioContact({ portfolio }: { portfolio: Portfolio }) {
  if (!portfolio.email && !portfolio.contact_number && !portfolio.social_links.length) return null;
  return (
    <section className="portfolio-section">
      <h3>Get in touch</h3>
      <dl className="portfolio-contact">
        {portfolio.email && (
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${encodeURIComponent(portfolio.email)}`}>{portfolio.email}</a>
            </dd>
          </div>
        )}
        {portfolio.contact_number && (
          <div>
            <dt>Phone</dt>
            <dd>{portfolio.contact_number}</dd>
          </div>
        )}
        {portfolio.social_links.map((link, index) => (
          <div key={index}>
            <dt>{link.label}</dt>
            <dd>
              {safeWebUrl(link.url) ? (
                <a href={safeWebUrl(link.url)!} target="_blank" rel="noopener noreferrer">
                  {link.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                'Link unavailable'
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
