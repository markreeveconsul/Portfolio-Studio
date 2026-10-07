import type { Portfolio } from './model';
import { PortfolioContact } from './PortfolioContact';
import { ProfessionalPortfolio } from './ProfessionalPortfolio';
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
  if (portfolio.template === 'resume' || portfolio.template === 'showcase')
    return <ProfessionalPortfolio portfolio={portfolio} photos={photos} />;
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
