import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortfolioEditor } from '../src/features/portfolio/PortfolioEditor';
import { AdminPortfolios } from '../src/features/portfolio/AdminPortfolios';
import { SimplePortfolio } from '../src/features/portfolio/SimplePortfolio';
import { emptyDraft } from '../src/features/portfolio/model';
import type { Portfolio, PortfolioRepository } from '../src/features/portfolio/model';

const saved: Portfolio = {
  ...emptyDraft(),
  id: 'portfolio-1',
  owner_id: 'owner-1',
  full_name: 'Alex Morgan',
  about_me: 'A thoughtful introduction.',
  social_links: [{ label: 'GitHub', url: 'https://github.com/example' }],
  template: 'simple',
  created_at: '2026-10-06T00:00:00.000Z',
  updated_at: '2026-10-06T00:00:00.000Z',
};
function repository(overrides: Partial<PortfolioRepository> = {}): PortfolioRepository {
  return {
    loadOwn: vi.fn().mockResolvedValue(null),
    savePortfolio: vi.fn().mockResolvedValue(saved),
    listForAdmin: vi.fn().mockResolvedValue([saved]),
    loadById: vi.fn().mockResolvedValue(saved),
    ...overrides,
  };
}
async function editor(repo = repository()) {
  const dirty = vi.fn();
  const view = render(
    <PortfolioEditor ownerId="owner-1" repository={repo} onDirtyChange={dirty} />,
  );
  await screen.findByRole('textbox', { name: 'Full name' });
  return { ...view, dirty };
}
function fillName(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value } });
}

describe('personal editor', () => {
  it('requires a non-blank name without sending a save', async () => {
    const repo = repository();
    await editor(repo);
    fillName('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    expect(await screen.findByText('Enter your full name.')).toBeTruthy();
    expect(repo.savePortfolio).not.toHaveBeenCalled();
  });
  it('retains input after a failed save and never shows a saved preview', async () => {
    const repo = repository({ savePortfolio: vi.fn().mockRejectedValue(new Error('network')) });
    const { dirty } = await editor(repo);
    fillName('Alex Morgan');
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('textbox', { name: 'Full name' }) as HTMLInputElement).value).toBe(
      'Alex Morgan',
    );
    expect(screen.queryByText('Your story, taking shape.')).toBeNull();
    expect(dirty).toHaveBeenLastCalledWith(true);
  });
  it('shows only the database-confirmed version and clears the dirty state', async () => {
    const repo = repository();
    const { dirty } = await editor(repo);
    fillName('  Alex Morgan  ');
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByRole('heading', { name: 'Your story, taking shape.' });
    expect(repo.savePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Alex Morgan' }),
      null,
    );
    expect(screen.getByText('A thoughtful introduction.')).toBeTruthy();
    expect(dirty).toHaveBeenLastCalledWith(false);
  });
  it('reloads saved details and sends their revision when editing', async () => {
    const repo = repository({ loadOwn: vi.fn().mockResolvedValue(saved) });
    await editor(repo);
    expect((screen.getByRole('textbox', { name: 'Full name' }) as HTMLInputElement).value).toBe(
      'Alex Morgan',
    );
    fillName('Alex Updated');
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await waitFor(() =>
      expect(repo.savePortfolio).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'Alex Updated' }),
        saved.updated_at,
      ),
    );
  });
  it('prevents unsafe website links from being saved', async () => {
    const repo = repository();
    await editor(repo);
    fillName('Alex');
    fireEvent.click(screen.getByRole('button', { name: '+ Add link' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Link 1 label' }), {
      target: { value: 'Bad link' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Link 1 URL' }), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByText(/Enter a complete http/);
    expect(repo.savePortfolio).not.toHaveBeenCalled();
  });
  it('does not open an empty editor when loading existing data fails', async () => {
    render(
      <PortfolioEditor
        ownerId="owner-1"
        repository={repository({ loadOwn: vi.fn().mockRejectedValue(new Error('offline')) })}
        onDirtyChange={vi.fn()}
      />,
    );
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Save & continue' })).toBeNull();
  });
  it('retains a stale draft and explains how to recover from a conflict', async () => {
    const repo = repository({
      loadOwn: vi.fn().mockResolvedValue(saved),
      savePortfolio: vi.fn().mockRejectedValue({ code: 'P0002' }),
    });
    await editor(repo);
    fillName('My unsaved edit');
    fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
    await screen.findByText(/changed in another session/);
    expect((screen.getByRole('textbox', { name: 'Full name' }) as HTMLInputElement).value).toBe(
      'My unsaved edit',
    );
  });
  it('does not issue duplicate requests while a save is pending', async () => {
    const repo = repository({ savePortfolio: vi.fn(() => new Promise(() => {})) });
    await editor(repo);
    fillName('Alex');
    const button = screen.getByRole('button', { name: 'Save & continue' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(repo.savePortfolio).toHaveBeenCalledTimes(1);
  });
});

describe('private preview', () => {
  it('renders user text literally and omits unsafe links', () => {
    render(
      <SimplePortfolio
        portfolio={{
          ...saved,
          full_name: '<script>alert(1)</script>',
          social_links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: '<script>alert(1)</script>' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Unsafe/ })).toBeNull();
    expect(document.querySelector('script')).toBeNull();
  });
  it('hides empty sections', () => {
    render(<SimplePortfolio portfolio={{ ...emptyDraft(), full_name: 'Alex' }} />);
    expect(screen.queryByRole('heading', { name: 'About me' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Get in touch' })).toBeNull();
  });
  it('lets an admin review without offering an edit or delete action', async () => {
    render(<AdminPortfolios repository={repository()} />);
    fireEvent.click(await screen.findByRole('button', { name: "View Alex Morgan's portfolio" }));
    await screen.findByRole('article', { name: "Alex Morgan's portfolio" });
    expect(screen.queryByRole('button', { name: /edit|delete|save/i })).toBeNull();
  });
});

it('saves without leaving the editor and enables photo selection after confirmation', async () => {
  const repo = repository();
  render(
    <PortfolioEditor
      ownerId="owner-1"
      repository={repo}
      onDirtyChange={vi.fn()}
      photos={{ download: vi.fn(), save: vi.fn() }}
    />,
  );
  await screen.findByRole('textbox', { name: 'Full name' });
  expect((screen.getByLabelText('Photo file') as HTMLInputElement).disabled).toBe(true);
  fillName('Alex Morgan');
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect((screen.getByLabelText('Photo file') as HTMLInputElement).disabled).toBe(false),
  );
  expect(screen.getByRole('textbox', { name: 'Full name' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Your story, taking shape.' })).toBeNull();
  expect(repo.savePortfolio).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Saved to your private portfolio.')).toBeTruthy();
});
it('preserves draft and keeps photo selection locked when an in-place save fails', async () => {
  const repo = repository({ savePortfolio: vi.fn().mockRejectedValue(new Error('offline')) });
  render(
    <PortfolioEditor
      ownerId="owner-1"
      repository={repo}
      onDirtyChange={vi.fn()}
      photos={{ download: vi.fn(), save: vi.fn() }}
    />,
  );
  await screen.findByRole('textbox', { name: 'Full name' });
  fillName('Keep this name');
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('textbox', { name: 'Full name' }) as HTMLInputElement).value).toBe(
    'Keep this name',
  );
  expect((screen.getByLabelText('Photo file') as HTMLInputElement).disabled).toBe(true);
});
