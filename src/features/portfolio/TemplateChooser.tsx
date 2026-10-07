import { useRef, useState } from 'react';
import type { Portfolio, PortfolioRepository } from './model';
import { saveErrorMessage } from './model';
import type { PhotoService } from './photos';
import { PortfolioView } from './PortfolioView';

const choices = [
  { id: 'simple', name: 'Simple', description: 'A quiet, single-column introduction.' },
  { id: 'modern', name: 'Modern', description: 'A structured sidebar with room for your work.' },
  { id: 'creative', name: 'Creative', description: 'Bold type, warm color, and project cards.' },
] as const;
export function TemplateChooser({
  portfolio,
  repository,
  photos,
  onSaved,
  onBusy,
}: {
  portfolio: Portfolio;
  repository: PortfolioRepository;
  photos?: PhotoService;
  onSaved: (portfolio: Portfolio) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState(portfolio.template);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save() {
    if (!repository.saveTemplate || lock.current || selected === portfolio.template) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await repository.saveTemplate(portfolio, selected);
      onSaved({ ...portfolio, ...result });
      setNotice('Template saved. Your information and photo are unchanged.');
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <>
      <section className="template-picker" aria-label="Choose a portfolio template">
        <h3>Choose your style</h3>
        <p>Preview with your saved information, then save your choice.</p>
        <fieldset disabled={busy} className="template-options">
          <legend className="sr-only">Portfolio template</legend>
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={`template-option ${selected === choice.id ? 'chosen' : ''}`}
            >
              <input
                type="radio"
                name="portfolio-template"
                value={choice.id}
                checked={selected === choice.id}
                onChange={() => {
                  setSelected(choice.id);
                  setError('');
                  setNotice('');
                }}
              />
              <span>
                <b>{choice.name}</b>
                <small>{choice.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="template-save">
          <p>
            {selected === portfolio.template
              ? 'Showing your saved template.'
              : 'Preview only · this choice has not been saved.'}
          </p>
          <button
            type="button"
            className="button small primary"
            disabled={busy || selected === portfolio.template || !repository.saveTemplate}
            onClick={save}
          >
            {busy ? 'Saving…' : 'Save template'}
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error} Return to Edit information to reload the saved version.
          </p>
        )}
        {notice && (
          <p role="status" className="field-hint">
            {notice}
          </p>
        )}
      </section>
      <PortfolioView portfolio={{ ...portfolio, template: selected }} photos={photos} />
    </>
  );
}
