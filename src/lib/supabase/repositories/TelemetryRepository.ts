/**
 * GALXAI: Supabase Telemetry & Metrics Repository + BroccoliDB Hot Table
 * Ingests request metrics, latency percentiles (P50/P90/P99), error rates, and token throughput.
 * Backed by BroccoliDB L1 reactive table with secondary indexing, natural query AST translation, and aggregation.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import type { Database, GalxProviderType } from '../types';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../../../core/broccolidb/broccolidb.contracts';

export interface TelemetrySample {
  id?: string;
  workspaceId?: string;
  userId?: string;
  provider: GalxProviderType;
  modelId: string;
  shardId: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isError?: boolean;
  statusCode?: number;
  timestampMs?: number;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p99: number;
  sampleCount: number;
  averageLatencyMs: number;
}

export class TelemetryRepository {
  private static instance: TelemetryRepository;
  public readonly telemetryTable: BroccoliDbTable<TelemetrySample>;

  private constructor() {
    this.telemetryTable = new BroccoliDbTable<TelemetrySample>('telemetry_samples');
    this.telemetryTable.createIndex('provider');
    this.telemetryTable.createIndex('modelId');
    this.telemetryTable.createIndex('shardId');
    this.telemetryTable.createIndex('statusCode');
    this.telemetryTable.createIndex('isError');
    this.telemetryTable.createSortedIndex('timestampMs');
    this.telemetryTable.createSortedIndex('latencyMs');
  }

  static getInstance(): TelemetryRepository {
    if (!TelemetryRepository.instance) {
      TelemetryRepository.instance = new TelemetryRepository();
    }
    return TelemetryRepository.instance;
  }

  async recordTelemetry(sample: TelemetrySample): Promise<void> {
    const now = sample.timestampMs || Date.now();
    const promptTokens = sample.promptTokens || 0;
    const completionTokens = sample.completionTokens || 0;
    const totalTokens = sample.totalTokens || (promptTokens + completionTokens);
    const id = sample.id || `tel_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const s: TelemetrySample = {
      ...sample,
      id,
      promptTokens,
      completionTokens,
      totalTokens,
      timestampMs: now
    };
    this.telemetryTable.put(id, s);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from('galx_metrics_telemetry').insert({
          workspace_id: sample.workspaceId || null,
          user_id: sample.userId || null,
          provider: sample.provider,
          model_id: sample.modelId,
          shard_id: sample.shardId,
          latency_ms: sample.latencyMs,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          is_error: sample.isError || false,
          status_code: sample.statusCode || 200,
          timestamp_ms: now
        });
      } catch {
        // Fallback
      }
    }
  }

  async recordTelemetryBatch(samples: TelemetrySample[]): Promise<number> {
    if (samples.length === 0) return 0;
    for (const sample of samples) {
      const now = sample.timestampMs || Date.now();
      const id = sample.id || `tel_${now}_${Math.random().toString(36).substring(2, 7)}`;
      this.telemetryTable.put(id, { ...sample, id, timestampMs: now });
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc('fn_batch_record_telemetry', {
          p_samples: samples as any
        });

        if (!error && data && (data as any).success) {
          return Number((data as any).inserted_samples_count || samples.length);
        }

        const { data: legacyData, error: legacyErr } = await supabase.rpc('fn_batch_record_telemetry_cf', {
          p_samples: samples as any
        });

        if (!legacyErr && typeof legacyData === 'number') {
          return legacyData;
        }
      } catch {
        // Fallback
      }
    }

    return samples.length;
  }

  async getLatencyPercentiles(params?: {
    provider?: GalxProviderType;
    modelId?: string;
    windowMs?: number;
  }): Promise<LatencyPercentiles> {
    const cutoffMs = Date.now() - (params?.windowMs || 300000);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = supabase
          .from('galx_metrics_telemetry')
          .select('latency_ms')
          .gte('timestamp_ms', cutoffMs)
          .order('latency_ms', { ascending: true });

        if (params?.provider) query = query.eq('provider', params.provider);
        if (params?.modelId) query = query.eq('model_id', params.modelId);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const latencies = data.map(d => Number(d.latency_ms));
          return this.computePercentiles(latencies);
        }
      } catch {
        // Fallback
      }
    }

    const whereClause: Record<string, any> = {
      timestampMs: { $gte: cutoffMs }
    };
    if (params?.provider) whereClause.provider = { $eq: params.provider };
    if (params?.modelId) whereClause.modelId = { $eq: params.modelId };

    const samples = this.telemetryTable.query({
      where: whereClause,
      sortBy: 'latencyMs',
      sortOrder: 'asc'
    }) as TelemetrySample[];

    const latencies = samples.map(s => s.latencyMs);
    return this.computePercentiles(latencies);
  }

  async getThroughput(windowMs: number = 60000): Promise<{
    requestsPerMinute: number;
    tokensPerMinute: number;
    errorRatePercentage: number;
  }> {
    const cutoffMs = Date.now() - windowMs;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('galx_metrics_telemetry')
          .select('total_tokens, is_error')
          .gte('timestamp_ms', cutoffMs);

        if (!error && data && data.length > 0) {
          const totalRequests = data.length;
          const totalTokens = data.reduce((acc, row) => acc + (Number(row.total_tokens) || 0), 0);
          const errors = data.filter(row => row.is_error).length;

          return {
            requestsPerMinute: totalRequests,
            tokensPerMinute: totalTokens,
            errorRatePercentage: (errors / totalRequests) * 100
          };
        }
      } catch {
        // Fallback
      }
    }

    const samples = this.telemetryTable.query({
      where: {
        timestampMs: { $gte: cutoffMs }
      }
    }) as TelemetrySample[];

    const totalRequests = samples.length;
    const totalTokens = samples.reduce((acc, row) => acc + (row.totalTokens || 0), 0);
    const errors = samples.filter(row => row.isError).length;

    return {
      requestsPerMinute: totalRequests,
      tokensPerMinute: totalTokens,
      errorRatePercentage: totalRequests > 0 ? (errors / totalRequests) * 100 : 0
    };
  }

  public queryNatural(naturalQuery: string): TelemetrySample[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'telemetry_samples');
    return this.telemetryTable.query(parsed.queryOptions) as TelemetrySample[];
  }

  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.telemetryTable.aggregate(query);
  }

  private computePercentiles(latencies: number[]): LatencyPercentiles {
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p99: 0, sampleCount: 0, averageLatencyMs: 0 };
    }
    const count = latencies.length;
    const p50 = latencies[Math.floor(count * 0.5)];
    const p90 = latencies[Math.floor(count * 0.9)];
    const p99 = latencies[Math.floor(count * 0.99)] || latencies[count - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / count;

    return {
      p50: Math.round(p50),
      p90: Math.round(p90),
      p99: Math.round(p99),
      sampleCount: count,
      averageLatencyMs: Math.round(avg)
    };
  }
}
