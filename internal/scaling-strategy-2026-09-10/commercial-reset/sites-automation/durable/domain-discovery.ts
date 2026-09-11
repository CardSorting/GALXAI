import { identifier, requireThat } from './contracts';
import { DomainDiscoveryStore } from './domain-discovery-store';
import { LiveSiteDomains } from './live-domains';
import { nativeSitesCall, verifySiteOwner, type SitesCall } from './live-sites';

/** Once enrolled, new native Sites are discovered without per-Site binding. */
export class SiteAddressDiscovery {
  constructor(private readonly store: DomainDiscoveryStore, private readonly domains: Pick<LiveSiteDomains, 'connect'>,
    private readonly accountUserId: string, private readonly call: SitesCall = nativeSitesCall) { identifier(accountUserId); }
  private async inventory(signal: AbortSignal): Promise<string[]> {
    const ids = new Set<string>(), cursors = new Set<string>(); let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const result = await this.call('sites.list_sites', { limit: 50, role: 'owner', ...(cursor ? { cursor } : {}) }, signal);
      requireThat(Array.isArray(result.items) && result.items.length <= 50, 'sites_inventory_invalid');
      for (const item of result.items) { identifier(item?.id); ids.add(item.id); }
      if (result.cursor == null) return [...ids];
      requireThat(typeof result.cursor === 'string' && result.cursor.length > 0 && result.cursor.length <= 4096 &&
        !/[\u0000-\u001f\u007f]/.test(result.cursor) && !cursors.has(result.cursor), 'sites_inventory_invalid');
      cursor = result.cursor; cursors.add(cursor!);
    }
    throw new Error('sites_inventory_invalid');
  }
  async tick(signal: AbortSignal): Promise<{ discoveryAvailable: boolean; checked: number; active: number }> {
    let discoveryAvailable = true;
    try { this.store.discover(await this.inventory(AbortSignal.any([signal, AbortSignal.timeout(180000)]))); }
    catch { discoveryAvailable = false; } // Previously enrolled jobs still progress during discovery failures.
    let checked = 0, active = 0;
    for (let count = 0; count < 4 && !signal.aborted; count++) {
      const job = this.store.claim(); if (!job) break;
      let ready = false;
      try {
        const deadline = AbortSignal.any([signal, AbortSignal.timeout(240000)]);
        const verify = () => verifySiteOwner(job.projectId, this.accountUserId, deadline, this.call);
        const site = await verify();
        const address = await this.domains.connect(job.projectId, site.title, verify, deadline);
        ready = address.status === 'active';
      } catch { /* Retry with the same project; the server retains the one attachment attempt. */ }
      this.store.finish(job, ready); checked++; if (ready) active++;
    }
    return { discoveryAvailable, checked, active };
  }
}
