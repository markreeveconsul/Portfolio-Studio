import { useEffect, useId, useRef, useState } from 'react';
import './search-select.css';

interface Props {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}
export function SearchSelect({
  label,
  name,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  error,
}: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value)?.label ?? '';
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const choices = [{ value: '', label: 'None selected' }, ...filtered];
  useEffect(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, [disabled, value]);
  useEffect(() => {
    if (open)
      list.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);
  function show() {
    if (disabled || input.current?.matches(':disabled')) return;
    setQuery('');
    setActive(0);
    setOpen(true);
  }
  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
    input.current?.focus();
  }
  return (
    <div
      className="search-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery('');
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="search-select-control" data-open={open}>
        <input
          ref={input}
          id={id}
          name={name}
          role="combobox"
          autoComplete="off"
          value={open ? query : selected}
          placeholder={open ? 'Type to search…' : placeholder}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={open ? id + '-list' : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open ? id + '-option-' + active : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? id + '-error' : undefined}
          onClick={() => {
            if (!open) show();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setQuery('');
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) show();
              else
                setActive(
                  (index) =>
                    (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) %
                    choices.length,
                );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (!open) show();
              else choose(choices[active]?.value ?? '');
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={'Open ' + label.toLowerCase()}
          onClick={() => {
            input.current?.focus();
            if (open) setOpen(false);
            else show();
          }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
      {open && (
        <div className="search-select-popup">
          <div className="search-select-caption" role="status">
            {filtered.length} matching {name === 'barangay' ? 'barangays' : 'locations'}
          </div>
          <div ref={list} id={id + '-list'} role="listbox" aria-label={label}>
            {choices.map((option, index) => (
              <div
                key={option.value}
                id={id + '-option-' + index}
                role="option"
                aria-selected={option.value === value}
                data-active={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </div>
            ))}
          </div>
          {!filtered.length && <p>No matches. Try another spelling.</p>}
        </div>
      )}
      {error && (
        <small id={id + '-error'} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
