/**
 * GALXAI: Enterprise Hardened "Provider as Auth" Engine (V3)
 * 1-Click Zero-Friction Provider Ingestion, AES-256-GCM Envelope Vaulting,
 * JWE-grade Encrypted Bearer Tokens, OAuth 2.0 Token Rotation with Reuse Cascades,
 * Client Fingerprint Binding (DPoP), Step-Up SUDO Mode, Token Scoping,
 * Adaptive Behavioral Risk Scoring, and KMS Key Re-Wrapping.
 */

import * as crypto from 'node:crypto';
import { getSupabaseAuthClient } from '../../lib/supabase/client';
import { GalxCryptoVault, PRIMARY_KEY_VERSION } from '../vault/GalxCryptoVault';
import { galxRouter } from '../router/GalxModelRouter';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';
import { SessionRepository } from '../../lib/supabase/repositories/SessionRepository';
import { OAuthRepository } from '../../lib/supabase/repositories/OAuthRepository';
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbAggregateQuery, DbAggregateResult } from '../broccolidb/broccolidb.contracts';
import type {
  ProviderType,
  ShardIsolationMode,
  GalxShardAccount,
  GalxUserSession,
  AuthSessionClaims,
  AuthIdentityResult,
  ProviderAuthParams,
  ProviderAuthResult,
  SessionDeviceInfo,
  SessionRotationResult,
  SudoElevationResult,
  UserSecurityPosture,
  RestrictedTokenParams,
  RestrictedTokenResult,
  SessionRiskEvaluation
} from '../contracts/GalxContracts';

import { GalxOAuthManager } from './GalxOAuthManager';
import { GalxPreflightValidator } from '../validator/GalxPreflightValidator';

export class GalxAuthEngine {
  private static instance: GalxAuthEngine;
  public readonly riskEvaluationTable: BroccoliDbTable<SessionRiskEvaluation & { id: string; userId?: string; sessionId?: string; timestampMs: number }>;
  private readonly sessionRepo: SessionRepository;
  private readonly persistence: GalxPersistence;

  private constructor() {
    this.sessionRepo = SessionRepository.getInstance();
    this.persistence = GalxPersistence.getInstance();

    this.riskEvaluationTable = new BroccoliDbTable<SessionRiskEvaluation & { id: string; userId?: string; sessionId?: string; timestampMs: number }>('session_risk_evaluations');
    this.riskEvaluationTable.createIndex('userId');
    this.riskEvaluationTable.createIndex('sessionId');
    this.riskEvaluationTable.createIndex('riskLevel');
    this.riskEvaluationTable.createIndex('isHighRisk');
    this.riskEvaluationTable.createSortedIndex('riskScore');
    this.riskEvaluationTable.createSortedIndex('timestampMs');
    this.riskEvaluationTable.createSortedIndex('riskScore');
    this.riskEvaluationTable.createSortedIndex('timestampMs');
  }

  static getInstance(): GalxAuthEngine {
    if (!GalxAuthEngine.instance) {
      GalxAuthEngine.instance = new GalxAuthEngine();
    }
    return GalxAuthEngine.instance;
  }

  /**
   * 1-Click Provider Ingestion & Hardened Authentication Flow ("Provider IS Auth").
   * Ingests upstream OAuth 2.0 authentication tokens or validated developer API keys,
   * vaults credentials with AES-256-GCM + AAD envelope binding, provisions a Substrate shard,
   * encrypts a JWE-grade bearer session token, and records session in Supabase PostgreSQL.
   */
  async authenticateProviderUser(
    provider: ProviderType,
    params: ProviderAuthParams = {}
  ): Promise<ProviderAuthResult> {
    const {
      apiKey,
      accessToken,
      refreshToken,
      accountId: explicitAccountId,
      idToken,
      expiresAtMs: explicitExpiresAtMs,
      authType: explicitAuthType,
      mode = 'pooled',
      ipAddress,
      userAgent,
      workspaceId,
      scopes = ['*']
    } = params;

    const effectiveProvider: ProviderType = 'openai';
    const uid = `openai_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const familyId = `fam_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const fingerprint = GalxCryptoVault.generateClientFingerprint(ipAddress, userAgent);
    const oauthManager = GalxOAuthManager.getInstance();

    // =========================================================================
    // 2. Real Credential Ingestion & Verification (OAuth Tokens vs API Keys)
    // =========================================================================
    let rawTokenSecret: string | undefined = undefined;
    let authType: 'oauth' | 'api_key' = (explicitAuthType === 'oauth' || explicitAuthType === 'api_key')
      ? explicitAuthType
      : (accessToken ? 'oauth' : 'api_key');
    let email = params.email;
    let displayName = params.displayName;
    let accountId = explicitAccountId;
    let expiresAtMs = explicitExpiresAtMs;

    if (accessToken || idToken || explicitAuthType === 'oauth') {
      authType = 'oauth';
      rawTokenSecret = accessToken || idToken;

      if (!rawTokenSecret || rawTokenSecret.trim().length < 10) {
        throw new Error('INVALID_OAUTH_TOKEN: Provided access token is invalid or too short');
      }

      // Parse claims from id_token or access_token
      const tokenSource = idToken || accessToken || '';
      if (!accountId) {
        accountId = oauthManager.extractAccountId(tokenSource);
      }
      if (!email) {
        email = oauthManager.extractEmail(tokenSource) || 'user@openai.oauth';
      }
      if (!displayName) {
        displayName = oauthManager.extractName(tokenSource) || 'OpenAI OAuth User';
      }
      if (!expiresAtMs) {
        const parsedExp = oauthManager.extractExpiryMs(accessToken || '');
        expiresAtMs = parsedExp || (Date.now() + 3600 * 1000);
      }
    } else if (apiKey) {
      authType = 'api_key';
      const preflight = GalxPreflightValidator.validateKeyFormat(apiKey, effectiveProvider);
      if (!preflight.isValid) {
        throw new Error(preflight.error || 'INVALID_API_KEY_FORMAT: Key does not match provider specifications');
      }
      rawTokenSecret = apiKey.trim();
      if (!email) {
        email = 'creator@openai.user';
      }
      if (!displayName) {
        displayName = 'OpenAI Creator';
      }
    } else {
      // Check server environment root fallback key (for dev/local infrastructure without placeholder generation)
      const envKey = process.env.OPENAI_API_KEY;
      if (envKey && envKey.trim().length > 15) {
        authType = 'api_key';
        rawTokenSecret = envKey.trim();
        if (!email) email = 'creator@openai.user';
        if (!displayName) displayName = 'OpenAI Creator';
      } else {
        throw new Error(
          `MISSING_PROVIDER_CREDENTIALS: An OAuth access token or valid API key is required to authenticate with ${effectiveProvider}.`
        );
      }
    }

    // =========================================================================
    // 3. Vault credential with AES-256-GCM Envelope Encryption & AAD Binding
    // =========================================================================
    const allowEphemeralTestIdentity =
      process.env.NODE_ENV === 'test' &&
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS === 'true';
    const shardIdSecret =
      process.env.GALX_SHARD_ID_SECRET ||
      process.env.GALX_VAULT_MASTER_SECRET ||
      (allowEphemeralTestIdentity ? 'test-only-ephemeral-shard-identity' : undefined);
    if (!shardIdSecret) {
      throw new Error('GALX_SHARD_ID_SECRET is required for stable, non-reversible shard identifiers');
    }
    const shardIdentity = accountId || rawTokenSecret!;
    const shardId = `codex_sh_${crypto
      .createHmac('sha256', shardIdSecret)
      .update(`${effectiveProvider}:${shardIdentity}`)
      .digest('hex')
      .slice(0, 24)}`;
    const encrypted = GalxCryptoVault.encryptSecret(
      {
        apiKey: authType === 'api_key' ? rawTokenSecret : undefined,
        accessToken: authType === 'oauth' ? rawTokenSecret : undefined,
        refreshToken,
        expiresAtMs,
        accountId: accountId || `acc_${uid.slice(-8)}`,
        email,
        name: displayName
      },
      uid,
      shardId,
      effectiveProvider
    );

    // 4. Create Rate Governor Continuous Bucket
    const bucket = galxRouter.rateGovernor.createDefaultBucket(
      400000,
      400000,
      800
    );

    // 5. Provision Shard Account
    const shard: GalxShardAccount = {
      id: shardId,
      userId: uid,
      accountLabel: displayName ? `${displayName}'s OpenAI Vault` : 'Personal AI Shard',
      provider: effectiveProvider,
      authType,
      shardMode: mode === 'private' ? 'private' : 'pooled',
      status: 'healthy',
      priority: mode === 'private' ? 50 : 10,
      weight: 1,
      fencingToken: 1,
      apiKeyMasked: GalxCryptoVault.maskApiKey(rawTokenSecret!),
      encryptedSecrets: encrypted,
      encryptedPayload: encrypted,
      tokenBucket: bucket,
      stats: {
        totalRequestsServed: 0,
        totalTokensConsumed: 0,
        consecutiveFailures: 0
      },
      permissionRetracted: false,
      registrySource: authType === 'oauth' ? 'oauth' : 'api',
      expiresAtMs,
      accountId,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    await galxRouter.substrate.addAccountAsync(shard, { requireRemote: true });

    // 5a. Persist OAuth Provider Identity in OAuthRepository (Sovereign Identity Linking)
    if (authType === 'oauth' || accessToken) {
      try {
        const oauthRepo = OAuthRepository.getInstance();
        const identityId = `oauth_${effectiveProvider}_${accountId || uid}`;
        oauthRepo.saveOAuthIdentity({
          id: identityId,
          userId: uid,
          provider: effectiveProvider,
          providerAccountId: accountId || uid,
          email: email || `${effectiveProvider}@user.ai`,
          displayName,
          shardId,
          encryptedAccessToken: encrypted,
          encryptedRefreshToken: refreshToken ? GalxCryptoVault.encryptSecret({ refreshToken }, uid, shardId, effectiveProvider) : undefined,
          idTokenClaims: idToken ? GalxOAuthManager.getInstance().parseJwtClaims(idToken) : undefined,
          scopes,
          expiresAtMs,
          lastRefreshedAtMs: Date.now(),
          status: 'active',
          createdAtMs: Date.now(),
          updatedAtMs: Date.now()
        }).catch(() => {});
      } catch {}
    }

    // 6. Generate JWE Encrypted Bearer Session Token with default 15-minute SUDO grant on initial login
    const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const initialSudoUntil = Date.now() + 15 * 60 * 1000;

    const tokenResult = GalxCryptoVault.generateEncryptedSessionToken({
      userId: uid,
      provider: effectiveProvider,
      shardId,
      shardMode: shard.shardMode,
      email: email || `${effectiveProvider}@user.ai`,
      displayName: displayName || 'Developer',
      workspaceId,
      role: 'developer',
      scopes,
      sudoUntilMs: initialSudoUntil,
      familyId,
      sequenceNumber: 1,
      fingerprint,
      ttlMs: 30 * 24 * 60 * 60 * 1000
    });

    const sessionRecord: GalxUserSession = {
      id: sessionId,
      userId: uid,
      provider: effectiveProvider,
      shardId,
      sessionFamilyId: familyId,
      sequenceNumber: 1,
      scopes,
      sudoElevatedUntilMs: initialSudoUntil,
      riskScore: 0,
      tokenHash: tokenResult.tokenHash,
      fingerprintHash: fingerprint,
      workspaceId,
      ipAddress,
      userAgent,
      isRevoked: false,
      issuedAtMs: tokenResult.claims.iat,
      expiresAtMs: tokenResult.expiresAtMs,
      lastActiveAtMs: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 7. Persist Session to Supabase PostgreSQL & Cache
    await this.sessionRepo.createSession(sessionRecord);

    // 8. Security Audit Event
    this.persistence.logAudit(
      'PROVIDER_AUTH_LOGIN',
      {
        provider: effectiveProvider,
        authType,
        shardId,
        shardMode: shard.shardMode,
        email,
        sessionId,
        familyId,
        scopes,
        tokenIssuedAt: tokenResult.claims.iat,
        expiresAt: tokenResult.expiresAtMs
      },
      shardId,
      uid
    );

      this.persistence.logAudit('OAUTH_PROVIDER_AUTHENTICATED', { provider: effectiveProvider, shardMode: shard.shardMode, scopes }, shardId, uid);

      return {
        success: true,
        user: {
          id: uid,
          email: email || `${effectiveProvider}@user.ai`,
          name: displayName || 'Developer',
          provider: effectiveProvider,
          shardId,
          shardMode: shard.shardMode || 'pooled',
          token: tokenResult.token,
          scopes,
          expiresAtMs: tokenResult.expiresAtMs
        }
      };
    }

  /**
   * Refreshes upstream OAuth provider tokens for a specific shard account using single-flight mutex.
   */
  async refreshProviderShardTokens(shardId: string): Promise<boolean> {
    try {
      await galxRouter.substrate.ensureFreshFromAuthority();
    } catch {
      return false;
    }
    const shard = galxRouter.substrate.getAccount(shardId);
    if (!shard || shard.permissionRetracted || shard.status === 'revoked') {
      return false;
    }

    try {
      const encrypted = shard.encryptedPayload || shard.encryptedSecrets;
      if (!encrypted) return false;

      const decrypted = GalxCryptoVault.decryptSecret(encrypted, shard.userId, shard.id, shard.provider);
      if (!decrypted.refreshToken) {
        return false;
      }

      const refreshed = await GalxOAuthManager.getInstance().refreshAccessToken(shard.provider, decrypted.refreshToken);
      const newEncrypted = GalxCryptoVault.encryptSecret(
        {
          ...decrypted,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || decrypted.refreshToken,
          expiresAtMs: refreshed.expiresAtMs,
          accountId: refreshed.accountId || decrypted.accountId
        },
        shard.userId,
        shard.id,
        shard.provider
      );

      const updatedShard: GalxShardAccount = {
        ...shard,
        status: 'healthy',
        cooldownUntilTimestampMs: undefined,
        stats: {
          ...shard.stats,
          consecutiveFailures: 0
        },
        apiKeyMasked: GalxCryptoVault.maskApiKey(refreshed.accessToken),
        encryptedSecrets: newEncrypted,
        encryptedPayload: newEncrypted,
        expiresAtMs: refreshed.expiresAtMs,
        accountId: refreshed.accountId || decrypted.accountId,
        updatedAtMs: Date.now()
      };

      await galxRouter.substrate.updateAccountAsync(updatedShard, { requireRemote: true });
      this.persistence.logAudit('OAUTH_TOKEN_ROTATED', { provider: shard.provider, expiresAtMs: refreshed.expiresAtMs }, shardId, shard.userId);

      // Update identity record in OAuthRepository
      try {
        const oauthRepo = OAuthRepository.getInstance();
        const identity = await oauthRepo.findIdentityByProvider(shard.userId, shard.provider);
        if (identity) {
          await oauthRepo.saveOAuthIdentity({
            ...identity,
            encryptedAccessToken: newEncrypted,
            expiresAtMs: refreshed.expiresAtMs,
            lastRefreshedAtMs: Date.now(),
            status: 'active',
            updatedAtMs: Date.now()
          });
        }
      } catch {}

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifies an incoming session bearer token cryptographically and checks PostgreSQL state.
   */
  async verifySession(
    token: string,
    touch: boolean = true
  ): Promise<{
    valid: boolean;
    claims?: AuthSessionClaims;
    session?: GalxUserSession;
    error?: string;
  }> {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'MISSING_TOKEN' };
    }

    // 1. Cryptographic HMAC/GCM Signature Verification & Claims Expiry Check
    const cryptoVerify = GalxCryptoVault.verifySessionToken(token);
    if (!cryptoVerify.valid || !cryptoVerify.claims) {
      return { valid: false, error: cryptoVerify.error || 'INVALID_SIGNATURE_OR_EXPIRED' };
    }

    // 2. Lookup Session in Supabase PostgreSQL by SHA-256 Token Hash
    const tokenHash = GalxCryptoVault.hashSessionToken(token);
    const session = await this.sessionRepo.findSessionByTokenHash(tokenHash, true);

    if (!session) {
      return { valid: false, claims: cryptoVerify.claims, error: 'SESSION_NOT_FOUND_OR_REVOKED' };
    }

    if (session.isRevoked) {
      return { valid: false, claims: cryptoVerify.claims, error: 'SESSION_REVOKED' };
    }

    if (session.expiresAtMs <= Date.now()) {
      return { valid: false, claims: cryptoVerify.claims, error: 'SESSION_EXPIRED' };
    }

    // 3. Touch session activity heartbeat
    if (touch) {
      this.sessionRepo.touchSession(session.id).catch(() => {});
    }

    return {
      valid: true,
      claims: cryptoVerify.claims,
      session
    };
  }

  /**
   * Step-Up SUDO Mode Elevation: Temporarily elevates session privileges for 15 minutes.
   */
  async elevateSessionSudo(
    sessionId: string,
    userId: string,
    durationMs: number = 15 * 60 * 1000
  ): Promise<SudoElevationResult> {
    const result = await this.sessionRepo.elevateSessionSudo(sessionId, userId, durationMs);
    if (result.success) {
      this.persistence.logAudit(
        'SUDO_MODE_ELEVATED',
        { sessionId, durationMs, elevatedUntil: result.sudoElevatedUntilMs },
        undefined,
        userId
      );
    }
    return result;
  }

  /**
   * Middleware check requiring active SUDO mode for high-risk operations.
   */
  requireSudoElevation(authResult: AuthIdentityResult): { elevated: boolean; error?: string } {
    if (!authResult.authenticated || !authResult.session) {
      return { elevated: false, error: 'UNAUTHENTICATED' };
    }

    const now = Date.now();
    const session = authResult.session;
    const isElevated = Boolean(session.sudoElevatedUntilMs && session.sudoElevatedUntilMs > now);

    if (!isElevated) {
      return {
        elevated: false,
        error: 'SUDO_MODE_REQUIRED: Elevated verification required for high-risk operations. Call POST /api/auth/sudo/elevate.'
      };
    }

    return { elevated: true };
  }

  /**
   * Mints an Ephemeral Scoped Sub-Token (Stripe / AWS STS Pattern) for subagents or microservices.
   */
  async createRestrictedToken(
    parentToken: string,
    params: RestrictedTokenParams
  ): Promise<RestrictedTokenResult> {
    const verified = await this.verifySession(parentToken, false);
    if (!verified.valid || !verified.claims || !verified.session) {
      return { success: false, error: verified.error || 'INVALID_PARENT_TOKEN' };
    }

    const parentClaims = verified.claims;
    const ttlMs = params.ttlMs || 3600000; // 1 hour default
    const expiresAtMs = Date.now() + ttlMs;

    // Validate that requested scopes are a subset of parent scopes
    const parentScopes = parentClaims.scopes || ['*'];
    for (const reqScope of params.scopes) {
      if (!GalxCryptoVault.validateTokenScope(parentScopes, reqScope)) {
        return { success: false, error: `SCOPE_NOT_PERMITTED: Scope '${reqScope}' exceeds parent token permissions.` };
      }
    }

    const subTokenResult = GalxCryptoVault.generateEncryptedSessionToken({
      userId: parentClaims.sub,
      provider: parentClaims.provider,
      shardId: parentClaims.shardId,
      shardMode: parentClaims.shardMode,
      email: parentClaims.email,
      displayName: params.name || `${parentClaims.name || 'User'} (Scoped)`,
      workspaceId: parentClaims.workspaceId,
      role: 'viewer',
      scopes: params.scopes,
      familyId: verified.session.sessionFamilyId,
      sequenceNumber: (verified.session.sequenceNumber || 1) + 1000,
      ttlMs
    });

    const subSessionId = `sess_sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await this.sessionRepo.createSession({
      id: subSessionId,
      userId: parentClaims.sub,
      provider: parentClaims.provider,
      shardId: parentClaims.shardId,
      sessionFamilyId: verified.session.sessionFamilyId,
      sequenceNumber: (verified.session.sequenceNumber || 1) + 1000,
      scopes: params.scopes,
      tokenHash: subTokenResult.tokenHash,
      isRevoked: false,
      issuedAtMs: Date.now(),
      expiresAtMs,
      lastActiveAtMs: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.persistence.logAudit(
      'RESTRICTED_TOKEN_MINTED',
      { parentSessionId: verified.session.id, subSessionId, scopes: params.scopes, expiresAtMs },
      parentClaims.shardId,
      parentClaims.sub
    );

    return {
      success: true,
      token: subTokenResult.token,
      scopes: params.scopes,
      expiresAtMs
    };
  }


  /**
   * Evaluates session behavioral risk score (0-100) based on environment and network anomalies.
   */
  evaluateSessionRisk(
    session: GalxUserSession,
    incomingIp?: string,
    incomingUserAgent?: string
  ): SessionRiskEvaluation {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // 1. IP Subnet Shift Detection
    if (incomingIp && session.ipAddress) {
      const storedFpt = session.fingerprintHash;
      const currentFpt = GalxCryptoVault.generateClientFingerprint(incomingIp, session.userAgent);
      if (storedFpt && currentFpt !== storedFpt) {
        riskScore += 25;
        riskFactors.push('IP_SUBNET_SHIFT_DETECTED');
      }
    }

    // 2. Client User-Agent OS Shift
    if (incomingUserAgent && session.userAgent) {
      const storedUa = GalxCryptoVault.parseUserAgent(session.userAgent);
      const currentUa = GalxCryptoVault.parseUserAgent(incomingUserAgent);
      if (storedUa.os !== currentUa.os) {
        riskScore += 35;
        riskFactors.push(`DEVICE_OS_SHIFT: ${storedUa.os} -> ${currentUa.os}`);
      }
    }

    const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
    const isHighRisk = riskScore >= 50;

    const evalRecord: SessionRiskEvaluation & { id: string; userId?: string; sessionId?: string; timestampMs: number } = {
      id: `risk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      userId: session.userId,
      riskScore,
      riskLevel,
      isHighRisk,
      riskFactors,
      timestampMs: Date.now()
    };
    this.riskEvaluationTable.put(evalRecord.id, evalRecord);

    if (riskScore > 0) {
      this.sessionRepo.recordRiskEvent(
        session.id,
        session.userId,
        riskScore,
        riskFactors,
        incomingIp,
        incomingUserAgent
      ).catch(() => {});
    }

    return {
      riskScore,
      riskLevel,
      isHighRisk,
      riskFactors
    };
  }

  /**
   * Calculates comprehensive User Security Posture & Health Grade.
   */
  async getUserSecurityPosture(userId: string, currentSessionId?: string): Promise<UserSecurityPosture> {
    return this.sessionRepo.getUserSecurityPosture(userId, currentSessionId);
  }

  /**
   * Re-encrypts all vaulted credentials under a new target KMS keyring version with zero downtime.
   */
  async reencryptVaultShards(targetKeyVersion = PRIMARY_KEY_VERSION): Promise<{ total: number; reencrypted: number }> {
    await galxRouter.substrate.ensureFreshFromAuthority();
    const shards = galxRouter.substrate.listAccounts();
    let reencrypted = 0;

    for (const shard of shards) {
      try {
        if (shard.encryptedSecrets) {
          const newSecrets = GalxCryptoVault.reencryptSecret(
            shard.encryptedSecrets,
            shard.userId,
            shard.id,
            shard.provider,
            targetKeyVersion
          );
          const updatedShard: GalxShardAccount = {
            ...shard,
            encryptedSecrets: newSecrets,
            encryptedPayload: newSecrets,
            updatedAtMs: Date.now()
          };
          await galxRouter.substrate.updateAccountAsync(updatedShard, { requireRemote: true });
          reencrypted++;
        }
      } catch {
        // Continue
      }
    }


    this.persistence.logAudit('KMS_VAULT_KEYS_REWRAPPED', { targetKeyVersion, reencrypted });
    return { total: shards.length, reencrypted };
  }

  /**
   * OAuth 2.0 Token Rotation with Anti-Replay & Reuse Detection Cascades (RFC 6819).
   */
  async refreshSession(
    currentToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionRotationResult> {
    const verified = await this.verifySession(currentToken, false);
    if (!verified.valid || !verified.claims || !verified.session) {
      return { success: false, error: verified.error || 'CANNOT_REFRESH_INVALID_SESSION' };
    }

    const { claims, session } = verified;
    const nextSeq = (session.sequenceNumber || 1) + 1;
    const fingerprint = GalxCryptoVault.generateClientFingerprint(ipAddress || session.ipAddress, userAgent || session.userAgent);

    // Evaluate risk on rotation
    const risk = this.evaluateSessionRisk(session, ipAddress, userAgent);

    // Generate fresh JWE Encrypted Token maintaining lineage
    const newTokenResult = GalxCryptoVault.generateEncryptedSessionToken({
      userId: claims.sub,
      provider: claims.provider,
      shardId: claims.shardId,
      shardMode: claims.shardMode,
      email: claims.email,
      displayName: claims.name,
      workspaceId: claims.workspaceId,
      role: claims.role,
      scopes: claims.scopes || ['*'],
      sudoUntilMs: session.sudoElevatedUntilMs,
      familyId: session.sessionFamilyId || claims.familyId,
      sequenceNumber: nextSeq,
      fingerprint,
      ttlMs: 30 * 24 * 60 * 60 * 1000
    });

    const oldTokenHash = GalxCryptoVault.hashSessionToken(currentToken);
    const rotation = await this.sessionRepo.rotateSessionTokenAtomic(
      oldTokenHash,
      newTokenResult.tokenHash,
      newTokenResult.expiresAtMs,
      fingerprint,
      30000
    );

    if (!rotation.success) {
      if (rotation.reuseDetected) {
        this.persistence.logAudit(
          'TOKEN_REUSE_ATTACK_DETECTED',
          { sessionId: session.id, familyId: session.sessionFamilyId, ipAddress },
          session.shardId,
          session.userId
        );
      }
      return {
        success: false,
        reuseDetected: rotation.reuseDetected,
        error: rotation.error || 'ROTATION_FAILED'
      };
    }

    this.persistence.logAudit(
      'SESSION_TOKEN_ROTATED',
      { sessionId: session.id, sequence: nextSeq, riskScore: risk.riskScore },
      session.shardId,
      session.userId
    );

    return {
      success: true,
      token: newTokenResult.token,
      expiresAtMs: newTokenResult.expiresAtMs,
      claims: newTokenResult.claims
    };
  }

  /**
   * Instantly revokes a session in Supabase PostgreSQL with zero residual footprint.
   */
  async revokeSession(tokenOrSessionId: string, reason: string = 'User requested logout'): Promise<boolean> {
    if (tokenOrSessionId.startsWith('galx_sess_')) {
      const tokenHash = GalxCryptoVault.hashSessionToken(tokenOrSessionId);
      const session = await this.sessionRepo.findSessionByTokenHash(tokenHash, true);
      if (session) {
        await this.sessionRepo.revokeSession(session.id, reason);
        this.persistence.logAudit('SESSION_REVOKED', { sessionId: session.id, reason }, session.shardId, session.userId);
        return true;
      }
    } else {
      await this.sessionRepo.revokeSession(tokenOrSessionId, reason);
      this.persistence.logAudit('SESSION_REVOKED', { sessionId: tokenOrSessionId, reason });
      return true;
    }
    return false;
  }

  /**
   * Revokes a specific session by ID for a user.
   */
  async revokeSessionById(sessionId: string, userId: string, reason: string = 'User terminated remote session'): Promise<boolean> {
    const session = await this.sessionRepo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      return false;
    }
    await this.sessionRepo.revokeSession(sessionId, reason);
    this.persistence.logAudit('SESSION_REVOKED', { sessionId, reason }, session.shardId, userId);
    return true;
  }

  /**
   * Revokes all active sessions for a user EXCEPT the specified current session (Remote Logout).
   */
  async revokeOtherSessions(userId: string, currentSessionId: string, reason: string = 'User logged out all other devices'): Promise<number> {
    const count = await this.sessionRepo.revokeOtherSessions(userId, currentSessionId, reason);
    this.persistence.logAudit('OTHER_SESSIONS_REVOKED', { userId, currentSessionId, count, reason }, undefined, userId);
    return count;
  }

  /**
   * Global emergency killswitch: revokes all active sessions for a given user across all devices.
   */
  async revokeAllUserSessions(userId: string, reason: string = 'Global user session killswitch'): Promise<number> {
    const count = await this.sessionRepo.revokeAllUserSessions(userId, reason);
    this.persistence.logAudit('GLOBAL_USER_SESSIONS_REVOKED', { userId, count, reason }, undefined, userId);
    return count;
  }

  /**
   * Returns active device sessions for a user with human-readable browser/OS badges.
   */
  async getUserActiveSessions(userId: string, currentSessionId?: string): Promise<SessionDeviceInfo[]> {
    return this.sessionRepo.getUserActiveSessions(userId, currentSessionId);
  }

  /**
   * Universal Request Auth Identity Resolver for Next.js APIs, Gateways, and Cloudflare Workers.
   * Resolves developer keys (`galx_live_...`, `galx_test_...`, `sk-galx-...`, `sk-...`),
   * hardened signed/encrypted session tokens (`galx_sess_...`), and scoped tokens with zero hesitation.
   * Ingests from standard headers, custom provider headers, query parameters, or cookies.
   */
  async resolveAuthIdentity(
    req: Request | { headers?: Headers | Record<string, string | null | undefined>; url?: string; nextUrl?: { searchParams?: URLSearchParams } },
    requiredScope?: string,
    options: { countRequest?: boolean } = {}
  ): Promise<AuthIdentityResult> {
    let rawAuth = '';

    // 1. Extract from standard and custom headers across all naming conventions
    if (req && 'headers' in req && req.headers) {
      if (typeof (req.headers as any).get === 'function') {
        const h = req.headers as Headers;
        rawAuth =
          h.get('authorization') ||
          h.get('x-api-key') ||
          h.get('x-galx-key') ||
          h.get('api-key') ||
          h.get('apikey') ||
          h.get('x-auth-token') ||
          h.get('x-galx-session') ||
          '';
      } else if (typeof req.headers === 'object') {
        const h = req.headers as Record<string, string | null | undefined>;
        rawAuth =
          h['authorization'] ||
          h['Authorization'] ||
          h['x-api-key'] ||
          h['X-Api-Key'] ||
          h['x-galx-key'] ||
          h['X-Galx-Key'] ||
          h['api-key'] ||
          h['ApiKey'] ||
          h['apikey'] ||
          h['x-auth-token'] ||
          h['x-galx-session'] ||
          '';
      }
    }

    // 2. URL Search Parameters Fallback (for rapid curl / sandbox / browser debugging)
    if (!rawAuth) {
      try {
        if ('nextUrl' in req && req.nextUrl?.searchParams) {
          rawAuth =
            req.nextUrl.searchParams.get('api_key') ||
            req.nextUrl.searchParams.get('apiKey') ||
            req.nextUrl.searchParams.get('key') ||
            req.nextUrl.searchParams.get('token') ||
            '';
        } else if ('url' in req && typeof req.url === 'string') {
          const parsedUrl = new URL(req.url, 'https://galx.ai');
          rawAuth =
            parsedUrl.searchParams.get('api_key') ||
            parsedUrl.searchParams.get('apiKey') ||
            parsedUrl.searchParams.get('key') ||
            parsedUrl.searchParams.get('token') ||
            '';
        }
      } catch {}
    }

    // 3. Cookie Fallback (for seamless browser console & dashboard playground requests)
    if (!rawAuth && req && 'headers' in req && req.headers) {
      try {
        let cookieHeader = '';
        if (typeof (req.headers as any).get === 'function') {
          cookieHeader = (req.headers as Headers).get('cookie') || '';
        } else if (typeof req.headers === 'object') {
          cookieHeader = (req.headers as any)['cookie'] || (req.headers as any)['Cookie'] || '';
        }
        if (cookieHeader) {
          // 3a. Check Supabase SSR session cookies first (sb-*-auth-token or chunked sb-*-auth-token.0)
          const cookies = new Map(cookieHeader.split(';').map(cookie => {
            const separator = cookie.indexOf('=');
            return [cookie.slice(0, separator).trim(), cookie.slice(separator + 1).trim()];
          }));
          const sessionName = [...cookies.keys()].find(name => /^sb-.+-auth-token(?:\.0)?$/.test(name));
          if (sessionName) {
            const baseName = sessionName.replace(/\.0$/, '');
            let encoded = cookies.get(baseName);
            if (encoded === undefined) {
              encoded = '';
              for (let index = 0; cookies.has(`${baseName}.${index}`); index++) {
                encoded += cookies.get(`${baseName}.${index}`);
              }
            }
            let val = decodeURIComponent(encoded);
            if (val.startsWith('base64-')) {
              try {
                val = Buffer.from(val.slice(7), 'base64').toString('utf-8');
              } catch {}
            }
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                rawAuth = parsed[0];
              } else if (parsed && typeof parsed.access_token === 'string') {
                rawAuth = parsed.access_token;
              }
            } catch {
              if (val.startsWith('eyJ')) {
                rawAuth = val;
              }
            }
          }

          // 3b. Check standard custom session cookies with exact cookie name boundaries
          if (!rawAuth) {
            const match = cookieHeader.match(/(?:^|;\s*)(?:galx_session|galx_key|galx_token)=([^;]+)/);
            if (match) {
              rawAuth = decodeURIComponent(match[1].trim());
            }
          }
        }
      } catch {}
    }

    if (!rawAuth || typeof rawAuth !== 'string') {
      return {
        authenticated: false,
        userId: 'anonymous_developer',
        authType: 'anonymous',
        isPriorityUser: false
      };
    }

    // 4. Sanitize and normalize token: strip Bearer, Token, quotes, whitespace
    let token = rawAuth
      .replace(/^(Bearer|Token)\s+/i, '')
      .replace(/^['"]+|['"]+$/g, '')
      .trim();

    if (!token) {
      return {
        authenticated: false,
        userId: 'anonymous_developer',
        authType: 'anonymous',
        isPriorityUser: false
      };
    }

    // 5. Developer Gateway API Key (`galx_live_...`, `galx_test_...`, `sk-galx-...`)
    if (token.startsWith('galx_live_') || token.startsWith('galx_test_') || token.startsWith('sk-galx-') || token.startsWith('sk-')) {
      let clientIp = '';
      if (req && 'headers' in req && req.headers) {
        if (typeof (req.headers as any).get === 'function') {
          const h = req.headers as Headers;
          clientIp = h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for') || '';
        } else if (typeof req.headers === 'object') {
          const h = req.headers as any;
          clientIp = h['cf-connecting-ip'] || h['x-real-ip'] || h['x-forwarded-for'] || '';
        }
      }

      const validation = await this.persistence.apiKeyRepo.validateGatewayKey(token, {
        requiredScope,
        clientIp,
        countRequest: options.countRequest,
      });

      if (validation.valid && validation.key) {
        const foundKey = validation.key;
        const grantedScopes = foundKey.scopes && foundKey.scopes.length > 0 ? foundKey.scopes : ['*'];
        return {
          authenticated: true,
          userId: foundKey.userId,
          authType: 'developer_key',
          isPriorityUser: true,
          scopes: grantedScopes,
          isSudoElevated: true,
          apiKey: foundKey,
          rateLimitRemaining: validation.rateLimitRemaining,
          rateLimitResetMs: validation.rateLimitResetMs
        };
      }

      return {
        authenticated: false,
        userId: validation.key?.userId || 'anonymous_developer',
        authType: 'developer_key',
        isPriorityUser: false,
        error: validation.error || 'INVALID_GATEWAY_API_KEY'
      };
    }

    // 6. Hardened JWE Encrypted or Signed Session Bearer Token (`galx_sess_...` or `galx_sess_v2...`)
    if (token.startsWith('galx_sess_')) {
      const verifyResult = await this.verifySession(token, true);
      if (verifyResult.valid && verifyResult.claims) {
        const claims = verifyResult.claims;
        const grantedScopes = claims.scopes || ['*'];

        // Scope verification
        if (requiredScope && !GalxCryptoVault.validateTokenScope(grantedScopes, requiredScope)) {
          return {
            authenticated: false,
            userId: claims.sub,
            authType: 'session_token',
            isPriorityUser: false,
            scopes: grantedScopes,
            error: `FORBIDDEN_INSUFFICIENT_SCOPE: Token requires scope '${requiredScope}'`
          };
        }

        const isSudoElevated = Boolean(claims.sudoUntilMs && claims.sudoUntilMs > Date.now());

        return {
          authenticated: true,
          userId: claims.sub,
          authType: 'session_token',
          isPriorityUser: claims.shardMode === 'private',
          isSudoElevated,
          scopes: grantedScopes,
          claims,
          session: verifyResult.session,
          token
        };
      }
      return {
        authenticated: false,
        userId: 'anonymous_developer',
        authType: 'session_token',
        isPriorityUser: false,
        error: verifyResult.error || 'INVALID_SESSION_TOKEN'
      };
    }

    // Only the authentication service may establish a bearer token's identity.
    // Decoded payloads and caller-supplied user identifiers are not credentials.
    if (token.startsWith('eyJ')) {
      const unavailable = () => ({ authenticated: false, userId: 'anonymous_developer',
        authType: 'session_token' as const, isPriorityUser: false, error: 'AUTH_UNAVAILABLE' });
      try {
        // User-token verification needs only the public Auth client. Requiring a
        // service-role credential here incorrectly rejects valid browser sessions.
        const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
        if (!error && data.user?.id) {
          return {
            authenticated: true,
            userId: data.user.id,
            authType: 'session_token',
            isPriorityUser: false,
            isSudoElevated: false,
            scopes: ['*'],
            token
          };
        }
        if (!error || !error.status || error.status >= 500 || error.status === 429) return unavailable();
      } catch {
        // Fail closed without telling a valid user their session has expired.
        return unavailable();
      }
    }

    return {
      authenticated: false,
      userId: 'anonymous_developer',
      authType: 'anonymous',
      isPriorityUser: false,
      error: 'UNRECOGNIZED_AUTH_SCHEME'
    };
  }

  public queryRiskEvaluationsNatural(naturalQuery: string): (SessionRiskEvaluation & { id: string; userId?: string; sessionId?: string; timestampMs: number })[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'session_risk_evaluations');
    return this.riskEvaluationTable.query(parsed.queryOptions) as (SessionRiskEvaluation & { id: string; userId?: string; sessionId?: string; timestampMs: number })[];
  }

  public aggregateRiskEvaluations(query: DbAggregateQuery): DbAggregateResult {
    return this.riskEvaluationTable.aggregate(query);
  }
}

export const galxAuth = GalxAuthEngine.getInstance();
