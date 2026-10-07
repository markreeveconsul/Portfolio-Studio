import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioEditor } from '../src/features/portfolio/PortfolioEditor';
import { SimplePortfolio } from '../src/features/portfolio/SimplePortfolio';
import { emptyDraft, validatePortfolio } from '../src/features/portfolio/model';
import type { Portfolio, PortfolioRepository } from '../src/features/portfolio/model';

const original: Portfolio = {
  ...emptyDraft(),
  id: '1',
  owner_id: 'owner',
  full_name: 'Alex Morgan',
  template: 'simple',
  created_at: '2026-10-06T00:00:00Z',
  updated_at: '2026-10-06T00:00:00Z',
};
function repository(): PortfolioRepository {
  return {
    loadOwn: vi.fn(async () => original),
    savePortfolio: vi.fn(async (draft) => ({ ...original, ...draft })),
    loadById: vi.fn(async () => original),
    listForAdmin: vi.fn(async () => [original]),
  };
}

describe('portfolio sections', () => {
  it('accepts a student with no experience or other optional sections', () => {
    expect(validatePortfolio({ ...emptyDraft(), full_name: 'Alex' }).errors).toEqual({});
  });
  it('rejects impossible dates, reversed dates, blank entries, and unsafe project links', () => {
    const result = validatePortfolio({
      ...emptyDraft(),
      full_name: 'Alex',
      education: [{ institution: '', qualification: '', start_date: '2026-02-30', end_date: '' }],
      projects: [
        {
          title: 'Project',
          description: '',
          project_url: 'javascript:alert(1)',
          repository_url: '',
        },
      ],
      experience: [
        {
          organization: 'Example',
          role_title: 'Intern',
          description: '',
          start_date: '2026-10-06',
          end_date: '2026-09-01',
        },
      ],
    });
    expect(Object.keys(result.errors)).toEqual(
      expect.arrayContaining([
        'education_0_institution',
        'education_0_start_date',
        'projects_0_project_url',
        'experience_0_end_date',
      ]),
    );
  });
  it('adds education and skills, saves them, and renders the returned sections', async () => {
    const repo = repository();
    render(<PortfolioEditor ownerId="owner" repository={repo} onDirtyChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Add education', exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Institution', exact: true }), {
      target: { value: 'Example University' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Add skill', exact: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Skill', exact: true }), {
      target: { value: 'React' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByRole('heading', { name: 'Your story, taking shape.' });
    expect(screen.getByText('Example University')).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();
    expect(repo.savePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({ skills: [{ name: 'React' }] }),
      original.updated_at,
    );
  });
  it('requires the core fields of an added entry and can remove that entry', async () => {
    const repo = repository();
    render(<PortfolioEditor ownerId="owner" repository={repo} onDirtyChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Add project', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByText(/Enter project title/);
    expect(repo.savePortfolio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove project 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByRole('heading', { name: 'Your story, taking shape.' });
    expect(repo.savePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({ projects: [] }),
      original.updated_at,
    );
  });
  it('renders every non-empty section and does not invent an ongoing date', () => {
    render(
      <SimplePortfolio
        portfolio={{
          ...original,
          education: [
            {
              institution: 'Example University',
              qualification: 'BS IT',
              start_date: '2023-08-01',
              end_date: '',
            },
          ],
          skills: [{ name: 'SQL' }],
          projects: [
            {
              title: 'Project',
              description: 'A project',
              project_url: 'https://example.com',
              repository_url: '',
            },
          ],
          experience: [
            {
              organization: 'Campus',
              role_title: 'Volunteer',
              description: 'Helped people',
              start_date: '',
              end_date: '',
            },
          ],
        }}
      />,
    );
    for (const name of ['Education', 'Skills', 'Projects', 'Experience'])
      expect(screen.getByRole('heading', { name, exact: true })).toBeTruthy();
    expect(screen.queryByText(/Present/)).toBeNull();
  });
});
