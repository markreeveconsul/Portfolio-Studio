import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const { auth } = vi.hoisted(() => ({
  auth: {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('../src/features/portfolio/Workspace', () => ({
  Workspace: () => <h1>Private workspace</h1>,
}));
import { App } from '../src/App';

beforeEach(() => {
  vi.resetAllMocks();
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.com' }, error: null });
  window.history.replaceState(null, '', '/#signup');
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

it.each(['signup', 'signin'])(
  'starts Google from %s without requiring email fields',
  async (route) => {
    window.history.replaceState(null, '', '/#' + route);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() =>
      expect(auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${location.origin}/?auth=google` },
      }),
    );
    const pending = screen.getByRole('button', { name: 'Opening Google…' });
    fireEvent.click(pending);
    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(auth.signUp).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Email address').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    fireEvent(window, new Event('pageshow'));
    expect(
      (screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  },
);

it('permits retry after provider startup failure and does not show raw errors', async () => {
  auth.signInWithOAuth.mockRejectedValue(new Error('internal-secret-details'));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Google sign-in is unavailable');
  expect(screen.queryByText('internal-secret-details')).toBeNull();
  expect(
    (screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled,
  ).toBe(false);
});

it('waits for the SDK session before completing the callback and cleans the URL', async () => {
  window.history.replaceState(null, '', '/?auth=google#access_token=fake-test-token');
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'google-owner' } } },
    error: null,
  });
  render(<App />);
  await screen.findByRole('heading', { name: 'Private workspace' });
  expect(location.search).toBe('');
  expect(location.hash).toBe('#dashboard');
});

it('does not grant access for a callback marker or denied consent without a session', async () => {
  window.history.replaceState(
    null,
    '',
    '/?auth=google#error=access_denied&error_description=untrusted',
  );
  render(<App />);
  await screen.findByText('Google sign-in was not completed. Try again or use email and password.');
  expect(screen.queryByRole('heading', { name: 'Private workspace' })).toBeNull();
  expect(location.search).toBe('');
  expect(location.hash).toBe('#signin');
  expect(screen.queryByText('untrusted')).toBeNull();
});

