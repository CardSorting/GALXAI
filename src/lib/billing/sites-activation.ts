import type { SitesRateCard } from './sites-generation';

/** Server configuration only. Membership uses the verified account subject,
 * never an email, request header, query parameter or caller-supplied owner. */
export function requireSitesCohort(raw: string | undefined, accountId: string): void {
  const unavailable = () => { throw new Error('Content unavailable'); };
  const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,254}$/.test(value);
  if (!raw || raw.length > 16384 || !validId(accountId)) return unavailable();
  let accounts: unknown;
  try { accounts = JSON.parse(raw); } catch { return unavailable(); }
  if (!Array.isArray(accounts) || accounts.length === 0 || accounts.length > 50 ||
      !accounts.every(validId) || new Set(accounts).size !== accounts.length || !accounts.includes(accountId)) return unavailable();
}

/** Private deployment qualification, supplied by an operator after live checks.
 * A feature flag alone cannot enable an unqualified billing contract. This is
 * configuration validation, not a substitute for live provider evidence.
 */
export function requireSitesActivation(enabled: string | undefined, raw: string | undefined,
  relayOrigin: string, rate: SitesRateCard, now = Date.now(), deliveryMode = 'cli'): void {
  const unavailable = () => { throw new Error('Content unavailable'); };
  if (enabled !== '1' || !['cli', 'native_host'].includes(deliveryMode)) return unavailable();
  // Fixed pricing accepts opaque supplier quotas. Fresh relay readiness and
  // locally enforced limits are checked separately before every admission.
  // Historical supplier/upload attestations do not authorize or price this mode.
  if (rate.billingMode === 'fixed') {
    if (!Number.isSafeInteger(rate.fixedChargeMicroUsd) || rate.fixedChargeMicroUsd! <= 0 ||
        !Number.isSafeInteger(rate.maxDailyGenerations) || rate.maxDailyGenerations! < 1 || rate.maxDailyGenerations! > 100 ||
        rate.inputMicroUsdPerMillion !== 0 || rate.outputMicroUsdPerMillion !== 0) return unavailable();
    return;
  }
  if (enabled !== '1' || !raw || raw.length > 8192) return unavailable();
  let q: any; try { q = JSON.parse(raw); } catch { return unavailable(); }
  if (!q || (deliveryMode !== 'cli' && deliveryMode !== 'native_host')) return unavailable();
  if (deliveryMode === 'cli') {
    if ((q.deliveryMode !== undefined && q.deliveryMode !== 'cli') || q.cliArchiveUploaded !== true) return unavailable();
  } else if (q.deliveryMode !== 'native_host' || q.nativeHostArchiveUploaded !== true || q.hostedReceiptVerified !== true) return unavailable();
  if (!q || q.schemaVersion !== 1 || q.profile !== 'sites-text-v1' || q.relayOrigin !== new URL(relayOrigin).origin ||
      q.rateVersion !== rate.version || q.model !== rate.model || !Number.isSafeInteger(q.checkedAt) ||
      !Number.isSafeInteger(q.expiresAt) || q.checkedAt > now || q.expiresAt <= now || q.expiresAt - q.checkedAt > 86400000 ||
      q.outputLimitEnforced !== true || q.maxOutputTokens !== rate.maxOutputTokens ||
      q.durableReceiptVersion !== 1 || q.receiptSurvivedRestart !== true || q.receiptRetentionDays < 30 ||
      !Number.isSafeInteger(q.receiptRetentionDays) || q.cliPrivatePublished !== true ||
      typeof q.evidenceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(q.evidenceSha256)) return unavailable();
}
