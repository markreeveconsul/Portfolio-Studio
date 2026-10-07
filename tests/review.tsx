// Developer-only visual fixture. Not imported by the application or production build.
import { createRoot } from 'react-dom/client';
import { PortfolioEditor } from '../src/features/portfolio/PortfolioEditor';
import { emptyDraft } from '../src/features/portfolio/model';
import type { Portfolio, PortfolioRepository } from '../src/features/portfolio/model';
import type { PhotoService } from '../src/features/portfolio/photos';
import '../src/styles.css';
import '../src/features/portfolio/portfolio.css';

if (!import.meta.env.DEV && import.meta.env.MODE !== 'review')
  throw new Error('This fixture is for local review only.');
let saved: Portfolio = {
  ...emptyDraft(),
  id: 'fictional-portfolio',
  owner_id: 'fictional-owner',
  full_name: 'Alex Morgan',
  email: 'alex@example.com',
  address: 'Singapore',
  about_me:
    'I am an information technology student who enjoys making everyday tasks simpler through thoughtful design.\n\nCurrently learning React, exploring user research, and building projects that put people first.',
  education: [
    {
      institution: 'Example University',
      qualification: 'BS Information Technology',
      start_date: '2023-08-01',
      end_date: '',
    },
  ],
  skills: [{ name: 'React' }, { name: 'SQL' }, { name: 'User research' }],
  projects: [
    {
      title: 'Campus Companion',
      description:
        'A small student portal that makes schedules and campus resources easier to find.',
      project_url: 'https://example.com',
      repository_url: '',
    },
  ],
  experience: [],
  social_links: [{ label: 'GitHub', url: 'https://github.com/example' }],
  template: 'simple',
  created_at: '2026-10-06T00:00:00Z',
  updated_at: '2026-10-06T00:00:00Z',
};
const repository: PortfolioRepository = {
  saveTemplate: async (portfolio, template) => {
    if (portfolio.updated_at !== saved.updated_at) throw { code: 'P0002' };
    saved = { ...saved, template, updated_at: new Date().toISOString() };
    return { template: saved.template, updated_at: saved.updated_at };
  },
  loadOwn: async () => (deleted ? null : structuredClone(saved)),
  savePortfolio: async (draft) => {
    deleted = false;
    saved = { ...saved, ...draft, updated_at: new Date().toISOString() };
    return structuredClone(saved);
  },
  loadById: async () => structuredClone(saved),
  listForAdmin: async () => [saved],
};
const reportDirty = () => {};
let deleted = false;
const photoFiles = new Map<string, Blob>();
const photos: PhotoService = {
  download: async (path) => {
    const file = photoFiles.get(path);
    if (!file) throw new Error('Missing fixture photo');
    return file;
  },
  save: async (portfolio, file) => {
    const path = file ? `fictional-owner/${crypto.randomUUID()}.png` : null;
    if (path && file) photoFiles.set(path, file);
    if (portfolio.photo_path) photoFiles.delete(portfolio.photo_path);
    saved = { ...saved, photo_path: path, updated_at: new Date().toISOString() };
    return { photo_path: path, updated_at: saved.updated_at, warning: '' };
  },
};
createRoot(document.getElementById('root')!).render(
  <>
    <div className="notice" style={{ margin: 0, borderRadius: 0, textAlign: 'center' }}>
      LOCAL UI TEST · Fictional data only · Saves stay in memory and reset on refresh
    </div>
    <main className="container workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">DESIGN REVIEW</p>
          <h1>My portfolio</h1>
        </div>
        <span className="pill">Portfolio information editor</span>
      </div>
      <PortfolioEditor
        deletion={{
          remove: async () => {
            deleted = true;
          },
          pending: async () => 0,
          cleanup: async () => {
            photoFiles.clear();
          },
        }}
        photos={photos}
        ownerId="fictional-owner"
        repository={repository}
        onDirtyChange={reportDirty}
      />
    </main>
  </>,
);
