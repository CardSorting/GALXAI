/** Customer-scoped Sites attachment; DNS credentials remain on the GALX server. */
import { exact, identifier, JobError, requireThat } from './contracts';
import { nativeSitesCall, type SitesCall } from './live-sites';

export interface SiteAddress { hostname: string; status: 'reserved' | 'pending' | 'active'; url: string | null; }
export class LiveSiteDomains {
  private readonly origin: string;
  constructor(origin: string, private readonly session: string, private readonly username: string,
    private readonly call: SitesCall = nativeSitesCall, private readonly fetcher: typeof fetch = fetch) {
    const url = new URL(origin);
    requireThat(url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'invalid_domain_origin');
    requireThat(typeof session === 'string' && /^[^\s]{1,8192}$/.test(session), 'sign_in_required');
    requireThat(typeof username === 'string' && /^[a-z][a-z0-9-]{1,18}[a-z0-9]$/.test(username), 'site_username_required');
    this.origin = url.origin;
  }
  private async request(projectId: string, signal: AbortSignal, body?: Record<string, unknown>) {
    identifier(projectId);
    const response = await this.fetcher(`${this.origin}/api/sites/domains${body ? '' : '?projectId=' + encodeURIComponent(projectId)}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.session}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ ...body, projectId }) } : {}), redirect: 'error', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(85000)]),
    });
    const reader = response.body?.getReader(); requireThat(reader, 'domain_unavailable');
    const chunks: Uint8Array[] = []; let bytes = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength; if (bytes > 4096) { await reader.cancel(); throw new JobError('domain_unavailable'); }
      chunks.push(part.value); } } finally { reader.releaseLock(); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!response.ok) throw new JobError(response.status === 429 ? 'domain_check_later' : response.status === 404 ? 'domain_not_found' : 'domain_unavailable');
    exact(data, ['hostname', 'status', 'url']);
    requireThat(typeof data.hostname === 'string' && /^[a-z0-9][a-z0-9-]{0,31}\.[a-z][a-z0-9-]{1,18}[a-z0-9]\.galx\.ai$/.test(data.hostname) &&
      data.hostname.endsWith(`.${this.username}.galx.ai`) && ['reserved', 'pending', 'active'].includes(data.status as string) &&
      data.url === (data.status === 'active' ? `https://${data.hostname}` : null), 'domain_result_invalid');
    return { status: response.status, address: data as unknown as SiteAddress };
  }
  async get(projectId: string, signal: AbortSignal): Promise<SiteAddress> { return (await this.request(projectId, signal)).address; }
  async connect(projectId: string, appName: string, verifyOwner: () => Promise<unknown>, signal: AbortSignal): Promise<SiteAddress> {
    await verifyOwner();
    const address = (await this.request(projectId, signal, { action: 'reserve', username: this.username, appName })).address;
    const listing = await this.call('sites.list_custom_domains', { project_id: projectId }, signal);
    requireThat(Array.isArray(listing.items) && listing.items.length <= 100, 'domain_result_invalid');
    const matching = listing.items.filter((item: any) => item?.hostname === address.hostname);
    requireThat(matching.length <= 1, 'domain_result_invalid');
    let domain = matching[0];
    if (!domain) {
      const attempt = await this.request(projectId, signal, { action: 'attach' });
      requireThat(attempt.status === 201, 'domain_attachment_needs_reconciliation');
      await verifyOwner();
      domain = await this.call('sites.add_custom_domain', { project_id: projectId, hostname: address.hostname }, signal);
    }
    identifier(domain.id);
    requireThat(domain.project_id === projectId && domain.hostname === address.hostname, 'domain_result_invalid');
    await verifyOwner();
    const registration = { domainId: domain.id, hostname: domain.hostname, cnameTarget: domain.cname_target,
      validationRecords: domain.validation_records?.map((r: any) => ({ name: r.name, record_type: r.record_type, value: r.value })) };
    let configured: SiteAddress;
    try { configured = (await this.request(projectId, signal, { action: 'configure', registration })).address; }
    catch (error) {
      if (error instanceof JobError && error.code === 'domain_check_later') return this.get(projectId, signal);
      throw error;
    }
    // Native status is operational evidence, never a client-supplied active flag to GALX.
    const refreshed = await this.call('sites.refresh_custom_domain_status', { project_id: projectId, custom_domain_id: domain.id }, signal);
    requireThat(refreshed.id === domain.id && refreshed.project_id === projectId && refreshed.hostname === address.hostname, 'domain_result_invalid');
    await verifyOwner();
    return configured;
  }
}
