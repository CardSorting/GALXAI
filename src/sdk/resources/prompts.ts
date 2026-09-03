/**
 * GALXAI Developer SDK: Enterprise Prompts Registry & Versioning
 * Powered by BroccoliDB L1 Reactive Tables for sub-microsecond prompt retrieval,
 * semantic versioning, variable interpolation, and natural language prompt discovery.
 * Pattern inspired by Braintrust, Humanloop, and LangFuse.
 */

import { BroccoliDbTable } from '../../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions } from '../../core/broccolidb/broccolidb.contracts';

export interface PromptTemplateRecord {
  id: string; // `${name}@${version}`
  name: string;
  version: string;
  template: string;
  description?: string;
  defaultVariables?: Record<string, any>;
  model?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface PromptCreateParams {
  name: string;
  template: string;
  version?: string;
  description?: string;
  defaultVariables?: Record<string, any>;
  model?: string;
  metadata?: Record<string, any>;
}

export class PromptsResource {
  private readonly table: BroccoliDbTable<PromptTemplateRecord>;

  constructor() {
    this.table = new BroccoliDbTable<PromptTemplateRecord>('sdk_prompts_registry');
    this.table.createIndex('name');
    this.table.createIndex('version');
    this.table.createSortedIndex('createdAt');
  }

  /**
   * Registers a prompt template with semantic versioning and default variable bindings.
   *
   * @example
   * ```typescript
   * galx.prompts.create({
   *   name: 'customer_support',
   *   version: '1.2.0',
   *   template: 'You are an agent for {{company}}. Assist user {{user}} with {{topic}}.',
   *   defaultVariables: { company: 'Acme Corp' }
   * });
   * ```
   */
  public create(params: PromptCreateParams): PromptTemplateRecord {
    const version = params.version || '1.0.0';
    const id = `${params.name}@${version}`;
    const now = Date.now();

    const record: PromptTemplateRecord = {
      id,
      name: params.name,
      version,
      template: params.template,
      description: params.description,
      defaultVariables: params.defaultVariables,
      model: params.model,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata
    };

    this.table.put(id, record);
    return record;
  }

  /**
   * Retrieves a prompt template by name and version. If version is omitted, returns latest.
   */
  public get(name: string, version?: string): PromptTemplateRecord | undefined {
    if (version) {
      return this.table.get(`${name}@${version}`);
    }

    // Find all versions of this prompt and sort descending
    const versions = (this.table.query({
      where: { name }
    }) as PromptTemplateRecord[]) || [];

    if (versions.length === 0) return undefined;
    return versions.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  /**
   * Renders a prompt template with variable interpolation.
   *
   * @example
   * ```typescript
   * const text = galx.prompts.render('customer_support', { user: 'Alice', topic: 'billing' });
   * console.log(text);
   * ```
   */
  public render(name: string, variables: Record<string, any> = {}, version?: string): string {
    const prompt = this.get(name, version);
    if (!prompt) {
      throw new Error(`Prompt template not found: ${name}${version ? `@${version}` : ''}`);
    }

    const merged = { ...(prompt.defaultVariables || {}), ...variables };
    return prompt.template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return key in merged ? String(merged[key]) : match;
    });
  }

  /**
   * Lists all registered prompt templates in the BroccoliDB table.
   */
  public list(options?: DbQueryOptions): PromptTemplateRecord[] {
    return this.table.query(options || { sortBy: 'createdAt', sortOrder: 'desc' }) as PromptTemplateRecord[];
  }

  /**
   * Natural language query over prompt templates (<0.1ms).
   *
   * @example
   * ```typescript
   * const supportPrompts = galx.prompts.queryNatural('where name is customer_support');
   * ```
   */
  public queryNatural(naturalQuery: string): PromptTemplateRecord[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'sdk_prompts_registry');
    return this.table.query(parsed.queryOptions) as PromptTemplateRecord[];
  }

  /**
   * Deletes a prompt version from the registry.
   */
  public delete(name: string, version?: string): boolean {
    if (version) {
      return this.table.delete(`${name}@${version}`);
    }
    const all = this.table.query({ where: { name } }) as PromptTemplateRecord[];
    for (const p of all) {
      this.table.delete(p.id);
    }
    return all.length > 0;
  }
}
