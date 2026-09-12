/** Public Sites workspace contracts. No provider or operational fields belong here. */
export interface SiteDocument { schema_version: 1; title: string; summary: string; sections: { heading: string; body: string }[]; }
export type SiteIntent = 'build' | 'discuss';
export interface SiteMessage { id: string; role: 'user' | 'assistant'; text: string; turn?: number; status?: 'pending' | 'completed' | 'failed'; version?: number | null; createdAt?: string; }
export interface WorkspaceSite {
  id: string; title: string; revision: number; updatedAt: string; document: SiteDocument | null;
  messages: SiteMessage[]; generating: boolean; archived: boolean; published: boolean;
  version: number; publishedVersion: number | null; context: { notes: string; summary: string }; historyCursor: number | null;
  address: { hostname: string; status: 'reserved' | 'pending' | 'active'; url: string | null } | null;
}
export type SiteSummary = Omit<WorkspaceSite, 'document' | 'messages' | 'context' | 'historyCursor'>;
export interface SiteVersion { version: number; label: string; createdAt: string; }
export type SitesAccess = 'included' | 'paid_plan_required' | 'unavailable';
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
    return readSiteMessage(m);
  });
  let address: WorkspaceSite['address'] = null;
  if (input.address !== null) {
    const a = input.address;
    if (!a || typeof a.hostname !== 'string' || !/^[a-z0-9-]+\.[a-z0-9-]+\.galx\.ai$/.test(a.hostname) ||
      !['reserved','pending','active'].includes(a.status) || a.url !== (a.status === 'active' ? `https://${a.hostname}` : null)) throw new Error('Invalid address');
    address = { hostname: a.hostname, status: a.status, url: a.url };
  }
  const version = input.version ?? 0, publishedVersion = input.publishedVersion ?? null, historyCursor = input.historyCursor ?? null;
  const context = input.context ?? { notes: '', summary: '' };
  if (!Number.isSafeInteger(version) || version < 0 || (publishedVersion !== null && (!Number.isSafeInteger(publishedVersion) || publishedVersion < 1)) ||
      (historyCursor !== null && (!Number.isSafeInteger(historyCursor) || historyCursor < 1)) || typeof context.notes !== 'string' || context.notes.length > 2000 || typeof context.summary !== 'string' || context.summary.length > 2000) throw new Error('Invalid site context');
  return { id: input.id, title: input.title, revision: input.revision, updatedAt: input.updatedAt, document, messages,
    generating: input.generating, archived: input.archived, published: input.published, address,
    version, publishedVersion, historyCursor, context: { notes: context.notes, summary: context.summary } };
}
export function readSiteMessage(m: any): SiteMessage {
  if (!m || typeof m.id !== 'string' || m.id.length > 100 || !['user','assistant'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 2000 ||
    (m.turn !== undefined && (!Number.isSafeInteger(m.turn) || m.turn < 1)) ||
    (m.status !== undefined && !['pending','completed','failed'].includes(m.status)) ||
    (m.version !== undefined && m.version !== null && (!Number.isSafeInteger(m.version) || m.version < 1)) ||
    (m.createdAt !== undefined && (typeof m.createdAt !== 'string' || !Number.isFinite(Date.parse(m.createdAt))))) throw new Error('Invalid message');
  return { id:m.id,role:m.role,text:m.text,...(m.turn!==undefined?{turn:m.turn}:{}),...(m.status?{status:m.status}:{}),
    ...(m.version!==undefined?{version:m.version}:{}),...(m.createdAt?{createdAt:m.createdAt}:{}) };
}
export function readSiteSummary(input: unknown): SiteSummary {
  const {document: _document,messages: _messages,context: _context,historyCursor: _cursor,...summary} = readWorkspaceSite({...(input as object),document:null,messages:[],context:{notes:'',summary:''},historyCursor:null});
  return summary;
}
export function workspaceError(status: number): string {
  if (status === 401) return 'Sign in again to continue. Your saved Sites will be here.';
  if (status === 403) return 'Sites is included with eligible paid plans. Check your plan to continue.';
  if (status === 404) return 'This Site is unavailable. Return to My Sites to choose another.';
  if (status === 409) return 'This Site has changed or is still updating. Refresh it before continuing.';
  if (status === 429) return 'Please wait before sending another update. Your saved work is safe.';
  return 'This couldn’t finish. Your saved work is safe. Try again in a moment.';
}
