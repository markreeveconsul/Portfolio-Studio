import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon';
import { PortfolioEditor } from './PortfolioEditor';
import { AdminPortfolios } from './AdminPortfolios';
import { portfolioRepository } from './repository';
import './portfolio.css';
import { photoService } from './photos';
import { deletionService } from './deletion';
import { PhotoCleanup } from './PhotoCleanup';

export function Workspace({
  session,
  adminPage,
  titleRef,
  onDirtyChange,
}: {
  session: Session;
  adminPage: boolean;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [cleanupRevision, setCleanupRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setChecking(true);
    setIsAdmin(false);
    setError('');
    supabase!.rpc('is_admin').then(
      ({ data, error: requestError }) => {
        if (!active) return;
        if (requestError)
          setError('We could not verify your access. Please try again in a moment.');
        else setIsAdmin(data === true);
        setChecking(false);
      },
      () => {
        if (active) {
          setError('Unable to connect. Please try again.');
          setChecking(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [session.user.id, retry]);
  if (checking)
    return (
      <div className="container page-status" role="status">
        Checking account access…
      </div>
    );
  if (error)
    return (
      <section className="container access-gate">
        <h1 ref={titleRef} tabIndex={-1}>
          Unable to verify access
        </h1>
        <p role="alert">{error}</p>
        <button className="button primary" onClick={() => setRetry((value) => value + 1)}>
          Try again
        </button>
      </section>
    );
  if (adminPage && !isAdmin)
    return (
      <section className="container access-gate">
        <Icon name="lock" size={32} />
        <h1 ref={titleRef} tabIndex={-1}>
          Admin access required.
        </h1>
        <p>This account does not have permission to enter the admin area.</p>
        <a className="button primary" href="#dashboard">
          Back to my portfolio
        </a>
      </section>
    );
  return (
    <section className="container workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE WORKSPACE</p>
          <h1 ref={titleRef} tabIndex={-1}>
            {adminPage ? 'Admin workspace' : 'My portfolio'}
          </h1>
          <p>
            Signed in as <b>{session.user.email}</b>
          </p>
        </div>
        <span className="pill">
          <Icon name="lock" size={14} />
          {isAdmin ? (adminPage ? 'Admin · view only' : 'Admin account') : 'Private portfolio'}
        </span>
      </div>
      <nav className="workspace-tabs" aria-label="Workspace">
        <a
          className={!adminPage ? 'selected' : ''}
          aria-current={!adminPage ? 'page' : undefined}
          href="#dashboard"
        >
          My portfolio
        </a>
        {isAdmin && (
          <a
            className={adminPage ? 'selected' : ''}
            aria-current={adminPage ? 'page' : undefined}
            href="#admin"
          >
            Admin workspace
          </a>
        )}
      </nav>
      {adminPage ? (
        <AdminPortfolios repository={portfolioRepository} />
      ) : (
        <PortfolioEditor
          deletion={deletionService}
          onDeleted={() => setCleanupRevision((value) => value + 1)}
          photos={photoService}
          ownerId={session.user.id}
          repository={portfolioRepository}
          onDirtyChange={onDirtyChange}
        />
      )}
      {!adminPage && <PhotoCleanup service={deletionService} revision={cleanupRevision} />}
    </section>
  );
}
