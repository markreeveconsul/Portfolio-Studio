import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { storage, query, client } = vi.hoisted(() => {
  const storage = { upload: vi.fn(), remove: vi.fn(), download: vi.fn() };
  const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  const client = { storage: { from: vi.fn(() => storage) }, from: vi.fn(() => query) };
  return { storage, query, client };
});
vi.mock('../src/lib/supabase', () => ({ supabase: client }));
import { photoService, validatePhoto } from '../src/features/portfolio/photos';
import { PhotoEditor } from '../src/features/portfolio/PhotoEditor';
import { PrivatePhoto } from '../src/features/portfolio/PrivatePhoto';
import { emptyDraft } from '../src/features/portfolio/model';
import type { Portfolio } from '../src/features/portfolio/model';
const portfolio: Portfolio = {
  ...emptyDraft(),
  id: 'p',
  owner_id: 'owner',
  full_name: 'Alex Morgan',
  photo_path: 'owner/old.png',
  updated_at: 'revision',
  created_at: 'date',
  template: 'simple',
};
const file = new File(['image'], 'portrait.png', { type: 'image/png' });
beforeEach(() => {
  vi.clearAllMocks();
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({
    data: { photo_path: 'owner/new.png', updated_at: 'new-revision' },
    error: null,
  });
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
  storage.download.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test-photo'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
it('rejects unsupported, empty, and oversized files before uploading', async () => {
  expect(validatePhoto(new File(['x'], 'x.svg', { type: 'image/svg+xml' }))).toContain('JPG');
  expect(validatePhoto(new File([], 'x.png', { type: 'image/png' }))).toContain('2 MB');
  expect(
    validatePhoto(new File([new Uint8Array(2097153)], 'x.png', { type: 'image/png' })),
  ).toContain('2 MB');
  await expect(photoService.save(portfolio, new File(['x'], 'x.txt'))).rejects.toThrow('JPG');
  expect(storage.upload).not.toHaveBeenCalled();
});
it('uploads a unique owner path, checks revision, then cleans the old photo', async () => {
  await photoService.save(portfolio, file);
  expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\/.+\.png$/), file, {
    upsert: false,
    contentType: 'image/png',
  });
  expect(query.eq).toHaveBeenCalledWith('updated_at', 'revision');
  expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner');
  expect(storage.remove).toHaveBeenCalledWith(['owner/old.png']);
  expect(query.maybeSingle.mock.invocationCallOrder[0]).toBeLessThan(
    storage.remove.mock.invocationCallOrder[0],
  );
});
it('preserves all files when the database response is ambiguous', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'network failure' } });
  await expect(photoService.save(portfolio, file)).rejects.toThrow('could not be confirmed');
  expect(storage.remove).not.toHaveBeenCalled();
});
it('cleans only the unused new upload on a known stale revision', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(photoService.save(portfolio, file)).rejects.toThrow('another session');
  expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]]);
});
it('reports cleanup failure while retaining the successful saved revision', async () => {
  storage.remove.mockResolvedValue({ error: { message: 'offline' } });
  const result = await photoService.save(portfolio, file);
  expect(result.updated_at).toBe('new-revision');
  expect(result.warning).toContain('previous file');
});
it('clears the database reference before deleting a removed photo', async () => {
  await photoService.save(portfolio, null);
  expect(query.update).toHaveBeenCalledWith({ photo_path: null });
  expect(storage.upload).not.toHaveBeenCalled();
  expect(storage.remove).toHaveBeenCalledWith(['owner/old.png']);
});
it('previews locally and requires an explicit save', async () => {
  const service = {
    download: vi.fn(),
    save: vi
      .fn()
      .mockResolvedValue({ photo_path: 'owner/new.png', updated_at: 'new', warning: '' }),
  };
  const onSaved = vi.fn();
  render(
    <PhotoEditor
      portfolio={{ ...portfolio, photo_path: null }}
      disabled={false}
      service={service}
      onSaved={onSaved}
      onBusy={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Photo file'), { target: { files: [file] } });
  await screen.findByAltText('Selected photo preview');
  expect(service.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(service.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'p' }), file);
});
it('downloads privately and revokes the temporary URL on unmount', async () => {
  const service = { download: vi.fn().mockResolvedValue(new Blob(['image'])), save: vi.fn() };
  const { unmount } = render(
    <PrivatePhoto path="owner/photo.png" name="Alex Morgan" service={service} />,
  );
  await screen.findByAltText('Alex Morgan profile photo');
  expect(service.download).toHaveBeenCalledWith('owner/photo.png');
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-photo');
});

it.each([null, portfolio])(
  'keeps the single native picker disabled until information is saved',
  (saved) => {
    const service = { download: vi.fn().mockResolvedValue(new Blob()), save: vi.fn() };
    const { rerender } = render(
      <PhotoEditor
        portfolio={saved && { ...saved, photo_path: null }}
        disabled={true}
        service={service}
        onSaved={vi.fn()}
        onBusy={vi.fn()}
      />,
    );
    expect((screen.getByLabelText('Photo file') as HTMLInputElement).disabled).toBe(true);
    expect(
      screen.getByText('Use Save changes above before choosing or changing your photo.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose a photo' })).toBeNull();
    rerender(
      <PhotoEditor
        portfolio={{ ...portfolio, photo_path: null }}
        disabled={false}
        service={service}
        onSaved={vi.fn()}
        onBusy={vi.fn()}
      />,
    );
    expect((screen.getByLabelText('Photo file') as HTMLInputElement).disabled).toBe(false);
  },
);
