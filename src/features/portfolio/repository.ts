import { supabase } from '../../lib/supabase';
import type { Portfolio, PortfolioRepository, PortfolioSummary } from './model';

const selection =
  'id,owner_id,full_name,email,contact_number,address,about_me,photo_path,template,created_at,updated_at,social_links(label,url,position),education(institution,qualification,start_date,end_date,position),skills(name,position),projects(title,description,project_url,repository_url,position),experience(organization,role_title,description,start_date,end_date,position)';
type PortfolioRow = Omit<Portfolio, 'social_links'> & {
  social_links: { label: string; url: string; position: number }[];
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function orderedSection(value: unknown): Record<string, string>[] {
  const entries = (value ?? []) as Record<string, string | number | null>[];
  return [...entries]
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(({ position: _position, ...entry }) =>
      Object.fromEntries(
        Object.entries(entry).map(([field, value]) => [field, String(value ?? '')]),
      ),
    );
}

function fromRow(row: PortfolioRow): Portfolio {
  return {
    ...row,
    education: orderedSection(row.education),
    skills: orderedSection(row.skills),
    projects: orderedSection(row.projects),
    experience: orderedSection(row.experience),
    social_links: [...(row.social_links ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(({ label, url }) => ({ label, url })),
  };
}

// No localStorage portfolio copies, mock fallbacks, or privileged keys.
// Both reads and writes are subject to database row-level security.
export const portfolioRepository: PortfolioRepository = {
  async saveTemplate(portfolio, template) {
    const { data, error } = await client()
      .from('portfolios')
      .update({ template })
      .eq('id', portfolio.id)
      .eq('owner_id', portfolio.owner_id)
      .eq('updated_at', portfolio.updated_at)
      .select('template,updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw { code: 'P0002' };
    return data as Pick<Portfolio, 'template' | 'updated_at'>;
  },
  async loadOwn(ownerId) {
    const { data, error } = await client()
      .from('portfolios')
      .select(selection)
      .eq('owner_id', ownerId)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as PortfolioRow) : null;
  },
  async savePortfolio(draft, expectedUpdatedAt) {
    const { data, error } = await client().rpc('save_portfolio_information', {
      p_full_name: draft.full_name,
      p_email: draft.email,
      p_contact_number: draft.contact_number,
      p_address: draft.address,
      p_about_me: draft.about_me,
      p_social_links: draft.social_links,
      p_education: draft.education,
      p_skills: draft.skills,
      p_projects: draft.projects,
      p_experience: draft.experience,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) throw error;
    if (!data?.id || !data?.updated_at) throw new Error('Save was not acknowledged.');
    return fromRow(data as PortfolioRow);
  },
  async listForAdmin(page) {
    const { data, error } = await client()
      .from('portfolios')
      .select('id,full_name,updated_at')
      .order('updated_at', { ascending: false })
      .order('id')
      .range(page * 20, page * 20 + 19);
    if (error) throw error;
    return (data ?? []) as PortfolioSummary[];
  },
  async loadById(id) {
    const { data, error } = await client()
      .from('portfolios')
      .select(selection)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as PortfolioRow) : null;
  },
};
