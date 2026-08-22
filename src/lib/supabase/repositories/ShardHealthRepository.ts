/**
 * GALXAI: Supabase Shard Health Probes & Auto-Drain Repository
 * Aggregates edge health traces and executes autonomous provider shard failover/drain.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';

export interface ShardHealthProbe {
  shardId: string;
  workerId: string;
  latencyMs: number;
  statusCode: number;
  isSuccess: boolean;
  errorMessage?: string;
  timestampMs?: number;
}

export class ShardHealthRepository {
  private static instance: ShardHealthRepository;
  private readonly inMemoryProbes: ShardHealthProbe[] = [];

  static getInstance(): ShardHealthRepository {
    if (!ShardHealthRepository.instance) {
      ShardHealthRepository.instance = new ShardHealthRepository();
    }
    return ShardHealthRepository.instance;
  }

  async reportHealthProbesBatch(probes: ShardHealthProbe[]): Promise<{
    success: boolean;
    probesIngested: number;
    statusTransitions: Array<{ shardId: string; newStatus: string; reason: string }>;
  }> {
    if (probes.length === 0) {
      return { success: true, probesIngested: 0, statusTransitions: [] };
    }

    for (const p of probes) {
      this.inMemoryProbes.push(p);
    }
    if (this.inMemoryProbes.length > 2000) {
      this.inMemoryProbes.splice(0, this.inMemoryProbes.length - 2000);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_report_shard_health_cf', {
          p_probes: probes as any
        });

        if (!error && data) {
          const res = data as any;
          return {
            success: res.success,
            probesIngested: res.probesIngested,
            statusTransitions: res.statusTransitions || []
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      success: true,
      probesIngested: probes.length,
      statusTransitions: []
    };
  }
}
