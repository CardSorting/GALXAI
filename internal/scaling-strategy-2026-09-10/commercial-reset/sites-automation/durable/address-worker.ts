/** One long-lived process per enrolled customer; no dotenv, model calls or server credentials. */
import { setTimeout as delay } from 'node:timers/promises';
import { requireThat } from './contracts';
import { DomainDiscoveryStore } from './domain-discovery-store';
import { SiteAddressDiscovery } from './domain-discovery';
import { LiveSiteDomains } from './live-domains';

async function main() {
  const [directory, ...flags] = process.argv.slice(2);
  requireThat(directory && flags.every(flag => ['--once', '--include-existing'].includes(flag)) && new Set(flags).size === flags.length, 'invalid_arguments');
  const controller = new AbortController();
  process.once('SIGTERM', () => controller.abort()); process.once('SIGINT', () => controller.abort());
  const origin = process.env.GALX_SITES_BILLING_ORIGIN!, username = process.env.GALX_SITES_USERNAME!;
  const domains = new LiveSiteDomains(origin, process.env.GALX_SITES_SESSION!, username);
  const store = new DomainDiscoveryStore(directory, { origin, username, connectionId: process.env.GALX_SITES_CONNECTION_ID!,
    accountUserId: process.env.GALX_SITES_ACCOUNT_USER_ID!, includeExisting: flags.includes('--include-existing') });
  try {
    const worker = new SiteAddressDiscovery(store, domains, process.env.GALX_SITES_ACCOUNT_USER_ID!);
    do {
      const result = await worker.tick(controller.signal);
      console.log(JSON.stringify({ status: result.discoveryAvailable ? 'watching' : 'reconnecting', checked: result.checked, active: result.active }));
      if (flags.includes('--once') || controller.signal.aborted) break;
      try { await delay(30000, undefined, { signal: controller.signal }); } catch { break; }
    } while (!controller.signal.aborted);
  } finally { store.close(); }
}
main().catch(() => { console.error(JSON.stringify({ error: 'site_address_worker_unavailable' })); process.exitCode = 1; });
