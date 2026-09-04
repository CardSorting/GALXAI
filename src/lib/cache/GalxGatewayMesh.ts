/**
 * GALXAI: High-Throughput Composite Gateway Pipeline Mesh
 * Powered by Hybrid BroccoliDB L1 Hot Tables & 1-Hop PostgreSQL Procedures
 * 
 * Collapses 5 sequential WAN database roundtrips (API Key -> Workspace -> Wallet ->
 * Shard Selection -> Lease Acquisition) into:
 * 1. 0ms / 0-roundtrip BroccoliDB in-memory snapshot resolution for hot repeat callers.
 * 2. 1 single atomic composite stored procedure (<5ms total) for fresh requests.
 */

import { createHash, randomUUID } from 'node:crypto';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../supabase/client';
import { executePostgresQuery } from '../db/postgres';
import { ShardRepository } from '../supabase/repositories/ShardRepository';
import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';

export interface PreflightTicket {
  id: string;
  keyHash: string;
  ticketId: string;
  userId: string;
  workspaceId: string;
  keyId: string;
  scopes: string[];
  walletId: string;
  currentBalanceUsd: number;
  shardId: string;
  shardProvider: string;
  leaseId?: string;
  model: string;
  timestampMs: number;
  cachedAtMs: number;
  requestId?: string;
  fencingToken?: number;
  leaseExpiresAtMs?: number;
}

export interface PostflightPayload {
  userId: string;
  workspaceId?: string;
  shardId?: string;
  leaseId?: string;
  actualCostUsd: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
  latencyMs: number;
  statusCode?: number;
  clientIp?: string;
}

export class GalxGatewayMesh {
  private static instance: GalxGatewayMesh;
  public readonly snapshotTable: BroccoliDbTable<PreflightTicket>;

  // Metrics
  private preflightL1Hits = 0;
  private preflightRpcDispatches = 0;
  private postflightDispatches = 0;

  private constructor() {
    this.snapshotTable = new BroccoliDbTable<PreflightTicket>('preflight_snapshots');
    this.snapshotTable.createIndex('keyHash');
    this.snapshotTable.createIndex('userId');
    this.snapshotTable.createSortedIndex('cachedAtMs');
  }

  public static getInstance(): GalxGatewayMesh {
    if (!GalxGatewayMesh.instance) {
      GalxGatewayMesh.instance = new GalxGatewayMesh();
    }
    return GalxGatewayMesh.instance;
  }

  /**
   * Executes atomic composite preflight in 0ms (L1 BroccoliDB) or 1-hop PostgreSQL RPC.
   */
  public async executePreflight(
    keyHash: string,
    requestedModel: string,
    estimatedCostUsd: number = 0.05,
    workerId: string = 'cf_edge_node',
    options: { requestId?: string; estimatedTokens?: number } = {}
  ): Promise<PreflightTicket> {
    const now = Date.now();
    const requestId = options.requestId || randomUUID();
    const estimatedTokens = options.estimatedTokens || 2000;
    const cacheKey = `${keyHash}:${requestedModel}:${requestId}`;

    // 1. Check BroccoliDB L1 Hot Table (<0.5 µs lookup, 5000ms freshness window)
    const cached = this.snapshotTable.get(cacheKey);
    if (cached && (now - cached.cachedAtMs) < 5000 && cached.currentBalanceUsd >= estimatedCostUsd) {
      this.preflightL1Hits++;
      return cached;
    }

    // 2. Dispatch the service-only v2 RPC. The request ID scopes the hot entry
    // to one execution and makes database admission safe to retry. A lease must
    // never be cached and reused across unrelated requests.
    this.preflightRpcDispatches++;
    let authorityFailure: unknown;
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.fn_gateway_preflight_composite_mesh_v2(
        $1::varchar, $2::varchar, $3::numeric, $4::varchar, $5::varchar, $6::bigint
      ) AS result`,
      [keyHash, requestedModel, estimatedCostUsd, workerId, requestId, estimatedTokens]
    );
    const directResult = direct?.rows[0]?.result;
    if (directResult?.success) {
      const ticket = this.mapPreflightResult(cacheKey, keyHash, requestedModel, requestId, now, directResult);
      this.snapshotTable.put(cacheKey, ticket);
      return ticket;
    }
    if (directResult && !directResult.success) {
      throw new Error(`[GatewayMesh Preflight Failed]: ${directResult.error_code || 'AUTHORITY_REJECTED'}`);
    }
    if (process.env.DATABASE_URL) authorityFailure = new Error('pooled PostgreSQL preflight failed');

    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_gateway_preflight_composite_mesh_v2', {
          p_key_hash: keyHash,
          p_requested_model: requestedModel,
          p_estimated_cost: estimatedCostUsd,
          p_worker_id: workerId,
          p_request_id: requestId,
          p_estimated_tokens: estimatedTokens
        });

        if (!error && data && (data as any).success) {
          const res = data as any;
          const ticket = this.mapPreflightResult(cacheKey, keyHash, requestedModel, requestId, now, res);

          // This is an idempotency response cache, not work ownership.
          this.snapshotTable.put(cacheKey, ticket);
          return ticket;
        } else if (error) {
          throw new Error(`[GatewayMesh Preflight Error]: ${error.message}`);
        } else if (data && !(data as any).success) {
          throw new Error(`[GatewayMesh Preflight Failed]: ${(data as any).message || (data as any).error_code}`);
        }
      } catch (err: any) {
        if (err.message?.includes('GatewayMesh')) throw err;
        authorityFailure = err;
      }
    }

    if (process.env.DATABASE_URL || isSupabaseAdminConfigured()) {
      throw new Error(
        `[GatewayMesh Preflight Error]: PostgreSQL authority unavailable${
          authorityFailure instanceof Error ? ` (${authorityFailure.message})` : ''
        }`
      );
    }
    if (
      process.env.NODE_ENV !== 'test' ||
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS !== 'true'
    ) {
      throw new Error('[GatewayMesh Preflight Error]: PostgreSQL authority is required');
    }

    // Local in-memory simulated fallback
    const fallbackTicket: PreflightTicket = {
      id: cacheKey,
      keyHash,
      ticketId: `tkt_local_${now}`,
      userId: 'usr_local_dev',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      keyId: 'key_local_dev',
      scopes: ['*'],
      walletId: 'wal_local_dev',
      currentBalanceUsd: 100.0,
      shardId: 'shard_direct',
      shardProvider: 'openai',
      model: requestedModel,
      timestampMs: now,
      cachedAtMs: now,
      requestId
    };

    this.snapshotTable.put(cacheKey, fallbackTicket);
    return fallbackTicket;
  }

  /**
   * Executes Universal QoS Gateway Preflight in 0ms (L1 snapshot) or 1 single atomic SQL hop.
   */
  public async executeUniversalQoSPreflight(
    keyHash: string,
    requestedModel: string = 'gpt-5.6-luna',
    clientFingerprint?: string,
    ipSubnet?: string,
    options: { requestId?: string; estimatedTokens?: number } = {}
  ) {
    const now = Date.now();
    const requestId = options.requestId || randomUUID();
    const estimatedTokens = options.estimatedTokens ?? 2000;
    const cacheKey = `qos:${keyHash || 'anon'}:${requestedModel}:${requestId}`;

    // L1 Hot Snapshot check (3000ms TTL)
    const cached = this.snapshotTable.get(cacheKey);
    if (cached && (now - cached.cachedAtMs) < 3000) {
      this.preflightL1Hits++;
      return {
        success: true,
        user_id: cached.userId,
        lease_id: cached.leaseId,
        fencing_token: cached.fencingToken,
        lease_expires_at_ms: cached.leaseExpiresAtMs,
        model_id: requestedModel,
        tier: 'lumi_10',
        shard_id: cached.shardId,
        cached_l1: true,
        request_id: requestId
      };
    }

    this.preflightRpcDispatches++;
    let qosResult: any;
    let authorityFailure: unknown;
    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.fn_gateway_preflight_qos_universal_v3(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar
      ) AS result`,
      [keyHash || '', requestedModel, clientFingerprint || null, ipSubnet || null]
    );
    if (direct?.rows[0]?.result) {
      qosResult = direct.rows[0].result;
    } else if (process.env.DATABASE_URL) {
      authorityFailure = new Error('pooled PostgreSQL QoS preflight failed');
    }

    if (!qosResult && isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin() as any;
        const { data, error } = await supabase.rpc('fn_gateway_preflight_qos_universal_v3', {
          p_key_hash: keyHash || '',
          p_requested_model: requestedModel,
          p_client_fingerprint: clientFingerprint || null,
          p_ip_subnet: ipSubnet || null
        });

        if (!error && data) {
          qosResult = data;
        } else if (error) {
          throw error;
        }
      } catch (err) {
        authorityFailure = err;
      }
    }

    if (qosResult && !qosResult.success) return qosResult;
    if (qosResult?.success) {
      if (!qosResult.shard_id || !qosResult.user_id) {
        throw new Error('[GatewayMesh QoS Error]: policy response did not identify a shard subject');
      }

      const jobId = `qos:${createHash('sha256').update(requestId).digest('hex')}`;
      const shardLease = await ShardRepository.getInstance().acquireLease({
        shardId: qosResult.shard_id,
        userId: qosResult.user_id,
        estimatedTokens,
        leaseTtlMs: 120_000,
        jobId
      });
      if (!shardLease.success || !shardLease.leaseId) {
        throw new Error(
          `[GatewayMesh QoS Error]: PostgreSQL rejected shard ownership (${shardLease.reason || 'AUTHORITY_REJECTED'})`
        );
      }

      const authoritativeResult = {
        ...qosResult,
        pool_lease_id: qosResult.lease_id,
        lease_id: shardLease.leaseId,
        fencing_token: shardLease.fencingToken,
        lease_expires_at_ms: shardLease.expiresAtMs,
        request_id: requestId
      };
      this.snapshotTable.put(cacheKey, {
        id: cacheKey,
        keyHash,
        ticketId: authoritativeResult.lease_id,
        userId: authoritativeResult.user_id,
        workspaceId: 'default',
        keyId: 'default',
        scopes: ['*'],
        walletId: 'default',
        currentBalanceUsd: 100,
        shardId: authoritativeResult.shard_id,
        shardProvider: authoritativeResult.shard_provider || 'openai',
        leaseId: authoritativeResult.lease_id,
        fencingToken: authoritativeResult.fencing_token,
        leaseExpiresAtMs: authoritativeResult.lease_expires_at_ms,
        model: requestedModel,
        timestampMs: now,
        cachedAtMs: now,
        requestId
      });
      return authoritativeResult;
    }

    if (process.env.DATABASE_URL || isSupabaseAdminConfigured()) {
      throw new Error(
        `[GatewayMesh QoS Error]: PostgreSQL authority unavailable${
          authorityFailure instanceof Error ? ` (${authorityFailure.message})` : ''
        }`
      );
    }
    if (
      process.env.NODE_ENV !== 'test' ||
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS !== 'true'
    ) {
      throw new Error('[GatewayMesh QoS Error]: PostgreSQL authority is required');
    }

    const ephemeralLeaseId = `local_lease_${randomUUID()}`;
    this.snapshotTable.put(cacheKey, {
      id: cacheKey,
      keyHash,
      ticketId: ephemeralLeaseId,
      userId: 'usr_local_dev',
      workspaceId: 'test',
      keyId: 'test',
      scopes: ['*'],
      walletId: 'test',
      currentBalanceUsd: 100,
      shardId: 'shard_cf_edge_direct',
      shardProvider: 'openai',
      leaseId: ephemeralLeaseId,
      fencingToken: 1,
      leaseExpiresAtMs: now + 120_000,
      model: requestedModel,
      timestampMs: now,
      cachedAtMs: now,
      requestId
    });
    return {
      success: true,
      user_id: 'usr_local_dev',
      lease_id: ephemeralLeaseId,
      fencing_token: 1,
      lease_expires_at_ms: now + 120_000,
      model_id: requestedModel,
      tier: 'lumi_10',
      shard_id: 'shard_cf_edge_direct',
      cluster_utilization_pct: 25.0,
      opportunistic_burst_multiplier: 2.50,
      request_id: requestId,
      ephemeral_test_only: true
    };
  }

  /**
   * Executes atomic composite postflight in 1 single PostgreSQL RPC.
   */
  public async executePostflight(payload: PostflightPayload): Promise<{ success: boolean; transactionId?: string; finalBalanceUsd?: number }> {
    this.postflightDispatches++;

    // Invalidate local preflight snapshot to reflect new balance
    const snapshots = this.snapshotTable.query({
      where: { userId: { $eq: payload.userId } }
    }) as PreflightTicket[];
    for (const snap of snapshots) {
      this.snapshotTable.delete(snap.id);
    }

    const direct = await executePostgresQuery<{ result: any }>(
      `SELECT public.fn_gateway_postflight_composite_mesh_v2(
        $1::varchar, $2::uuid, $3::varchar, $4::varchar, $5::numeric, $6::varchar,
        $7::integer, $8::integer, $9::integer, $10::integer, $11::integer, $12::varchar
      ) AS result`,
      [
        payload.userId,
        payload.workspaceId || null,
        payload.shardId || null,
        payload.leaseId || null,
        payload.actualCostUsd,
        payload.model,
        payload.promptTokens,
        payload.completionTokens,
        payload.cachedTokens || 0,
        payload.latencyMs,
        payload.statusCode || 200,
        payload.clientIp || null
      ]
    );
    const directResult = direct?.rows[0]?.result;
    if (directResult?.success) {
      return {
        success: true,
        transactionId: directResult.transaction_id,
        finalBalanceUsd: Number(directResult.final_balance_usd)
      };
    }
    if (directResult && !directResult.success) {
      throw new Error(`[GatewayMesh Postflight Failed]: ${directResult.error_code || 'AUTHORITY_REJECTED'}`);
    }

    let authorityFailure: unknown = process.env.DATABASE_URL
      ? new Error('pooled PostgreSQL postflight failed')
      : undefined;
    if (isSupabaseAdminConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_gateway_postflight_composite_mesh_v2', {
          p_user_id: payload.userId,
          p_workspace_id: payload.workspaceId as any,
          p_shard_id: (payload.shardId || null) as any,
          p_lease_id: (payload.leaseId || null) as any,
          p_actual_cost: payload.actualCostUsd,
          p_model: payload.model,
          p_prompt_tokens: payload.promptTokens,
          p_completion_tokens: payload.completionTokens,
          p_cached_tokens: payload.cachedTokens || 0,
          p_latency_ms: payload.latencyMs,
          p_status_code: payload.statusCode || 200,
          p_client_ip: (payload.clientIp || null) as any
        });

        if (!error && data && (data as any).success) {
          return {
            success: true,
            transactionId: (data as any).transaction_id,
            finalBalanceUsd: Number((data as any).final_balance_usd)
          };
        } else if (error) {
          throw error;
        } else if (data) {
          throw new Error((data as any).error_code || 'AUTHORITY_REJECTED');
        }
      } catch (error) {
        authorityFailure = error;
      }
    }

    if (process.env.DATABASE_URL || isSupabaseAdminConfigured()) {
      throw new Error(
        `[GatewayMesh Postflight Error]: PostgreSQL authority unavailable${
          authorityFailure instanceof Error ? ` (${authorityFailure.message})` : ''
        }`
      );
    }
    if (
      process.env.NODE_ENV !== 'test' ||
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS !== 'true'
    ) {
      throw new Error('[GatewayMesh Postflight Error]: PostgreSQL authority is required');
    }

    return { success: true, finalBalanceUsd: 99.50 };
  }

  private mapPreflightResult(
    cacheKey: string,
    keyHash: string,
    requestedModel: string,
    requestId: string,
    now: number,
    result: any
  ): PreflightTicket {
    return {
      id: cacheKey,
      keyHash,
      ticketId: result.ticket_id,
      userId: result.user_id,
      workspaceId: result.workspace_id,
      keyId: result.key_id,
      scopes: result.scopes || ['*'],
      walletId: result.wallet_id,
      currentBalanceUsd: Number(result.current_balance_usd),
      shardId: result.shard_id,
      shardProvider: result.shard_provider,
      leaseId: result.lease_id,
      fencingToken: Number(result.fencing_token),
      leaseExpiresAtMs: Number(result.lease_expires_at_ms),
      model: requestedModel,
      timestampMs: Number(result.timestamp_ms || now),
      cachedAtMs: now,
      requestId
    };
  }

  /**
   * Clears in-memory preflight snapshots.
   */
  public clear(): void {
    this.snapshotTable.clear();
  }

  public getStats() {
    return {
      preflightL1Hits: this.preflightL1Hits,
      preflightRpcDispatches: this.preflightRpcDispatches,
      postflightDispatches: this.postflightDispatches,
      cachedSnapshots: this.snapshotTable.count()
    };
  }
}
