import { safeWebUrl } from './model';
import type { SectionData } from './sections';

function Dates({ start, end }: { start?: string; end?: string }) {
  const format = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  if (!start && !end) return null;
  return (
    <p className="entry-date">
      {start ? format(start) : ''}
      {start && end ? ' – ' : ''}
      {end ? format(end) : ''}
    </p>
  );
}
function WebLink({ url, children }: { url: string; children: string }) {
  const safe = safeWebUrl(url);
  return safe ? (
    <a href={safe} target="_blank" rel="noopener noreferrer">
      {children} ↗<span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : null;
}
export function PortfolioSections({
  portfolio,
  only = ['education', 'skills', 'projects', 'experience'],
}: {
  portfolio: SectionData;
  only?: (keyof SectionData)[];
}) {
  return (
    <>
      {only.includes('education') && portfolio.education.length > 0 && (
        <section className="portfolio-section">
          <h3>Education</h3>
          {portfolio.education.map((entry, index) => (
            <div className="portfolio-entry" key={index}>
              <h4>{entry.institution}</h4>
              {entry.qualification && <p>{entry.qualification}</p>}
              <Dates start={entry.start_date} end={entry.end_date} />
            </div>
          ))}
        </section>
      )}
      {only.includes('skills') && portfolio.skills.length > 0 && (
        <section className="portfolio-section">
          <h3>Skills</h3>
          <ul className="skill-tags">
            {portfolio.skills.map((entry, index) => (
              <li key={index}>{entry.name}</li>
            ))}
          </ul>
        </section>
      )}
      {only.includes('projects') && portfolio.projects.length > 0 && (
        <section className="portfolio-section portfolio-projects">
          <h3>Projects</h3>
          {portfolio.projects.map((entry, index) => (
            <div className="portfolio-entry" key={index}>
              <h4>{entry.title}</h4>
              {entry.description && <p className="preserve-lines">{entry.description}</p>}
              <div className="project-links">
                <WebLink url={entry.project_url}>View project</WebLink>
                <WebLink url={entry.repository_url}>Source code</WebLink>
              </div>
            </div>
          ))}
        </section>
      )}
      {only.includes('experience') && portfolio.experience.length > 0 && (
        <section className="portfolio-section">
          <h3>Experience</h3>
          {portfolio.experience.map((entry, index) => (
            <div className="portfolio-entry" key={index}>
              <h4>{entry.role_title}</h4>
              <p>{entry.organization}</p>
              <Dates start={entry.start_date} end={entry.end_date} />
              {entry.description && <p className="preserve-lines">{entry.description}</p>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
