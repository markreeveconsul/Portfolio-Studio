import { beforeEach, expect, it, vi } from 'vitest';

const { client, query, storage } = vi.hoisted(() => {
  const query = { select: vi.fn(), order: vi.fn(), limit: vi.fn(), delete: vi.fn(), eq: vi.fn() };
  const storage = { remove: vi.fn() };
  const client = { from: vi.fn(() => query), rpc: vi.fn(), storage: { from: vi.fn(() => storage) } };
  return { client, query, storage };
});
vi.mock('../src/lib/supabase', () => ({ supabase: client }));
import { deletionService } from '../src/features/portfolio/deletion';

beforeEach(() => {
  vi.clearAllMocks();
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [{ id: 'job-1', photo_path: 'owner/photo.png' }], error: null });
  query.eq.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
});

it('removes the queued file before acknowledging the durable job', async () => {
  await deletionService.cleanup();
  expect(storage.remove).toHaveBeenCalledWith(['owner/photo.png']);
  expect(query.eq).toHaveBeenCalledWith('id', 'job-1');
  expect(storage.remove.mock.invocationCallOrder[0]).toBeLessThan(query.delete.mock.invocationCallOrder[0]);
});

it('retains the durable job if storage removal fails', async () => {
  storage.remove.mockResolvedValue({ error: { message: 'offline' } });
  await expect(deletionService.cleanup()).rejects.toEqual({ message: 'offline' });
  expect(query.delete).not.toHaveBeenCalled();
});

it('reports acknowledgement failure so a removed file can safely be retried', async () => {
  query.eq.mockResolvedValue({ error: { message: 'connection lost' } });
  await expect(deletionService.cleanup()).rejects.toEqual({ message: 'connection lost' });
  expect(storage.remove).toHaveBeenCalledTimes(1);
});
