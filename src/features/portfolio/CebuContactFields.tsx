import { useId, useState } from 'react';
import {
  CEBU_BARANGAYS,
  emptyCebuAddress,
  normalizePhilippinePhone,
  validPhilippinePhone,
} from './cebu';
import type { PortfolioDraft, FieldErrors } from './model';
import './cebu.css';

export function CebuContactFields({
  draft,
  errors,
  onChange,
}: {
  draft: PortfolioDraft;
  errors: FieldErrors;
  onChange: (draft: PortfolioDraft) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState('');
  const address = draft.cebu_address;
  const normalized = normalizePhilippinePhone(draft.contact_number);
  const legacyPhone =
    !!draft.contact_number &&
    !validPhilippinePhone(normalized) &&
    !draft.contact_number.startsWith('+63');
  const updateAddress = (key: 'barangay' | 'street' | 'postal_code', value: string) =>
    onChange({ ...draft, cebu_address: { ...(address ?? emptyCebuAddress()), [key]: value } });
  const error = (key: string) =>
    errors[key] ? (
      <small id={id + key} role="alert">
        {errors[key]}
      </small>
    ) : null;
  return (
    <div className="cebu-contact">
      <label htmlFor={id + 'phone'}>Contact number (optional)</label>
      {legacyPhone ? (
        <>
          <input id={id + 'phone'} name="contact_number" value={draft.contact_number} readOnly />
          <small>Your existing number is preserved.</small>
          <button
            type="button"
            className="text-button"
            onClick={() => onChange({ ...draft, contact_number: '' })}
          >
            Replace with a Philippine number
          </button>
        </>
      ) : (
        <>
          <div className="cebu-phone">
            <span>+63</span>
            <input
              id={id + 'phone'}
              name="contact_number"
              type="tel"
              autoComplete="tel-national"
              value={draft.contact_number.replace(/^\+63/, '')}
              placeholder="917 123 4567"
              aria-invalid={!!errors.contact_number}
              aria-describedby={errors.contact_number ? id + 'contact_number' : id + 'phone-help'}
              onChange={(event) => {
                const value = event.target.value;
                onChange({
                  ...draft,
                  contact_number: value ? (value.startsWith('+') ? value : '+63' + value) : '',
                });
              }}
            />
          </div>
          <small id={id + 'phone-help'}>
            Philippine mobile or Cebu landline (area code 032). You can paste a full +63 number.
          </small>
        </>
      )}
      {error('contact_number')}
      {address ? (
        <>
          <div className="cebu-fixed">
            <div>
              <label htmlFor={id + 'country'}>Country</label>
              <input id={id + 'country'} value="Philippines" readOnly />
            </div>
            <div>
              <label htmlFor={id + 'city'}>City</label>
              <input id={id + 'city'} value="Cebu City" readOnly />
            </div>
          </div>
          <label htmlFor={id + 'search'}>Search barangays</label>
          <input
            id={id + 'search'}
            type="search"
            value={search}
            placeholder="Type a barangay name"
            onChange={(event) => setSearch(event.target.value)}
          />
          <label htmlFor={id + 'barangay'}>Barangay (optional)</label>
          <select
            id={id + 'barangay'}
            name="barangay"
            value={address.barangay}
            aria-invalid={!!errors.barangay}
            aria-describedby={errors.barangay ? id + 'barangay-error' : undefined}
            onChange={(event) => updateAddress('barangay', event.target.value)}
          >
            <option value="">Choose a barangay</option>
            {CEBU_BARANGAYS.filter(
              (name) =>
                name === address.barangay ||
                name.toLowerCase().includes(search.trim().toLowerCase()),
            ).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          {errors.barangay && (
            <small id={id + 'barangay-error'} role="alert">
              {errors.barangay}
            </small>
          )}
          {search &&
            !CEBU_BARANGAYS.some((name) =>
              name.toLowerCase().includes(search.trim().toLowerCase()),
            ) && <small role="status">No matching barangays. Try another spelling.</small>}
          <label htmlFor={id + 'street'}>Street, building, or unit (optional)</label>
          <input
            id={id + 'street'}
            name="street"
            autoComplete="address-line1"
            maxLength={200}
            value={address.street}
            onChange={(event) => updateAddress('street', event.target.value)}
            aria-invalid={!!errors.street}
            aria-describedby={errors.street ? id + 'street' + '-error' : undefined}
          />
          {errors.street && (
            <small id={id + 'street-error'} role="alert">
              {errors.street}
            </small>
          )}
          <label htmlFor={id + 'postal'}>Postal code (optional)</label>
          <input
            id={id + 'postal'}
            name="postal_code"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={4}
            value={address.postal_code}
            onChange={(event) => updateAddress('postal_code', event.target.value)}
            aria-invalid={!!errors.postal_code}
            aria-describedby={errors.postal_code ? id + 'postal_code' : undefined}
          />
          {error('postal_code')}
          <small>
            Your portfolio shows Cebu City, Philippines. Detailed address fields are retained here
            and accessible to authorized admins.
          </small>
        </>
      ) : (
        <>
          <label htmlFor={id + 'legacy'}>Existing address</label>
          <textarea id={id + 'legacy'} value={draft.address} readOnly />
          <small>This address stays unchanged unless you choose to replace it.</small>
          <button
            type="button"
            className="text-button"
            onClick={() => onChange({ ...draft, cebu_address: emptyCebuAddress() })}
          >
            Use Cebu City address fields
          </button>
        </>
      )}
    </div>
  );
}
