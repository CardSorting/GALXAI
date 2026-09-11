import { SiteDomainError, requireDomain, siteHostname, type DomainPlan, type DomainRecord } from './domains';

/** Creates only exact, reserved names. Never edits or deletes a foreign record. */
export class SitesCloudflareDns {
  constructor(private readonly zoneId: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {
    requireDomain(/^[a-f0-9]{32}$/.test(zoneId) && typeof token === 'string' && token.length > 0, 'domain_unavailable', 503);
  }
  private async call(path: string, signal: AbortSignal, body?: unknown): Promise<any> {
    try {
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(6000)]);
      const response = await this.fetcher(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}${path}`, {
        method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', cache: 'no-store',
        signal: deadline,
      });
      const data = await boundedDomainJson(response, 131072, deadline);
      requireDomain(response.ok && data.success === true, 'dns_unavailable', 503);
      return data;
    } catch { throw new SiteDomainError('dns_unavailable'); }
  }
  private async records(record: DomainRecord, marker: string, signal: AbortSignal): Promise<boolean> {
    const data = await this.call(`/dns_records?name=${encodeURIComponent(record.name)}&per_page=100`, signal);
    requireDomain(Array.isArray(data.result) && data.result.length <= 100 && (!data.result_info || data.result_info.total_pages <= 1), 'dns_conflict', 409);
    requireDomain(data.result.every((r: any) => r.name === record.name && r.type === record.type &&
      r.content === record.content && r.comment === marker && r.proxied === false), 'dns_conflict', 409);
    return data.result.length > 0;
  }
  async ensure(plan: DomainPlan, reservationId: string, signal: AbortSignal): Promise<void> {
    siteHostname(plan.hostname);
    requireDomain(/^[a-f0-9-]{36}$/.test(reservationId), 'domain_unavailable', 503);
    const marker = `galx-sites-domain-v1:${reservationId}`;
    // Validate all conflicts before the first write; partial/lost writes are read back on recovery.
    const present: boolean[] = [];
    for (const record of plan.records) present.push(await this.records(record, marker, signal));
    for (let i = 0; i < plan.records.length; i++) {
      const record = plan.records[i];
      if (!present[i]) await this.call('/dns_records', signal, { ...record, ttl: 300, proxied: false, comment: marker });
      requireDomain(await this.records(record, marker, signal), 'dns_unavailable', 503);
    }
  }
}
export async function boundedDomainJson(response: Response, maximum: number, signal?: AbortSignal): Promise<any> {
  const reader = response.body?.getReader(); requireDomain(reader, 'domain_unavailable', 503);
  const chunks: Uint8Array[] = []; let size = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    signal?.throwIfAborted();
    while (true) { const part = await reader.read(); signal?.throwIfAborted(); if (part.done) break;
      size += part.value.byteLength; if (size > maximum) { await reader.cancel(); throw new SiteDomainError('domain_unavailable'); }
      chunks.push(part.value); }
  } finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
/** No session, cookie, redirect following, provider bypass token, or caller-selected origin. */
export async function verifySitesHttps(hostname: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<boolean> {
  siteHostname(hostname);
  try {
    const response = await fetcher(`https://${hostname}/`, { method: 'HEAD', redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) });
    await response.body?.cancel();
    // Owner-private Sites return 401 to an anonymous probe after successful activation.
    return (response.status >= 200 && response.status < 400) || response.status === 401;
  } catch { return false; }
}
