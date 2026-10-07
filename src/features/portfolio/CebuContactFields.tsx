import { useId } from 'react';
import { SearchSelect } from '../../components/SearchSelect';
import {
  CEBU_LOCATIONS,
  cityCode,
  cityLocation,
  addressSummary,
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
            <span className="cebu-phone-prefix" id={id + 'phone-prefix'}>
              <svg
                className="philippine-flag"
                viewBox="0 0 60 30"
                width="28"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path fill="#0038a8" d="M0 0h60v15H0z" />
                <path fill="#ce1126" d="M0 15h60v15H0z" />
                <path fill="#fff" d="M0 0L26 15 0 30z" />
                <circle cx="10" cy="15" r="3" fill="#fcd116" />
                <path d="M 13.70 15.00 L 15.50 15.00" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 12.62 17.62 L 13.89 18.89" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 10.00 18.70 L 10.00 20.50" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 7.38 17.62 L 6.11 18.89" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 6.30 15.00 L 4.50 15.00" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 7.38 12.38 L 6.11 11.11" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 10.00 11.30 L 10.00 9.50" stroke="#fcd116" strokeWidth="1.4" />
                <path d="M 12.62 12.38 L 13.89 11.11" stroke="#fcd116" strokeWidth="1.4" />
                <polygon
                  fill="#fcd116"
                  points="3.50,2.60 3.95,3.89 5.31,3.91 4.22,4.73 4.62,6.04 3.50,5.26 2.38,6.04 2.78,4.73 1.69,3.91 3.05,3.89"
                />
                <polygon
                  fill="#fcd116"
                  points="3.50,23.60 3.95,24.89 5.31,24.91 4.22,25.73 4.62,27.04 3.50,26.26 2.38,27.04 2.78,25.73 1.69,24.91 3.05,24.89"
                />
                <polygon
                  fill="#fcd116"
                  points="21.50,13.10 21.95,14.39 23.31,14.41 22.22,15.23 22.62,16.54 21.50,15.76 20.38,16.54 20.78,15.23 19.69,14.41 21.05,14.39"
                />
              </svg>
              <span className="sr-only">Philippines country code </span>
              <span>+63</span>
            </span>
            <input
              id={id + 'phone'}
              name="contact_number"
              type="tel"
              autoComplete="tel-national"
              value={draft.contact_number.replace(/^\+63/, '')}
              placeholder="917 123 4567"
              aria-invalid={!!errors.contact_number}
              aria-describedby={`${id}phone-prefix ${errors.contact_number ? id + 'contact_number' : id + 'phone-help'}`}
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
              <label htmlFor={id + 'area'}>Coverage</label>
              <input id={id + 'area'} value="Cebu" readOnly />
            </div>
          </div>
          <SearchSelect
            label="City / municipality (optional)"
            name="city_code"
            value={cityCode(address)}
            options={CEBU_LOCATIONS.map((city) => ({ value: city.code, label: city.name }))}
            placeholder="Choose a city or municipality"
            error={errors.city_code}
            onChange={(value) =>
              onChange({
                ...draft,
                cebu_address: { ...address, city_code: value, barangay: '', postal_code: '' },
              })
            }
          />
          <SearchSelect
            key={cityCode(address)}
            label="Barangay (optional)"
            name="barangay"
            value={address.barangay}
            options={(cityLocation(address)?.barangays ?? []).map((name) => ({
              value: name,
              label: name,
            }))}
            placeholder={
              cityLocation(address) ? 'Choose a barangay' : 'Choose a city or municipality first'
            }
            disabled={!cityLocation(address)}
            error={errors.barangay}
            onChange={(value) => updateAddress('barangay', value)}
          />
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
            Your portfolio shows {addressSummary(address)}. Detailed address fields are retained
            here and accessible to authorized admins.
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
            Use Cebu address fields
          </button>
        </>
      )}
    </div>
  );
}
