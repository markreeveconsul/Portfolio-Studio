import { useEffect, useState } from 'react';
import type { DeletionService } from './deletion';
export function PhotoCleanup({
  service,
  revision,
}: {
  service: DeletionService;
  revision: number;
}) {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    service
      .pending()
      .then((count) => {
        if (active) {
          setPending(count);
          setError('');
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Photo cleanup status could not be checked. Check your connection and database setup, then retry.',
          );
      });
    return () => {
      active = false;
    };
  }, [service, revision, retry]);
  async function cleanup() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await service.cleanup();
      setRetry((value) => value + 1);
    } catch {
      setError(
        'Some private photo files could not be removed. You can retry; your deletion request is saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!pending && !error) return null;
  return (
    <section className="notice cleanup-notice" aria-label="Pending photo cleanup">
      {pending > 0 && (
        <p>{pending} photo cleanup request(s) pending. The files remain private until removed.</p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="button small outline"
        disabled={busy}
        onClick={pending ? cleanup : () => setRetry((value) => value + 1)}
      >
        {busy ? 'Removing files…' : pending ? 'Retry photo cleanup' : 'Check again'}
      </button>
    </section>
  );
}
