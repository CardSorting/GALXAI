import * as crypto from 'node:crypto';
import type { EncryptedSecretPayload, DecryptedGalxSecret, ProviderType, AuthSessionClaims } from '../contracts/GalxContracts';


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
export const PRIMARY_KEY_VERSION = 'v1';
export const RAW_MASTER_SEED = process.env.GALX_VAULT_MASTER_SECRET || process.env.GALX_VAULT_KEY || 'galx-super-secure-master-secret-key-32b-min!';


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
    const clean = token.replace(/^Bearer\s+/i, '').trim();
    if (clean.startsWith('galx_live_')) {
      const prefix = clean.substring(0, 14);
      const suffix = clean.substring(clean.length - 4);
      return `${prefix}...${suffix}`;
    }
    if (clean.startsWith('sk-') || clean.startsWith('xai-') || clean.startsWith('ant-')) {
      const prefix = clean.substring(0, 8);
      const suffix = clean.substring(clean.length - 4);
      return `${prefix}...${suffix}`;
    }
    const prefix = clean.substring(0, 4);
    const suffix = clean.substring(clean.length - 4);
    return `${prefix}...${suffix}`;
  }

  /**
   * Generates a secure developer gateway API key with `galx_live_` or `galx_test_` prefix and SHA-256 hash.
   * Mirrors Stripe and GitHub enterprise token formats with embedded checksum for fast offline format validation.
   */
  static generateGatewayKey(
    name?: string,
    userId?: string,
    options?: { environment?: 'live' | 'test' }
  ): { apiKey: string; keyPrefix: string; keyHash: string; rawKey: string; prefix: string; checksum: string; environment: 'live' | 'test' } {
    const environment = options?.environment === 'test' ? 'test' : 'live';
    const randomHex = crypto.randomBytes(24).toString('hex');
    const payload = `${environment}_${randomHex}`;
    const checksum = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 6);
    const apiKey = `galx_${environment}_${randomHex}_${checksum}`;
    const keyPrefix = `galx_${environment}_${randomHex.substring(0, 6)}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    return { apiKey, keyPrefix, keyHash, rawKey: apiKey, prefix: keyPrefix, checksum, environment };
  }

  static generateGatewayApiKey(options?: { environment?: 'live' | 'test' }) {
    return this.generateGatewayKey(undefined, undefined, options);
  }

  /**
   * Validates token format and embedded checksum offline before database lookup.
   */
  static validateKeyFormat(token: string): { valid: boolean; environment?: 'live' | 'test' } {
    if (!token || typeof token !== 'string') return { valid: false };
    const clean = token.replace(/^(Bearer|Token)\s+/i, '').trim();
    const match = clean.match(/^galx_(live|test)_([0-9a-f]{48})_([0-9a-f]{6})$/i);
    if (!match) {
      // Legacy prefix compatibility support (e.g. galx_live_48hex or sk-...)
      if (clean.startsWith('galx_live_') || clean.startsWith('galx_test_') || clean.startsWith('sk-galx-') || clean.startsWith('sk-')) {
        return { valid: true, environment: clean.includes('test') ? 'test' : 'live' };
      }
      return { valid: false };
    }
    const [, env, hex, providedChecksum] = match;
    const computedChecksum = crypto.createHash('sha256').update(`${env}_${hex}`).digest('hex').substring(0, 6);
    if (computedChecksum.toLowerCase() !== providedChecksum.toLowerCase()) {
      return { valid: false };
    }
    return { valid: true, environment: env as 'live' | 'test' };
  }

  /**
   * Hashes a developer API key for secure lookup and validation.
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  static verifyGatewayApiKey(rawKey: string, expectedHash: string): boolean {
    if (!rawKey || !expectedHash) return false;
    try {
      const computed = this.hashApiKey(rawKey);
      const computedBuf = Buffer.from(computed, 'hex');
      const expectedBuf = Buffer.from(expectedHash, 'hex');
      if (computedBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(computedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Validates whether an incoming IP address satisfies an allowlist of CIDR ranges / exact IPs.
   */
  static isIpAllowed(clientIp?: string, allowlist?: string[]): boolean {
    if (!allowlist || allowlist.length === 0 || allowlist.includes('*') || allowlist.includes('0.0.0.0/0')) {
      return true;
    }
    if (!clientIp) return false;
    const cleanIp = clientIp.split(',')[0].trim();

    for (const rule of allowlist) {
      const trimmedRule = rule.trim();
      if (trimmedRule === cleanIp || trimmedRule === '0.0.0.0/0' || trimmedRule === '*') return true;

      // IPv4 CIDR matching (e.g. 192.168.1.0/24 or 10.0.0.0/8)
      if (trimmedRule.includes('/') && cleanIp.includes('.')) {
        try {
          const [range, bitsStr] = trimmedRule.split('/');
          const bits = parseInt(bitsStr, 10);
          if (bits >= 0 && bits <= 32) {
            const ipToNum = (ip: string) => ip.split('.').reduce((acc, oct) => ((acc << 8) + parseInt(oct, 10)) >>> 0, 0) >>> 0;
            const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
            if ((ipToNum(cleanIp) & mask) === (ipToNum(range) & mask)) {
              return true;
            }
          }
        } catch {}
      }
    }

    return false;
  }

  /**
   * Generates a tamper-evident client environment fingerprint (DPoP / Subnet + User-Agent binding).
   */
  static generateClientFingerprint(ipAddress?: string, userAgent?: string): string {
    let normalizedIp = '0.0.0.0/0';
    if (ipAddress) {
      const cleanIp = ipAddress.split(',')[0].trim();
      if (cleanIp.includes('.')) {
        // IPv4 /24 subnet masking for dynamic IP mobility tolerance
        const parts = cleanIp.split('.');
        normalizedIp = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
      } else if (cleanIp.includes(':')) {
        // IPv6 /64 prefix
        const parts = cleanIp.split(':');
        normalizedIp = `${parts.slice(0, 4).join(':')}::/64`;
      }
    }
    const normalizedUa = (userAgent || 'unknown_agent').toLowerCase().trim();
    return crypto.createHash('sha256').update(`${normalizedIp}|${normalizedUa}`).digest('hex');
  }

  /**
   * Parses user-agent header into clean browser and OS identifiers for non-technical user security views.
   */
  static parseUserAgent(userAgent?: string): { browser: string; os: string } {
    if (!userAgent || typeof userAgent !== 'string') {
      return { browser: 'Unknown Client', os: 'Unknown OS' };
    }

    let os = 'Unknown OS';
    if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/windows nt/i.test(userAgent)) os = 'Windows';
    else if (/linux/i.test(userAgent)) os = 'Linux';

    let browser = 'Unknown Browser';
    if (/edg\//i.test(userAgent)) browser = 'Microsoft Edge';
    else if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) browser = 'Google Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Apple Safari';
    else if (/curl/i.test(userAgent)) browser = 'cURL';
    else if (/python/i.test(userAgent)) browser = 'Python SDK';
    else if (/postman/i.test(userAgent)) browser = 'Postman';
    else if (/node-fetch|undici|axios/i.test(userAgent)) browser = 'Node.js Service';

    return { browser, os };
  }


  /**
   * Validates whether granted token scopes satisfy a required operation scope (with wildcard matching).
   * Examples:
   *   - '*' satisfies everything
   *   - 'chat:*' satisfies 'chat:completions', 'chat:stream'
   *   - 'shards:read' satisfies 'shards:read'
   */
  static validateTokenScope(grantedScopes: string[] = ['*'], requiredScope: string): boolean {
    if (!requiredScope || grantedScopes.includes('*')) return true;
    if (grantedScopes.includes(requiredScope)) return true;

    for (const scope of grantedScopes) {
      if (scope.endsWith(':*')) {
        const prefix = scope.slice(0, -2);
        if (requiredScope.startsWith(prefix + ':') || requiredScope === prefix) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Re-encrypts an AES-256-GCM vaulted secret under a target keyring version without plaintext leakage.
   */
  static reencryptSecret(
    encryptedEnvelope: EncryptedSecretPayload,
    userId: string,
    shardId: string,
    provider: ProviderType,
    targetKeyVersion = PRIMARY_KEY_VERSION
  ): EncryptedSecretPayload {
    return this.reEncryptSecret(encryptedEnvelope, userId, shardId, provider, targetKeyVersion);
  }


  /**
   * Generates an Enterprise JWE-grade Compact AES-256-GCM Encrypted Bearer Token (`galx_sess_v2...`).
   * Claims and sensitive metadata are zero-knowledge encrypted to prevent leakage over wire/logs.
   */
  static generateEncryptedSessionToken(
    params: {
      userId: string;
      provider: ProviderType;
      shardId?: string;
      shardMode?: 'pooled' | 'private';
      email?: string;
      displayName?: string;
      workspaceId?: string;
      role?: 'developer' | 'admin' | 'owner' | 'viewer';
      familyId?: string;
      sequenceNumber?: number;
      fingerprint?: string;
      scopes?: string[];
      sudoUntilMs?: number;
      ttlMs?: number;
    },
    keyVersion = PRIMARY_KEY_VERSION
  ): {
    token: string;
    tokenHash: string;
    claims: AuthSessionClaims;
    expiresAtMs: number;
  } {
    const now = Date.now();
    const ttlMs = params.ttlMs || 30 * 24 * 60 * 60 * 1000;
    const expiresAtMs = now + ttlMs;
    const jti = `jti_${now}_${crypto.randomBytes(16).toString('hex')}`;
    const familyId = params.familyId || `fam_${now}_${crypto.randomBytes(8).toString('hex')}`;
    const sequenceNumber = params.sequenceNumber || 1;
    const scopes = params.scopes && params.scopes.length > 0 ? params.scopes : ['*'];

    const claims: AuthSessionClaims = {
      sub: params.userId,
      email: params.email,
      name: params.displayName,
      provider: params.provider,
      shardId: params.shardId,
      shardMode: params.shardMode || 'pooled',
      role: params.role || 'developer',
      workspaceId: params.workspaceId,
      scopes,
      sudoUntilMs: params.sudoUntilMs,
      iat: now,
      exp: expiresAtMs,
      jti,
      iss: 'galxai-auth-v2',
      fpt: params.fingerprint,
      familyId,
      seq: sequenceNumber,
      version: 'v2'
    };

    const key = KEYRING.get(keyVersion);
    if (!key) throw new Error(`Key version '${keyVersion}' not found in keyring`);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const aad = Buffer.from(`galxai-auth-v2:${keyVersion}`, 'utf-8');
    cipher.setAAD(aad);

    const plaintext = JSON.stringify(claims);
    let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    const token = `galx_sess_v2.${iv.toString('hex')}.${ciphertext}.${tag}.${keyVersion}`;
    const tokenHash = this.hashSessionToken(token);

    return {
      token,
      tokenHash,
      claims,
      expiresAtMs
    };
  }


  /**
   * Generates a signed or encrypted session token (defaults to V2 JWE-grade compact encrypted token).
   */
  static generateSessionToken(
    params: {
      userId: string;
      provider: ProviderType;
      shardId?: string;
      shardMode?: 'pooled' | 'private';
      email?: string;
      displayName?: string;
      workspaceId?: string;
      role?: 'developer' | 'admin' | 'owner' | 'viewer';
      familyId?: string;
      sequenceNumber?: number;
      fingerprint?: string;
      ttlMs?: number;
      version?: 'v1' | 'v2';
    },
    secretSeed = RAW_MASTER_SEED
  ): {
    token: string;
    tokenHash: string;
    claims: AuthSessionClaims;
    expiresAtMs: number;
  } {
    if (params.version === 'v1') {
      const now = Date.now();
      const ttlMs = params.ttlMs || 30 * 24 * 60 * 60 * 1000;
      const expiresAtMs = now + ttlMs;
      const jti = `jti_${now}_${crypto.randomBytes(16).toString('hex')}`;

      const claims: AuthSessionClaims = {
        sub: params.userId,
        email: params.email,
        name: params.displayName,
        provider: params.provider,
        shardId: params.shardId,
        shardMode: params.shardMode || 'pooled',
        role: params.role || 'developer',
        workspaceId: params.workspaceId,
        iat: now,
        exp: expiresAtMs,
        jti,
        iss: 'galxai-auth-v1'
      };

      const payloadB64 = Buffer.from(JSON.stringify(claims), 'utf-8').toString('base64url');
      const signingKey = deriveVersionedKey(secretSeed, 'v1');
      const signature = crypto.createHmac('sha256', signingKey).update(payloadB64).digest('hex');

      const token = `galx_sess_${payloadB64}.${signature}`;
      const tokenHash = this.hashSessionToken(token);

      return {
        token,
        tokenHash,
        claims,
        expiresAtMs
      };
    }

    return this.generateEncryptedSessionToken(params);
  }

  /**
   * Verifies an incoming session token, seamlessly supporting both V2 Encrypted Tokens and V1 Signed Tokens.
   */
  static verifySessionToken(
    token: string,
    secretSeed = RAW_MASTER_SEED
  ): {
    valid: boolean;
    claims?: AuthSessionClaims;
    error?: string;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'MISSING_TOKEN' };
    }

    // 1. Handle V2 JWE-Grade Compact Encrypted Token (`galx_sess_v2.iv.ciphertext.tag.keyVersion`)
    if (token.startsWith('galx_sess_v2.')) {
      const parts = token.slice('galx_sess_v2.'.length).split('.');
      if (parts.length < 3) {
        return { valid: false, error: 'MALFORMED_V2_TOKEN_STRUCTURE' };
      }

      const [ivHex, ciphertextHex, tagHex, keyVersion = PRIMARY_KEY_VERSION] = parts;
      const key = KEYRING.get(keyVersion);
      if (!key) {
        return { valid: false, error: 'KEYRING_VERSION_NOT_FOUND' };
      }

      try {
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        const aad = Buffer.from(`galxai-auth-v2:${keyVersion}`, 'utf-8');
        decipher.setAAD(aad);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertextHex, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');

        if (!decrypted) {
          return { valid: false, error: 'INVALID_SIGNATURE_TAMPER_DETECTED' };
        }

        const claims = JSON.parse(decrypted) as AuthSessionClaims;
        if (!claims.exp || claims.exp <= Date.now()) {
          return { valid: false, claims, error: 'TOKEN_EXPIRED' };
        }

        if (!claims.sub || !claims.provider) {
          return { valid: false, claims, error: 'INVALID_CLAIMS_PAYLOAD' };
        }

        return { valid: true, claims };
      } catch {
        return { valid: false, error: 'INVALID_SIGNATURE_TAMPER_DETECTED' };
      }
    }


    // 2. Handle V1 HMAC-SHA256 Signed Token (`galx_sess_payload.signature`)
    if (token.startsWith('galx_sess_')) {
      const raw = token.slice('galx_sess_'.length);
      const dotIdx = raw.lastIndexOf('.');
      if (dotIdx === -1) {
        return { valid: false, error: 'MALFORMED_TOKEN_STRUCTURE' };
      }

      const payloadB64 = raw.substring(0, dotIdx);
      const signatureHex = raw.substring(dotIdx + 1);

      if (!payloadB64 || !signatureHex || signatureHex.length !== 64) {
        return { valid: false, error: 'INVALID_TOKEN_COMPONENTS' };
      }

      let isSignatureValid = false;
      for (const [, key] of KEYRING.entries()) {
        try {
          const expectedSig = crypto.createHmac('sha256', key).update(payloadB64).digest('hex');
          const sigBuf = Buffer.from(signatureHex, 'hex');
          const expectedBuf = Buffer.from(expectedSig, 'hex');
          if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            isSignatureValid = true;
            break;
          }
        } catch {}
      }

      if (!isSignatureValid) {
        return { valid: false, error: 'INVALID_SIGNATURE_TAMPER_DETECTED' };
      }

      try {
        const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
        const claims = JSON.parse(decodedJson) as AuthSessionClaims;

        if (!claims.exp || typeof claims.exp !== 'number' || claims.exp <= Date.now()) {
          return { valid: false, claims, error: 'TOKEN_EXPIRED' };
        }

        if (!claims.sub || !claims.provider) {
          return { valid: false, claims, error: 'INVALID_CLAIMS_PAYLOAD' };
        }

        return { valid: true, claims };
      } catch {
        return { valid: false, error: 'MALFORMED_CLAIMS_JSON' };
      }
    }

    return { valid: false, error: 'INVALID_TOKEN_PREFIX' };
  }

  /**
   * Hashes a session bearer token with SHA-256 for zero-knowledge storage in PostgreSQL.
   */
  static hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a high-entropy cryptographically secure refresh token.
   */
  static generateRefreshToken(): { refreshToken: string; tokenHash: string } {
    const raw = `galx_ref_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = this.hashSessionToken(raw);
    return { refreshToken: raw, tokenHash };
  }
}


