import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { platformForUrl, PlatformIcon } from '../src/components/PlatformIcon';
import { SectionsEditor } from '../src/features/portfolio/SectionsEditor';
import { PortfolioSections } from '../src/features/portfolio/PortfolioSections';
import { validateSections, type SectionData } from '../src/features/portfolio/sections';
const data: SectionData = {
  education: [{ institution: 'School', start_date: '2020-08-20', end_date: '2024-06-01' }],
  skills: [],
  projects: [],
  experience: [],
};
describe('platform icons', () => {
  it.each([
    ['https://github.com/alex', 'GitHub'],
    ['https://m.facebook.com/alex', 'Facebook'],
    ['https://instagram.com/alex', 'Instagram'],
    ['https://youtu.be/example', 'YouTube'],
    ['https://twitter.com/alex', 'X'],
    ['https://www.tiktok.com/@alex', 'TikTok'],
    ['https://linkedin.com/in/alex', 'LinkedIn'],
  ])('detects %s', (url, name) => expect(platformForUrl(url)?.name).toBe(name));
  it.each([
    'https://github.com.example.com',
    'https://fakegithub.com',
    'https://example.com/github.com',
    'javascript:alert(1)',
    'https://github.com@evil.example',
    '',
  ])('does not assign a brand to %s', (url) => expect(platformForUrl(url)).toBeUndefined());
  it('uses a decorative fallback without remote images', () => {
    const { container } = render(<PlatformIcon url="https://example.com" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
describe('education years', () => {
  it('loads old dates as years and allows choosing or clearing a year', () => {
    const change = vi.fn();
    render(<SectionsEditor value={data} errors={{}} onChange={change} id="test" />);
    const start = screen.getByRole('combobox', { name: /Start year/ }) as HTMLSelectElement;
    expect(start.value).toBe('2020');
    expect((screen.getByRole('combobox', { name: /End year/ }) as HTMLSelectElement).value).toBe(
      '2024',
    );
    fireEvent.change(start, { target: { value: '2021' } });
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({
        education: [expect.objectContaining({ start_date: '2021-01-01' })],
      }),
    );
    fireEvent.change(screen.getByRole('combobox', { name: /End year/ }), { target: { value: '' } });
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({ education: [expect.objectContaining({ end_date: '' })] }),
    );
  });
  it('compares education by year and keeps experience dates precise', () => {
    const result = validateSections({
      ...data,
      education: [{ institution: 'School', start_date: '2024-08-01', end_date: '2024-01-01' }],
      experience: [
        {
          organization: 'Office',
          role_title: 'Intern',
          start_date: '2023-08-09',
          end_date: '2024-06-20',
        },
      ],
    });
    expect(result.errors).toEqual({});
    expect(result.sections.education[0].start_date).toBe('2024-01-01');
    expect(result.sections.experience[0].start_date).toBe('2023-08-09');
    expect(
      validateSections({
        ...data,
        education: [{ institution: 'School', start_date: '2025-01-01', end_date: '2024-01-01' }],
      }).errors.education_0_end_date,
    ).toMatch(/End year/);
  });
  it('renders only education years', () => {
    render(<PortfolioSections portfolio={data} />);
    expect(screen.getByText('2020 – 2024')).toBeTruthy();
  });
});
