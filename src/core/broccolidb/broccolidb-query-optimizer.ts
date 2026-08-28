/**
 * GALXAI: BroccoliQueryOptimizer (Zenith Tier)
 *
 * Deterministic heuristic query planner and index selector for BroccoliDB.
 * Chooses an execution shape from filter operators and available index names.
 */

import type {
  BroccoliQueryPlan,
  IBroccoliQueryOptimizer,
} from "./broccolidb.contracts";

export class BroccoliQueryOptimizer implements IBroccoliQueryOptimizer {
  public planQuery<T extends Record<string, unknown>>(
    tableName: string,
    filter: Partial<T> | Record<string, unknown>,
    indexNames: readonly string[] = []
  ): BroccoliQueryPlan {
    const filterKeys = Object.keys(filter);

    if (filterKeys.length === 0) {
      return {
        planType: "FULL_TABLE_SCAN",
        targetTable: tableName,
        estimatedCost: 100,
        explanation: "Unconstrained query; executing full table scan.",
      };
    }

    // 1. Primary key lookup
    if (filterKeys.includes("id") || filterKeys.includes("_id")) {
      return {
        planType: "PRIMARY_KEY_LOOKUP",
        targetTable: tableName,
        selectedIndex: "PRIMARY_KEY",
        estimatedCost: 1,
        explanation: "Constant-time O(1) hash map lookup on primary key.",
      };
    }

    // 2. Secondary index seek
    const matchingIndex = indexNames.find((idx) => filterKeys.includes(idx));
    if (matchingIndex) {
      const filterVal = filter[matchingIndex];
      const isRange = typeof filterVal === "object" && filterVal !== null &&
        ("$gt" in filterVal || "$gte" in filterVal || "$lt" in filterVal || "$lte" in filterVal);

      if (isRange) {
        const range = filterVal as Record<string, unknown>;
        return {
          planType: "RANGE_SCAN",
          targetTable: tableName,
          selectedIndex: matchingIndex,
          estimatedCost: 15,
          explanation: `B-Tree range scan on indexed column '${matchingIndex}'.`,
          scanRange: {
            min: range.$gt ?? range.$gte,
            max: range.$lt ?? range.$lte,
          },
        };
      }

      return {
        planType: "SECONDARY_INDEX_SEEK",
        targetTable: tableName,
        selectedIndex: matchingIndex,
        estimatedCost: 5,
        explanation: `Direct index seek on secondary index '${matchingIndex}'.`,
      };
    }

    // 3. Fallback Full Table Scan with Predicate Filter
    return {
      planType: "FULL_TABLE_SCAN",
      targetTable: tableName,
      estimatedCost: 50 + filterKeys.length * 10,
      explanation: `No matching index found for fields [${filterKeys.join(", ")}]; executing sequential table scan with predicates.`,
    };
  }
}
