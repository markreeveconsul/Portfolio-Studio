import { useEffect, useRef, useState } from 'react';
import type { Portfolio, PortfolioRepository, PortfolioSummary } from './model';
import { PortfolioView } from './PortfolioView';
import { Icon } from '../../components/Icon';

export function AdminPortfolios({ repository }: { repository: PortfolioRepository }) {
  const [rows, setRows] = useState<PortfolioSummary[]>([]);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setPortfolio(null);
    setRows([]);
    const request = selection ? repository.loadById(selection) : repository.listForAdmin(page);
    request
      .then((result) => {
        if (!active) return;
        if (selection) {
          if (!result)
            setError(
              'This portfolio is unavailable. It may have been deleted or your access may have changed.',
            );
          else setPortfolio(result as Portfolio);
        } else setRows(result as PortfolioSummary[]);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError(
            'The portfolios could not be loaded. Please check your connection and access, then try again.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [repository, selection, page, retry]);
  useEffect(() => {
    if (!loading) title.current?.focus();
  }, [loading]);
  return (
    <section className="admin-portfolios">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">AUTHORIZED ADMIN ACCESS · READ ONLY</p>
          <h2 ref={title} tabIndex={-1}>
            {selection ? 'Portfolio review' : 'Private portfolios'}
          </h2>
          <p>Review saved information. Only the owner can edit it.</p>
        </div>
        {selection && (
          <button className="button outline" onClick={() => setSelection(null)}>
            ← Back to portfolios
          </button>
        )}
      </div>
      {loading ? (
        <p className="editor-loading" role="status">
          Loading private portfolios…
        </p>
      ) : error ? (
        <div className="notice">
          <p role="alert">{error}</p>
          <button className="text-button" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : portfolio ? (
        <PortfolioView portfolio={portfolio} />
      ) : (
        <>
          <div className="admin-list">
            {rows.length === 0 ? (
              <p className="editor-loading">
                {page === 0
                  ? 'No portfolios have been created yet.'
                  : 'No more portfolios on this page.'}
              </p>
            ) : (
              rows.map((row) => (
                <div className="admin-row" key={row.id}>
                  <div>
                    <h3>{row.full_name}</h3>
                    <p>
                      Saved{' '}
                      <time dateTime={row.updated_at}>
                        {new Date(row.updated_at).toLocaleString()}
                      </time>
                    </p>
                  </div>
                  <button
                    className="button small outline"
                    onClick={() => setSelection(row.id)}
                    aria-label={`View ${row.full_name}'s portfolio`}
                  >
                    View <Icon name="eye" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="admin-pagination">
            <button
              className="button small outline"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="button small outline"
              disabled={rows.length < 20}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
