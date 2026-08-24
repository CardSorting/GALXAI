/**
 * GALXAI: Supabase & BroccoliDB Enterprise OAuth State & Identity Repository
 * Implements traditional enterprise OAuth 2.0 / 2.1 PKCE state management,
 * atomic single-use nonce consumption (anti-replay), multi-provider identity linking,
 * and background proactive token expiration scanning.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type {
  OAuthAuthorizationRequest,
  OAuthIdentityRecord,
  OAuthDeviceCodeRecord,
  PushedAuthorizationRequestRecord,
  ProviderType,
  ShardIsolationMode
} from '../../../core/contracts/GalxContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';
import type { DbAggregateQuery, DbAggregateResult } from '../../../core/broccolidb/broccolidb.contracts';

export class OAuthRepository {
  private static instance: OAuthRepository;
  public readonly requestsTable: BroccoliDbTable<OAuthAuthorizationRequest>;
  public readonly identitiesTable: BroccoliDbTable<OAuthIdentityRecord>;
  public readonly deviceCodesTable: BroccoliDbTable<OAuthDeviceCodeRecord>;
  public readonly parTable: BroccoliDbTable<PushedAuthorizationRequestRecord>;
  public readonly dpopProofsTable: BroccoliDbTable<{ id: string; jti: string; expiresAtMs: number }>;

  constructor() {
    this.requestsTable = new BroccoliDbTable<OAuthAuthorizationRequest>('oauth_authorization_requests');
    this.requestsTable.createIndex('state');
    this.requestsTable.createIndex('provider');
    this.requestsTable.createIndex('isConsumed');
    this.requestsTable.createIndex('userId');
    this.requestsTable.createSortedIndex('expiresAtMs');
    this.requestsTable.createSortedIndex('createdAtMs');

    this.identitiesTable = new BroccoliDbTable<OAuthIdentityRecord>('oauth_identities');
    this.identitiesTable.createIndex('userId');
    this.identitiesTable.createIndex('provider');
    this.identitiesTable.createIndex('providerAccountId');
    this.identitiesTable.createIndex('status');
    this.identitiesTable.createIndex('shardId');
    this.identitiesTable.createSortedIndex('expiresAtMs');
    this.identitiesTable.createSortedIndex('createdAtMs');

    this.deviceCodesTable = new BroccoliDbTable<OAuthDeviceCodeRecord>('oauth_device_codes');
    this.deviceCodesTable.createIndex('deviceCode');
    this.deviceCodesTable.createIndex('userCode');
    this.deviceCodesTable.createIndex('status');
    this.deviceCodesTable.createSortedIndex('expiresAtMs');

    this.parTable = new BroccoliDbTable<PushedAuthorizationRequestRecord>('oauth_pushed_requests');
    this.parTable.createIndex('requestUri');
    this.parTable.createIndex('isConsumed');
    this.parTable.createSortedIndex('expiresAtMs');

    this.dpopProofsTable = new BroccoliDbTable<{ id: string; jti: string; expiresAtMs: number }>('oauth_dpop_proofs');
    this.dpopProofsTable.createIndex('jti');
    this.dpopProofsTable.createSortedIndex('expiresAtMs');
  }

  static getInstance(): OAuthRepository {
    if (!OAuthRepository.instance) {
      OAuthRepository.instance = new OAuthRepository();
    }
    return OAuthRepository.instance;
  }

  /**
   * Persists an in-flight PKCE authorization request into BroccoliDB hot cache and Supabase.
   */
  async createAuthorizationRequest(req: OAuthAuthorizationRequest): Promise<void> {
    this.requestsTable.put(req.id, req);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from('galx_oauth_requests' as any) as any).upsert({
          id: req.id,
          state: req.state,
          code_verifier: req.codeVerifier,
          provider: req.provider,
          redirect_uri: req.redirectUri,
          mode: req.mode,
          workspace_id: req.workspaceId,
          user_id: req.userId,
          ip_address: req.ipAddress,
          user_agent: req.userAgent,
          is_consumed: req.isConsumed,
          expires_at: new Date(req.expiresAtMs).toISOString(),
          created_at: new Date(req.createdAtMs).toISOString()
        }, { onConflict: 'id' });
      } catch {}
    }
  }

  /**
   * Atomically verifies and consumes an authorization request by state and provider.
   * Enforces RFC 6749 § 4.1.2 single-use semantics to eliminate replay attacks.
   */
  async consumeAuthorizationRequest(
    state: string,
    provider?: ProviderType
  ): Promise<OAuthAuthorizationRequest | null> {
    // 1. Check L1 BroccoliDB Hot Table
    const matches = this.requestsTable.query({
      where: {
        state: { $eq: state }
      }
    });

    let targetReq: OAuthAuthorizationRequest | undefined = undefined;
    for (const req of matches) {
      if (!provider || req.provider === provider) {
        targetReq = req;
        break;
      }
    }

    if (!targetReq && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = (supabase.from('galx_oauth_requests' as any) as any).select('*').eq('state', state);
        if (provider) query = query.eq('provider', provider);
        const { data, error } = await query.single();
        if (!error && data) {
          targetReq = {
            id: data.id,
            state: data.state,
            codeVerifier: data.code_verifier,
            provider: data.provider as ProviderType,
            redirectUri: data.redirect_uri,
            mode: data.mode as ShardIsolationMode,
            workspaceId: data.workspace_id || undefined,
            userId: data.user_id || undefined,
            ipAddress: data.ip_address || undefined,
            userAgent: data.user_agent || undefined,
            isConsumed: data.is_consumed,
            consumedAtMs: data.consumed_at ? new Date(data.consumed_at).getTime() : undefined,
            expiresAtMs: new Date(data.expires_at).getTime(),
            createdAtMs: new Date(data.created_at).getTime()
          };
          this.requestsTable.put(targetReq.id, targetReq);
        }
      } catch {}
    }

    if (!targetReq) return null;

    // Check expiration
    if (Date.now() > targetReq.expiresAtMs) {
      return null;
    }

    // Check single-use anti-replay invariant
    if (targetReq.isConsumed) {
      return null;
    }

    // Atomically mark consumed
    const consumedRecord: OAuthAuthorizationRequest = {
      ...targetReq,
      isConsumed: true,
      consumedAtMs: Date.now()
    };

    this.requestsTable.put(consumedRecord.id, consumedRecord);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from('galx_oauth_requests' as any) as any)
          .update({
            is_consumed: true,
            consumed_at: new Date().toISOString()
          })
          .eq('id', targetReq.id);
      } catch {}
    }

    return targetReq;
  }

  /**
   * Persists or updates an OAuth provider identity linked to a user.
   */
  async saveOAuthIdentity(identity: OAuthIdentityRecord): Promise<void> {
    this.identitiesTable.put(identity.id, identity);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { error } = await (supabase.rpc as any)('fn_save_oauth_identity', {
          p_id: identity.id,
          p_user_id: identity.userId,
          p_provider: identity.provider,
          p_provider_account_id: identity.providerAccountId,
          p_email: identity.email,
          p_encrypted_access_token: identity.encryptedAccessToken,
          p_display_name: identity.displayName || null,
          p_shard_id: identity.shardId || null,
          p_session_family_id: identity.sessionFamilyId || null,
          p_sequence_number: identity.sequenceNumber || 1,
          p_refresh_token_hash: identity.refreshTokenHash || null,
          p_previous_refresh_token_hash: identity.previousRefreshTokenHash || null,
          p_grace_period_until: identity.gracePeriodUntilMs ? new Date(identity.gracePeriodUntilMs).toISOString() : null,
          p_encrypted_refresh_token: identity.encryptedRefreshToken || null,
          p_id_token_claims: identity.idTokenClaims || null,
          p_scopes: identity.scopes || null,
          p_expires_at: identity.expiresAtMs ? new Date(identity.expiresAtMs).toISOString() : null,
          p_last_refreshed_at: identity.lastRefreshedAtMs ? new Date(identity.lastRefreshedAtMs).toISOString() : null,
          p_status: identity.status
        });

        if (error) {
          // Direct table upsert fallback
          await (supabase.from('galx_oauth_identities' as any) as any).upsert({
            id: identity.id,
            user_id: identity.userId,
            provider: identity.provider,
            provider_account_id: identity.providerAccountId,
            email: identity.email,
            display_name: identity.displayName || null,
            shard_id: identity.shardId || null,
            session_family_id: identity.sessionFamilyId || null,
            sequence_number: identity.sequenceNumber || 1,
            refresh_token_hash: identity.refreshTokenHash || null,
            previous_refresh_token_hash: identity.previousRefreshTokenHash || null,
            grace_period_until: identity.gracePeriodUntilMs ? new Date(identity.gracePeriodUntilMs).toISOString() : null,
            encrypted_access_token: identity.encryptedAccessToken as any,
            encrypted_refresh_token: identity.encryptedRefreshToken as any,
            id_token_claims: identity.idTokenClaims as any,
            scopes: identity.scopes as any,
            expires_at: identity.expiresAtMs ? new Date(identity.expiresAtMs).toISOString() : null,
            last_refreshed_at: identity.lastRefreshedAtMs ? new Date(identity.lastRefreshedAtMs).toISOString() : null,
            status: identity.status,
            created_at: new Date(identity.createdAtMs).toISOString(),
            updated_at: new Date(identity.updatedAtMs).toISOString()
          }, { onConflict: 'id' });
        }
      } catch {}
    }
  }

  /**
   * Returns all linked OAuth identities for a given user.
   */
  async findIdentitiesByUserId(userId: string): Promise<readonly OAuthIdentityRecord[]> {
    const memoryMatches = this.identitiesTable.query({
      where: {
        userId: { $eq: userId },
        status: { $in: ['active', 'needs_reauth'] }
      }
    });

    if (memoryMatches.length > 0) {
      return memoryMatches;
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_get_oauth_identities_by_user', {
          p_user_id: userId
        });

        if (!error && data && data.success && Array.isArray(data.identities)) {
          const results = data.identities.map((d: any) => this.mapRowToIdentity(d));
          for (const ident of results) {
            this.identitiesTable.put(ident.id, ident);
          }
          return results;
        }

        const { data: tableData, error: tableErr } = await (supabase.from('galx_oauth_identities' as any) as any)
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'revoked');

        if (!tableErr && tableData) {
          const results = tableData.map((d: any) => this.mapRowToIdentity(d));
          for (const ident of results) {
            this.identitiesTable.put(ident.id, ident);
          }
          return results;
        }
      } catch {}
    }

    return [];
  }

  /**
   * Finds a specific linked identity by its primary ID (including revoked).
   */
  async findIdentityById(id: string): Promise<OAuthIdentityRecord | null> {
    const memory = this.identitiesTable.get(id);
    if (memory) return memory;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_get_oauth_identity_by_id', {
          p_id: id
        });

        if (!error && data && data.found && data.identity) {
          const identity = this.mapRowToIdentity(data.identity);
          this.identitiesTable.put(identity.id, identity);
          return identity;
        }

        const { data: tableData, error: tableErr } = await (supabase.from('galx_oauth_identities' as any) as any)
          .select('*')
          .eq('id', id)
          .single();

        if (!tableErr && tableData) {
          const identity = this.mapRowToIdentity(tableData);
          this.identitiesTable.put(identity.id, identity);
          return identity;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Finds a specific linked identity by user ID and provider.
   */
  async findIdentityByProvider(userId: string, provider: ProviderType): Promise<OAuthIdentityRecord | null> {
    const matches = this.identitiesTable.query({
      where: {
        userId: { $eq: userId },
        provider: { $eq: provider },
        status: { $in: ['active', 'needs_reauth'] }
      }
    });

    if (matches.length > 0) {
      return matches[0];
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.from('galx_oauth_identities' as any) as any)
          .select('*')
          .eq('user_id', userId)
          .eq('provider', provider)
          .neq('status', 'revoked')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          const identity = this.mapRowToIdentity(data);
          this.identitiesTable.put(identity.id, identity);
          return identity;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Queries identities expiring within a specific time window for background refresh workers.
   */
  getExpiringIdentities(windowMs: number = 5 * 60 * 1000): readonly OAuthIdentityRecord[] {
    const threshold = Date.now() + windowMs;
    return this.identitiesTable.query({
      where: {
        status: { $eq: 'active' },
        expiresAtMs: { $lte: threshold }
      }
    });
  }

  /**
   * Unlinks / revokes an OAuth provider identity for a user.
   */
  async unlinkOAuthIdentity(userId: string, provider: ProviderType): Promise<boolean> {
    const existing = await this.findIdentityByProvider(userId, provider);
    if (!existing) return false;

    const revoked: OAuthIdentityRecord = {
      ...existing,
      status: 'revoked',
      updatedAtMs: Date.now()
    };

    this.identitiesTable.put(revoked.id, revoked);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from('galx_oauth_identities' as any) as any)
          .update({
            status: 'revoked',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } catch {}
    }

    return true;
  }

  public queryIdentitiesNatural(naturalQuery: string): readonly OAuthIdentityRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'oauth_identities');
    return this.identitiesTable.query(parsed.queryOptions);
  }

  public aggregateIdentities(query: DbAggregateQuery): DbAggregateResult {
    return this.identitiesTable.aggregate(query);
  }

  /**
   * Persists an RFC 8628 Device Authorization code into BroccoliDB and Supabase.
   */
  async saveDeviceCode(record: OAuthDeviceCodeRecord): Promise<void> {
    this.deviceCodesTable.put(record.id, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from('galx_oauth_device_codes' as any) as any).upsert({
          id: record.id,
          device_code: record.deviceCode,
          user_code: record.userCode,
          provider: record.provider,
          status: record.status,
          session_token: record.sessionToken || null,
          token_record: record.tokenRecord || null,
          user_id: record.userId || null,
          workspace_id: record.workspaceId || null,
          ip_address: record.ipAddress || null,
          user_agent: record.userAgent || null,
          polling_interval_sec: record.pollingIntervalSec,
          last_polled_at_ms: record.lastPolledAtMs || null,
          expires_at: new Date(record.expiresAtMs).toISOString(),
          created_at: new Date(record.createdAtMs).toISOString()
        }, { onConflict: 'id' });
      } catch {}
    }
  }

  /**
   * Polls device code status atomically using Supabase stored procedure fn_poll_device_code or memory fallback.
   */
  async pollDeviceCode(deviceCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    error_description?: string;
    interval?: number;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_poll_device_code', {
          p_device_code: deviceCode,
          p_now_ms: Date.now()
        });

        if (!error && data) {
          const res = data as any;
          if (res.success) {
            return {
              success: true,
              data: {
                access_token: res.access_token,
                token_type: res.token_type || 'Bearer',
                expires_in: res.expires_in || 2592000,
                user: res.token_record
              }
            };
          }
          if (res.error && res.error !== 'invalid_grant') {
            return {
              success: false,
              error: res.error,
              error_description: res.error_description,
              interval: res.interval
            };
          }
        }
      } catch {}
    }

    // Hot memory fallback
    const candidates = this.deviceCodesTable.query({
      where: { deviceCode: { $eq: deviceCode } }
    });
    const record = candidates[0];
    if (!record) {
      return { success: false, error: 'invalid_grant', error_description: 'Device code not found or invalid' };
    }

    const now = Date.now();
    if (now >= record.expiresAtMs) {
      this.deviceCodesTable.delete(record.id);
      return { success: false, error: 'expired_token', error_description: 'The device authorization code has expired.' };
    }

    if (record.lastPolledAtMs && now - record.lastPolledAtMs < record.pollingIntervalSec * 1000 - 500) {
      const slowInterval = record.pollingIntervalSec + 5;
      this.deviceCodesTable.put(record.id, { ...record, pollingIntervalSec: slowInterval, lastPolledAtMs: now });
      return { success: false, error: 'slow_down', error_description: `Polling too rapidly. Increase interval to ${slowInterval}s.`, interval: slowInterval };
    }

    this.deviceCodesTable.put(record.id, { ...record, lastPolledAtMs: now });

    if (record.status === 'pending') {
      return { success: false, error: 'authorization_pending', error_description: 'The user has not yet authorized the request.', interval: record.pollingIntervalSec };
    }
    if (record.status === 'denied') {
      this.deviceCodesTable.delete(record.id);
      return { success: false, error: 'access_denied', error_description: 'The user denied the authorization request.' };
    }
    if (record.status === 'approved') {
      this.deviceCodesTable.delete(record.id);
      return {
        success: true,
        data: {
          access_token: record.sessionToken || record.tokenRecord?.accessToken,
          token_type: 'Bearer',
          expires_in: 30 * 24 * 3600,
          user: record.tokenRecord || { provider: record.provider }
        }
      };
    }
    return { success: false, error: 'invalid_grant', error_description: 'Unexpected authorization status' };
  }

  /**
   * Approves a pending RFC 8628 Device Authorization code.
   */
  async approveDeviceCode(userCode: string, sessionToken: string, tokenRecord?: any, userId?: string): Promise<boolean> {
    const cleanCode = userCode.toUpperCase().replace(/\s+/g, '');
    const normalizedCode = cleanCode.includes('-') ? cleanCode : `${cleanCode.substring(0, 4)}-${cleanCode.substring(4, 8)}`;

    // Sync memory state immediately
    const candidates = this.deviceCodesTable.query({ where: { userCode: { $eq: normalizedCode } } });
    const memoryRecord = candidates[0];
    if (memoryRecord && memoryRecord.status === 'pending' && Date.now() < memoryRecord.expiresAtMs) {
      this.deviceCodesTable.put(memoryRecord.id, {
        ...memoryRecord,
        status: 'approved',
        sessionToken,
        tokenRecord
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_approve_device_code', {
          p_user_code: normalizedCode,
          p_session_token: sessionToken,
          p_token_record: tokenRecord || null,
          p_user_id: userId || null
        });
        if (!error && typeof data === 'boolean') {
          return data;
        }
      } catch {}
    }

    return !!memoryRecord;
  }

  /**
   * Persists an RFC 9126 PAR request into BroccoliDB and Supabase.
   */
  async savePushedAuthorizationRequest(record: PushedAuthorizationRequestRecord): Promise<void> {
    this.parTable.put(record.id, record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from('galx_oauth_pushed_requests' as any) as any).upsert({
          id: record.id,
          request_uri: record.requestUri,
          provider: record.provider,
          client_id: record.clientId,
          redirect_uri: record.redirectUri,
          scope: record.scope || null,
          code_challenge: record.codeChallenge || null,
          code_challenge_method: record.codeChallengeMethod || 'S256',
          state: record.state || null,
          response_type: record.responseType || 'code',
          workspace_id: record.workspaceId || null,
          is_consumed: record.isConsumed,
          consumed_at: record.consumedAtMs ? new Date(record.consumedAtMs).toISOString() : null,
          expires_at: new Date(record.expiresAtMs).toISOString(),
          created_at: new Date(record.createdAtMs).toISOString()
        }, { onConflict: 'id' });
      } catch {}
    }
  }

  /**
   * Atomically consumes a PAR request_uri using Supabase stored procedure fn_consume_pushed_request.
   */
  async consumePushedAuthorizationRequest(requestUri: string): Promise<PushedAuthorizationRequestRecord | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_consume_pushed_request', {
          p_request_uri: requestUri
        });

        if (!error && data && data.success) {
          const record: PushedAuthorizationRequestRecord = {
            id: data.id,
            requestUri: data.request_uri,
            provider: data.provider as ProviderType,
            clientId: data.client_id,
            redirectUri: data.redirect_uri,
            scope: data.scope || undefined,
            codeChallenge: data.code_challenge || undefined,
            codeChallengeMethod: data.code_challenge_method || 'S256',
            state: data.state || undefined,
            responseType: data.response_type || 'code',
            workspaceId: data.workspace_id || undefined,
            isConsumed: true,
            expiresAtMs: Date.now() + 90000,
            createdAtMs: Date.now()
          };
          this.parTable.put(record.id, record);
          return record;
        }
      } catch {}
    }

    // Memory fallback
    const candidates = this.parTable.query({ where: { requestUri: { $eq: requestUri } } });
    const record = candidates[0];
    if (!record || record.isConsumed || Date.now() >= record.expiresAtMs) {
      return null;
    }
    const consumed = { ...record, isConsumed: true, consumedAtMs: Date.now() };
    this.parTable.put(consumed.id, consumed);
    return consumed;
  }

  /**
   * Records and validates an RFC 9449 DPoP proof anti-replay JTI in BroccoliDB and Supabase.
   */
  async recordDPoPProof(
    jti: string,
    ath?: string,
    htm?: string,
    htu?: string,
    iatMs?: number,
    expMs?: number
  ): Promise<boolean> {
    // 1. Hot memory check
    const existing = this.dpopProofsTable.get(jti);
    if (existing) {
      return false;
    }
    this.dpopProofsTable.put(jti, {
      id: jti,
      jti,
      expiresAtMs: expMs || Date.now() + 300_000
    });

    // 2. Supabase L2 RPC check
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_record_dpop_proof', {
          p_jti: jti,
          p_ath: ath || null,
          p_htm: htm || 'POST',
          p_htu: htu || '',
          p_iat_ms: iatMs || Date.now(),
          p_exp_ms: expMs || Date.now() + 300_000
        });
        if (!error && data && data.valid === false) {
          return false;
        }
      } catch {}
    }

    return true;
  }

  /**
   * Rotates OAuth provider tokens with RFC 6819 Token Family theft containment.
   */
  async rotateOAuthIdentityTokens(params: {
    identityId: string;
    oldRefreshHash: string;
    newEncryptedAccess: any;
    newEncryptedRefresh: any;
    newRefreshHash: string;
    expiresAt: Date;
    graceWindowSec?: number;
  }): Promise<{
    success: boolean;
    sequenceNumber?: number;
    sessionFamilyId?: string;
    graceWindow?: boolean;
    error?: string;
    familyRevoked?: boolean;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_rotate_oauth_identity_tokens', {
          p_identity_id: params.identityId,
          p_old_refresh_hash: params.oldRefreshHash,
          p_new_encrypted_access: params.newEncryptedAccess,
          p_new_encrypted_refresh: params.newEncryptedRefresh,
          p_new_refresh_hash: params.newRefreshHash,
          p_expires_at: params.expiresAt.toISOString(),
          p_grace_window_sec: params.graceWindowSec || 30
        });

        if (!error && data) {
          const res = data as any;
          if (res.success) {
            const currentMem = this.identitiesTable.get(params.identityId);
            if (currentMem) {
              if (!res.grace_window) {
                this.identitiesTable.put(params.identityId, {
                  ...currentMem,
                  sequenceNumber: res.sequence_number,
                  sessionFamilyId: res.session_family_id,
                  previousRefreshTokenHash: currentMem.refreshTokenHash,
                  refreshTokenHash: params.newRefreshHash,
                  encryptedAccessToken: params.newEncryptedAccess,
                  encryptedRefreshToken: params.newEncryptedRefresh,
                  expiresAtMs: params.expiresAt.getTime(),
                  gracePeriodUntilMs: Date.now() + (params.graceWindowSec || 30) * 1000,
                  updatedAtMs: Date.now()
                });
              }
            }
            return {
              success: true,
              sequenceNumber: res.sequence_number,
              sessionFamilyId: res.session_family_id,
              graceWindow: res.grace_window
            };
          }
          if (res.family_revoked) {
            const currentMem = this.identitiesTable.get(params.identityId);
            if (currentMem) {
              this.identitiesTable.put(params.identityId, {
                ...currentMem,
                status: 'revoked',
                updatedAtMs: Date.now()
              });
            }
          }
          return {
            success: false,
            error: res.error,
            familyRevoked: res.family_revoked,
            sessionFamilyId: res.session_family_id
          };
        }
      } catch {}
    }

    // Memory fallback
    const identity = this.identitiesTable.get(params.identityId);
    if (!identity) {
      return { success: false, error: 'IDENTITY_NOT_FOUND' };
    }
    if (identity.status === 'revoked') {
      return { success: false, error: 'IDENTITY_ALREADY_REVOKED' };
    }

    const familyId = identity.sessionFamilyId || `fam_${identity.id.substring(0, 16)}`;
    const now = Date.now();

    // Normal rotation
    if (!identity.refreshTokenHash || identity.refreshTokenHash === params.oldRefreshHash) {
      const nextSeq = (identity.sequenceNumber || 1) + 1;
      const updated: OAuthIdentityRecord = {
        ...identity,
        sessionFamilyId: familyId,
        sequenceNumber: nextSeq,
        previousRefreshTokenHash: identity.refreshTokenHash,
        refreshTokenHash: params.newRefreshHash,
        encryptedAccessToken: params.newEncryptedAccess,
        encryptedRefreshToken: params.newEncryptedRefresh,
        expiresAtMs: params.expiresAt.getTime(),
        lastRefreshedAtMs: now,
        gracePeriodUntilMs: now + (params.graceWindowSec || 30) * 1000,
        status: 'active',
        updatedAtMs: now
      };
      this.identitiesTable.put(updated.id, updated);
      return { success: true, sequenceNumber: nextSeq, sessionFamilyId: familyId };
    }

    // Grace period replay
    if (identity.previousRefreshTokenHash === params.oldRefreshHash) {
      if (identity.gracePeriodUntilMs && now <= identity.gracePeriodUntilMs) {
        return { success: true, graceWindow: true, sequenceNumber: identity.sequenceNumber, sessionFamilyId: familyId };
      }
    }

    // Reuse Attack Detected: Revoke family
    const revoked: OAuthIdentityRecord = {
      ...identity,
      status: 'revoked',
      updatedAtMs: now
    };
    this.identitiesTable.put(revoked.id, revoked);
    return { success: false, error: 'TOKEN_REUSE_ATTACK_DETECTED', familyRevoked: true, sessionFamilyId: familyId };
  }

  /**
   * Processes OpenID Connect (OIDC) Back-Channel Logout 1.0.
   */
  async processBackchannelLogout(params: {
    id: string;
    provider: ProviderType;
    sub: string;
    iss: string;
    rawToken: string;
    sid?: string;
    jti?: string;
  }): Promise<{
    success: boolean;
    userId?: string;
    identitiesRevoked: number;
    sessionsRevoked: number;
  }> {
    // 1. Memory sync first
    const memoryMatches = this.identitiesTable.query({
      where: {
        provider: { $eq: params.provider },
        providerAccountId: { $eq: params.sub }
      }
    });

    let revokedCount = 0;
    for (const m of memoryMatches) {
      this.identitiesTable.put(m.id, { ...m, status: 'revoked', updatedAtMs: Date.now() });
      revokedCount++;
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_process_backchannel_logout', {
          p_id: params.id,
          p_provider: params.provider,
          p_sub: params.sub,
          p_iss: params.iss,
          p_raw_token: params.rawToken,
          p_sid: params.sid || null,
          p_jti: params.jti || null
        });

        if (!error && data && data.success) {
          return {
            success: true,
            userId: data.user_id || memoryMatches[0]?.userId,
            identitiesRevoked: Math.max(data.identities_revoked || 0, revokedCount),
            sessionsRevoked: data.sessions_revoked || (revokedCount > 0 ? 1 : 0)
          };
        }
      } catch {}
    }

    return {
      success: true,
      userId: memoryMatches[0]?.userId,
      identitiesRevoked: revokedCount,
      sessionsRevoked: revokedCount > 0 ? 1 : 0
    };
  }

  /**
   * Executes scheduled database substrate vacuum & expired OAuth state scavenging.
   */
  async scavengeOAuthSubstrate(): Promise<{
    success: boolean;
    purgedDpopProofs: number;
    purgedOAuthRequests: number;
    purgedDeviceCodes: number;
    purgedParRequests: number;
    expiredIdentitiesMarked: number;
  }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_scavenge_oauth_substrate_cron');
        if (!error && data && data.success) {
          return {
            success: true,
            purgedDpopProofs: data.purged_dpop_proofs,
            purgedOAuthRequests: data.purged_oauth_requests,
            purgedDeviceCodes: data.purged_device_codes,
            purgedParRequests: data.purged_par_requests,
            expiredIdentitiesMarked: data.expired_identities_marked
          };
        }
      } catch {}
    }

    // Memory fallback
    const now = Date.now();
    const allRequests = this.requestsTable.query();
    let purgedReq = 0;
    for (const req of allRequests) {
      if (now >= req.expiresAtMs) {
        this.requestsTable.delete(req.id);
        purgedReq++;
      }
    }

    const allDevices = this.deviceCodesTable.query();
    let purgedDev = 0;
    for (const dev of allDevices) {
      if (now >= dev.expiresAtMs) {
        this.deviceCodesTable.delete(dev.id);
        purgedDev++;
      }
    }

    const allPar = this.parTable.query();
    let purgedPar = 0;
    for (const par of allPar) {
      if (now >= par.expiresAtMs) {
        this.parTable.delete(par.id);
        purgedPar++;
      }
    }

    return {
      success: true,
      purgedDpopProofs: 0,
      purgedOAuthRequests: purgedReq,
      purgedDeviceCodes: purgedDev,
      purgedParRequests: purgedPar,
      expiredIdentitiesMarked: 0
    };
  }

  private mapRowToIdentity(data: any): OAuthIdentityRecord {
    return {
      id: data.id,
      userId: data.user_id,
      provider: data.provider as ProviderType,
      providerAccountId: data.provider_account_id,
      email: data.email,
      displayName: data.display_name || undefined,
      shardId: data.shard_id,
      sessionFamilyId: data.session_family_id || undefined,
      sequenceNumber: data.sequence_number || 1,
      refreshTokenHash: data.refresh_token_hash || undefined,
      previousRefreshTokenHash: data.previous_refresh_token_hash || undefined,
      gracePeriodUntilMs: data.grace_period_until ? new Date(data.grace_period_until).getTime() : undefined,
      encryptedAccessToken: data.encrypted_access_token,
      encryptedRefreshToken: data.encrypted_refresh_token || undefined,
      idTokenClaims: data.id_token_claims || undefined,
      scopes: data.scopes || undefined,
      expiresAtMs: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
      lastRefreshedAtMs: data.last_refreshed_at ? new Date(data.last_refreshed_at).getTime() : undefined,
      status: data.status,
      createdAtMs: new Date(data.created_at).getTime(),
      updatedAtMs: new Date(data.updated_at).getTime()
    };
  }
}

export const oauthRepository = OAuthRepository.getInstance();

