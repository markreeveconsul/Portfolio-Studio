import type { Portfolio } from './model';
import type { PhotoService } from './photos';
import { PrivatePhoto } from './PrivatePhoto';
import { PortfolioSections } from './PortfolioSections';
import { PortfolioContact } from './PortfolioContact';
import './professional-templates.css';

export function ProfessionalPortfolio({
  portfolio,
  photos,
}: {
  portfolio: Portfolio;
  photos?: PhotoService;
}) {
  const resume = portfolio.template === 'resume';
  return (
    <article
      className={'real-portfolio portfolio-' + portfolio.template}
      aria-label={portfolio.full_name + "'s portfolio"}
    >
      <header className="professional-heading">
        <div>
          <p className="professional-kicker">
            {resume ? 'Curriculum vitae' : 'Portfolio / Selected work'}
          </p>
          <h2>{portfolio.full_name}</h2>
          {portfolio.address && <p className="portfolio-location">{portfolio.address}</p>}
        </div>
        {portfolio.photo_path && (
          <PrivatePhoto path={portfolio.photo_path} name={portfolio.full_name} service={photos} />
        )}
      </header>
      {portfolio.about_me && (
        <section className="portfolio-section professional-summary">
          <h3>{resume ? 'Profile' : 'Introduction'}</h3>
          <p className="preserve-lines">{portfolio.about_me}</p>
        </section>
      )}
      {resume ? (
        <>
          <PortfolioContact portfolio={portfolio} />
          <PortfolioSections portfolio={portfolio} only={['experience']} />
          <PortfolioSections portfolio={portfolio} only={['education']} />
          <PortfolioSections portfolio={portfolio} only={['skills']} />
          <PortfolioSections portfolio={portfolio} only={['projects']} />
        </>
      ) : (
        <>
          <PortfolioSections portfolio={portfolio} only={['projects']} />
          <div className="showcase-support">
            <div>
              <PortfolioSections portfolio={portfolio} only={['experience']} />
              <PortfolioSections portfolio={portfolio} only={['education']} />
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
