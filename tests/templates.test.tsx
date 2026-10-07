import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useState } from 'react';
import { emptyDraft } from '../src/features/portfolio/model';
import type { Portfolio, PortfolioRepository } from '../src/features/portfolio/model';
import { TemplateChooser } from '../src/features/portfolio/TemplateChooser';
import { PortfolioView } from '../src/features/portfolio/PortfolioView';

const record: Portfolio = { ...emptyDraft(), id: 'p', owner_id: 'owner', full_name: 'Alex Morgan', template: 'simple', updated_at: 'v1', created_at: 'date', email: 'alex@example.com', about_me: 'My introduction', skills: [{ name: 'React' }], education: [{ institution: 'University' }], projects: [{ title: 'Campus project', description: 'Project details', project_url: 'javascript:alert(1)' }], experience: [{ organization: 'Campus', role_title: 'Designer' }] };
it.each(['simple', 'modern', 'creative'] as const)('%s displays every section without executable links', template => {
  render(<PortfolioView portfolio={{ ...record, template }} />);
  for (const text of ['Alex Morgan', 'My introduction', 'React', 'University', 'Campus project', 'Designer', 'alex@example.com']) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByRole('link', { name: /View project/ })).toBeNull();
});
it('previews without writing and saves only the template while preserving content', async () => {
  const saveTemplate = vi.fn().mockResolvedValue({ template: 'modern', updated_at: 'v2' });
  const onSaved = vi.fn();
  function Harness() {
    const [portfolio, setPortfolio] = useState(record);
    return <TemplateChooser portfolio={portfolio} repository={{ saveTemplate } as unknown as PortfolioRepository} onSaved={result => { onSaved(result); setPortfolio(result); }} onBusy={() => {}} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('radio', { name: /Modern/ }));
  expect(saveTemplate).not.toHaveBeenCalled();
  expect(screen.getByText(/Preview only/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...record, template: 'modern', updated_at: 'v2' }));
  expect(saveTemplate).toHaveBeenCalledWith(record, 'modern');
  expect(screen.getByText('Showing your saved template.')).toBeTruthy();
});
it('keeps a failed preview available and does not claim it was saved', async () => {
  const onSaved = vi.fn();
  render(<TemplateChooser portfolio={record} repository={{ saveTemplate: vi.fn().mockRejectedValue({ code: 'P0002' }) } as unknown as PortfolioRepository} onSaved={onSaved} onBusy={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: /Creative/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
  expect((await screen.findByRole('alert')).textContent).toContain('another session');
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByText(/Preview only/)).toBeTruthy();
});
