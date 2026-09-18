/**
 * GALXAI: QoS Pool & Compute Grant Repository
 * 
 * Provides type-safe access to LUMI QoS pool stream leases, sliding 5-hour quotas,
 * continuous credit interpolation, heartbeat extensions, and community free pool grant balances.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import { GalxLumiQoSPoolGovernor } from '@/core/governor/GalxLumiQoSPoolGovernor';
import { GalxCommunityPoolGovernor } from '@/core/governor/GalxCommunityPoolGovernor';

export interface LumiLeaseAcquireParams {
  userId: string;
  apiKeyId?: string;
  modelId?: string;
  clientFingerprint?: string;
  maxBurst?: number;
  fiveHourQuota?: number;
  ttlSeconds?: number;
}

export interface LumiLeaseResult {
  allowed: boolean;
  leaseId?: string;
  activeStreams?: number;
  modelWarpWeight?: number;
  quotaRemaining?: number;
  quotaRemainingPct?: number;
  rejectionCode?: string;
  rejectionMessage?: string;
  retryAfter?: number;
  pool: 'qos_lumi_quota' | 'qos_vip_payg';
  expiresAt?: string;
}

export class QoSPoolRepository {
  private static instance: QoSPoolRepository;
  private supabase: SupabaseClient<any> | null = null;

  constructor() {
    if (isSupabaseAdminConfigured()) {
      this.supabase = getSupabaseAdmin();
    }
  }

  private allowsEphemeralTestAuthority(): boolean {
    return process.env.NODE_ENV === 'test' &&
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS === 'true';
  }

  private mapLumiLease(data: any): LumiLeaseResult {
    return {
      allowed: Boolean(data?.allowed),
      leaseId: data?.lease_id,
      activeStreams: data?.active_streams,
      modelWarpWeight: data?.model_warp_weight,
      quotaRemaining: data?.quota_remaining_credits,
      quotaRemainingPct: data?.quota_remaining_pct,
      rejectionCode: data?.rejection_code,
      rejectionMessage: data?.rejection_message,
      retryAfter: data?.retry_after,
      pool: data?.pool || 'qos_lumi_quota',
      expiresAt: data?.expires_at
    };
  }

  public static getInstance(): QoSPoolRepository {
    if (!QoSPoolRepository.instance) {
      QoSPoolRepository.instance = new QoSPoolRepository();
    }
    return QoSPoolRepository.instance;
  }

  /**
   * Acquire an atomic in-flight stream lease for a LUMI user (V2 with Continuous Credit Interpolation)
   */
  async acquireLumiLease(params: LumiLeaseAcquireParams): Promise<LumiLeaseResult> {
    const args = [
      params.userId,
      params.modelId || 'galx-nova',
      params.apiKeyId || null,
      params.clientFingerprint || null,
      params.maxBurst || 12,
      params.fiveHourQuota || 2050,
      params.ttlSeconds || 120
    ];
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.rpc_acquire_lumi_stream_lease_v2(
        $1::text, $2::text, $3::text, $4::text, $5::integer, $6::integer, $7::integer
      ) AS result`,
      args
    );
    if (direct?.rows[0]?.result) {
      return this.mapLumiLease(direct.rows[0].result);
    }

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_acquire_lumi_stream_lease_v2', {
          p_user_id: params.userId,
          p_model_id: params.modelId || 'galx-nova',
          p_api_key_id: params.apiKeyId || null,
          p_client_fingerprint: params.clientFingerprint || null,
          p_max_burst: params.maxBurst || 12,
          p_5h_quota: params.fiveHourQuota || 2050,
          p_ttl_seconds: params.ttlSeconds || 120
        });
        if (error) throw error;
        return this.mapLumiLease(data);
      } catch {
        // The rejection below is the safe result of an unavailable authority.
      }
    }

    if (this.allowsEphemeralTestAuthority()) {
      const governor = GalxLumiQoSPoolGovernor.getInstance();
      const evalResult = governor.evaluateRequest(params.userId, true, false, params.modelId);
      return {
        allowed: evalResult.allowed,
        leaseId: evalResult.allowed ? `test_lease_${Date.now()}` : undefined,
        activeStreams: evalResult.activeUserStreams,
        quotaRemaining: evalResult.userQuotaRemaining,
        rejectionCode: evalResult.rejectionReason?.code,
        rejectionMessage: evalResult.rejectionReason?.message,
        retryAfter: evalResult.rejectionReason?.retryAfterSeconds,
        pool: evalResult.pool
      };
    }

    return {
      allowed: false,
      rejectionCode: 'AUTHORITY_UNAVAILABLE',
      rejectionMessage: 'PostgreSQL QoS lease authority is unavailable',
      pool: 'qos_lumi_quota'
    };
  }

  /**
   * Extends active stream lease TTL during long reasoning steps (o3 deep thinking)
   */
  async heartbeatLumiLease(leaseId: string, userId: string, extendSeconds = 60): Promise<boolean> {
    const direct = await executePostgresQuery<{ result: any }>(
      'SELECT public.rpc_heartbeat_lumi_stream_lease($1::text, $2::text, $3::integer) AS result',
      [leaseId, userId, extendSeconds]
    );
    if (direct?.rows[0]?.result) return Boolean(direct.rows[0].result.success);

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_heartbeat_lumi_stream_lease', {
          p_lease_id: leaseId,
          p_user_id: userId,
          p_extend_seconds: extendSeconds
        });
        if (!error && data?.success) return true;
      } catch {}
    }
    return this.allowsEphemeralTestAuthority();
  }

  /**
   * Release and settle an active LUMI stream lease with detailed token metrics
   */
  async releaseLumiLease(
    leaseId: string,
    userId: string,
    promptTokens = 0,
    completionTokens = 0,
    reasoningTokens = 0
  ): Promise<void> {
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.rpc_settle_lumi_stream_lease_v2(
        $1::text, $2::text, $3::bigint, $4::bigint, $5::bigint
      ) AS result`,
      [leaseId, userId, promptTokens, completionTokens, reasoningTokens]
    );
    if (direct?.rows[0]?.result?.success) return;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_settle_lumi_stream_lease_v2', {
          p_lease_id: leaseId,
          p_user_id: userId,
          p_prompt_tokens: promptTokens,
          p_completion_tokens: completionTokens,
          p_reasoning_tokens: reasoningTokens
        });
        if (!error && data?.success) return;
      } catch {}
    }
    if (this.allowsEphemeralTestAuthority()) {
      GalxLumiQoSPoolGovernor.getInstance().releaseStreamSlot(userId, true);
      return;
    }
    throw new Error('PostgreSQL QoS lease settlement authority is unavailable');
  }

  /**
   * Sweep and scavenge expired or orphaned stream leases without blocking active queries
   */
  async sweepExpiredLeases(): Promise<number> {
    const direct = await executePostgresQuery<{ result: any }>(
      'SELECT public.rpc_sweep_expired_lumi_leases() AS result'
    );
    if (direct?.rows[0]?.result?.success) {
      return Number(direct.rows[0].result.expired_leases_swept || 0);
    }
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_sweep_expired_lumi_leases');
        if (!error && data?.success) {
          return data.expired_leases_swept || 0;
        }
      } catch {}
    }
    if (this.allowsEphemeralTestAuthority()) return 0;
    throw new Error('PostgreSQL QoS lease scavenger authority is unavailable');
  }

  /**
   * Evaluate and acquire a Community Free Grant ($30/mo & $500/day pool)
   */
  async evaluateCommunityGrant(userId: string, costEstimateUsd = 0.005) {
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.rpc_evaluate_and_acquire_community_grant(
        p_user_id => $1::text,
        p_cost_estimate_usd => $2::numeric
      ) AS result`,
      [userId, costEstimateUsd]
    );
    if (direct?.rows[0]?.result) {
      const data = direct.rows[0].result;
      return {
        allowed: Boolean(data.allowed),
        pool: data.pool || 'shared_community',
        userRemainingUsd: data.user_remaining_usd,
        dailyPoolRemainingUsd: data.daily_pool_remaining_usd,
        rejectionReason: !data.allowed ? {
          code: data.rejection_code,
          message: data.rejection_message,
          resetAt: data.reset_at,
          resetInSeconds: data.reset_in_seconds,
          upgradeUrl: data.upgrade_url
        } : undefined
      };
    }

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_evaluate_and_acquire_community_grant', {
          p_user_id: userId,
          p_cost_estimate_usd: costEstimateUsd
        });
        if (error) throw error;
        return {
          allowed: Boolean(data?.allowed),
          pool: data?.pool || 'shared_community',
          userRemainingUsd: data?.user_remaining_usd,
          dailyPoolRemainingUsd: data?.daily_pool_remaining_usd,
          rejectionReason: !data?.allowed ? {
            code: data?.rejection_code,
            message: data?.rejection_message,
            resetAt: data?.reset_at,
            resetInSeconds: data?.reset_in_seconds,
            upgradeUrl: data?.upgrade_url
          } : undefined
        };
      } catch {}
    }
    if (this.allowsEphemeralTestAuthority()) {
      const governor = GalxCommunityPoolGovernor.getInstance();
      return governor.evaluateRequest(userId, undefined, costEstimateUsd);
    }
    return {
      allowed: false,
      pool: 'shared_community',
      rejectionReason: {
        code: 'AUTHORITY_UNAVAILABLE',
        message: 'PostgreSQL community grant authority is unavailable'
      }
    };
  }

  /**
   * Settle token spend against user free grant and collective daily pool
   */
  async settleCommunityGrant(userId: string, costUsd: number): Promise<void> {
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.rpc_settle_community_grant_draw(
        p_user_id => $1::text,
        p_cost_usd => $2::numeric
      ) AS result`,
      [userId, costUsd]
    );
    if (direct?.rows[0]?.result?.settled) return;
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_settle_community_grant_draw', {
          p_user_id: userId,
          p_cost_usd: costUsd
        });
        if (!error && data?.settled) return;
      } catch {}
    }
    if (this.allowsEphemeralTestAuthority()) return;
    throw new Error('PostgreSQL community grant settlement authority is unavailable');
  }
}

export const qosPoolRepository = QoSPoolRepository.getInstance();
