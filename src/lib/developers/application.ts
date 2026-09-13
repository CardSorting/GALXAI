/** Shared, browser-safe application fields and validation. Profile links are self-reported. */
export const TRAFFIC_OPTIONS = {
  exploring: 'I’m still exploring',
  under_100_daily: 'Fewer than 100 per day',
  under_1000_daily: '100–1,000 per day',
  over_1000_daily: 'More than 1,000 per day',
} as const;
export type ApplicationInput = {
  introduction: string;
  github_url: string | null;
  linkedin_url: string | null;
  use_case: string;
  expected_traffic: keyof typeof TRAFFIC_OPTIONS;
  cohort_interest: 'next' | 'later';
};
export type ApplicationDetails = Omit<ApplicationInput, 'introduction' | 'cohort_interest'> & {
  introduction: string | null; cohort_interest: ApplicationInput['cohort_interest'] | null;
  revision: number; updated_at: string | null;
};
export type ApplicationErrors = Partial<Record<keyof ApplicationInput, string>>;

/** Exact hosts and profile paths only. Never fetch, authenticate, or verify the supplied profile. */
export function normalizeProfile(value: unknown, kind: 'github' | 'linkedin'): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  if (raw.length > 300 || /[\s\\]/.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host !== `${kind}.com` && host !== `www.${kind}.com`) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/$/, '');
    if (kind === 'github' && !/^\/[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(path)) return null;
    if (kind === 'linkedin' && !/^\/in\/[\p{L}\p{M}\p{N}_-]{1,150}$/u.test(path)) return null;
    // Strip tracking parameters and fragments; store a canonical HTTPS profile link.
    const canonical = `https://${kind === 'linkedin' ? 'www.' : ''}${kind}.com${encodeURI(path)}`;
    return canonical.length <= 300 ? canonical : null;
  } catch { return null; }
}

export function validateApplication(input: unknown): { value: ApplicationInput; errors: ApplicationErrors } {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const text = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const value: ApplicationInput = {
    introduction: text('introduction'), github_url: normalizeProfile(body.github_url, 'github'),
    linkedin_url: normalizeProfile(body.linkedin_url, 'linkedin'), use_case: text('use_case'),
    expected_traffic: text('expected_traffic') as ApplicationInput['expected_traffic'],
    cohort_interest: text('cohort_interest') as ApplicationInput['cohort_interest'],
  };
  const errors: ApplicationErrors = {};
  if (value.introduction.length < 20 || value.introduction.length > 1000) errors.introduction = 'Introduce yourself in 20–1,000 characters.';
  for (const kind of ['github', 'linkedin'] as const) {
    const key = `${kind}_url` as const;
    if (body[key] != null && body[key] !== '' && (!value[key] && (typeof body[key] !== 'string' || text(key))))
      errors[key] = kind === 'github' ? 'Use a GitHub profile, such as github.com/yourname.' : 'Use a LinkedIn profile, such as linkedin.com/in/yourname.';
  }
  if (!value.github_url && !value.linkedin_url && !errors.github_url && !errors.linkedin_url) errors.github_url = 'Add a GitHub or LinkedIn profile. One is enough.';
  if (value.use_case.length < 20 || value.use_case.length > 2000) errors.use_case = 'Describe your project in 20–2,000 characters.';
  if (!Object.hasOwn(TRAFFIC_OPTIONS, value.expected_traffic)) errors.expected_traffic = 'Choose your expected API traffic.';
  if (!['next', 'later'].includes(value.cohort_interest)) errors.cohort_interest = 'Choose whether you’re interested in the next cohort or a future one.';
  return { value, errors };
}
