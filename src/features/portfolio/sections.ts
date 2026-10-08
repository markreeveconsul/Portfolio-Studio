import { safeWebUrl } from './urls';
import type { FieldErrors } from './model';

export type SectionName = 'education' | 'skills' | 'projects' | 'experience';
export type SectionEntry = Record<string, string>;
export type SectionData = Record<SectionName, SectionEntry[]>;
export interface SectionField {
  key: string;
  label: string;
  required?: boolean;
  limit?: number;
  type?: 'year' | 'date' | 'url' | 'textarea';
}
export const sectionDefinitions: {
  key: SectionName;
  title: string;
  singular: string;
  description: string;
  fields: SectionField[];
}[] = [
  {
    key: 'education',
    title: 'Education',
    singular: 'education',
    description: 'Where you have studied and what you have learned.',
    fields: [
      { key: 'institution', label: 'Institution', required: true, limit: 180 },
      { key: 'qualification', label: 'Qualification', limit: 180 },
      { key: 'start_date', label: 'Start year', type: 'year' },
      { key: 'end_date', label: 'End year', type: 'year' },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    singular: 'skill',
    description: 'The tools and abilities you bring to your work.',
    fields: [{ key: 'name', label: 'Skill', required: true, limit: 80 }],
  },
  {
    key: 'projects',
    title: 'Projects',
    singular: 'project',
    description: 'Show what you have built, explored, or contributed to.',
    fields: [
      { key: 'title', label: 'Project title', required: true, limit: 180 },
      { key: 'description', label: 'Description', type: 'textarea', limit: 3000 },
      { key: 'project_url', label: 'Project URL', type: 'url', limit: 2000 },
      { key: 'repository_url', label: 'Repository URL', type: 'url', limit: 2000 },
    ],
  },
  {
    key: 'experience',
    title: 'Experience',
    singular: 'experience',
    description:
      'Work, internships, and volunteering all count. Leave this empty if you are just starting out.',
    fields: [
      { key: 'organization', label: 'Organization', required: true, limit: 180 },
      { key: 'role_title', label: 'Role', required: true, limit: 180 },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea', limit: 3000 },
    ],
  },
];

export function newEntry(section: SectionName): SectionEntry {
  return Object.fromEntries(
    sectionDefinitions
      .find((definition) => definition.key === section)!
      .fields.map((field) => [field.key, '']),
  );
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateSections(input: SectionData): {
  sections: SectionData;
  errors: FieldErrors;
} {
  const sections: SectionData = { education: [], skills: [], projects: [], experience: [] };
  const errors: FieldErrors = {};
  for (const definition of sectionDefinitions) {
    const entries = input[definition.key] ?? [];
    if (entries.length > 30) errors[definition.key] = 'Keep this section within 30 entries.';
    sections[definition.key] = entries.map((entry, index) => {
      const normalized: SectionEntry = {};
      for (const field of definition.fields) {
        const value = (entry[field.key] ?? '').trim();
        const errorKey = `${definition.key}_${index}_${field.key}`;
        normalized[field.key] = value;
        if (field.required && !value)
          errors[errorKey] = `Enter ${field.label.toLowerCase()}, or remove this entry.`;
        else if (field.limit && value.length > field.limit)
          errors[errorKey] = `Use no more than ${field.limit.toLocaleString()} characters.`;
        else if (value && (field.type === 'date' || field.type === 'year') && !validDate(value))
          errors[errorKey] = 'Enter a valid date.';
        else if (value && field.type === 'year')
          normalized[field.key] = value.slice(0, 4) + '-01-01';
        else if (value && field.type === 'url') {
          const safe = safeWebUrl(value);
          if (!safe || safe.length > 2000)
            errors[errorKey] =
              'Enter a complete http:// or https:// URL without embedded credentials.';
          else normalized[field.key] = safe;
        }
      }
      if (
        normalized.start_date &&
        normalized.end_date &&
        normalized.end_date < normalized.start_date
      )
        errors[`${definition.key}_${index}_end_date`] =
          definition.key === 'education'
            ? 'End year must be on or after the start year.'
            : 'End date must be on or after the start date.';
      return normalized;
    });
  }
  return { sections, errors };
}
