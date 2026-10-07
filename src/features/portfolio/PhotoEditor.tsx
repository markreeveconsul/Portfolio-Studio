import { useEffect, useId, useRef, useState } from 'react';
import type { Portfolio } from './model';
import { validatePhoto } from './photos';
import type { PhotoService } from './photos';
import { PrivatePhoto } from './PrivatePhoto';

export function PhotoEditor({
  portfolio,
  disabled,
  service,
  onSaved,
  onBusy,
}: {
  portfolio: Portfolio | null;
  disabled: boolean;
  service: PhotoService;
  onSaved: (result: { photo_path: string | null; updated_at: string }) => void;
  onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save(remove: boolean) {
    if (!portfolio || disabled || locked.current || (!remove && !file)) return;
    locked.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await service.save(portfolio, remove ? null : file);
      if (!mounted.current) return;
      onSaved(result);
      setFile(null);
      if (input.current) input.current.value = '';
      setNotice(result.warning || (remove ? 'Photo removed.' : 'Photo saved privately.'));
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : 'Photo could not be saved. Reload and try again.',
        );
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  return (
    <section className="photo-editor" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>
        Profile photo <span>Optional</span>
      </h3>
      <p className="field-hint">
        JPG, PNG, or WebP · up to 2 MB. Visible only to you and authorized admins.
      </p>
      {!portfolio || disabled ? (
        <p className="field-hint">Save your information before changing your photo.</p>
      ) : null}
      <div className="photo-controls">
        {preview ? (
          <img className="portfolio-photo" src={preview} alt="Selected photo preview" />
        ) : (
          <PrivatePhoto
            path={portfolio?.photo_path}
            name={portfolio?.full_name || ''}
            service={service}
          />
        )}
        <div>
          <label htmlFor={id}>Choose a photo</label>
          <input
            ref={input}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={!portfolio || disabled || busy}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              setError('');
              setNotice('');
              if (!selected) return;
              const validation = validatePhoto(selected);
              if (validation) {
                setError(validation);
                event.target.value = '';
                setFile(null);
                return;
              }
              setFile(selected);
            }}
          />
          {file && <p className="field-hint">Preview only. Choose Save photo to upload it.</p>}
        </div>
      </div>
      <div className="photo-actions">
        {file && (
          <>
            <button
              type="button"
              className="button small outline"
              disabled={busy || disabled}
              onClick={() => save(false)}
            >
              {busy ? 'Saving…' : 'Save photo'}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setFile(null);
                if (input.current) input.current.value = '';
              }}
            >
              Cancel selection
            </button>
          </>
        )}
        {portfolio?.photo_path && (
          <button
            type="button"
            className="text-button"
            disabled={busy || disabled}
            onClick={() => {
              if (window.confirm('Remove your saved profile photo?')) void save(true);
            }}
          >
            Remove photo
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="field-hint" role="status">
          {notice}
        </p>
      )}
      {busy && <p role="status">Updating your private photo…</p>}
    </section>
  );
}
