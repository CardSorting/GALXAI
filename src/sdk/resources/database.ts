/**
 * GALXAI Developer SDK: BroccoliDB Zenith Hybrid Database Resource
 * Direct access to L1 Reactive Tables, Natural Language Query Parsing, and Aggregations.
 */

import { BroccoliDatabaseKernel, broccolidb } from "../../core/broccolidb/broccolidb-kernel";
import { BroccoliNaturalQueryParser } from "../../core/broccolidb/broccolidb-natural-query";
import type { IDbTable, NaturalQueryParsed, DbAggregateQuery, DbAggregateResult } from "../../core/broccolidb/broccolidb.contracts";

export class DatabaseResource {
  private readonly kernel: BroccoliDatabaseKernel;

  constructor(kernel: BroccoliDatabaseKernel = broccolidb) {
    this.kernel = kernel;
  }

  /**
   * Retrieves a typed L1 reactive in-memory database table.
   */
  public getTable<T extends Record<string, any> = Record<string, any>>(name: string): IDbTable<T> {
    return this.kernel.getTable<T>(name);
  }

  /**
   * Parses a natural language query string into a structured AST (< 0.1ms offline).
   */
  public parseNaturalQuery(query: string, defaultTable = "default"): NaturalQueryParsed {
    return BroccoliNaturalQueryParser.parse(query, defaultTable);
  }

  /**
   * Executes a natural language query directly against target table.
   */
  public queryNatural<T extends Record<string, any> = Record<string, any>>(naturalQuery: string): readonly T[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery);
    const table = this.kernel.getTable<T>(parsed.targetTable);
    return table.query(parsed.queryOptions);
  }

  /**
   * Creates an atomic double-buffered state checkpoint.
   */
  public async checkpoint(label?: string) {
    return this.kernel.checkpoint(label);
  }

  /**
   * Rolls back state to a prior timeline checkpoint.
   */
  public async rollback(checkpointId: string) {
    return this.kernel.rollback(checkpointId);
  }

  /**
   * Stores a key-value memory item with optional TTL.
   */
  public remember(key: string, value: any, ttlMs?: number): void {
    const table = this.kernel.getTable<{ key: string; value: any; expiresAt?: number }>('agent_memory');
    table.put(key, {
      key,
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    });
  }

  /**
   * Recalls a stored memory item by key. Returns null if expired or not found.
   */
  public recall<T = any>(key: string): T | null {
    const table = this.kernel.getTable<{ key: string; value: any; expiresAt?: number }>('agent_memory');
    const found = table.get(key);
    if (!found) return null;
    if (found.expiresAt && found.expiresAt < Date.now()) {
      table.delete(key);
      return null;
    }
    return found.value as T;
  }

  /**
   * Forgets a stored memory item.
   */
  public forget(key: string): boolean {
    const table = this.kernel.getTable<{ key: string; value: any; expiresAt?: number }>('agent_memory');
    return table.delete(key);
  }

  /**
   * Executes the 4-Pillar Forensic Diagnostic Probe.
   */
  public async health() {
    return this.kernel.health();
  }
}
