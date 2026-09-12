/** Public Sites workspace contracts. No provider or operational fields belong here. */
export interface SiteDocument { schema_version: 1; title: string; summary: string; sections: { heading: string; body: string }[]; }
export interface SiteMessage { id: string; role: 'user' | 'assistant'; text: string; }
export interface WorkspaceSite {
  id: string; title: string; revision: number; updatedAt: string; document: SiteDocument | null;
  messages: SiteMessage[]; generating: boolean; archived: boolean; published: boolean;
  address: { hostname: string; status: 'reserved' | 'pending' | 'active'; url: string | null } | null;
}
export interface SiteQuote { quoteVersion: string; maxChargeMicroUsd: number; }
export function readSiteDocument(input: unknown): SiteDocument | null {
  const v = input as Record<string, unknown> | null;
  const fields = (x: any, keys: string) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).sort().join(',') === keys;
  const line = (x: unknown, max: number): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= max && !/[\u0000-\u001f\u007f]/.test(x);
  if (!fields(v, 'schema_version,sections,summary,title') || v!.schema_version !== 1 || !line(v!.title, 90) || !line(v!.summary, 350) ||
    !Array.isArray(v!.sections) || v!.sections.length < 1 || v!.sections.length > 3 || !v!.sections.every((s: any) => fields(s, 'body,heading') && line(s.heading, 90) && line(s.body, 650))) return null;
  return { schema_version: 1, title: v!.title as string, summary: v!.summary as string,
    sections: (v!.sections as { heading: string; body: string }[]).map(s => ({ heading: s.heading, body: s.body })) };
}
export function readWorkspaceSite(input: any): WorkspaceSite {
  if (!input || typeof input.id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.id) || typeof input.title !== 'string' || input.title.length > 90 ||
    !Number.isSafeInteger(input.revision) || input.revision < 0 || typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt)) ||
    typeof input.generating !== 'boolean' || typeof input.archived !== 'boolean' || typeof input.published !== 'boolean' || !Array.isArray(input.messages) || input.messages.length > 80) throw new Error('Invalid site');
  const document = input.document === null ? null : readSiteDocument(input.document);
  if (input.document !== null && !document) throw new Error('Invalid site');
  const messages = input.messages.map((m: any): SiteMessage => {
    if (!m || typeof m.id !== 'string' || !['user', 'assistant'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 2000) throw new Error('Invalid message');
    return { id: m.id, role: m.role, text: m.text };
  });
  let address: WorkspaceSite['address'] = null;
  if (input.address !== null) {
    const a = input.address;
    if (!a || typeof a.hostname !== 'string' || !/^[a-z0-9-]+\.[a-z0-9-]+\.galx\.ai$/.test(a.hostname) ||
      !['reserved','pending','active'].includes(a.status) || a.url !== (a.status === 'active' ? `https://${a.hostname}` : null)) throw new Error('Invalid address');
    address = { hostname: a.hostname, status: a.status, url: a.url };
  }
  return { id: input.id, title: input.title, revision: input.revision, updatedAt: input.updatedAt, document, messages,
    generating: input.generating, archived: input.archived, published: input.published, address };
}
export function workspaceError(status: number): string {
  if (status === 401) return 'Sign in again to continue. Your saved Sites will be here.';
  if (status === 402) return 'Add credit to your account, then try again.';
  if (status === 404) return 'This Site is unavailable. Return to My Sites to choose another.';
  if (status === 409) return 'This Site has changed or is still updating. Refresh it before continuing.';
  if (status === 429) return 'You’ve reached the current limit. Try again later.';
  return 'This couldn’t finish. Your saved work is safe. Try again in a moment.';
}
