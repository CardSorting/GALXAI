/**
 * GALXAI Developer SDK: OpenTelemetry GenAI Semantic Conventions Tracing
 * Backed by BroccoliDB L1 Reactive Tables for sub-microsecond in-memory span indexing,
 * natural language observability queries (<0.1ms), and latency aggregation.
 */

import type { GalxPlugin, MiddlewareRequestContext, MiddlewareResponseContext, MiddlewareErrorContext } from './middleware';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../core/broccolidb/broccolidb.contracts';

export interface GenAISpanRecord {
  id: string;
  name: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: 'ok' | 'error';
  errorMessage?: string;
  attributes: {
    'gen_ai.system': 'galxai';
    'gen_ai.request.model'?: string;
    'gen_ai.request.temperature'?: number;
    'gen_ai.request.max_tokens'?: number;
    'gen_ai.response.model'?: string;
    'gen_ai.response.finish_reasons'?: string[];
    'gen_ai.usage.input_tokens'?: number;
    'gen_ai.usage.output_tokens'?: number;
    'gen_ai.usage.total_tokens'?: number;
    'gen_ai.usage.cost_usd'?: number;
    'http.status_code'?: number;
    'http.route'?: string;
    [key: string]: any;
  };
}

export class TelemetryResource {
  private static readonly MAX_SPANS = 500;
  private readonly table: BroccoliDbTable<GenAISpanRecord>;
  private readonly spanIds: string[] = [];
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
    this.table = new BroccoliDbTable<GenAISpanRecord>('telemetry_spans');
    this.table.createIndex('status');
    this.table.createIndex('name');
    this.table.createSortedIndex('startTimeMs');
    this.table.createSortedIndex('durationMs');
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public recordSpan(span: GenAISpanRecord) {
    if (!this.enabled) return;

    this.table.put(span.id, span);
    this.spanIds.push(span.id);

    if (this.spanIds.length > TelemetryResource.MAX_SPANS) {
      const oldestId = this.spanIds.shift();
      if (oldestId) {
        this.table.delete(oldestId);
      }
    }

    // If global OpenTelemetry tracer is registered in developer's runtime, forward attributes
    const globalOtel = (globalThis as any).trace?.getTracer?.('galxai-sdk');
    if (globalOtel) {
      try {
        const otelSpan = globalOtel.startSpan(span.name, {
          startTime: span.startTimeMs,
          attributes: span.attributes
        });
        if (span.status === 'error' && span.errorMessage) {
          otelSpan.recordException(new Error(span.errorMessage));
          otelSpan.setStatus({ code: 2, message: span.errorMessage }); // 2 = ERROR
        } else {
          otelSpan.setStatus({ code: 1 }); // 1 = OK
        }
        otelSpan.end(span.endTimeMs);
      } catch {}
    }
  }

  /**
   * Subscribes to real-time telemetry spans as they are recorded.
   */
  public subscribe(callback: (span: GenAISpanRecord) => void): () => void {
    const sub = this.table.subscribe((event) => {
      if (event.operation === 'INSERT' && event.after) {
        callback(event.after as GenAISpanRecord);
      }
    });
    return () => sub.unsubscribe();
  }

  /**
   * Retrieves all recent spans in chronological order.
   */
  public getRecentSpans(): GenAISpanRecord[] {
    return this.table.query({
      sortBy: 'startTimeMs',
      sortOrder: 'asc'
    }) as GenAISpanRecord[];
  }

  /**
   * Executes deterministic offline natural language queries over the telemetry spans (<0.1ms).
   *
   * @example
   * ```ts
   * const errors = galx.telemetry.queryNatural('errors with duration > 1000');
   * ```
   */
  public queryNatural(naturalQuery: string): GenAISpanRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'telemetry_spans');
    return this.table.query(parsed.queryOptions) as GenAISpanRecord[];
  }

  /**
   * Evaluates rich BroccoliDB operator filters ($gt, $between, $in, $regex) over telemetry spans.
   */
  public queryDSL(options: DbQueryOptions): GenAISpanRecord[] {
    return this.table.query(options) as GenAISpanRecord[];
  }

  /**
   * Performs statistical aggregation across recorded spans (e.g. avg durationMs, sum totalTokens).
   *
   * @example
   * ```ts
   * const stats = galx.telemetry.aggregate({
   *   metrics: [
   *     { field: 'durationMs', op: 'avg' },
   *     { field: 'durationMs', op: 'max' }
   *   ]
   * });
   * ```
   */
  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.table.aggregate(query);
  }

  /**
   * Clears all in-memory telemetry spans.
   */
  public clear() {
    this.table.clear();
    this.spanIds.length = 0;
  }
}

/**
 * Creates a middleware plugin that traces LLM completions according to OpenTelemetry GenAI Semantic Conventions.
 */
export function createTelemetryPlugin(telemetryResource?: TelemetryResource): GalxPlugin {
  const activeRequests = new Map<string, { startTime: number; model?: string; body?: any }>();
  const telemetry = telemetryResource || new TelemetryResource();

  return {
    name: 'OpenTelemetryGenAIPlugin',

    onRequest: (ctx: MiddlewareRequestContext) => {
      const key = `${ctx.method}_${ctx.path}_${ctx.timestampMs}`;
      activeRequests.set(key, {
        startTime: ctx.timestampMs,
        model: ctx.body?.model,
        body: ctx.body
      });
    },

    onResponse: (ctx: MiddlewareResponseContext) => {
      const now = Date.now();
      const usage = ctx.data?.usage;
      const model = ctx.requestBody?.model || ctx.data?.model || 'unknown';

      const finishReasons: string[] = [];
      if (Array.isArray(ctx.data?.choices)) {
        for (const c of ctx.data.choices) {
          if (c.finish_reason) finishReasons.push(c.finish_reason);
        }
      }

      const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0;
      const outputTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
      const totalTokens = usage?.total_tokens ?? (inputTokens + outputTokens);

      const span: GenAISpanRecord = {
        id: `span_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `galxai.chat.completions ${model}`,
        startTimeMs: now - ctx.durationMs,
        endTimeMs: now,
        durationMs: ctx.durationMs,
        status: 'ok',
        attributes: {
          'gen_ai.system': 'galxai',
          'gen_ai.request.model': model,
          'gen_ai.request.temperature': ctx.requestBody?.temperature,
          'gen_ai.request.max_tokens': ctx.requestBody?.max_tokens,
          'gen_ai.response.model': ctx.data?.model || model,
          'gen_ai.response.finish_reasons': finishReasons.length > 0 ? finishReasons : undefined,
          'gen_ai.usage.input_tokens': inputTokens,
          'gen_ai.usage.output_tokens': outputTokens,
          'gen_ai.usage.total_tokens': totalTokens,
          'http.status_code': ctx.statusCode,
          'http.route': ctx.path
        }
      };

      telemetry.recordSpan(span);
    },

    onError: (ctx: MiddlewareErrorContext) => {
      const now = Date.now();
      const span: GenAISpanRecord = {
        id: `span_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: `galxai.request.error ${ctx.path}`,
        startTimeMs: now - ctx.durationMs,
        endTimeMs: now,
        durationMs: ctx.durationMs,
        status: 'error',
        errorMessage: ctx.error.message,
        attributes: {
          'gen_ai.system': 'galxai',
          'http.route': ctx.path
        }
      };

      telemetry.recordSpan(span);
    }
  };
}
