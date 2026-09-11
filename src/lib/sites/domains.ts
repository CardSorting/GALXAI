/** Private domain control contracts. Only domainView crosses the public boundary. */
export class SiteDomainError extends Error {
  constructor(readonly code: string, readonly status = 503) { super(code); }
}
export function requireDomain(value: unknown, code = 'invalid_request', status = 400): asserts value {
  if (!value) throw new SiteDomainError(code, status);
}
export function exactDomainFields(value: unknown, fields: string[]): asserts value is Record<string, any> {
  requireDomain(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === fields.sort().join(','));
}
const reserved = new Set(['admin', 'administrator', 'api', 'app', 'assets', 'auth', 'billing', 'cdn', 'cloud', 'dashboard',
  'dev', 'docs', 'galx', 'galxai', 'help', 'internal', 'login', 'mail', 'monitor', 'ns1', 'ns2', 'ops', 'private',
  'prod', 'relay', 'root', 'security', 'sites', 'staging', 'static', 'status', 'support', 'system', 'test', 'www']);
export function siteUsername(value: unknown): string {
  requireDomain(typeof value === 'string' && /^[a-z][a-z0-9-]{1,18}[a-z0-9]$/.test(value), 'invalid_username');
  requireDomain(!reserved.has(value) && !value.startsWith('xn--'), 'username_unavailable', 409);
  return value;
}
export function siteSlug(value: unknown): string {
  requireDomain(typeof value === 'string' && value.trim().length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value));
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32).replace(/-$/, '');
  requireDomain(slug.length > 0 && !slug.startsWith('xn--'), 'invalid_app_name');
  return slug;
}
export function siteProjectId(value: unknown): asserts value is string {
  requireDomain(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:~-]{0,119}$/.test(value));
}
export function siteHostname(value: unknown): asserts value is string {
  requireDomain(typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\.[a-z][a-z0-9-]{1,18}[a-z0-9]\.galx\.ai$/.test(value));
  siteUsername(value.split('.')[1]);
}
export interface DomainRecord { type: 'CNAME' | 'TXT'; name: string; content: string; }
export interface DomainPlan { domainId: string; hostname: string; records: DomainRecord[]; }
export interface DomainRow {
  id: string; user_id: string; username: string; project_id: string; app_slug: string; hostname: string;
  status: 'reserved' | 'pending' | 'active'; attach_started: boolean; plan: DomainPlan | null;
  lease_id: string | null; lease_until: Date | null; next_check_at: Date | null; last_error: string | null;
  retry_count: number; automation_stopped: boolean;
}
export function domainView(row: DomainRow) {
  return { hostname: row.hostname, status: row.status, url: row.status === 'active' ? `https://${row.hostname}` : null };
}
export function domainPlan(input: unknown, hostname: string): DomainPlan {
  siteHostname(hostname);
  exactDomainFields(input, ['domainId', 'hostname', 'cnameTarget', 'validationRecords']);
  siteProjectId(input.domainId);
  requireDomain(input.hostname === hostname && typeof input.cnameTarget === 'string' &&
    input.cnameTarget.replace(/\.$/, '') === 'custom-domains.chatgpt.site', 'invalid_domain_records');
  requireDomain(Array.isArray(input.validationRecords) && input.validationRecords.length >= 1 && input.validationRecords.length <= 6, 'invalid_domain_records');
  const records: DomainRecord[] = [{ type: 'CNAME', name: hostname, content: 'custom-domains.chatgpt.site' }];
  for (const record of input.validationRecords) {
    exactDomainFields(record, ['name', 'record_type', 'value']);
    // Native Sites can include an entirely empty certificate-validation placeholder.
    if (record.name === null && record.record_type === null && record.value === null) continue;
    requireDomain(typeof record.name === 'string' && typeof record.value === 'string' &&
      /^[\x21-\x7e]{1,1024}$/.test(record.value), 'invalid_domain_records');
    const name = record.name.replace(/\.$/, '');
    requireDomain(['_openai-site-verification', '_cf-custom-hostname', '_acme-challenge'].some(prefix => name === `${prefix}.${hostname}`), 'invalid_domain_records');
    requireDomain(record.record_type === 'TXT' || (record.record_type === 'CNAME' && name === `_acme-challenge.${hostname}` &&
      /^[a-zA-Z0-9-]+\.dcv\.cloudflare\.com\.?$/.test(record.value)), 'invalid_domain_records');
    requireDomain(!records.some(existing => existing.name === name), 'invalid_domain_records');
    records.push({ name, type: record.record_type, content: record.record_type === 'CNAME' ? record.value.replace(/\.$/, '') : record.value });
  }
  requireDomain(records.some(r => r.name === `_openai-site-verification.${hostname}` && r.type === 'TXT' &&
    /^openai-site-verification=[a-zA-Z0-9_-]{20,120}$/.test(r.content)), 'invalid_domain_records');
  return { domainId: input.domainId, hostname, records: records.sort((a, b) => a.name.localeCompare(b.name)) };
}
