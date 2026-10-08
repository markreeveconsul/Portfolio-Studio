import { PlatformIcon, platformForUrl } from '../../components/PlatformIcon';
import './editor-ux.css';
import { CebuContactFields } from './CebuContactFields';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { emptyDraft, saveErrorMessage, toDraft, validatePortfolio } from './model';
import type { FieldErrors, PortfolioDraft, Portfolio, PortfolioRepository } from './model';
import { SectionsEditor } from './SectionsEditor';
import type { SectionData } from './sections';
import { sectionDefinitions } from './sections';
import { TemplateChooser } from './TemplateChooser';
import { DeletePortfolio } from './DeletePortfolio';
import type { DeletionService } from './deletion';
import { PhotoEditor } from './PhotoEditor';
import type { PhotoService } from './photos';

interface Props {
  ownerId: string;
  repository: PortfolioRepository;
  onDirtyChange: (dirty: boolean) => void;
  photos?: PhotoService;
  deletion?: DeletionService;
  onDeleted?: () => void;
}

export function PortfolioEditor({
  ownerId,
  repository,
  onDirtyChange,
  photos,
  deletion,
  onDeleted,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [saved, setSaved] = useState<Portfolio | null>(null);
  const [draft, setDraft] = useState<PortfolioDraft>(emptyDraft);
  const [baseline, setBaseline] = useState<PortfolioDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [retry, setRetry] = useState(0);
  const [saveNotice, setSaveNotice] = useState('');
  const mounted = useRef(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onDirtyChange(dirty || photoBusy || templateBusy || deleting);
  }, [dirty, photoBusy, templateBusy, deleting, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    repository
      .loadOwn(ownerId)
      .then((portfolio) => {
        if (!active) return;
        const next = portfolio ? toDraft(portfolio) : emptyDraft();
        setSaved(portfolio);
        setDraft(next);
        setBaseline(next);
        setLoading(false);
        setSaveError('');
        setFieldErrors({});
        setSaveNotice('');
      })
      .catch(() => {
        if (active) {
          setLoadError(
            'Your saved portfolio could not be loaded. Please try again before editing.',
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [ownerId, repository, retry]);
  useEffect(() => {
    if (!loading) headingRef.current?.focus();
  }, [view, loading]);

  function update(
    field: keyof Omit<PortfolioDraft, 'social_links' | 'cebu_address' | keyof SectionData>,
    value: string,
  ) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setSaveNotice('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || photoBusy) return;
    const stayInEditor =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'stay';
    const { draft: normalized, errors } = validatePortfolio(draft, baseline.contact_number);
    setFieldErrors(errors);
    setSaveError('');
    setSaveNotice('');
    if (Object.keys(errors).length) {
      const name = Object.keys(errors)[0];
      const input = formRef.current?.elements.namedItem(name) as HTMLElement | null;
      input?.focus();
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const result = await repository.savePortfolio(normalized, saved?.updated_at ?? null);
      if (!mounted.current) return;
      const next = toDraft(result);
      setSaved(result);
      setDraft(next);
      setBaseline(next);
      onDirtyChange(false);
      setSaveNotice('Saved to your private portfolio.');
      if (!stayInEditor) setView('preview');
    } catch (error) {
      if (mounted.current) setSaveError(saveErrorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  function reloadSaved() {
    if (
      dirty &&
      !window.confirm('Discard the unsaved changes in this form and load the saved version?')
    )
      return;
    setRetry((value) => value + 1);
  }

  if (loading)
    return (
      <div className="editor-loading" role="status">
        Loading your private portfolio…
      </div>
    );
  if (loadError)
    return (
      <div className="editor-loading">
        <p role="alert">{loadError}</p>
        <button className="button outline" onClick={() => setRetry((value) => value + 1)}>
          Try again
        </button>
      </div>
    );

  if (view === 'preview' && saved)
    return (
      <div className="saved-preview">
        <div className="preview-toolbar">
          <div>
            <p className="eyebrow">YOUR PRIVATE PORTFOLIO</p>
            <h2 ref={headingRef} tabIndex={-1}>
              Your story, taking shape.
            </h2>
            <p>Only you and authorized admins can view this portfolio.</p>
          </div>
          <button
            className="button outline"
            disabled={templateBusy || deleting}
            onClick={() => setView('edit')}
          >
            <Icon name="edit" size={17} /> Edit information
          </button>
        </div>
        {saveNotice && (
          <p className="notice success" role="status">
            <Icon name="check" size={16} /> {saveNotice}
          </p>
        )}
        <fieldset disabled={deleting}>
          <TemplateChooser
            portfolio={saved}
            repository={repository}
            photos={photos}
            onSaved={setSaved}
            onBusy={setTemplateBusy}
          />
        </fieldset>
        {deletion && (
          <DeletePortfolio
            portfolio={saved}
            service={deletion}
            disabled={templateBusy}
            onBusy={setDeleting}
            onDeleted={() => {
              setSaved(null);
              setDraft(emptyDraft());
              setBaseline(emptyDraft());
              setView('edit');
              setSaveError('');
              setSaveNotice('Your portfolio was deleted. Your account is still active.');
              onDeleted?.();
            }}
          />
        )}
        <p className="saved-time">
          Last saved{' '}
          <time dateTime={saved.updated_at}>{new Date(saved.updated_at).toLocaleString()}</time>
        </p>
      </div>
    );

  const fields: {
    key: keyof Omit<PortfolioDraft, 'social_links' | 'cebu_address' | keyof SectionData>;
    label: string;
    type: string;
    limit: number;
    placeholder: string;
    hint?: string;
    autoComplete?: string;
  }[] = [
    {
      key: 'full_name',
      label: 'Full name',
      type: 'text',
      limit: 120,
      placeholder: 'How you would like to be introduced',
      autoComplete: 'name',
    },
    {
      key: 'email',
      label: 'Contact email',
      type: 'email',
      limit: 254,
      placeholder: 'you@example.com',
      hint: 'Shown on your portfolio. This does not change your sign-in email.',
      autoComplete: 'email',
    },
    {
      key: 'contact_number',
      label: 'Contact number',
      type: 'tel',
      limit: 40,
      placeholder: 'Include your country code',
      autoComplete: 'tel',
    },
    {
      key: 'address',
      label: 'Address or location',
      type: 'text',
      limit: 300,
      placeholder: 'City, country, or your preferred address',
      hint: 'A city and country are enough if you prefer.',
      autoComplete: 'street-address',
    },
  ];
  return (
    <div className="editor-layout">
      <aside className="editor-context">
        <p className="eyebrow">START WITH THE ESSENTIALS</p>
        <h2>
          Build your
          <br /> portfolio.
        </h2>
        <p>Start with your name. Add more whenever you’re ready.</p>
        <ol className="editor-roadmap" aria-label="Portfolio setup">
          <li>
            <b>1. Introduce yourself</b>
            <span>Save your name and any details you want to include.</span>
          </li>
          <li>
            <b>2. Add a photo · optional</b>
            <span>Save your information first, then upload your photo.</span>
          </li>
          <li>
            <b>3. Choose your style</b>
            <span>Use Save &amp; continue to preview and pick a template.</span>
          </li>
        </ol>
        <div className="editor-step">
          <span>01</span>
          <div>
            <b>Personal information</b>
            <small>Your introduction and contact details</small>
          </div>
        </div>
        <nav className="section-jumps" aria-label="Portfolio sections">
          <button
            type="button"
            className="text-button"
            onClick={() =>
              (formRef.current?.elements.namedItem('full_name') as HTMLElement | null)?.focus()
            }
          >
            Introduction <span>Start here</span>
          </button>
          {sectionDefinitions.map((section) => (
            <button
              type="button"
              className="text-button"
              key={section.key}
              onClick={() =>
                document
                  .getElementById(id + '-' + section.key)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {section.title}
              <span>{draft[section.key].length}</span>
            </button>
          ))}
        </nav>
        <div className="editor-privacy">
          <Icon name="lock" size={18} />
          <p>Private to you and authorized admins.</p>
        </div>
        {saved && (
          <button
            className="text-button"
            disabled={dirty || saving || photoBusy}
            onClick={() => setView('preview')}
          >
            <Icon name="eye" size={17} /> View saved portfolio
          </button>
        )}
      </aside>
      <form
        ref={formRef}
        className="personal-form"
        onSubmit={save}
        noValidate
        aria-labelledby={`${id}-heading`}
      >
        {saveNotice && !dirty && (
          <p className="notice success" role="status">
            {saveNotice}
          </p>
        )}
        <div className="editor-savebar">
          <div>
            <b>
              {saving
                ? 'Saving your information…'
                : dirty
                  ? 'You have unsaved changes'
                  : saved
                    ? 'Your information is saved'
                    : 'Start with your name'}
            </b>
            <p>
              {dirty
                ? 'Save before adding a photo or leaving this page.'
                : 'Save here to keep editing. Preview when you’re ready.'}
            </p>
          </div>
          <button
            className="button primary"
            type="submit"
            name="save-intent"
            value="stay"
            disabled={saving || photoBusy}
          >
            {saving ? 'Saving information…' : 'Save changes'}
          </button>
        </div>
        {Object.keys(fieldErrors).length > 0 && (
          <p className="form-error" role="alert">
            Check the highlighted fields before continuing.
          </p>
        )}
        {saveError && (
          <p className="form-error" role="alert">
            {saveError}
          </p>
        )}
        <div className="form-heading">
          <div>
            <p className="eyebrow">PERSONAL INFORMATION</p>
            <h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1}>
              Make your introduction.
            </h2>
            <p>Only your full name is required. Everything else is optional.</p>
          </div>
          <span className={`save-state ${dirty ? 'unsaved' : ''}`} role="status">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : saved ? 'Saved' : 'Not saved yet'}
          </span>
        </div>
        <fieldset disabled={saving || photoBusy}>
          <div className="personal-fields">
            {fields
              .filter((field) => field.key !== 'address' && field.key !== 'contact_number')
              .map((field) => (
                <div
                  className={`field ${field.key === 'full_name' || field.key === 'address' ? 'wide' : ''}`}
                  key={field.key}
                >
                  <label htmlFor={`${id}-${field.key}`}>
                    {field.label}
                    {field.key !== 'full_name' && <span>Optional</span>}
                  </label>
                  <input
                    id={`${id}-${field.key}`}
                    name={field.key}
                    type={field.type}
                    value={draft[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    maxLength={field.limit}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    required={field.key === 'full_name'}
                    aria-invalid={Boolean(fieldErrors[field.key])}
                    aria-describedby={`${id}-${field.key}-help`}
                  />
                  <div id={`${id}-${field.key}-help`}>
                    {fieldErrors[field.key] ? (
                      <p className="field-error">{fieldErrors[field.key]}</p>
                    ) : field.hint ? (
                      <p className="field-hint">{field.hint}</p>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
          {photos && (
            <PhotoEditor
              portfolio={saved}
              disabled={dirty || saving}
              service={photos}
              onBusy={setPhotoBusy}
              onSaved={(result) => {
                setSaved((previous) => (previous ? { ...previous, ...result } : previous));
                setSaveNotice('');
              }}
            />
          )}
          <CebuContactFields
            draft={draft}
            errors={fieldErrors}
            onChange={(next) => {
              setDraft(next);
              setFieldErrors({});
              setSaveNotice('');
            }}
          />
          <div className="field about-field">
            <label htmlFor={`${id}-about_me`}>
              About me <span>Optional</span>
            </label>
            <p className="field-hint" id={`${id}-about-help`}>
              What are you learning, what do you enjoy, and what would you like to work on?
            </p>
            <textarea
              id={`${id}-about_me`}
              name="about_me"
              value={draft.about_me}
              onChange={(event) => update('about_me', event.target.value)}
              maxLength={3000}
              rows={6}
              placeholder="A short introduction, in your own words…"
              aria-invalid={Boolean(fieldErrors.about_me)}
              aria-describedby={`${id}-about-help ${id}-about-count`}
            />
            <div className="field-meta">
              <p className="field-error">{fieldErrors.about_me}</p>
              <span id={`${id}-about-count`}>{draft.about_me.length.toLocaleString()} / 3,000</span>
            </div>
          </div>
          <section className="links-editor" aria-labelledby={`${id}-links-title`}>
            <div className="links-heading">
              <div>
                <h3 id={`${id}-links-title`}>
                  Around the web <span>Optional</span>
                </h3>
                <p className="field-hint">Connect your GitHub, LinkedIn, or personal website.</p>
              </div>
              <button
                type="button"
                className="button small outline"
                disabled={draft.social_links.length >= 10}
                onClick={() => {
                  setDraft((previous) => ({
                    ...previous,
                    social_links: [...previous.social_links, { label: '', url: '' }],
                  }));
                  setFieldErrors({});
                }}
              >
                + Add link
              </button>
            </div>
            {draft.social_links.length === 0 && (
              <p className="links-empty">No links added. You can always add them later.</p>
            )}
            {draft.social_links.map((link, index) => (
              <div className="link-row" key={index}>
                <div className="field">
                  <label htmlFor={`${id}-link-label-${index}`}>Link {index + 1} label</label>
                  <input
                    id={`${id}-link-label-${index}`}
                    name={`link_label_${index}`}
                    value={link.label}
                    maxLength={80}
                    placeholder="e.g. GitHub"
                    onChange={(event) => {
                      setDraft((previous) => ({
                        ...previous,
                        social_links: previous.social_links.map((item, n) =>
                          n === index ? { ...item, label: event.target.value } : item,
                        ),
                      }));
                      setFieldErrors({});
                    }}
                    aria-invalid={Boolean(fieldErrors[`link_label_${index}`])}
                    aria-describedby={`${id}-link-label-error-${index}`}
                  />
                  <p id={`${id}-link-label-error-${index}`} className="field-error">
                    {fieldErrors[`link_label_${index}`]}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor={`${id}-link-url-${index}`}>Link {index + 1} URL</label>
                  <input
                    id={`${id}-link-url-${index}`}
                    name={`link_url_${index}`}
                    type="url"
                    value={link.url}
                    maxLength={2000}
                    placeholder="https://…"
                    onChange={(event) => {
                      setDraft((previous) => ({
                        ...previous,
                        social_links: previous.social_links.map((item, n) =>
                          n === index ? { ...item, url: event.target.value } : item,
                        ),
                      }));
                      setFieldErrors({});
                    }}
                    aria-invalid={Boolean(fieldErrors[`link_url_${index}`])}
                    aria-describedby={`${id}-link-url-error-${index}`}
                  />
                  <p className="platform-detection">
                    <PlatformIcon url={link.url} />
                    {platformForUrl(link.url)?.name ?? 'Website'} · icon chosen from URL
                  </p>
                  <p id={`${id}-link-url-error-${index}`} className="field-error">
                    {fieldErrors[`link_url_${index}`]}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button remove-link"
                  aria-label={`Remove link ${index + 1}`}
                  onClick={() => {
                    setDraft((previous) => ({
                      ...previous,
                      social_links: previous.social_links.filter((_, n) => n !== index),
                    }));
                    setFieldErrors({});
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            {fieldErrors.social_links && <p className="field-error">{fieldErrors.social_links}</p>}
          </section>
          <SectionsEditor
            value={draft}
            errors={fieldErrors}
            id={id}
            onChange={(sections) => {
              setDraft((previous) => ({ ...previous, ...sections }));
              setFieldErrors({});
              setSaveNotice('');
            }}
          />
          <div className="editor-next-step">
            <b>Ready to see your portfolio?</b>
            <p>
              Save &amp; continue opens your private preview, where you can choose a template. You
              can return to edit at any time.
            </p>
          </div>
          <div className="form-actions">
            <button type="button" className="text-button" onClick={reloadSaved}>
              Reload saved version
            </button>
            <button className="button primary" type="submit">
              {saving ? 'Saving…' : 'Save & continue'}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
