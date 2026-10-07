import {
  CEBU_BARANGAYS,
  emptyCebuAddress,
  normalizePhilippinePhone,
  validPhilippinePhone,
} from './cebu';
import type { CebuAddress } from './cebu';
import { safeWebUrl } from './urls';
export { safeWebUrl } from './urls';
import type { SectionData } from './sections';
import { validateSections } from './sections';

export interface SocialLink {
  label: string;
  url: string;
}

export interface PortfolioDraft extends SectionData {
  full_name: string;
  email: string;
  contact_number: string;
  address: string;
  cebu_address?: CebuAddress | null;
  about_me: string;
  social_links: SocialLink[];
}

export interface Portfolio extends PortfolioDraft {
  photo_path?: string | null;
  id: string;
  owner_id: string;
  template: 'simple' | 'modern' | 'creative';
  created_at: string;
  updated_at: string;
}

export interface PortfolioRepository {
  saveTemplate?(
    portfolio: Portfolio,
    template: Portfolio['template'],
  ): Promise<Pick<Portfolio, 'template' | 'updated_at'>>;
  loadOwn(ownerId: string): Promise<Portfolio | null>;
  savePortfolio(draft: PortfolioDraft, expectedUpdatedAt: string | null): Promise<Portfolio>;
  listForAdmin(page: number): Promise<PortfolioSummary[]>;
  loadById(id: string): Promise<Portfolio | null>;
}

export type PortfolioSummary = Pick<Portfolio, 'id' | 'full_name' | 'updated_at'>;
export type FieldErrors = Record<string, string>;

export function emptyDraft(): PortfolioDraft {
  return {
    full_name: '',
    email: '',
    contact_number: '',
    address: '',
    cebu_address: emptyCebuAddress(),
    about_me: '',
    social_links: [],
    education: [],
    skills: [],
    projects: [],
    experience: [],
  };
}

export function toDraft(portfolio: Portfolio): PortfolioDraft {
  return {
    education: structuredClone(portfolio.education ?? []),
    skills: structuredClone(portfolio.skills ?? []),
    projects: structuredClone(portfolio.projects ?? []),
    experience: structuredClone(portfolio.experience ?? []),
    full_name: portfolio.full_name,
    email: portfolio.email,
    contact_number: portfolio.contact_number,
    address: portfolio.address,
    cebu_address: portfolio.cebu_address ? { ...portfolio.cebu_address } : null,
    about_me: portfolio.about_me,
    social_links: portfolio.social_links.map(({ label, url }) => ({ label, url })),
  };
}

export function validatePortfolio(
  input: PortfolioDraft,
  previousPhone = '',
): {
  draft: PortfolioDraft;
  errors: FieldErrors;
} {
  const { sections, errors: sectionErrors } = validateSections(input);
  const draft: PortfolioDraft = {
    ...sections,
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    contact_number: input.contact_number.trim(),
    address: input.cebu_address ? 'Cebu City, Philippines' : input.address.trim(),
    cebu_address: input.cebu_address
      ? {
          barangay: input.cebu_address.barangay.trim(),
          street: input.cebu_address.street.trim(),
          postal_code: input.cebu_address.postal_code.trim(),
        }
      : null,
    about_me: input.about_me.trim(),
    social_links: input.social_links.map(({ label, url }) => ({
      label: label.trim(),
      url: url.trim(),
    })),
  };
  const errors: FieldErrors = { ...sectionErrors };
  if (draft.contact_number !== previousPhone.trim()) {
    draft.contact_number = normalizePhilippinePhone(draft.contact_number);
    if (!validPhilippinePhone(draft.contact_number))
      errors.contact_number =
        'Enter a Philippine mobile number (09 followed by 9 digits), or a Cebu landline including area code 032.';
  }
  if (draft.cebu_address) {
    const address = draft.cebu_address;
    if (address.barangay && !CEBU_BARANGAYS.includes(address.barangay))
      errors.barangay = 'Choose a Cebu City barangay from the list.';
    if (address.street.length > 200)
      errors.street = 'Keep the street or building within 200 characters.';
    if (address.postal_code && !/^\d{4}$/.test(address.postal_code))
      errors.postal_code = 'Enter a four-digit postal code, or leave it empty.';
  }
  if (!draft.full_name) errors.full_name = 'Enter your full name.';
  if (draft.full_name.length > 120) errors.full_name = 'Keep your name within 120 characters.';
  if (draft.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) || draft.email.length > 254))
    errors.email = 'Enter a valid email address, or leave it empty.';
  if (draft.contact_number.length > 40)
    errors.contact_number = 'Keep your contact number within 40 characters.';
  if (draft.address.length > 300) errors.address = 'Keep your address within 300 characters.';
  if (draft.about_me.length > 3000)
    errors.about_me = 'Keep your introduction within 3,000 characters.';
  if (draft.social_links.length > 10) errors.social_links = 'You can add up to 10 links.';
  draft.social_links.forEach((link, index) => {
    if (!link.label || link.label.length > 80)
      errors[`link_label_${index}`] = 'Enter a label of up to 80 characters.';
    const normalized = safeWebUrl(link.url);
    if (!normalized || normalized.length > 2000)
      errors[`link_url_${index}`] =
        'Enter a complete http:// or https:// URL without a username or password.';
    else link.url = normalized;
  });
  return { draft, errors };
}

export function saveErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'P0002' || code === '23505')
    return 'This portfolio changed in another session. Your input is still here. Copy any changes you want to keep, then reload the saved version before trying again.';
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303')
    return 'Your session or permissions could not be verified. Your input is still here. Check your sign-in before trying again.';
  if (code === '23514' || code === '22023')
    return 'Some information could not be saved. Check the field lengths and website links, then try again.';
  return 'We could not confirm that your changes were saved. Your input is still here. Check your connection and try again.';
}
