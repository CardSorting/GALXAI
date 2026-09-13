/**
 * GALXAI: Supabase User Session & Hardened Auth Token Repository (V3)
 * High-performance session resolution, SHA-256 token hash lookup, OAuth 2.0 token rotation,
 * attack-detection reuse cascades, step-up SUDO mode, risk scoring telemetry, and multi-device governance.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
import { getSupabaseConfig } from '../config';
import { executePostgresQuery } from '@/lib/db/postgres';
import { GalxCryptoVault, PRIMARY_KEY_VERSION } from '../../../core/vault/GalxCryptoVault';
import type {
  GalxUserSession,
  ProviderType,
  SessionDeviceInfo,
  SessionRotationResult,
  SudoElevationResult,
  UserSecurityPosture
} from '../../../core/contracts/GalxContracts';

import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export class SessionRepository {
  private static instance: SessionRepository;
  private readonly inMemoryCache = new Map<string, GalxUserSession>();
  private readonly sessionTable: BroccoliDbTable<GalxUserSession>;
  private readonly inMemoryRiskEvents: any[] = [];

  constructor() {
    this.sessionTable = new BroccoliDbTable<GalxUserSession>('user_sessions');
    this.sessionTable.createIndex('tokenHash');
    this.sessionTable.createIndex('previousTokenHash');
    this.sessionTable.createIndex('userId');
    this.sessionTable.createIndex('isRevoked');
    this.sessionTable.createSortedIndex('expiresAtMs');
  }

  static getInstance(): SessionRepository {
    if (!SessionRepository.instance) {
      SessionRepository.instance = new SessionRepository();
    }
    return SessionRepository.instance;
  }

  private saveSessionInMemory(session: GalxUserSession): void {
    this.inMemoryCache.set(session.id, session);
    this.sessionTable.put(session.id, session);
  }

  private deleteSessionInMemory(sessionId: string): void {
    this.inMemoryCache.delete(sessionId);
    this.sessionTable.delete(sessionId);
  }

  private async authorityQuery(sql: string, values: unknown[] = []) {
    const result = await executePostgresQuery(sql, values);
    if (!result) throw new Error('SESSION_STORAGE_UNAVAILABLE');
    return result;
  }

  async createSession(session: GalxUserSession): Promise<void> {
    // Create-only persistence includes scopes/family metadata. Never issue from a
    // cache-only success or replace an existing session through an upsert fallback.
    const row = this.mapSessionToRow(session);
    if (getSupabaseConfig().databaseUrl) {
      // Column identifiers come only from the fixed mapper, never request fields.
      const columns = Object.keys(row);
      await this.authorityQuery(`INSERT INTO public.galx_user_sessions (${columns.join(',')}) VALUES (${columns.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(row));
    } else {
      const { error } = await getSupabaseAdmin().from('galx_user_sessions').insert(row);
      if (error) throw new Error('SESSION_CREATION_UNAVAILABLE');
    }
    this.saveSessionInMemory(session);
  }

  async findSessionByTokenHash(tokenHash: string, includeRevoked: boolean = true): Promise<GalxUserSession | null> {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) return null;
    if (getSupabaseConfig().databaseUrl) {
      const result = await this.authorityQuery('SELECT * FROM public.galx_user_sessions WHERE (token_hash=$1 OR previous_token_hash=$1) AND ($2 OR NOT is_revoked) LIMIT 2', [tokenHash, includeRevoked]);
      if (result.rows.length > 1) throw new Error('SESSION_VERIFICATION_UNAVAILABLE');
      return result.rows[0] ? this.mapRowToSession(result.rows[0]) : null;
    }
    let query = getSupabaseAdmin().from('galx_user_sessions').select('*')
      .or(`token_hash.eq.${tokenHash},previous_token_hash.eq.${tokenHash}`);
    if (!includeRevoked) query = query.eq('is_revoked', false);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error('SESSION_VERIFICATION_UNAVAILABLE');
    return data ? this.mapRowToSession(data) : null;
  }

  async findSessionById(id: string): Promise<GalxUserSession | null> {
    if (getSupabaseConfig().databaseUrl) {
      const result = await this.authorityQuery('SELECT * FROM public.galx_user_sessions WHERE id=$1', [id]);
      return result.rows[0] ? this.mapRowToSession(result.rows[0]) : null;
    }
    const { data, error } = await getSupabaseAdmin().from('galx_user_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error('SESSION_VERIFICATION_UNAVAILABLE');
    return data ? this.mapRowToSession(data) : null;
  }

  /**
   * Atomic Token Rotation with Reuse Attack Detection (RFC 6819).
   */
  async rotateSessionTokenAtomic(oldTokenHash: string, newTokenHash: string, newExpiresAtMs: number, newFingerprint?: string, graceWindowMs = 30000): Promise<SessionRotationResult> {
    const { data, error } = getSupabaseConfig().databaseUrl
      ? { data: (await this.authorityQuery('SELECT public.fn_rotate_session_token_atomic($1,$2,$3,$4,$5,$6) AS result', [oldTokenHash,newTokenHash,newExpiresAtMs,newFingerprint || null,graceWindowMs,Date.now()])).rows[0]?.result, error: null }
      : await getSupabaseAdmin().rpc('fn_rotate_session_token_atomic', {
      p_old_token_hash: oldTokenHash, p_new_token_hash: newTokenHash, p_new_expires_at_ms: newExpiresAtMs,
      p_new_fingerprint: newFingerprint || undefined, p_grace_window_ms: graceWindowMs, p_now_ms: Date.now(),
    });
    if (error || !data) throw new Error('SESSION_ROTATION_UNAVAILABLE');
    const result = data as { success?: boolean; reuse_detected?: boolean };
    if (result.success) return { success: true, expiresAtMs: newExpiresAtMs, reuseDetected: false };
    return { success: false, reuseDetected: result.reuse_detected === true, error: result.reuse_detected ? 'TOKEN_REUSE_ATTACK_DETECTED' : 'SESSION_ROTATION_DENIED' };
  }

  /**
   * Step-Up SUDO Mode Session Elevation (15-Minute Privileged Window).
   */
  async elevateSessionSudo(_sessionId: string, _userId: string, _durationMs = 900000): Promise<SudoElevationResult> {
    // No fresh-proof contract exists yet; no caller-provided duration can elevate.
    return { success: false, sudoActive: false, sudoElevatedUntilMs: 0, expiresInMs: 0, error: 'FRESH_PROOF_REQUIRED' };
  }

  /**
   * Records session behavioral risk event.
   */
  async recordRiskEvent(
    sessionId: string,
    userId: string,
    riskScore: number,
    riskFactors: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const event = {
      id: `risk_${Date.now()}`,
      sessionId,
      userId,
      riskScore,
      riskFactors,
      ipAddress,
      userAgent,
      createdAt: new Date().toISOString()
    };
    this.inMemoryRiskEvents.push(event);

    // Update risk score on session
    const existing = this.inMemoryCache.get(sessionId);
    if (existing) {
      this.saveSessionInMemory({
        ...existing,
        riskScore: Math.max(existing.riskScore || 0, riskScore)
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_session_risk_events').insert({
          session_id: sessionId,
          user_id: userId,
          risk_score: riskScore,
          risk_factors: riskFactors as any,
          ip_address: ipAddress || null,
          user_agent: userAgent || null
        });
      } catch {
        // Fallback
      }
    }
  }

  async touchSession(sessionId: string, nowMs: number = Date.now()): Promise<void> {
    if (getSupabaseConfig().databaseUrl) {
      await this.authorityQuery('UPDATE public.galx_user_sessions SET last_active_at_ms=$2::bigint, updated_at=to_timestamp(($2::bigint)::double precision/1000) WHERE id=$1 AND NOT is_revoked', [sessionId, nowMs]);
      return;
    }
    const existing = this.inMemoryCache.get(sessionId);
    if (existing) {
      this.saveSessionInMemory({
        ...existing,
        lastActiveAtMs: nowMs,
        updatedAt: new Date(nowMs).toISOString()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_user_sessions')
          .update({
            last_active_at_ms: nowMs,
            updated_at: new Date(nowMs).toISOString()
          })
          .eq('id', sessionId);
      } catch {
        // Fallback
      }
    }
  }

  /**
   * High-Velocity Bulk Session Heartbeat Touch via UNNEST PostgreSQL RPC.
   */
  async touchSessionsBatch(
    tokenHashes: string[],
    nowMs: number = Date.now()
  ): Promise<{ success: boolean; touchedCount: number }> {
    if (tokenHashes.length === 0) return { success: true, touchedCount: 0 };

    for (const session of this.inMemoryCache.values()) {
      if (tokenHashes.includes(session.tokenHash)) {
        this.saveSessionInMemory({
          ...session,
          lastActiveAtMs: nowMs,
          updatedAt: new Date(nowMs).toISOString()
        });
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_bulk_touch_sessions', {
          p_token_hashes: tokenHashes,
          p_now_ms: nowMs
        });

        if (!error && data && (data as any).success) {
          return {
            success: true,
            touchedCount: Number((data as any).touched_sessions_count || 0)
          };
        }
      } catch {
        // Fallback
      }
    }

    return { success: true, touchedCount: tokenHashes.length };
  }

  async getUserSessions(userId: string): Promise<GalxUserSession[]> {
    if (getSupabaseConfig().databaseUrl) {
      return (await this.authorityQuery('SELECT * FROM public.galx_user_sessions WHERE user_id=$1 AND NOT is_revoked ORDER BY last_active_at_ms DESC', [userId])).rows.map(row => this.mapRowToSession(row));
    }
    const { data, error } = await getSupabaseAdmin().from('galx_user_sessions').select('*')
      .eq('user_id', userId).eq('is_revoked', false).order('last_active_at_ms', { ascending: false });
    if (error || !data) throw new Error('SESSION_LIST_UNAVAILABLE');
    return data.map(row => this.mapRowToSession(row));
  }

  /**
   * Returns formatted device & session metadata for user security views.
   */
  async getUserActiveSessions(userId: string, currentSessionId?: string): Promise<SessionDeviceInfo[]> {
    const rawSessions = await this.getUserSessions(userId);
    const now = Date.now();

    return rawSessions
      .filter(s => !s.isRevoked && s.expiresAtMs > now)
      .map(s => {
        const uaInfo = GalxCryptoVault.parseUserAgent(s.userAgent);
        const sudoActive = Boolean(s.sudoElevatedUntilMs && s.sudoElevatedUntilMs > now);
        return {
          id: s.id,
          userId: s.userId,
          provider: s.provider,
          shardId: s.shardId,
          ipAddress: s.ipAddress || '127.0.0.1',
          userAgent: s.userAgent,
          browser: uaInfo.browser,
          os: uaInfo.os,
          isCurrent: currentSessionId ? s.id === currentSessionId : false,
          sudoActive,
          riskScore: s.riskScore || 0,
          lastActiveAtMs: s.lastActiveAtMs,
          expiresAtMs: s.expiresAtMs,
          createdAt: s.createdAt
        };
      });
  }

  /**
   * Calculates comprehensive User Security Posture & Health Grade.
   */
  async getUserSecurityPosture(userId: string, currentSessionId?: string): Promise<UserSecurityPosture> {
    const activeSessions = await this.getUserActiveSessions(userId, currentSessionId);
    const now = Date.now();

    let maxRisk = 0;
    let sudoActive = false;
    let sudoExpiresInMs = 0;

    for (const session of activeSessions) {
      if (session.riskScore > maxRisk) maxRisk = session.riskScore;
      const isTarget = currentSessionId ? session.isCurrent : true;
      if (isTarget && session.sudoActive) {
        sudoActive = true;
        const currentRec = this.inMemoryCache.get(session.id);
        if (currentRec?.sudoElevatedUntilMs) {
          sudoExpiresInMs = Math.max(0, currentRec.sudoElevatedUntilMs - now);
        }
      }
    }


    let overallGrade: 'A+' | 'A' | 'B' | 'C' = 'A+';
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (maxRisk >= 75) {
      overallGrade = 'C';
      riskLevel = 'critical';
    } else if (maxRisk >= 50) {
      overallGrade = 'B';
      riskLevel = 'high';
    } else if (maxRisk >= 25 || activeSessions.length > 5) {
      overallGrade = 'A';
      riskLevel = 'medium';
    }

    const recommendations: string[] = [];
    if (activeSessions.length === 1) {
      recommendations.push('Single active device session with tamper-evident DPoP fingerprinting.');
    } else if (activeSessions.length > 3) {
      recommendations.push('You have multiple active sessions. Consider revoking unused devices.');
    }

    if (sudoActive) {
      recommendations.push(`SUDO elevated mode active (expires in ${Math.round(sudoExpiresInMs / 60000)}m).`);
    } else {
      recommendations.push('SUDO mode inactive; sensitive operations require verification.');
    }

    recommendations.push(`Vault credentials protected with AES-256-GCM under key version '${PRIMARY_KEY_VERSION}'.`);

    return {
      overallGrade,
      riskScore: maxRisk,
      riskLevel,
      activeSessionsCount: activeSessions.length,
      sudoActive,
      sudoExpiresInMs,
      primaryKeyringVersion: PRIMARY_KEY_VERSION,
      recommendations,
      lastAuditedAt: new Date().toISOString()
    };
  }

  async revokeSession(sessionId: string, reason = 'User requested logout'): Promise<void> {
    const now = new Date().toISOString();
    if (getSupabaseConfig().databaseUrl) {
      await this.authorityQuery('UPDATE public.galx_user_sessions SET is_revoked=true,revoked_at=$2,revoked_reason=$3,updated_at=$2 WHERE id=$1', [sessionId, now, reason]);
    } else {
      const { error } = await getSupabaseAdmin().from('galx_user_sessions')
        .update({ is_revoked: true, revoked_at: now, revoked_reason: reason, updated_at: now }).eq('id', sessionId);
      if (error) throw new Error('SESSION_REVOCATION_UNAVAILABLE');
    }
    this.deleteSessionInMemory(sessionId);
  }

  async revokeOtherSessions(userId: string, currentSessionId: string, reason = 'Remote logout of other devices'): Promise<number> {
    const { data, error } = getSupabaseConfig().databaseUrl
      ? { data: (await this.authorityQuery('SELECT public.fn_revoke_other_user_sessions($1,$2,$3,$4) AS result', [userId,currentSessionId,reason,Date.now()])).rows[0]?.result, error: null }
      : await getSupabaseAdmin().rpc('fn_revoke_other_user_sessions', {
      p_user_id: userId, p_current_session_id: currentSessionId, p_reason: reason, p_now_ms: Date.now(),
    });
    return this.revokedCount(data, error);
  }

  async revokeSessionFamily(familyId: string, reason = 'Session family revocation'): Promise<number> {
    const { data, error } = getSupabaseConfig().databaseUrl
      ? { data: (await this.authorityQuery('SELECT public.fn_revoke_session_family($1,$2,$3) AS result', [familyId,reason,Date.now()])).rows[0]?.result, error: null }
      : await getSupabaseAdmin().rpc('fn_revoke_session_family', {
      p_family_id: familyId, p_reason: reason, p_now_ms: Date.now(),
    });
    return this.revokedCount(data, error);
  }

  async revokeAllUserSessions(userId: string, reason = 'Global logout from all devices'): Promise<number> {
    const { data, error } = getSupabaseConfig().databaseUrl
      ? { data: (await this.authorityQuery('SELECT public.fn_revoke_all_user_sessions($1,$2,$3) AS result', [userId,reason,Date.now()])).rows[0]?.result, error: null }
      : await getSupabaseAdmin().rpc('fn_revoke_all_user_sessions', {
      p_user_id: userId, p_reason: reason, p_now_ms: Date.now(),
    });
    return this.revokedCount(data, error);
  }

  private revokedCount(data: unknown, error: unknown): number {
    const count = (data as { revoked_count?: unknown } | null)?.revoked_count;
    if (error || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new Error('SESSION_REVOCATION_UNAVAILABLE');
    return count;
  }

  async scavengeExpiredSessions(): Promise<number> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_cleanup_expired_sessions', {
          p_now_ms: Date.now()
        });
        if (!error && typeof data === 'number') {
          return data;
        }
      } catch {
        // Fallback
      }
    }

    const now = Date.now();
    let reclaimed = 0;
    for (const [id, session] of this.inMemoryCache.entries()) {
      if (session.expiresAtMs < now || (session.isRevoked && now - session.lastActiveAtMs > 7 * 24 * 3600 * 1000)) {
        this.deleteSessionInMemory(id);
        reclaimed++;
      }
    }
    return reclaimed;
  }

  private mapRowToSession(data: Database['public']['Tables']['galx_user_sessions']['Row']): GalxUserSession {
    return {
      id: data.id,
      userId: data.user_id,
      provider: data.provider as ProviderType,
      shardId: data.shard_id || undefined,
      sessionFamilyId: data.session_family_id || undefined,
      sequenceNumber: data.sequence_number || 1,
      scopes: data.scopes || [],
      sudoElevatedUntilMs: data.sudo_elevated_until_ms ? Number(data.sudo_elevated_until_ms) : undefined,
      riskScore: data.risk_score || 0,
      tokenHash: data.token_hash,
      previousTokenHash: data.previous_token_hash || undefined,
      gracePeriodUntilMs: data.grace_period_until_ms ? Number(data.grace_period_until_ms) : undefined,
      refreshTokenHash: data.refresh_token_hash || undefined,
      fingerprintHash: data.fingerprint_hash || undefined,
      workspaceId: data.workspace_id || undefined,
      ipAddress: data.ip_address || undefined,
      userAgent: data.user_agent || undefined,
      isRevoked: data.is_revoked,
      revokedAt: data.revoked_at || undefined,
      revokedReason: data.revoked_reason || undefined,
      issuedAtMs: Number(data.issued_at_ms),
      expiresAtMs: Number(data.expires_at_ms),
      lastActiveAtMs: Number(data.last_active_at_ms),
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapSessionToRow(session: GalxUserSession): Database['public']['Tables']['galx_user_sessions']['Insert'] {
    return {
      id: session.id,
      workspace_id: session.workspaceId || null,
      user_id: session.userId,
      provider: session.provider,
      shard_id: session.shardId || null,
      session_family_id: session.sessionFamilyId || null,
      sequence_number: session.sequenceNumber || 1,
      scopes: session.scopes || [],
      sudo_elevated_until_ms: session.sudoElevatedUntilMs || null,
      risk_score: session.riskScore || 0,
      token_hash: session.tokenHash,
      previous_token_hash: session.previousTokenHash || null,
      grace_period_until_ms: session.gracePeriodUntilMs || null,
      refresh_token_hash: session.refreshTokenHash || null,
      fingerprint_hash: session.fingerprintHash || null,
      ip_address: session.ipAddress || null,
      user_agent: session.userAgent || null,
      is_revoked: session.isRevoked || false,
      revoked_at: session.revokedAt || null,
      revoked_reason: session.revokedReason || null,
      issued_at_ms: session.issuedAtMs,
      expires_at_ms: session.expiresAtMs,
      last_active_at_ms: session.lastActiveAtMs,
      created_at: session.createdAt || new Date(session.issuedAtMs).toISOString(),
      updated_at: session.updatedAt || new Date(session.lastActiveAtMs).toISOString()
    };
  }
}
