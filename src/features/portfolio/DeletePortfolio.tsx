import { useId, useRef, useState } from 'react';
import type { Portfolio } from './model';
import type { DeletionService } from './deletion';
export function DeletePortfolio({
  portfolio,
  service,
  disabled,
  onBusy,
  onDeleted,
}: {
  portfolio: Portfolio;
  service: DeletionService;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const id = useId();
  async function remove() {
    if (confirmation !== 'DELETE' || disabled || locked.current) return;
    locked.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      await service.remove(portfolio);
      // The durable job remains if Storage is unavailable or this page closes.
      try {
        await service.cleanup();
      } catch {
        /* Cleanup panel offers retry. */
      }
      onDeleted();
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      setError(
        code === 'P0002'
          ? 'This portfolio changed or is no longer available. Return to Edit information and reload before deleting.'
          : code === 'PGRST202'
            ? 'Portfolio deletion is not available yet. Please contact the administrator to finish setting it up. Your portfolio was not deleted by this request.'
            : 'Deletion could not be confirmed. Reload your saved portfolio before trying again. If it was deleted, any pending photo cleanup can be retried below.',
      );
    } finally {
      locked.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="delete-portfolio" aria-label="Delete portfolio">
      <h3>Delete portfolio</h3>
      <p>
        Permanently remove your portfolio information, sections, and saved photo. Your sign-in
        account stays active.
      </p>
      {!open ? (
        <button
          type="button"
          className="button small outline"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          Delete my portfolio
        </button>
      ) : (
        <div className="delete-confirmation">
          <p>
            This cannot be undone. Type <b>DELETE</b> to confirm.
          </p>
          <label htmlFor={id}>Deletion confirmation</label>
          <input
            id={id}
            value={confirmation}
            autoComplete="off"
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <div className="photo-actions">
            <button
              type="button"
              className="button small danger"
              disabled={busy || disabled || confirmation !== 'DELETE'}
              onClick={remove}
            >
              {busy ? 'Deleting…' : 'Permanently delete portfolio'}
            </button>
            <button
              type="button"
              className="button small outline"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmation('');
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
