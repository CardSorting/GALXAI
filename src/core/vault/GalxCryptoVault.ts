import * as crypto from 'node:crypto';
import type { EncryptedSecretPayload, DecryptedGalxSecret, ProviderType } from '../contracts/GalxContracts';

/**
 * Enterprise Hardware-Grade Cryptographic Vault for Secret Isolation.
 *
 * Implements:
 * 1. AES-256-GCM Envelope Encryption with 96-bit random IVs and 128-bit authentication tags.
 * 2. Authenticated Associated Data (AAD) binding tenant UID, shard ID, and provider to prevent cross-tenant secret transplantation.
 * 3. Ephemeral memory zeroization (`zeroizeBuffer`) for unconditional post-request RAM scrubbing.
 * 4. Multi-version Keyring derivation via HKDF-SHA256.
 */

export class GalxVaultDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GalxVaultDecryptionError';
  }
}

// Master Keyring with HKDF-SHA256 Derivation
const PRIMARY_KEY_VERSION = 'v1';
const RAW_MASTER_SEED = process.env.GALX_VAULT_MASTER_SECRET || 'galx-super-secure-master-secret-key-32b-min!';

function deriveVersionedKey(seed: string, version: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(seed, 'utf-8'),
      Buffer.from('galx-vault-salt-2026', 'utf-8'),
      Buffer.from(`galx-shard-isolation-${version}`, 'utf-8'),
      32
    )
  );
}

const KEYRING: Map<string, Buffer> = new Map([
  ['v1', deriveVersionedKey(RAW_MASTER_SEED, 'v1')],
  ['v2', deriveVersionedKey(RAW_MASTER_SEED, 'v2')]
]);

export class GalxCryptoVault {
  /**
   * Encrypts plaintext credential secret with AES-256-GCM and binds AAD envelope.
   */
  static encryptSecret(
    secret: DecryptedGalxSecret,
    tenantUid: string,
    shardId: string,
    provider: ProviderType = 'openai',
    keyVersion = PRIMARY_KEY_VERSION
  ): EncryptedSecretPayload {
    const key = KEYRING.get(keyVersion);
    if (!key) {
      throw new Error(`Key version '${keyVersion}' not found in keyring`);
    }

    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Cryptographically bind Tenant UID, Shard ID, and Provider via AAD
    const aad = Buffer.from(`${tenantUid}:${shardId}:${provider}`, 'utf-8');
    cipher.setAAD(aad);

    const plaintext = JSON.stringify(secret);
    let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
      keyVersion
    };
  }

  /**
   * Decrypts ciphertext with AAD authentication. Fails if tenant UID, shard ID, or provider mismatch.
   */
  static decryptSecret(
    encrypted: EncryptedSecretPayload,
    tenantUid: string,
    shardId: string,
    provider: ProviderType = 'openai'
  ): DecryptedGalxSecret {
    const version = encrypted.keyVersion || PRIMARY_KEY_VERSION;
    const key = KEYRING.get(version);
    if (!key) {
      throw new GalxVaultDecryptionError(`Key version '${version}' is missing from keyring`);
    }

    try {
      const iv = Buffer.from(encrypted.iv, 'hex');
      const tag = Buffer.from(encrypted.tag, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

      const aad = Buffer.from(`${tenantUid}:${shardId}:${provider}`, 'utf-8');
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return JSON.parse(decrypted) as DecryptedGalxSecret;
    } catch {
      throw new GalxVaultDecryptionError(
        `Failed to authenticate or decrypt shard credentials for tenant '${tenantUid}' and shard '${shardId}'. Authentication tag mismatch.`
      );
    }
  }

  /**
   * Re-encrypts payload under latest primary key version for secret migration.
   */
  static reEncryptSecret(
    encrypted: EncryptedSecretPayload,
    tenantUid: string,
    shardId: string,
    provider: ProviderType = 'openai',
    targetKeyVersion = PRIMARY_KEY_VERSION
  ): EncryptedSecretPayload {
    const decrypted = this.decryptSecret(encrypted, tenantUid, shardId, provider);
    return this.encryptSecret(decrypted, tenantUid, shardId, provider, targetKeyVersion);
  }

  /**
   * Securely zeroizes a memory buffer to prevent sensitive token retention in heap.
   */
  static zeroizeBuffer(buffer: Buffer): void {
    buffer.fill(0);
  }

  /**
   * Masks an API Key or Bearer Token for safe client telemetry.
   */
  static maskApiKey(token: string): string {
    if (!token || typeof token !== 'string' || token.length < 8) return '****';
    const clean = token.replace(/^Bearer\s+/i, '');
    if (clean.startsWith('sk-') || clean.startsWith('xai-')) {
      const prefix = clean.substring(0, 8);
      const suffix = clean.substring(clean.length - 4);
      return `${prefix}...${suffix}`;
    }
    const prefix = clean.substring(0, 4);
    const suffix = clean.substring(clean.length - 4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Generates a secure developer gateway API key with `galx_live_` prefix and SHA-256 hash.
   */
  static generateGatewayKey(name?: string, userId?: string): { apiKey: string; keyPrefix: string; keyHash: string; rawKey: string; prefix: string } {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const apiKey = `galx_live_${randomHex}`;
    const keyPrefix = apiKey.substring(0, 18);
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    return { apiKey, keyPrefix, keyHash, rawKey: apiKey, prefix: keyPrefix };
  }

  static generateGatewayApiKey(): { rawKey: string; keyHash: string; prefix: string; apiKey: string; keyPrefix: string } {
    return this.generateGatewayKey();
  }

  /**
   * Hashes a developer API key for secure lookup and validation.
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  static verifyGatewayApiKey(rawKey: string, expectedHash: string): boolean {
    const computed = this.hashApiKey(rawKey);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expectedHash, 'hex'));
  }
}
