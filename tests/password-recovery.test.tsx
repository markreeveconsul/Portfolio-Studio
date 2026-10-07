import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const { auth } = vi.hoisted(() => ({
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('../src/features/portfolio/Workspace', () => ({
  Workspace: () => <h1>Private workspace</h1>,
}));
import { App } from '../src/App';
const session = { user: { id: 'recovery-owner' } };
beforeEach(() => {
  vi.resetAllMocks();
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
  window.history.replaceState(null, '', '/#forgot');
  window.scrollTo = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});
async function openReset() {
  window.history.replaceState(null, '', '/?auth=recovery#access_token=fake');
  render(<App />);
  await waitFor(() => expect(location.hash).toBe('#reset'));
  act(() => auth.onAuthStateChange.mock.calls[0][0]('PASSWORD_RECOVERY', session));
  await screen.findByLabelText('New password');
}
function fillPassword(password = 'a-long-test-password', confirmation = password) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: confirmation },
  });
}
it('offers recovery from sign in', async () => {
  window.history.replaceState(null, '', '/#signin');
  render(<App />);
  expect(screen.getByRole('link', { name: 'Forgot password?' }).getAttribute('href')).toBe(
    '#forgot',
  );
});
it('requests the approved callback and uses neutral confirmation with no duplicate sends', async () => {
  let resolve!: (value: { error: null }) => void;
  auth.resetPasswordForEmail.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'alex@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  fireEvent.submit(screen.getByLabelText('Email address').closest('form')!);
  expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('alex@example.com', {
    redirectTo: `${location.origin}/?auth=recovery`,
  });
  await act(async () => resolve({ error: null }));
  expect((await screen.findByRole('status')).textContent).toContain('If this email');
});
it('allows retry after an email error without exposing provider details', async () => {
  auth.resetPasswordForEmail.mockResolvedValue({
    error: { status: 429, message: 'internal-details' },
  });
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'alex@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Check your inbox');
  expect(screen.queryByText('internal-details')).toBeNull();
  expect(
    (screen.getByRole('button', { name: 'Send reset link' }) as HTMLButtonElement).disabled,
  ).toBe(false);
});
it.each([null, session])(
  'rejects callback markers and expired links even with an existing session: %j',
  async (existing) => {
    window.history.replaceState(
      null,
      '',
      '/?auth=recovery#error=access_denied&error_description=untrusted',
    );
    auth.getSession.mockResolvedValue({ data: { session: existing }, error: null });
    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'missing, expired, or has already been used',
    );
    expect(screen.queryByLabelText('New password')).toBeNull();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(location.search).toBe('');
    expect(location.hash).toBe('#reset');
  },
);
it('validates matching passwords before sending an update', async () => {
  await openReset();
  fillPassword('a-long-test-password', 'different-password');
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect((await screen.findByRole('alert')).textContent).toContain('do not match');
  expect(auth.updateUser).not.toHaveBeenCalled();
});
it('updates only after recovery, clears inputs, and consumes local recovery permission', async () => {
  await openReset();
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect((await screen.findByRole('status')).textContent).toContain('password has been updated');
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-long-test-password' });
  expect(screen.queryByLabelText('New password')).toBeNull();
  act(() => {
    location.hash = 'forgot';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  act(() => {
    location.hash = 'reset';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect((await screen.findByRole('alert')).textContent).toContain('missing, expired');
});
it('does not claim success on a failed update and offers a fresh link', async () => {
  await openReset();
  auth.updateUser.mockResolvedValue({ error: { status: 401 } });
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect((await screen.findByRole('alert')).textContent).toContain('could not be confirmed');
  expect(screen.getByRole('link', { name: 'Request a new reset link' }).getAttribute('href')).toBe(
    '#forgot',
  );
  expect(screen.queryByText('Your password has been updated.')).toBeNull();
});

it('ends the recovery session before returning to sign in after a password update', async () => {
  await openReset();
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  await screen.findByText('Your password has been updated. Your portfolio is unchanged.');
  let finish!: (value: { error: null }) => void;
  auth.signOut.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  fireEvent.click(screen.getByRole('link', { name: '← Back to sign in' }));
  fireEvent.click(screen.getByRole('link', { name: 'Signing out…' }));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(location.hash).toBe('#reset');
  await act(async () => finish({ error: null }));
  await screen.findByRole('heading', { name: 'Welcome back.' });
  expect(location.hash).toBe('#signin');
  expect(screen.queryByRole('heading', { name: 'Private workspace' })).toBeNull();
});

it('keeps successful reset confirmation visible and permits retry when sign out fails', async () => {
  await openReset();
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  await screen.findByText('Your password has been updated. Your portfolio is unchanged.');
  auth.signOut.mockResolvedValueOnce({ error: new Error('internal-details') });
  fireEvent.click(screen.getByRole('link', { name: '← Back to sign in' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to sign out');
  expect(screen.getByRole('status').textContent).toContain('password has been updated');
  expect(location.hash).toBe('#reset');
  fireEvent.click(screen.getByRole('link', { name: '← Back to sign in' }));
  await screen.findByRole('heading', { name: 'Welcome back.' });
});

it('still allows continuing to the portfolio without signing out', async () => {
  await openReset();
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Continue to my portfolio →' }));
  await screen.findByRole('heading', { name: 'Private workspace' });
  expect(auth.signOut).not.toHaveBeenCalled();
});
