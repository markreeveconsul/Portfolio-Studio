import { useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { supabase } from '../../lib/supabase';

export function PasswordRecovery({
  mode,
  ready,
  loading,
  titleRef,
  onComplete,
  onReturnToSignIn,
}: {
  mode: 'forgot' | 'reset';
  ready: boolean;
  loading: boolean;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onComplete: () => void;
  onReturnToSignIn: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState('');
  const locked = useRef(false);
  const reset = mode === 'reset';

  async function returnToSignIn(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (locked.current || loading) return;
    locked.current = true;
    setReturning(true);
    setReturnError('');
    try {
      await onReturnToSignIn();
    } catch {
      setReturnError('Unable to sign out. Please try Back to sign in again.');
    } finally {
      locked.current = false;
      setReturning(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || locked.current || done || (reset && !ready)) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get('password') ?? '');
    setError('');
    if (reset && (password.length < 12 || password.length > 128)) {
      setError('Use a password between 12 and 128 characters.');
      return;
    }
    if (reset && password !== values.get('confirmation')) {
      setError('Your passwords do not match. Please check both fields.');
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const { error: requestError } = reset
        ? await supabase.auth.updateUser({ password })
        : await supabase.auth.resetPasswordForEmail(String(values.get('email')).trim(), {
            redirectTo: `${location.origin}/?auth=recovery`,
          });
      if (requestError) throw requestError;
      form.reset();
      setDone(true);
      if (reset) onComplete();
    } catch (cause) {
      const failure = cause as { status?: number; code?: string } | null;
      setError(
        failure?.status === 429
          ? 'Too many requests right now. Check your inbox for an earlier reset email and try again later if needed.'
          : reset && failure?.code === 'same_password'
            ? 'Choose a password different from your current password.'
            : reset && failure?.code === 'weak_password'
              ? 'Choose a stronger password with at least 12 characters.'
              : reset
                ? 'Your password change could not be confirmed. Check your connection. If this link has expired, request a new reset email.'
                : 'The reset email could not be requested. Check your connection and try again.',
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout container">
      <div className="auth-story">
        <p className="eyebrow">A WAY BACK TO YOUR WORK</p>
        <h2>
          Your story <br />
          is still <br />
          <em>right here.</em>
        </h2>
        <p>
          Recover access to your account. <br />
          Your portfolio stays safely in place.
        </p>
      </div>
      <div className="auth-card">
        <a
          className="back-link"
          href="#signin"
          onClick={returnToSignIn}
          aria-disabled={busy || returning || loading}
        >
          {returning ? 'Signing out…' : '← Back to sign in'}
        </a>
        {returnError && (
          <p className="form-error" role="alert">
            {returnError}
          </p>
        )}
        <h1 ref={titleRef} tabIndex={-1}>
          {reset ? 'A fresh start.' : 'Forgot your password?'}
        </h1>
        <p className="auth-subtitle">
          {reset
            ? 'Choose a new password for Portfolio Studio.'
            : 'Enter your account email and we’ll help you get back in.'}
        </p>
        {!supabase ? (
          <p className="notice" role="status">
            Account connection is not set up yet.
          </p>
        ) : done ? (
          <div className="notice success" role="status">
            <p>
              {reset
                ? 'Your password has been updated. Your portfolio is unchanged.'
                : 'If this email can receive a reset link, you’ll find it in your inbox. Check your spam folder too.'}
            </p>
            {reset ? (
              <a href="#dashboard">Continue to my portfolio →</a>
            ) : (
              <p>Use the newest email and keep the app running while opening its link.</p>
            )}
          </div>
        ) : reset && loading ? (
          <p role="status">Checking your reset link…</p>
        ) : reset && !ready ? (
          <div className="notice" role="alert">
            <p>
              This reset link is missing, expired, or has already been used. Request a new email and
              open its link to choose a password.
            </p>
            <a href="#forgot">Request a new reset link →</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <fieldset disabled={busy || returning}>
              {reset ? (
                <>
                  <label htmlFor="new-password">New password</label>
                  <div className="password-field">
                    <input
                      id="new-password"
                      name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      aria-describedby="reset-password-help"
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <small id="reset-password-help">Use at least 12 characters.</small>
                  <label htmlFor="reset-confirmation">Confirm new password</label>
                  <input
                    id="reset-confirmation"
                    name="confirmation"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    maxLength={128}
                    required
                  />
                </>
              ) : (
                <>
                  <label htmlFor="recovery-email">Email address</label>
                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    maxLength={254}
                    required
                  />
                </>
              )}
              <button className="button primary full-width" type="submit">
                {busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link'}
              </button>
            </fieldset>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {reset && error && <a href="#forgot">Request a new reset link</a>}
          </form>
        )}
        {!reset && (
          <p className="auth-switch">
            Usually sign in with Google?{' '}
            <a href="#signin" onClick={returnToSignIn} aria-disabled={busy || returning || loading}>
              Continue with Google
            </a>{' '}
            instead.
          </p>
        )}
      </div>
    </section>
  );
}
