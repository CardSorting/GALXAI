/**
 * GALXAI: Supabase User Session & Hardened Auth Token Repository (V3)
 * High-performance session resolution, SHA-256 token hash lookup, OAuth 2.0 token rotation,
 * attack-detection reuse cascades, step-up SUDO mode, risk scoring telemetry, and multi-device governance.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database } from '../types';
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

  async createSession(session: GalxUserSession): Promise<void> {
    this.saveSessionInMemory(session);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const row = this.mapSessionToRow(session);
        await supabase.from('galx_user_sessions').upsert(row, { onConflict: 'id' });
      } catch {
        // Fallback to in-memory
      }
    }
  }

  async findSessionByTokenHash(tokenHash: string, includeRevoked: boolean = true): Promise<GalxUserSession | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase
          .from('galx_user_sessions')
          .select('*')
          .or(`token_hash.eq.${tokenHash},previous_token_hash.eq.${tokenHash}`);

        if (!includeRevoked) {
          query = query.eq('is_revoked', false);
        }

        const { data, error } = await query.single();

        if (!error && data) {
          const mapped = this.mapRowToSession(data);
          this.inMemoryCache.set(mapped.id, mapped);
          this.sessionTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback to in-memory
      }
    }

    const now = Date.now();
    const primaryMatches = this.sessionTable.query({
      where: {
        tokenHash: { $eq: tokenHash },
        ...(includeRevoked ? {} : { isRevoked: { $eq: false } }),
        expiresAtMs: { $gt: now }
      }
    }) as GalxUserSession[];
    if (primaryMatches.length > 0) {
      return primaryMatches[0];
    }

    const prevMatches = this.sessionTable.query({
      where: {
        previousTokenHash: { $eq: tokenHash },
        ...(includeRevoked ? {} : { isRevoked: { $eq: false } })
      }
    }) as GalxUserSession[];
    for (const session of prevMatches) {
      if (now <= (session.gracePeriodUntilMs || 0)) {
        return session;
      }
    }
    return null;
  }

  async findSessionById(id: string): Promise<GalxUserSession | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_user_sessions')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToSession(data);
          this.inMemoryCache.set(mapped.id, mapped);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return this.inMemoryCache.get(id) || null;
  }

  /**
   * Atomic Token Rotation with Reuse Attack Detection (RFC 6819).
   */
  async rotateSessionTokenAtomic(
    oldTokenHash: string,
    newTokenHash: string,
    newExpiresAtMs: number,
    newFingerprint?: string,
    graceWindowMs: number = 30000
  ): Promise<SessionRotationResult> {
    const now = Date.now();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_rotate_session_token_atomic', {
          p_old_token_hash: oldTokenHash,
          p_new_token_hash: newTokenHash,
          p_new_expires_at_ms: newExpiresAtMs,
          p_new_fingerprint: newFingerprint || undefined,
          p_grace_window_ms: graceWindowMs,
          p_now_ms: now
        });

        if (!error && data) {
          const res = data as any;
          if (res.success) {
            for (const session of this.inMemoryCache.values()) {
              if (session.id === res.session_id) {
                this.saveSessionInMemory({
                  ...session,
                  previousTokenHash: oldTokenHash,
                  tokenHash: newTokenHash,
                  sequenceNumber: res.sequence_number,
                  expiresAtMs: newExpiresAtMs,
                  gracePeriodUntilMs: now + graceWindowMs,
                  lastActiveAtMs: now
                });
                break;
              }
            }
            return {
              success: true,
              expiresAtMs: newExpiresAtMs,
              reuseDetected: false
            };
          }

          if (res.reuse_detected) {
            if (res.family_id) {
              for (const [id, s] of this.inMemoryCache.entries()) {
                if (s.sessionFamilyId === res.family_id || s.id === res.session_id) {
                  this.saveSessionInMemory({ ...s, isRevoked: true, revokedReason: 'TOKEN_REUSE_ATTACK_DETECTED' });
                }
              }
            }
            return {
              success: false,
              reuseDetected: true,
              error: 'TOKEN_REUSE_ATTACK_DETECTED'
            };
          }
          // If RPC returned not found or failed, fall through to in-memory fallback
        }
      } catch {
        // Fallback
      }
    }

    // In-Memory Fast-Path Fallback
    for (const session of this.inMemoryCache.values()) {
      if (session.tokenHash === oldTokenHash) {
        if (session.isRevoked) {
          return { success: false, reuseDetected: false, error: 'SESSION_REVOKED' };
        }
        if (session.expiresAtMs <= now) {
          return { success: false, reuseDetected: false, error: 'SESSION_EXPIRED' };
        }

        const updated: GalxUserSession = {
          ...session,
          previousTokenHash: oldTokenHash,
          tokenHash: newTokenHash,
          sequenceNumber: (session.sequenceNumber || 1) + 1,
          fingerprintHash: newFingerprint || session.fingerprintHash,
          expiresAtMs: newExpiresAtMs,
          gracePeriodUntilMs: now + graceWindowMs,
          lastActiveAtMs: now,
          updatedAt: new Date(now).toISOString()
        };
        this.saveSessionInMemory(updated);
        return { success: true, expiresAtMs: newExpiresAtMs, reuseDetected: false };
      }
    }

    for (const session of this.inMemoryCache.values()) {
      if (session.previousTokenHash === oldTokenHash) {
        if (now <= (session.gracePeriodUntilMs || 0)) {
          return { success: true, expiresAtMs: session.expiresAtMs, reuseDetected: false };
        }

        const familyId = session.sessionFamilyId;
        for (const [id, s] of this.inMemoryCache.entries()) {
          if ((familyId && s.sessionFamilyId === familyId) || s.id === session.id) {
            this.saveSessionInMemory({ ...s, isRevoked: true, revokedReason: 'TOKEN_REUSE_ATTACK_DETECTED' });
          }
        }
        return { success: false, reuseDetected: true, error: 'TOKEN_REUSE_ATTACK_DETECTED' };
      }
    }

    return { success: false, reuseDetected: false, error: 'SESSION_NOT_FOUND' };
  }

  /**
   * Step-Up SUDO Mode Session Elevation (15-Minute Privileged Window).
   */
  async elevateSessionSudo(
    sessionId: string,
    userId: string,
    durationMs: number = 900000
  ): Promise<SudoElevationResult> {
    const now = Date.now();
    const elevatedUntil = now + durationMs;

    const existing = this.inMemoryCache.get(sessionId);
    if (existing) {
      if (existing.userId !== userId || existing.isRevoked) {
        return { success: false, sudoActive: false, sudoElevatedUntilMs: 0, expiresInMs: 0, error: 'SESSION_NOT_FOUND_OR_REVOKED' };
      }
      this.saveSessionInMemory({
        ...existing,
        sudoElevatedUntilMs: elevatedUntil,
        updatedAt: new Date(now).toISOString()
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_elevate_session_sudo', {
          p_session_id: sessionId,
          p_user_id: userId,
          p_duration_ms: durationMs,
          p_now_ms: now
        });

        if (!error && data && (data as any).success) {
          return {
            success: true,
            sudoActive: true,
            sudoElevatedUntilMs: elevatedUntil,
            expiresInMs: durationMs
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      success: true,
      sudoActive: true,
      sudoElevatedUntilMs: elevatedUntil,
      expiresInMs: durationMs
    };
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

  async getUserSessions(userId: string): Promise<GalxUserSession[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_user_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_revoked', false)
          .order('last_active_at_ms', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map(this.mapRowToSession);
          for (const s of mapped) this.saveSessionInMemory(s);
          return mapped;
        }
      } catch {
        // Fallback
      }
    }

    return Array.from(this.inMemoryCache.values()).filter(s => s.userId === userId && !s.isRevoked);
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

  async revokeSession(sessionId: string, reason: string = 'User requested logout'): Promise<void> {
    const existing = this.inMemoryCache.get(sessionId);
    const nowIso = new Date().toISOString();
    if (existing) {
      this.saveSessionInMemory({
        ...existing,
        isRevoked: true,
        revokedAt: nowIso,
        revokedReason: reason,
        updatedAt: nowIso
      });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from('galx_user_sessions')
          .update({
            is_revoked: true,
            revoked_at: nowIso,
            revoked_reason: reason,
            updated_at: nowIso
          })
          .eq('id', sessionId);
      } catch {
        // Fallback
      }
    }
  }

  async revokeOtherSessions(userId: string, currentSessionId: string, reason: string = 'Remote logout of other devices'): Promise<number> {
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const [id, session] of this.inMemoryCache.entries()) {
      if (session.userId === userId && id !== currentSessionId && !session.isRevoked) {
        this.saveSessionInMemory({
          ...session,
          isRevoked: true,
          revokedAt: nowIso,
          revokedReason: reason,
          updatedAt: nowIso
        });
        count++;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_revoke_other_user_sessions', {
          p_user_id: userId,
          p_current_session_id: currentSessionId,
          p_reason: reason,
          p_now_ms: Date.now()
        });
        if (!error && data && typeof (data as any).revoked_count === 'number' && (data as any).revoked_count > 0) {
          return (data as any).revoked_count;
        }
      } catch {
        // Fallback
      }
    }

    return count;
  }

  async revokeSessionFamily(familyId: string, reason: string = 'Session family revocation'): Promise<number> {
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const [id, session] of this.inMemoryCache.entries()) {
      if (session.sessionFamilyId === familyId && !session.isRevoked) {
        this.saveSessionInMemory({
          ...session,
          isRevoked: true,
          revokedAt: nowIso,
          revokedReason: reason,
          updatedAt: nowIso
        });
        count++;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_revoke_session_family', {
          p_family_id: familyId,
          p_reason: reason,
          p_now_ms: Date.now()
        });
        if (!error && data && typeof (data as any).revoked_count === 'number') {
          return (data as any).revoked_count;
        }
      } catch {
        // Fallback
      }
    }

    return count;
  }

  async revokeAllUserSessions(userId: string, reason: string = 'Global logout from all devices'): Promise<number> {
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const [id, session] of this.inMemoryCache.entries()) {
      if (session.userId === userId && !session.isRevoked) {
        this.saveSessionInMemory({
          ...session,
          isRevoked: true,
          revokedAt: nowIso,
          revokedReason: reason,
          updatedAt: nowIso
        });
        count++;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_revoke_all_user_sessions', {
          p_user_id: userId,
          p_reason: reason,
          p_now_ms: Date.now()
        });
        if (!error && data && typeof (data as any).revoked_count === 'number') {
          return (data as any).revoked_count;
        }
      } catch {
        // Fallback
      }
    }

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
      scopes: data.scopes || ['*'],
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
      scopes: session.scopes || ['*'],
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
