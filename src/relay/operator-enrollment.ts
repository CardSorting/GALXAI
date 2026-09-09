import { parseDesktopCredential, type DesktopCredential } from './desktop-credentials.js';
import { discoverOpenAIModels, CapabilityDiscoveryError } from './capability-discovery.js';

/** Explicit operator OAuth enrollment. Never discovers host files or refreshes a token family. */
export async function validateOperatorCredential(input: { accessToken: string; accountId: string; refreshToken?: string },
  transport: typeof fetch = fetch, now = Date.now()): Promise<DesktopCredential> {
  let candidate: DesktopCredential;
  try { candidate = parseDesktopCredential([{ source: 'manual', modifiedAt: now, data: input }], now); }
  catch { throw new Error('Enrollment requires a fresh login with matching account identity. Sign in inside the intended desktop and retry.'); }
  try { await discoverOpenAIModels({ id: 'operator-enrollment', ...candidate }, AbortSignal.timeout(10000), transport); }
  catch (error) {
    throw new Error(error instanceof CapabilityDiscoveryError && error.code === 'invalid_credential'
      ? 'The provider rejected this login. Sign in again before enrollment.'
      : 'Provider validation is unavailable. Nothing was enrolled; retry later.');
  }
  return candidate;
}
