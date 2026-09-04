import * as crypto from 'node:crypto';

let ephemeralDevelopmentSeed: Buffer | undefined;

/**
 * Derives domain-separated signing keys without embedding a reusable fallback.
 * Production must supply secret-manager material. Tests and local simulations
 * receive a random process-lifetime key that cannot verify across restarts.
 */
export function resolveSigningKey(purpose: string): Buffer {
  const configured =
    process.env.GALX_AUDIT_SIGNING_SECRET ||
    process.env.GALX_VAULT_MASTER_SECRET;

  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error(
      'GALX_AUDIT_SIGNING_SECRET or GALX_VAULT_MASTER_SECRET must be supplied by the deployment secret manager'
    );
  }

  const rootKey = configured
    ? Buffer.from(configured, 'utf8')
    : (ephemeralDevelopmentSeed ||= crypto.randomBytes(48));

  return crypto
    .createHmac('sha256', rootKey)
    .update(`galx-signing:${purpose}:v1`)
    .digest();
}

export function hasConfiguredSigningKey(): boolean {
  return Boolean(
    process.env.GALX_AUDIT_SIGNING_SECRET ||
    process.env.GALX_VAULT_MASTER_SECRET
  );
}
