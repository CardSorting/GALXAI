import { DesktopCredentialError, credentialClaims, type DesktopCredential } from './desktop-credentials.js';
import { readShardRegistry, decryptRegistryShard, encryptRegistryShard, replaceRegistryCredential } from './shard-registry.js';
import { CapabilityDiscoveryError, discoverOpenAIModels } from './capability-discovery.js';

export interface CredentialRefreshResult { outcome: 'updated' | 'current' }
export type RefreshDesktopCredential = (shardId: string, candidate: DesktopCredential, current: () => boolean) => Promise<CredentialRefreshResult>;
interface Dependencies {
  read: typeof readShardRegistry;
  decrypt: typeof decryptRegistryShard;
  encrypt: typeof encryptRegistryShard;
  replace: typeof replaceRegistryCredential;
  validate: (candidate: DesktopCredential) => Promise<unknown>;
}
/** Host-only handoff. No database key or returned credential crosses the desktop HTTP boundary. */
export function createDesktopCredentialRefresh(overrides: Partial<Dependencies> = {}): RefreshDesktopCredential {
  const deps: Dependencies = { read: readShardRegistry, decrypt: decryptRegistryShard, encrypt: encryptRegistryShard,
    replace: replaceRegistryCredential, validate: candidate => discoverOpenAIModels({ id: 'credential-check', ...candidate }, AbortSignal.timeout(10000)), ...overrides };
  return async (shardId, candidate, current) => {
    let row: Record<string, any> | undefined;
    try { row = (await deps.read()).find(r => r.id === shardId); }
    catch { throw new DesktopCredentialError('credential_registry_unavailable'); }
    if (!row || row.provider !== 'openai' || row.permission_retracted || ['revoked', 'dead', 'quarantined'].includes(row.status)) throw new DesktopCredentialError('credential_not_allowed');
    const previous = deps.decrypt(row);
    if (!previous || typeof previous.accountId !== 'string') throw new DesktopCredentialError('credential_registry_unavailable');
    if (previous.accountId !== candidate.accountId) throw new DesktopCredentialError('credential_account_mismatch');
    const oldToken = previous.accessToken || previous.apiKey;
    if (oldToken === candidate.accessToken && (!candidate.refreshToken || previous.refreshToken === candidate.refreshToken)) return { outcome: 'current' };
    const oldIssued = credentialClaims(oldToken || '').iat;
    if (typeof oldIssued === 'number' && candidate.issuedAtMs < oldIssued * 1000) throw new DesktopCredentialError('credential_older');
    try { await deps.validate(candidate); }
    catch (error) { throw new DesktopCredentialError(error instanceof CapabilityDiscoveryError && error.code === 'invalid_credential' ? 'credential_rejected' : 'credential_check_unavailable'); }
    if (!current()) throw new DesktopCredentialError('credential_conflict');
    try {
      const encrypted = deps.encrypt(row, { accessToken: candidate.accessToken, accountId: candidate.accountId,
        ...(candidate.refreshToken ? { refreshToken: candidate.refreshToken } : {}), expiresAtMs: candidate.expiresAtMs,
        ...(typeof previous.email === 'string' ? { email: previous.email.slice(0, 320) } : {}),
        ...(typeof previous.name === 'string' ? { name: previous.name.slice(0, 256) } : {}) });
      if (!await deps.replace(row, encrypted, candidate.expiresAtMs)) throw new DesktopCredentialError('credential_conflict');
    } catch (error) { if (error instanceof DesktopCredentialError) throw error; throw new DesktopCredentialError('credential_registry_unavailable'); }
    return { outcome: 'updated' };
  };
}
