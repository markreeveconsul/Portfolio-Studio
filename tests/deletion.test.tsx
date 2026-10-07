import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DeletePortfolio } from '../src/features/portfolio/DeletePortfolio';
import { PhotoCleanup } from '../src/features/portfolio/PhotoCleanup';
import { emptyDraft } from '../src/features/portfolio/model';
import type { Portfolio } from '../src/features/portfolio/model';
const portfolio: Portfolio = {
  ...emptyDraft(),
  id: 'p',
  owner_id: 'o',
  full_name: 'Alex',
  template: 'simple',
  created_at: 'date',
  updated_at: 'revision',
};
it('requires explicit typed confirmation and permits cancellation', () => {
  const service = { remove: vi.fn(), pending: vi.fn(), cleanup: vi.fn() };
  render(
    <DeletePortfolio
      portfolio={portfolio}
      service={service}
      disabled={false}
      onBusy={vi.fn()}
      onDeleted={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete my portfolio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Permanently delete portfolio' }));
  expect(service.remove).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Deletion confirmation'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(service.remove).not.toHaveBeenCalled();
});
it('deletes before cleanup and completes database deletion even if cleanup needs retry', async () => {
  const service = {
    remove: vi.fn().mockResolvedValue(undefined),
    pending: vi.fn(),
    cleanup: vi.fn().mockRejectedValue(new Error('offline')),
  };
  const onDeleted = vi.fn();
  render(
    <DeletePortfolio
      portfolio={portfolio}
      service={service}
      disabled={false}
      onBusy={vi.fn()}
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete my portfolio' }));
  fireEvent.change(screen.getByLabelText('Deletion confirmation'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Permanently delete portfolio' }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  expect(service.remove).toHaveBeenCalledWith(portfolio);
  expect(service.remove.mock.invocationCallOrder[0]).toBeLessThan(
    service.cleanup.mock.invocationCallOrder[0],
  );
});
it('does not clean files or report success after a stale delete', async () => {
  const service = {
    remove: vi.fn().mockRejectedValue({ code: 'P0002' }),
    pending: vi.fn(),
    cleanup: vi.fn(),
  };
  const onDeleted = vi.fn();
  render(
    <DeletePortfolio
      portfolio={portfolio}
      service={service}
      disabled={false}
      onBusy={vi.fn()}
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete my portfolio' }));
  fireEvent.change(screen.getByLabelText('Deletion confirmation'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Permanently delete portfolio' }));
  expect((await screen.findByRole('alert')).textContent).toContain('reload');
  expect(onDeleted).not.toHaveBeenCalled();
  expect(service.cleanup).not.toHaveBeenCalled();
});
it('explains an unavailable deletion function without claiming success', async () => {
  const service = {
    remove: vi.fn().mockRejectedValue({ code: 'PGRST202' }),
    pending: vi.fn(),
    cleanup: vi.fn(),
  };
  const onDeleted = vi.fn();
  render(<DeletePortfolio portfolio={portfolio} service={service} disabled={false} onBusy={vi.fn()} onDeleted={onDeleted} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete my portfolio' }));
  fireEvent.change(screen.getByLabelText('Deletion confirmation'), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Permanently delete portfolio' }));
  expect((await screen.findByRole('alert')).textContent).toContain('not available yet');
  expect(onDeleted).not.toHaveBeenCalled();
  expect(service.cleanup).not.toHaveBeenCalled();
});
it('offers retry for durable pending cleanup and rechecks after success', async () => {
  const service = {
    remove: vi.fn(),
    pending: vi.fn().mockResolvedValueOnce(1).mockResolvedValue(0),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  render(<PhotoCleanup service={service} revision={0} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry photo cleanup' }));
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Pending photo cleanup' })).toBeNull(),
  );
  expect(service.cleanup).toHaveBeenCalledTimes(1);
});
