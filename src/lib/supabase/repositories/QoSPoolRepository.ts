/**
 * GALXAI: QoS Pool & Compute Grant Repository
 * 
 * Provides type-safe access to LUMI QoS pool stream leases, sliding 5-hour quotas,
 * continuous credit interpolation, heartbeat extensions, and community free pool grant balances.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
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
    if (isSupabaseConfigured()) {
      this.supabase = getSupabaseAdmin();
    }
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
    if (!this.supabase) {
      // Offline / In-Memory Fallback
      const governor = GalxLumiQoSPoolGovernor.getInstance();
      const evalResult = governor.evaluateRequest(params.userId, true, false, params.modelId);
      return {
        allowed: evalResult.allowed,
        leaseId: evalResult.allowed ? `local_lease_${Date.now()}` : undefined,
        activeStreams: evalResult.activeUserStreams,
        quotaRemaining: evalResult.userQuotaRemaining,
        rejectionCode: evalResult.rejectionReason?.code,
        rejectionMessage: evalResult.rejectionReason?.message,
        retryAfter: evalResult.rejectionReason?.retryAfterSeconds,
        pool: evalResult.pool
      };
    }

    try {
      const { data, error } = await this.supabase.rpc('rpc_acquire_lumi_stream_lease_v2', {
        p_user_id: params.userId,
        p_model_id: params.modelId || 'gpt-5.6-luna',
        p_api_key_id: params.apiKeyId || null,
        p_client_fingerprint: params.clientFingerprint || null,
        p_max_burst: params.maxBurst || 12,
        p_5h_quota: params.fiveHourQuota || 2050,
        p_ttl_seconds: params.ttlSeconds || 120
      });

      if (error) throw error;
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
    } catch (rpcError) {
      console.warn('[QoSPoolRepository] Postgres RPC v2 fallback to memory:', rpcError);
      const governor = GalxLumiQoSPoolGovernor.getInstance();
      const evalResult = governor.evaluateRequest(params.userId, true, false, params.modelId);
      return {
        allowed: evalResult.allowed,
        leaseId: evalResult.allowed ? `fallback_lease_${Date.now()}` : undefined,
        activeStreams: evalResult.activeUserStreams,
        quotaRemaining: evalResult.userQuotaRemaining,
        rejectionCode: evalResult.rejectionReason?.code,
        rejectionMessage: evalResult.rejectionReason?.message,
        retryAfter: evalResult.rejectionReason?.retryAfterSeconds,
        pool: evalResult.pool
      };
    }
  }

  /**
   * Extends active stream lease TTL during long reasoning steps (o3 deep thinking)
   */
  async heartbeatLumiLease(leaseId: string, userId: string, extendSeconds = 60): Promise<boolean> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_heartbeat_lumi_stream_lease', {
          p_lease_id: leaseId,
          p_user_id: userId,
          p_extend_seconds: extendSeconds
        });
        if (!error && data?.success) return true;
      } catch (err) {
        console.warn('[QoSPoolRepository] Heartbeat lease failed:', err);
      }
    }
    return true;
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
    // Release in memory
    GalxLumiQoSPoolGovernor.getInstance().releaseStreamSlot(userId, true);

    if (this.supabase) {
      try {
        await this.supabase.rpc('rpc_settle_lumi_stream_lease_v2', {
          p_lease_id: leaseId,
          p_user_id: userId,
          p_prompt_tokens: promptTokens,
          p_completion_tokens: completionTokens,
          p_reasoning_tokens: reasoningTokens
        });
      } catch (err) {
        console.warn('[QoSPoolRepository] Postgres release lease failed:', err);
      }
    }
  }

  /**
   * Sweep and scavenge expired or orphaned stream leases without blocking active queries
   */
  async sweepExpiredLeases(): Promise<number> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('rpc_sweep_expired_lumi_leases');
        if (!error && data?.success) {
          return data.expired_leases_swept || 0;
        }
      } catch (err) {
        console.warn('[QoSPoolRepository] Sweep expired leases RPC failed:', err);
      }
    }
    return 0;
  }

  /**
   * Evaluate and acquire a Community Free Grant ($30/mo & $500/day pool)
   */
  async evaluateCommunityGrant(userId: string, costEstimateUsd = 0.005) {
    if (!this.supabase) {
      const governor = GalxCommunityPoolGovernor.getInstance();
      return governor.evaluateRequest(userId, undefined, costEstimateUsd);
    }

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
    } catch (rpcError) {
      console.warn('[QoSPoolRepository] Community grant RPC fallback to memory:', rpcError);
      const governor = GalxCommunityPoolGovernor.getInstance();
      return governor.evaluateRequest(userId, undefined, costEstimateUsd);
    }
  }

  /**
   * Settle token spend against user free grant and collective daily pool
   */
  async settleCommunityGrant(userId: string, costUsd: number): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.rpc('rpc_settle_community_grant_draw', {
          p_user_id: userId,
          p_cost_usd: costUsd
        });
      } catch (err) {
        console.warn('[QoSPoolRepository] Settle community grant RPC failed:', err);
      }
    }
  }
}

export const qosPoolRepository = QoSPoolRepository.getInstance();
