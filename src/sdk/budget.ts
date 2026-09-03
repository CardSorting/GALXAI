/**
 * GALXAI Developer SDK: Client-Side Safety & Cost Budget Governor
 * Backed by BroccoliDB L1 Reactive Ledger for sub-microsecond transaction indexing,
 * natural language spend queries (<0.1ms), and financial aggregation.
 */

import { GalxError } from './errors';
import type { GalxPlugin, MiddlewareRequestContext, MiddlewareResponseContext } from './middleware';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../core/broccolidb/broccolidb.contracts';

export class BudgetExceededError extends GalxError {
  public readonly currentSpendUsd: number;
  public readonly maxSpendUsd: number;

  constructor(message: string, currentSpendUsd: number, maxSpendUsd: number) {
    super(message);
    this.name = 'BudgetExceededError';
    this.currentSpendUsd = currentSpendUsd;
    this.maxSpendUsd = maxSpendUsd;
  }
}

export interface BudgetConfig {
  maxSpendUsd?: number;
  maxTokensPerRequest?: number;
  onBudgetExceeded?: 'throw' | 'warn' | ((stats: BudgetStats) => void);
}

export interface BudgetStats {
  totalRequests: number;
  totalTokens: number;
  totalSpendUsd: number;
  remainingBudgetUsd?: number;
}

export interface BudgetLedgerEntry {
  id: string;
  timestampMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  cumulativeSpendUsd: number;
  model?: string;
}

export class BudgetGovernor {
  private readonly config: BudgetConfig;
  private readonly ledgerTable: BroccoliDbTable<BudgetLedgerEntry>;
  private totalRequests = 0;
  private totalTokens = 0;
  private totalSpendUsd = 0;

  constructor(config: BudgetConfig = {}) {
    this.config = {
      onBudgetExceeded: 'throw',
      ...config
    };
    this.ledgerTable = new BroccoliDbTable<BudgetLedgerEntry>('budget_ledger');
    this.ledgerTable.createIndex('model');
    this.ledgerTable.createSortedIndex('timestampMs');
    this.ledgerTable.createSortedIndex('costUsd');
    this.ledgerTable.createSortedIndex('totalTokens');
  }

  public checkBeforeRequest(estimatedTokens = 0) {
    if (this.config.maxTokensPerRequest && estimatedTokens > this.config.maxTokensPerRequest) {
      this.handleLimitBreach(
        `Request estimated tokens (${estimatedTokens}) exceeds safety limit of ${this.config.maxTokensPerRequest} tokens`
      );
    }

    if (this.config.maxSpendUsd !== undefined && this.totalSpendUsd >= this.config.maxSpendUsd) {
      this.handleLimitBreach(
        `Client spend budget exceeded: $${this.totalSpendUsd.toFixed(4)} spent of $${this.config.maxSpendUsd.toFixed(4)} limit`
      );
    }
  }

  public recordUsage(usage: { promptTokens?: number; completionTokens?: number; costUsd?: number; model?: string }) {
    this.totalRequests++;
    const pTokens = usage.promptTokens || 0;
    const cTokens = usage.completionTokens || 0;
    const tokens = pTokens + cTokens;
    this.totalTokens += tokens;

    const cost = usage.costUsd ?? (tokens / 1000) * 0.002;
    this.totalSpendUsd += cost;

    const entryId = `tx_${Date.now()}_${this.totalRequests}`;
    this.ledgerTable.put(entryId, {
      id: entryId,
      timestampMs: Date.now(),
      promptTokens: pTokens,
      completionTokens: cTokens,
      totalTokens: tokens,
      costUsd: Number(cost.toFixed(6)),
      cumulativeSpendUsd: Number(this.totalSpendUsd.toFixed(6)),
      model: usage.model
    });

    if (this.config.maxSpendUsd !== undefined && this.totalSpendUsd >= this.config.maxSpendUsd) {
      this.handleLimitBreach(
        `Client spend budget exceeded: $${this.totalSpendUsd.toFixed(4)} spent of $${this.config.maxSpendUsd.toFixed(4)} limit`
      );
    }
  }

  /**
   * Executes deterministic natural language queries over the budget ledger via BroccoliDB (<0.1ms).
   *
   * @example
   * ```ts
   * const expensiveCalls = client.budget.queryNatural('transactions with costUsd > 0.01');
   * ```
   */
  public queryNatural(naturalQuery: string): BudgetLedgerEntry[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'budget_ledger');
    return this.ledgerTable.query(parsed.queryOptions) as BudgetLedgerEntry[];
  }

  /**
   * Evaluates structured query filters over the ledger.
   */
  public queryDSL(options: DbQueryOptions): BudgetLedgerEntry[] {
    return this.ledgerTable.query(options) as BudgetLedgerEntry[];
  }

  /**
   * Calculates financial aggregations across the budget ledger ($sum, $avg, $max).
   */
  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.ledgerTable.aggregate(query);
  }

  /**
   * Subscribes to real-time budget ledger mutations.
   */
  public subscribe(callback: (entry: BudgetLedgerEntry) => void): () => void {
    const sub = this.ledgerTable.subscribe((event) => {
      if (event.operation === 'INSERT' && event.after) {
        callback(event.after as BudgetLedgerEntry);
      }
    });
    return () => sub.unsubscribe();
  }

  /**
   * Returns complete transaction timeline.
   */
  public getTimeline(options?: DbQueryOptions): BudgetLedgerEntry[] {
    return this.ledgerTable.query(options || { sortBy: 'timestampMs', sortOrder: 'asc' }) as BudgetLedgerEntry[];
  }

  /**
   * Aggregates spend, token burn, and call count grouped by model.
   *
   * @example
   * ```typescript
   * const modelsBreakdown = client.budget.byModel();
   * console.log(modelsBreakdown['gpt-5.6-sol'].totalSpendUsd);
   * ```
   */
  public byModel(): Record<string, { totalSpendUsd: number; totalTokens: number; callCount: number }> {
    const entries = this.ledgerTable.query() as BudgetLedgerEntry[];
    const result: Record<string, { totalSpendUsd: number; totalTokens: number; callCount: number }> = {};

    for (const e of entries) {
      const model = e.model || 'unknown';
      if (!result[model]) {
        result[model] = { totalSpendUsd: 0, totalTokens: 0, callCount: 0 };
      }
      result[model].totalSpendUsd = Number((result[model].totalSpendUsd + e.costUsd).toFixed(6));
      result[model].totalTokens += e.totalTokens;
      result[model].callCount++;
    }

    return result;
  }

  /**
   * Aggregates spend and tokens grouped by a custom tag.
   */
  public byTag(tagKey: string): Record<string, { totalSpendUsd: number; totalTokens: number; callCount: number }> {
    const entries = this.ledgerTable.query() as BudgetLedgerEntry[];
    const result: Record<string, { totalSpendUsd: number; totalTokens: number; callCount: number }> = {};

    for (const e of entries) {
      const tagVal = (e as any).tags?.[tagKey] || 'untagged';
      if (!result[tagVal]) {
        result[tagVal] = { totalSpendUsd: 0, totalTokens: 0, callCount: 0 };
      }
      result[tagVal].totalSpendUsd = Number((result[tagVal].totalSpendUsd + e.costUsd).toFixed(6));
      result[tagVal].totalTokens += e.totalTokens;
      result[tagVal].callCount++;
    }

    return result;
  }

  private handleLimitBreach(msg: string) {
    if (this.config.onBudgetExceeded === 'warn') {
      console.warn(`\x1b[33m[GALXAI Budget Warning]\x1b[0m ${msg}`);
      return;
    }

    if (typeof this.config.onBudgetExceeded === 'function') {
      this.config.onBudgetExceeded(this.getStats());
      return;
    }

    throw new BudgetExceededError(msg, this.totalSpendUsd, this.config.maxSpendUsd ?? 0);
  }

  public getStats(): BudgetStats {
    const remaining = this.config.maxSpendUsd !== undefined
      ? Math.max(0, this.config.maxSpendUsd - this.totalSpendUsd)
      : undefined;

    return {
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      totalSpendUsd: Number(this.totalSpendUsd.toFixed(6)),
      remainingBudgetUsd: remaining !== undefined ? Number(remaining.toFixed(6)) : undefined
    };
  }

  public reset() {
    this.totalRequests = 0;
    this.totalTokens = 0;
    this.totalSpendUsd = 0;
    this.ledgerTable.clear();
  }

  /**
   * Converts the budget governor into an executable client plugin.
   */
  public toPlugin(): GalxPlugin {
    const self = this;
    return {
      name: 'BudgetGovernorPlugin',
      onRequest: () => {
        self.checkBeforeRequest();
      },
      onResponse: (ctx: MiddlewareResponseContext) => {
        const usage = ctx.data?.usage;
        if (usage) {
          self.recordUsage({
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            model: ctx.requestBody?.model || ctx.data?.model
          });
        }
      }
    };
  }
}
