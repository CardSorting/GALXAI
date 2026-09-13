/** Public, authored starting ideas. Only these identifiers travel in entry links. */
export const SITE_STARTERS = [
  {
    id: 'product', label: 'Landing page', name: 'A product launch',
    brief: 'Create a launch page for a thoughtfully designed task planner called Daylight. Explain how it helps small teams plan a calmer week.',
    refinement: 'Make the message more personal and focus on making room for meaningful work.',
  },
  {
    id: 'portfolio', label: 'Portfolio', name: 'My portfolio',
    brief: 'Create a portfolio for an independent brand designer. Keep it warm and confident, with sections for selected work, approach, and getting in touch.',
    refinement: 'Focus the introduction on helping small businesses find their voice.',
  },
  {
    id: 'event', label: 'Event page', name: 'An event page',
    brief: 'Create a page for a neighborhood makers market. Include an introduction, what visitors can expect, and practical event information with clearly marked details to fill in.',
    refinement: 'Make the invitation feel more welcoming to neighbors and families.',
  },
] as const;

export type SiteStarter = typeof SITE_STARTERS[number];
export type SiteStarterSelection = { id: SiteStarter['id']; name: string; brief: string; href: string };

export function siteStarterHref(id: SiteStarter['id'], refined = false) {
  return `/sites?starter=${id}${refined ? '&refine=1' : ''}`;
}

export function resolveSiteStarter(id: unknown, refinement?: unknown): SiteStarterSelection | undefined {
  const starter = SITE_STARTERS.find(item => item.id === id);
  if (!starter) return undefined;
  const refined = refinement === '1';
  return { id: starter.id, name: starter.name, brief: `${starter.brief}${refined ? ` ${starter.refinement}` : ''}`, href: siteStarterHref(starter.id, refined) };
}
