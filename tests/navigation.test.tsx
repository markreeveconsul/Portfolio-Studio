import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { client, repo } = vi.hoisted(() => ({
  client: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'owner-1', email: 'alex@example.com' } } },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    rpc: vi.fn(async () => ({ data: false, error: null })),
  },
  repo: {
    loadOwn: vi.fn(async () => null),
    savePortfolio: vi.fn(),
    listForAdmin: vi.fn(async () => []),
    loadById: vi.fn(async () => null),
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: client }));
vi.mock('../src/features/portfolio/repository', () => ({ portfolioRepository: repo }));
import { App } from '../src/App';

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/#dashboard');
  window.scrollTo = vi.fn();
  // jsdom does not implement dialog rendering; no template dialog is opened here.
  HTMLDialogElement.prototype.close = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn();
});

describe('private workspace navigation', () => {
  it('keeps an unsaved form when navigation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Full name' }), {
      target: { value: 'Unsaved name' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Overview', exact: true }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(window.location.hash).toBe('#dashboard');
    expect((screen.getByRole('textbox', { name: 'Full name' }) as HTMLInputElement).value).toBe(
      'Unsaved name',
    );
    confirm.mockRestore();
  });
  it('warns before refresh and does not sign out when cancellation is chosen', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Full name' }), {
      target: { value: 'Unsaved name' },
    });
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(confirm).toHaveBeenCalled();
    expect(client.auth.signOut).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
  it('blocks the admin screen for a regular account, including direct navigation', async () => {
    window.history.replaceState(null, '', '/#admin');
    render(<App />);
    await screen.findByRole('heading', { name: 'Admin access required.' });
    expect(repo.listForAdmin).not.toHaveBeenCalled();
  });
});
