/**
 * GALXAI Developer SDK: Moderations & Guardrails Resource
 * Backed by BroccoliDB L1 Reactive Audit Tables for sub-microsecond compliance logging,
 * natural language audit queries (<0.1ms), and safety metrics aggregation.
 */

import type { GalxAIClientCore } from '../client';
import type { RequestOptions } from '../types';
import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../../core/broccolidb/broccolidb.contracts';

export interface ModerationCreateParams {
  input: string | string[];
  model?: string;
}

export interface ModerationCategories {
  hate: boolean;
  harassment: boolean;
  self_harm: boolean;
  sexual: boolean;
  violence: boolean;
  pii_violation: boolean;
  prompt_injection: boolean;
}

export interface ModerationCategoryScores {
  hate: number;
  harassment: number;
  self_harm: number;
  sexual: number;
  violence: number;
  pii_violation: number;
  prompt_injection: number;
}

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
  category_scores: ModerationCategoryScores;
}

export interface ModerationCreateResponse {
  id: string;
  model: string;
  results: ModerationResult[];
}

export interface ModerationAuditRecord {
  id: string;
  timestampMs: number;
  input: string;
  model: string;
  flagged: boolean;
  promptInjection: boolean;
  categories: ModerationCategories;
  categoryScores: ModerationCategoryScores;
}

export class ModerationsResource {
  private readonly client: GalxAIClientCore;
  private readonly auditTable: BroccoliDbTable<ModerationAuditRecord>;

  constructor(client: GalxAIClientCore) {
    this.client = client;
    this.auditTable = new BroccoliDbTable<ModerationAuditRecord>('moderations_audit');
    this.auditTable.createIndex('flagged');
    this.auditTable.createIndex('model');
    this.auditTable.createIndex('promptInjection');
    this.auditTable.createSortedIndex('timestampMs');
  }

  /**
   * Classifies text inputs for harmful, sensitive, or jailbreak content.
   * Automatically records results to BroccoliDB L1 reactive audit table.
   *
   * @example
   * ```ts
   * const mod = await galx.moderations.create({
   *   input: userQuery
   * });
   * if (mod.results[0].flagged) {
   *   throw new Error('Input rejected by safety guardrails');
   * }
   * ```
   */
  public async create(
    params: ModerationCreateParams,
    options?: RequestOptions
  ): Promise<ModerationCreateResponse> {
    const inputs = Array.isArray(params.input) ? params.input : [params.input];
    const model = params.model || 'omni-moderation-latest';

    let response: ModerationCreateResponse;

    if (this.client.isMock) {
      const results: ModerationResult[] = inputs.map(text => {
        const lower = text.toLowerCase();
        const injection = lower.includes('ignore previous instructions') || lower.includes('system prompt leak');
        const flagged = injection;

        return {
          flagged,
          categories: {
            hate: false,
            harassment: false,
            self_harm: false,
            sexual: false,
            violence: false,
            pii_violation: false,
            prompt_injection: injection
          },
          category_scores: {
            hate: 0.0001,
            harassment: 0.0001,
            self_harm: 0.0001,
            sexual: 0.0001,
            violence: 0.0001,
            pii_violation: 0.0001,
            prompt_injection: injection ? 0.98 : 0.0002
          }
        };
      });

      response = {
        id: `mod_${Date.now()}`,
        model,
        results
      };
    } else {
      response = await this.client.request<ModerationCreateResponse>('/v1/moderations', {
        method: 'POST',
        body: {
          input: params.input,
          model
        },
        ...options
      });
    }

    // Record audit records to BroccoliDB reactive table
    const now = Date.now();
    for (let i = 0; i < inputs.length; i++) {
      const res = response.results[i];
      if (res) {
        const recordId = `${response.id}_${i}`;
        this.auditTable.put(recordId, {
          id: recordId,
          timestampMs: now,
          input: inputs[i],
          model: response.model,
          flagged: res.flagged,
          promptInjection: res.categories.prompt_injection,
          categories: res.categories,
          categoryScores: res.category_scores
        });
      }
    }

    return response;
  }

  /**
   * Executes deterministic offline natural language queries over moderation audit logs (<0.1ms).
   *
   * @example
   * ```ts
   * const flaggedAttacks = galx.moderations.queryNatural('flagged prompt injections');
   * ```
   */
  public queryNatural(naturalQuery: string): ModerationAuditRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'moderations_audit');
    return this.auditTable.query(parsed.queryOptions) as ModerationAuditRecord[];
  }

  /**
   * Evaluates structured query filters over the moderation audit table.
   */
  public queryDSL(options: DbQueryOptions): ModerationAuditRecord[] {
    return this.auditTable.query(options) as ModerationAuditRecord[];
  }

  /**
   * Runs safety and violation aggregations across moderation history.
   */
  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    return this.auditTable.aggregate(query);
  }

  /**
   * Retrieves complete audit log history.
   */
  public getAuditLog(options?: DbQueryOptions): ModerationAuditRecord[] {
    return this.auditTable.query(options || { sortBy: 'timestampMs', sortOrder: 'desc' }) as ModerationAuditRecord[];
  }
}
