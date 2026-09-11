/** Scheduler only. Job state and DNS authority stay in the existing backend. */
class TickError extends Error {
  constructor(readonly kind: 'configuration' | 'transport' | 'invocation' | 'redirect' | 'dns' | 'tls' | 'timeout' | 'http', readonly status: number | null = null,
    readonly destination: 'same_endpoint' | 'same_host' | 'platform_auth' | 'other' | null = null) {
    super('domain_worker_unavailable');
  }
}
export async function tick(token: string, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new TickError('configuration');
  let response: Response;
  try {
    response = await fetcher('https://galx.ai/api/internal/sites/domains/process', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.timeout(85000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const kind = message.includes('illegal invocation') ? 'invocation' : message.includes('redirect') ? 'redirect'
      : /dns|resolve/.test(message) ? 'dns' : /tls|certificate/.test(message) ? 'tls'
      : /timeout|timed out|aborted/.test(message) ? 'timeout' : 'transport';
    throw new TickError(kind);
  }
  await response.body?.cancel();
  if (response.status !== 204) {
    let destination: TickError['destination'] = null;
    const location = response.headers.get('location');
    if (location) {
      try {
        const target = new URL(location, 'https://galx.ai');
        destination = target.href === 'https://galx.ai/api/internal/sites/domains/process' ? 'same_endpoint'
          : target.origin === 'https://galx.ai' ? 'same_host' : target.origin === 'https://vercel.com' ? 'platform_auth' : 'other';
      } catch { destination = 'other'; }
    }
    throw new TickError('http', response.status, destination);
  }
}
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(env.GALX_SITES_WORKER_TOKEN).catch(error => {
      // Administrator-only logs; never HTTP bodies, headers or account records.
      console.warn(JSON.stringify({ event: 'sites_domain_scheduler_failure',
        kind: error instanceof TickError ? error.kind : 'transport', status: error instanceof TickError ? error.status : null,
        destination: error instanceof TickError ? error.destination : null }));
      throw new Error('domain_worker_unavailable');
    }));
  },
} satisfies ExportedHandler<Env>;
