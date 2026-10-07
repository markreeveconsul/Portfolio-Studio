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
test('searches inside the dropdown and clears dependent values when city changes', () => {
  function Form() {
    const [draft, setDraft] = useState({
      ...emptyDraft(),
      cebu_address: {
        city_code: '0730600000',
        barangay: 'Lahug',
        street: 'Sample',
        postal_code: '6000',
      },
    });
    return <CebuContactFields draft={draft} errors={{}} onChange={setDraft} />;
  }
  render(<Form />);
  expect(screen.queryByLabelText('Search barangays')).toBeNull();
  const barangay = screen.getByRole('combobox', { name: 'Barangay (optional)' });
  fireEvent.click(barangay);
  fireEvent.change(barangay, { target: { value: 'tis' } });
  expect(screen.getByRole('option', { name: 'Tisa' })).toBeTruthy();
  fireEvent.keyDown(barangay, { key: 'ArrowDown' });
  fireEvent.keyDown(barangay, { key: 'Enter' });
  expect((barangay as HTMLInputElement).value).toBe('Tisa');
  const city = screen.getByRole('combobox', { name: 'City / municipality (optional)' });
  fireEvent.click(city);
  fireEvent.change(city, { target: { value: 'lapu' } });
  fireEvent.click(screen.getByRole('option', { name: 'Lapu-Lapu City' }));
  expect(
    (screen.getByRole('combobox', { name: 'Barangay (optional)' }) as HTMLInputElement).value,
  ).toBe('');
  expect((screen.getByLabelText('Postal code (optional)') as HTMLInputElement).value).toBe('');
  fireEvent.click(screen.getByRole('combobox', { name: 'Barangay (optional)' }));
  expect(screen.queryByRole('option', { name: 'Lahug' })).toBeNull();
  expect(screen.getByRole('option', { name: 'Pajo' })).toBeTruthy();
});
test('Escape discards search without changing the saved selection', () => {
  render(
    <CebuContactFields
      draft={{
        ...emptyDraft(),
        cebu_address: { city_code: '0730600000', barangay: 'Lahug', street: '', postal_code: '' },
      }}
      errors={{}}
      onChange={() => {}}
    />,
  );
  const input = screen.getByRole('combobox', { name: 'Barangay (optional)' });
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: 'no such place' } });
  expect(screen.getByText('No matches. Try another spelling.')).toBeTruthy();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect((input as HTMLInputElement).value).toBe('Lahug');
  expect(screen.queryByRole('listbox')).toBeNull();
});
test('requires a city before barangay selection and validates city/barangay pairing', () => {
  render(<CebuContactFields draft={emptyDraft()} errors={{}} onChange={() => {}} />);
  expect(
    (screen.getByRole('combobox', { name: 'Barangay (optional)' }) as HTMLInputElement).disabled,
  ).toBe(true);
  const draft = {
    ...emptyDraft(),
    full_name: 'Alex',
    cebu_address: { city_code: '0731100000', barangay: 'Lahug', street: '', postal_code: '' },
  };
  expect(validatePortfolio(draft).errors.barangay).toBeTruthy();
  expect(
    validatePortfolio({ ...draft, cebu_address: { ...draft.cebu_address, barangay: 'Pajo' } }).draft
      .address,
  ).toBe('Lapu-Lapu City, Philippines');
});
