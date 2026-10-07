import { expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { CebuContactFields } from '../src/features/portfolio/CebuContactFields';
import {
  CEBU_BARANGAYS,
  normalizePhilippinePhone,
  validPhilippinePhone,
} from '../src/features/portfolio/cebu';
import { emptyDraft, validatePortfolio } from '../src/features/portfolio/model';
test('normalizes Philippine mobile and Cebu landline formats', () => {
  for (const value of ['09171234567', '917 123 4567', '+63 917 123 4567', '+6309171234567'])
    expect(normalizePhilippinePhone(value)).toBe('+639171234567');
  expect(validPhilippinePhone(normalizePhilippinePhone('032 123 4567'))).toBe(true);
  expect(validPhilippinePhone('+63917')).toBe(false);
  expect(new Set(CEBU_BARANGAYS).size).toBe(80);
});
test('preserves legacy contact details and validates new structured fields', () => {
  const legacy = {
    ...emptyDraft(),
    full_name: 'Alex',
    address: 'Old address',
    cebu_address: null,
    contact_number: '+1 212 555 0100',
  };
  expect(validatePortfolio(legacy, legacy.contact_number).draft.address).toBe('Old address');
  expect(validatePortfolio(legacy, legacy.contact_number).errors).toEqual({});
  const result = validatePortfolio(
    { ...legacy, cebu_address: { barangay: 'Invalid', street: '', postal_code: '12' } },
    legacy.contact_number,
  );
  expect(result.errors.barangay).toBeTruthy();
  expect(result.errors.postal_code).toBeTruthy();
  expect(result.draft.address).toBe('Cebu City, Philippines');
});
test('filters barangays without losing the selected value', () => {
  function Form() {
    const [draft, setDraft] = useState(emptyDraft());
    return <CebuContactFields draft={draft} errors={{}} onChange={setDraft} />;
  }
  render(<Form />);
  fireEvent.change(screen.getByLabelText('Search barangays'), { target: { value: 'lah' } });
  fireEvent.change(screen.getByLabelText('Barangay (optional)'), { target: { value: 'Lahug' } });
  fireEvent.change(screen.getByLabelText('Search barangays'), { target: { value: 'tisa' } });
  expect((screen.getByLabelText('Barangay (optional)') as HTMLSelectElement).value).toBe('Lahug');
  expect(screen.getByRole('option', { name: 'Tisa' })).toBeTruthy();
});
