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
   * Executes the 4-Pillar Forensic Diagnostic Probe.
   */
  public async health() {
    return this.kernel.health();
  }
}
