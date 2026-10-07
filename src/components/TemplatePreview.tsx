import { TemplateThumbnail } from './TemplateThumbnail';
export type TemplateName = 'simple' | 'modern' | 'creative' | 'resume' | 'showcase';
export const templates: { id: TemplateName; label: string; description: string; tag: string }[] = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Clear, considered, and quietly confident.',
    tag: 'Timeless & professional',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'A structured space for a growing body of work.',
    tag: 'Structured & versatile',
  },
  {
    id: 'creative',
    label: 'Creative',
    description: 'An expressive introduction with room to explore.',
    tag: 'Bold & expressive',
  },
  {
    id: 'resume',
    label: 'Professional Résumé',
    description: 'A focused record of your experience and skills.',
    tag: 'Clear & professional',
  },
  {
    id: 'showcase',
    label: 'Project Showcase',
    description: 'Give your projects the space to speak for themselves.',
    tag: 'Work comes first',
  },
];

// Fictional content only. These visual studies are not saved user portfolios.
export function TemplatePreview({
  template,
  large = false,
}: {
  template: TemplateName;
  large?: boolean;
}) {
  return (
    <div className={`template-art ${template} ${large ? 'large' : ''}`}>
      {(template === 'resume' || template === 'showcase') && (
        <TemplateThumbnail template={template} />
      )}
      {template === 'simple' && (
        <>
          <div className="sample-topline">
            <b>AM.</b>
            <span>PORTFOLIO / 2026</span>
          </div>
          <div className="sample-intro">
            <div className="avatar-art">AM</div>
            <p className="sample-kicker">DESIGNER & CREATIVE THINKER</p>
            <h3>Alex Morgan</h3>
            <p>
              I turn thoughtful ideas into
              <br />
              simple, useful experiences.
            </p>
          </div>
          <div className="sample-about">
            <h4>A little about me</h4>
            <p>
              A design student exploring the intersection of people, technology, and everyday life.
            </p>
          </div>
          <div className="sample-projects">
            <h4>Selected work</h4>
            <div>
              <span className="project-art mint">01</span>
              <span className="project-art sand">02</span>
            </div>
            <div className="sample-labels">
              <span>Campus companion</span>
              <span>A better daily habit</span>
            </div>
          </div>
        </>
      )}
      {template === 'modern' && (
        <>
          <aside className="sample-sidebar">
            <div className="avatar-art">AM</div>
            <h3>
              Alex
              <br />
              Morgan.
            </h3>
            <p>
              Product designer
              <br />& curious builder
            </p>
            <div className="sample-pills">
              <span>UI / UX</span>
              <span>React</span>
              <span>Research</span>
            </div>
            <small>DESIGN WITH INTENTION.</small>
          </aside>
          <div className="sample-main">
            <p className="sample-kicker">HELLO, I'M ALEX</p>
            <h3>
              Good design.
              <br />
              Real impact.
            </h3>
            <p>
              Thoughtful digital experiences,
              <br />
              built around people.
            </p>
            <div className="modern-card">
              <span className="project-art mint">01 / CAMPUS</span>
              <h4>Campus companion</h4>
              <p>Making student life a little simpler.</p>
            </div>
            <div className="modern-card">
              <h4>Learning, always.</h4>
              <p>BS Information Technology · 2026</p>
            </div>
          </div>
        </>
      )}
      {template === 'creative' && (
        <>
          <div className="sample-topline">
            <b>ALEX / MORGAN</b>
            <span>DESIGN · BUILD · EXPLORE</span>
          </div>
          <div className="creative-title">
            <p className="sample-kicker">A CURIOUS MIND. A HANDS-ON APPROACH.</p>
            <h3>
              Ideas into
              <br />
              <em>experiences.</em>
            </h3>
            <span className="star-art" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="creative-bottom">
            <span className="creative-number">01</span>
            <div>
              <h4>
                A little curiosity
                <br />
                goes a long way.
              </h4>
              <p>
                I'm Alex, a designer finding new ways
                <br />
                to make everyday things work better.
              </p>
            </div>
          </div>
          <div className="creative-work">
            <span>SELECTED WORK</span>
            <b>CAMPUS COMPANION ↗</b>
          </div>
        </>
      )}
    </div>
  );
}
