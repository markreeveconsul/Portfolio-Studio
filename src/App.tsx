import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Icon } from './components/Icon';
import { TemplatePreview, templates } from './components/TemplatePreview';
import type { TemplateName } from './components/TemplatePreview';
import { supabase } from './lib/supabase';
import { Workspace } from './features/portfolio/Workspace';
import { PasswordRecovery } from './features/auth/PasswordRecovery';

type Route = 'home' | 'signin' | 'signup' | 'dashboard' | 'admin' | 'forgot' | 'reset';
const routes: Route[] = ['home', 'signin', 'signup', 'dashboard', 'admin', 'forgot', 'reset'];
function currentRoute(): Route {
  if (new URLSearchParams(location.search).get('auth') === 'recovery') return 'reset';
  if (new URLSearchParams(location.search).get('auth') === 'google') return 'signin';
  const value = location.hash.slice(1).split('?')[0] as Route;
  return routes.includes(value) ? value : 'home';
}

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Portfolio Studio home">
      <span className="brand-mark">
        p<span>.</span>
      </span>
      <span>
        portfolio<span className="brand-light"> studio</span>
      </span>
    </a>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [preview, setPreview] = useState<TemplateName | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const firstRoute = useRef(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const routeRef = useRef(route);
  dirtyRef.current = dirty;
  routeRef.current = route;

  useEffect(() => {
    const update = () => {
      const next = currentRoute();
      if (
        next !== routeRef.current &&
        dirtyRef.current &&
        !window.confirm('Leave this page and discard your unsaved changes?')
      ) {
        history.replaceState(null, '', '#' + routeRef.current);
        return;
      }
      if (next !== routeRef.current) setDirty(false);
      setRoute(next);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    document.title = `${route === 'home' ? 'A thoughtful home for your work' : route === 'signin' ? 'Sign in' : route === 'signup' ? 'Create account' : route === 'forgot' ? 'Forgot password' : route === 'reset' ? 'Reset password' : route === 'admin' ? 'Admin access' : 'My portfolio'} · Portfolio Studio`;
    if (firstRoute.current) firstRoute.current = false;
    else title.current?.focus();
  }, [route]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const googleReturn = new URLSearchParams(location.search).get('auth') === 'google';
    const recoveryReturn = new URLSearchParams(location.search).get('auth') === 'recovery';
    const finishRecoveryReturn = () => {
      if (!recoveryReturn) return;
      // Let the SDK consume the URL first; never treat a query marker as authorization.
      history.replaceState(null, '', `${location.pathname}#reset`);
      setRoute('reset');
    };
    const finishGoogleReturn = (next: Session | null) => {
      if (!googleReturn) return;
      const destination = next ? 'dashboard' : 'signin';
      history.replaceState(null, '', `${location.pathname}#${destination}`);
      setRoute(destination);
      if (!next)
        setAuthError('Google sign-in was not completed. Try again or use email and password.');
    };
    // Subscribe before the initial read so a new session cannot be missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
        if (!next) setRecoveryReady(false);
        if (event === 'PASSWORD_RECOVERY' && next) {
          setRecoveryReady(true);
          history.replaceState(null, '', `${location.pathname}#reset`);
          setRoute('reset');
        }
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
        if (error) setAuthError('Your session could not be restored. Please sign in again.');
        finishGoogleReturn(error ? null : data.session);
        finishRecoveryReturn();
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setAuthError('Unable to connect. Check your connection and try again.');
          finishGoogleReturn(null);
          finishRecoveryReturn();
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading && session && (route === 'signin' || route === 'signup'))
      location.hash = 'dashboard';
  }, [session, loading, route]);

  useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
    document.body.style.overflow = preview ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [preview]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, []);

  async function signOut() {
    if (!supabase || signingOut) return;
    if (dirtyRef.current && !window.confirm('Sign out and discard your unsaved changes?')) return;
    setSigningOut(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      dirtyRef.current = false;
      setDirty(false);
      setSession(null);
      location.hash = 'home';
    } catch {
      setAuthError('Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  async function returnToSignIn() {
    // A recovery link establishes a session. End it before showing the sign-in route.
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    setSession(null);
    setRecoveryReady(false);
    setAuthError('');
    history.replaceState(null, '', `${location.pathname}#signin`);
    setRoute('signin');
  }

  const privateRoute = route === 'dashboard' || route === 'admin';
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a className={route === 'home' ? 'active' : ''} href="#home">
              Overview
            </a>
            {session ? (
              <>
                <a className={privateRoute ? 'active' : ''} href="#dashboard">
                  My portfolio
                </a>
                <button className="text-button signout" onClick={signOut} disabled={signingOut}>
                  <Icon name="logout" />
                  <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </>
            ) : (
              <a className="button small outline" href="#signin">
                Sign in <Icon name="arrow" size={16} />
              </a>
            )}
          </nav>
        </div>
      </header>
      {authError && (
        <div className="global-error" role="alert">
          {authError}
          <button className="text-button" onClick={() => setAuthError('')}>
            Dismiss
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {route === 'home' && (
          <>
            <section className="hero container">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> YOUR NEXT CHAPTER STARTS HERE
                </div>
                <h1 ref={title} tabIndex={-1}>
                  Your work.
                  <br />
                  Your story.
                  <br />
                  <em>Beautifully you.</em>
                </h1>
                <p className="hero-description">
                  Bring your skills, projects, and experience together in a portfolio that feels
                  like you.
                </p>
                <div className="hero-actions">
                  <a className="button primary" href={session ? '#dashboard' : '#signup'}>
                    {session ? 'My portfolio' : 'Create your portfolio'}
                    <Icon name="arrow" />
                  </a>
                  <button
                    className="text-button"
                    onClick={() =>
                      document.getElementById('templates')?.scrollIntoView({
                        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                          ? 'instant'
                          : 'smooth',
                      })
                    }
                  >
                    Explore templates <span aria-hidden="true">↓</span>
                  </button>
                </div>
                <p className="privacy-note">
                  <Icon name="lock" size={15} /> Private to you and authorized admins.
                </p>
              </div>
              <div className="hero-visual">
                <div className="paper-orbit" />
                <div className="hero-paper">
                  <div className="browser-bar">
                    <i />
                    <i />
                    <i />
                    <span>YOUR PORTFOLIO, REIMAGINED</span>
                  </div>
                  <TemplatePreview template="simple" />
                </div>
                <div className="floating-note">
                  <span className="note-icon">
                    <Icon name="check" size={18} />
                  </span>
                  <div>
                    A little structure.
                    <br />
                    <b>A lot of possibility.</b>
                  </div>
                </div>
                <div className="vertical-caption">MADE FOR YOUR NEXT STEP</div>
              </div>
            </section>
            <section className="process-strip" aria-label="How it works">
              <div className="container process-grid">
                {[
                  ['01', 'Tell your story', 'Add the details that make you, you.'],
                  ['02', 'Find your style', 'Choose from three distinct templates.'],
                  ['03', 'Make it yours', 'Preview, refine, and keep it up to date.'],
                ].map(([n, heading, copy]) => (
                  <div className="process-item" key={n}>
                    <span>{n}</span>
                    <div>
                      <h2>{heading}</h2>
                      <p>{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="templates-section container" id="templates">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THREE WAYS TO BE YOURSELF</p>
                  <h2>
                    A good first impression,
                    <br />
                    in your own style.
                  </h2>
                </div>
                <p>
                  One story. Three different perspectives.
                  <br />
                  Start with the one that feels right.
                </p>
              </div>
              <div className="template-grid">
                {templates.map((t) => (
                  <article className="template-card" key={t.id}>
                    <button
                      className={`template-open ${t.id}-frame`}
                      onClick={() => setPreview(t.id)}
                      aria-label={`Preview ${t.label} template`}
                    >
                      <TemplatePreview template={t.id} />
                      <span className="preview-label">
                        <Icon name="eye" size={16} /> Preview template
                      </span>
                    </button>
                    <div className="template-card-heading">
                      <h3>{t.label}</h3>
                      <span>{t.tag}</span>
                    </div>
                    <p>{t.description}</p>
                  </article>
                ))}
              </div>
              <p className="sample-disclaimer">
                Template previews use fictional sample information.
              </p>
            </section>
            <section className="privacy-panel container">
              <span className="privacy-symbol">
                <Icon name="lock" size={26} />
              </span>
              <div>
                <h2>Your story stays in trusted hands.</h2>
                <p>
                  Your personal portfolio is visible only to you and authorized admins. Other users
                  cannot browse your information.
                </p>
              </div>
              <span className="pill">
                <Icon name="lock" size={13} /> Private by default
              </span>
            </section>
          </>
        )}
        {(route === 'signin' || route === 'signup') && (
          <AuthScreen key={route} mode={route} titleRef={title} />
        )}
        {(route === 'forgot' || route === 'reset') && (
          <PasswordRecovery
            key={route}
            mode={route}
            ready={recoveryReady && Boolean(session)}
            loading={loading}
            titleRef={title}
            onComplete={() => setRecoveryReady(false)}
            onReturnToSignIn={returnToSignIn}
          />
        )}
        {privateRoute &&
          (loading ? (
            <div className="container page-status" role="status">
              Restoring your session…
            </div>
          ) : session ? (
            <Workspace
              key={session.user.id}
              session={session}
              adminPage={route === 'admin'}
              onDirtyChange={setDirty}
              titleRef={title}
            />
          ) : (
            <section className="container access-gate">
              <span className="large-icon">
                <Icon name="lock" size={30} />
              </span>
              <h1 ref={title} tabIndex={-1}>
                A space just for you.
              </h1>
              <p>Sign in to access your private portfolio.</p>
              <a className="button primary" href="#signin">
                Sign in <Icon name="arrow" />
              </a>
            </section>
          ))}
      </main>
      <footer className="site-footer container">
        <Brand />
        <span>A thoughtful home for your work.</span>
        <p>Built with purpose. Made for you.</p>
      </footer>
      <dialog
        ref={dialog}
        className="preview-dialog"
        onCancel={() => setPreview(null)}
        onClose={() => setPreview(null)}
        aria-labelledby="preview-title"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">FICTIONAL SAMPLE · DESIGN PREVIEW</p>
            <h2 id="preview-title">{templates.find((t) => t.id === preview)?.label} template</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close preview"
            onClick={() => setPreview(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {preview && <TemplatePreview template={preview} large />}
        <p className="dialog-footnote">
          A visual direction for the template. Your information will replace the sample content in a
          later milestone.
        </p>
      </dialog>
    </>
  );
}

type TitleRef = React.RefObject<HTMLHeadingElement | null>;
function AuthScreen({ mode, titleRef }: { mode: 'signin' | 'signup'; titleRef: TitleRef }) {
  const signup = mode === 'signup';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const authPending = useRef(false);
  async function continueWithGoogle() {
    if (!supabase || authPending.current) return;
    authPending.current = true;
    setGoogleBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: requestError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/?auth=google` },
      });
      if (requestError) throw requestError;
      // Remain disabled while the SDK navigates to Google.
    } catch {
      setError('Google sign-in is unavailable right now. Try again or use email and password.');
      authPending.current = false;
      setGoogleBusy(false);
    }
  }
  useEffect(() => {
    const restoreAfterBack = () => {
      authPending.current = false;
      setGoogleBusy(false);
      setBusy(false);
    };
    window.addEventListener('pageshow', restoreAfterBack);
    return () => window.removeEventListener('pageshow', restoreAfterBack);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || authPending.current) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    if (signup && password !== String(form.get('confirmation'))) {
      setError('Your passwords do not match. Please check both fields.');
      return;
    }
    authPending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data, error: requestError } = signup
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/#dashboard` },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (requestError) throw requestError;
      if (data.session) location.hash = 'dashboard';
      else
        setMessage(
          'Check your email for a confirmation link. If you already have an account, sign in instead.',
        );
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(
        status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : signup
            ? 'We could not create your account. Check your details and connection, then try again.'
            : 'Unable to sign in. Check your email, password, and email confirmation, then try again.',
      );
    } finally {
      authPending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout container">
      <div className="auth-story">
        <p className="eyebrow">A SPACE FOR YOUR NEXT CHAPTER</p>
        <h2>
          Good things <br />
          start with <br />
          <em>your story.</em>
        </h2>
        <p>
          Small beginnings. Meaningful projects.
          <br />
          Everything you’re becoming, in one place.
        </p>
        <div className="auth-privacy">
          <Icon name="lock" />
          <p>Only you and authorized admins can access your personal portfolio.</p>
        </div>
      </div>
      <div className="auth-card">
        <a className="back-link" href="#home">
          ← Back to overview
        </a>
        <h1 ref={titleRef} tabIndex={-1}>
          {signup ? 'Make room for your work.' : 'Welcome back.'}
        </h1>
        <p className="auth-subtitle">
          {signup
            ? 'Create your account to get started.'
            : 'Your next chapter is right where you left it.'}
        </p>
        {!supabase && (
          <div className="notice" role="status">
            <b>Account connection is not set up yet.</b>
            <p>
              This first milestone is ready for review. Sign-in will work after the project’s
              Supabase connection is configured.
            </p>
          </div>
        )}
        <form onSubmit={submit}>
          <fieldset disabled={!supabase || busy || googleBusy}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
            />
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                minLength={signup ? 12 : 1}
                maxLength={128}
                required
                aria-describedby={signup ? 'password-help' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {signup && (
              <>
                <small id="password-help">Use at least 12 characters.</small>
                <label htmlFor="confirmation">Confirm password</label>
                <input
                  id="confirmation"
                  name="confirmation"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  maxLength={128}
                />
              </>
            )}
            <button className="button primary full-width" type="submit">
              {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
              <Icon name="arrow" size={18} />
            </button>
          </fieldset>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice success" role="status">
              {message}
            </p>
          )}
        </form>
        {!signup && (
          <p className="auth-switch">
            <a href="#forgot">Forgot password?</a>
          </p>
        )}
        <div className="auth-divider">
          <span>or</span>
        </div>
        <button
          type="button"
          className="button outline full-width google-signin"
          disabled={!supabase || busy || googleBusy}
          onClick={continueWithGoogle}
        >
          <svg
            className="google-logo"
            width="20"
            height="20"
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
            />
          </svg>
          <span>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</span>
        </button>
        {googleBusy && (
          <p role="status" className="auth-subtitle">
            Taking you to Google to sign in securely…
          </p>
        )}
        <p className="auth-switch">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <a href={signup ? '#signin' : '#signup'}>{signup ? 'Sign in' : 'Create an account'}</a>
        </p>
      </div>
    </section>
  );
}
