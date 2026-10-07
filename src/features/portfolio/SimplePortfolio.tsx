import { PortfolioSections } from './PortfolioSections';
import { safeWebUrl } from './model';
import type { PortfolioDraft } from './model';
import { PrivatePhoto } from './PrivatePhoto';
import type { PhotoService } from './photos';

export function SimplePortfolio({
  portfolio,
  photos,
}: {
  portfolio: PortfolioDraft & { photo_path?: string | null };
  photos?: PhotoService;
}) {
  return (
    <article className="real-portfolio" aria-label={`${portfolio.full_name}'s portfolio`}>
      <div className="portfolio-masthead">
        <span>PERSONAL PORTFOLIO</span>
        <span>SIMPLE</span>
      </div>
      <header className="portfolio-intro">
        <PrivatePhoto path={portfolio.photo_path} name={portfolio.full_name} service={photos} />
        <h2>{portfolio.full_name}</h2>
        {portfolio.address && <p className="portfolio-location">{portfolio.address}</p>}
      </header>
      {portfolio.about_me && (
        <section className="portfolio-section">
          <h3>About me</h3>
          <p className="preserve-lines">{portfolio.about_me}</p>
        </section>
      )}
      <PortfolioSections portfolio={portfolio} />
      {(portfolio.email || portfolio.contact_number || portfolio.social_links.length > 0) && (
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
            {portfolio.social_links.map((link, index) => {
              const safe = safeWebUrl(link.url);
              return (
                <div key={`${index}-${link.label}`}>
                  <dt>{link.label}</dt>
                  <dd>
                    {safe ? (
                      <a href={safe} target="_blank" rel="noopener noreferrer">
                        {link.label} <span aria-hidden="true">↗</span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span>Link unavailable</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
    </article>
  );
}
