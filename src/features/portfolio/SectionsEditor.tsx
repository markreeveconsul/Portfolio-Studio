import { Icon } from '../../components/Icon';
import { newEntry, sectionDefinitions } from './sections';
import type { SectionData } from './sections';
import type { FieldErrors } from './model';

export function SectionsEditor({
  value,
  errors,
  onChange,
  id,
}: {
  value: SectionData;
  errors: FieldErrors;
  onChange: (sections: SectionData) => void;
  id: string;
}) {
  return (
    <div className="additional-sections">
      {sectionDefinitions.map((definition) => (
        <section
          className="repeat-section"
          key={definition.key}
          id={`${id}-${definition.key}`}
          aria-labelledby={`${id}-${definition.key}-heading`}
        >
          <div className="links-heading">
            <div>
              <h3 id={`${id}-${definition.key}-heading`}>
                {definition.title} <span>Optional</span>
              </h3>
              <p className="field-hint">{definition.description}</p>
            </div>
            <button
              className="button small outline"
              type="button"
              disabled={value[definition.key].length >= 30}
              onClick={() =>
                onChange({
                  ...value,
                  [definition.key]: [...value[definition.key], newEntry(definition.key)],
                })
              }
            >
              + Add {definition.singular}
            </button>
          </div>
          {value[definition.key].length === 0 && (
            <p className="links-empty">No {definition.key} added yet.</p>
          )}
          {value[definition.key].map((entry, index) => (
            <div className="section-entry" key={index}>
              <div className="entry-heading">
                <h4>
                  {definition.title} {index + 1}
                </h4>
                <button
                  type="button"
                  className="text-button remove-entry"
                  aria-label={`Remove ${definition.singular} ${index + 1}`}
                  onClick={() =>
                    onChange({
                      ...value,
                      [definition.key]: value[definition.key].filter(
                        (_, position) => position !== index,
                      ),
                    })
                  }
                >
                  <Icon name="close" size={15} /> Remove
                </button>
              </div>
              <div className="entry-fields">
                {definition.fields.map((field) => {
                  const name = `${definition.key}_${index}_${field.key}`;
                  const props = {
                    id: `${id}-${name}`,
                    name,
                    value: entry[field.key] ?? '',
                    required: field.required,
                    maxLength: field.limit,
                    'aria-invalid': Boolean(errors[name]),
                    'aria-describedby': `${id}-${name}-help`,
                    onChange: (
                      event: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                      >,
                    ) =>
                      onChange({
                        ...value,
                        [definition.key]: value[definition.key].map((row, position) =>
                          position === index
                            ? {
                                ...row,
                                [field.key]:
                                  field.type === 'year' && event.target.value
                                    ? event.target.value + '-01-01'
                                    : event.target.value,
                              }
                            : row,
                        ),
                      }),
                  };
                  return (
                    <div
                      className={`field ${field.type === 'textarea' ? 'wide' : ''}`}
                      key={field.key}
                    >
                      <label htmlFor={props.id}>
                        {field.label} {!field.required && <span>Optional</span>}
                      </label>
                      {field.type === 'year' ? (
                        <select
                          {...props}
                          className="education-year"
                          value={(entry[field.key] ?? '').slice(0, 4)}
                        >
                          <option value="">
                            {field.key === 'end_date' ? 'Ongoing / not specified' : 'Choose a year'}
                          </option>
                          {[
                            ...new Set([
                              ...Array.from(
                                { length: new Date().getFullYear() + 11 - 1900 },
                                (_, i) => String(1900 + i),
                              ),
                              ...(entry[field.key] ? [entry[field.key].slice(0, 4)] : []),
                            ]),
                          ]
                            .sort()
                            .reverse()
                            .map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea {...props} rows={4} />
                      ) : (
                        <input
                          {...props}
                          type={field.type ?? 'text'}
                          placeholder={field.type === 'url' ? 'https://…' : undefined}
                          min={field.key === 'end_date' ? entry.start_date || undefined : undefined}
                          max={field.type === 'date' ? '9999-12-31' : undefined}
                        />
                      )}
                      <div id={`${id}-${name}-help`}>
                        {errors[name] ? (
                          <p className="field-error">{errors[name]}</p>
                        ) : field.key === 'end_date' ? (
                          <p className="field-hint">Leave empty if ongoing or unknown.</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {errors[definition.key] && <p className="field-error">{errors[definition.key]}</p>}
        </section>
      ))}
    </div>
  );
}
