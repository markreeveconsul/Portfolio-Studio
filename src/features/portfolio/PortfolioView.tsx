import type { Portfolio } from './model';
import { safeWebUrl } from './model';
import type { PhotoService } from './photos';
import { PrivatePhoto } from './PrivatePhoto';
import { SimplePortfolio } from './SimplePortfolio';
import { PortfolioSections } from './PortfolioSections';

export function PortfolioView({
  portfolio,
  photos,
}: {
  portfolio: Portfolio;
  photos?: PhotoService;
}) {
  if (portfolio.template !== 'modern' && portfolio.template !== 'creative')
    return <SimplePortfolio portfolio={portfolio} photos={photos} />;
  const modern = portfolio.template === 'modern';
  const identity = (
    <header className="portfolio-intro">
      <PrivatePhoto path={portfolio.photo_path} name={portfolio.full_name} service={photos} />
      <h2>{portfolio.full_name}</h2>
      {portfolio.address && <p className="portfolio-location">{portfolio.address}</p>}
    </header>
  );
  const about = portfolio.about_me && (
    <section className="portfolio-section">
      <h3>About me</h3>
      <p className="preserve-lines">{portfolio.about_me}</p>
    </section>
  );
  return (
    <article
      className={`real-portfolio portfolio-${portfolio.template}`}
      aria-label={`${portfolio.full_name}'s portfolio`}
    >
      <div className="portfolio-masthead">
        <span>PERSONAL PORTFOLIO</span>
        <span>{portfolio.template.toUpperCase()}</span>
      </div>
      {modern ? (
        <div className="modern-columns">
          <aside className="modern-sidebar">
            {identity}
            <PortfolioContact portfolio={portfolio} />
            <PortfolioSections portfolio={portfolio} only={['skills']} />
          </aside>
          <div className="modern-main">
            {about}
            <PortfolioSections
              portfolio={portfolio}
              only={['education', 'projects', 'experience']}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="creative-introduction">
            {identity}
            {about}
          </div>
          <PortfolioSections portfolio={portfolio} only={['projects']} />
          <div className="creative-details">
            <div>
              <PortfolioSections portfolio={portfolio} only={['experience', 'education']} />
            </div>
            <div>
              <PortfolioSections portfolio={portfolio} only={['skills']} />
              <PortfolioContact portfolio={portfolio} />
            </div>
          </div>
        </>
      )}
    </article>
  );
}
function PortfolioContact({ portfolio }: { portfolio: Portfolio }) {
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
