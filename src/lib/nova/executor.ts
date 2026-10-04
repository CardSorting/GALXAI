import { executeRelayChat, RelayDispatchError } from '@/core/router/adapters/RelayChatTransport';
import { resolveIsolatedRelay } from '@/core/router/adapters/RelayEndpointDiscovery';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import { NovaError } from './contract';
import type { NovaExecutor } from './inference';

/** Reuse the established execution transport and its conservative outcome rules. */
export const executeNova: NovaExecutor = async (input, admission, signal) => {
  let configured;
  try { configured = await resolveIsolatedRelay('text'); }
  catch { throw new NovaError('service_busy', 503); }
  try {
    const model = ModelCatalog.resolveModel('galx-nova');
    const result = await executeRelayChat({ ...configured, tenant: admission.userId, idempotencyKey: admission.id,
      // Nova validates terminal evidence itself, including for a JSON client.
      // Do not inherit the legacy nonstreaming adapter's default finish reason.
      payload: { ...input, stream: true, model: model.upstreamId || model.id }, signal,
      ttftTimeoutMs: 45_000, idleTimeoutMs: 45_000, wallTimeoutMs: 300_000 });
    return result.response;
  } catch (error) {
    if (error instanceof RelayDispatchError && error.executionState === 'not_accepted') throw new NovaError('service_busy', 503);
    throw new NovaError('outcome_unconfirmed', 502, 'unknown');
  }
};
