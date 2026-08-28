/**
 * GALXAI: BroccoliMaterializedViewEngine (Zenith Tier)
 *
 * Continuous Incremental Materialized View Substrate for BroccoliDB.
 * Incrementally maintains pre-computed aggregate and filtered projections over CDC streams,
 * providing direct O(1) group lookup for local dashboards and analytics.
 */

import type {
  IBroccoliMaterializedViewEngine,
  MaterializedViewDefinition,
  MaterializedViewRow,
} from "./broccolidb.contracts";

interface InternalViewGroup {
  groupKey: string;
  sum: number;
  count: number;
  min: number;
  max: number;
  values: Map<number, number>;
  lastUpdatedAt: number;
}

export class BroccoliMaterializedViewEngine implements IBroccoliMaterializedViewEngine {
  private readonly definitions = new Map<string, MaterializedViewDefinition<any>>();
  // viewName -> (groupKey -> InternalViewGroup)
  private readonly viewStore = new Map<string, Map<string, InternalViewGroup>>();

  public createView<TRecord extends Record<string, any> = Record<string, any>>(
    def: MaterializedViewDefinition<TRecord>
  ): void {
    if (!def.viewName.trim() || !def.sourceTable.trim()) {
      throw new TypeError("viewName and sourceTable must be non-empty");
    }
    this.definitions.set(def.viewName, def);
    // Re-defining a view resets it; retaining rows computed under the previous
    // definition would silently mix incompatible aggregates.
    this.viewStore.set(def.viewName, new Map());
  }

  public dropView(viewName: string): boolean {
    const d1 = this.definitions.delete(viewName);
    const d2 = this.viewStore.delete(viewName);
    return d1 || d2;
  }

  public applyMutation<TRecord extends Record<string, any> = Record<string, any>>(
    sourceTable: string,
    operation: "INSERT" | "UPDATE" | "DELETE",
    before?: TRecord,
    after?: TRecord
  ): void {
    for (const [viewName, def] of this.definitions.entries()) {
      if (def.sourceTable !== sourceTable) continue;

      const groupMap = this.viewStore.get(viewName)!;

      // 1. Subtract 'before' record if applicable
      if (before && (operation === "DELETE" || operation === "UPDATE")) {
        const passesFilter = !def.filterPredicate || def.filterPredicate(before);
        if (passesFilter) {
          const rec = before as Record<string, unknown>;
          const groupKey = def.groupByField ? String(rec[def.groupByField] ?? "default") : "global";
          const aggVal = this.aggregateValue(def, rec);

          const group = groupMap.get(groupKey);
          if (group) {
            group.count--;
            group.sum -= aggVal;
            this.removeValue(group, aggVal);
            group.lastUpdatedAt = Date.now();
            if (group.count <= 0) {
              groupMap.delete(groupKey);
            } else {
              this.refreshExtrema(group);
            }
          }
        }
      }

      // 2. Add 'after' record if applicable
      if (after && (operation === "INSERT" || operation === "UPDATE")) {
        const passesFilter = !def.filterPredicate || def.filterPredicate(after);
        if (passesFilter) {
          const rec = after as Record<string, unknown>;
          const groupKey = def.groupByField ? String(rec[def.groupByField] ?? "default") : "global";
          const aggVal = this.aggregateValue(def, rec);

          let group = groupMap.get(groupKey);
          if (!group) {
            group = {
              groupKey,
              sum: 0,
              count: 0,
              min: Infinity,
              max: -Infinity,
              values: new Map(),
              lastUpdatedAt: Date.now(),
            };
            groupMap.set(groupKey, group);
          }

          group.count++;
          group.sum += aggVal;
          group.values.set(aggVal, (group.values.get(aggVal) ?? 0) + 1);
          if (aggVal < group.min) group.min = aggVal;
          if (aggVal > group.max) group.max = aggVal;
          group.lastUpdatedAt = Date.now();
        }
      }
    }
  }

  public getViewData(viewName: string): readonly MaterializedViewRow[] {
    const def = this.definitions.get(viewName);
    const groupMap = this.viewStore.get(viewName);
    if (!def || !groupMap) return [];

    return Array.from(groupMap.values(), (group) => this.toViewRow(def, group));
  }

  public getViewRow(viewName: string, groupKey: string): MaterializedViewRow | undefined {
    const def = this.definitions.get(viewName);
    const group = this.viewStore.get(viewName)?.get(groupKey);
    if (!def || !group) return undefined;
    return this.toViewRow(def, group);
  }

  public listViews(): readonly string[] {
    return Array.from(this.definitions.keys());
  }

  private aggregateValue(
    def: MaterializedViewDefinition<any>,
    record: Record<string, unknown>
  ): number {
    if ((def.aggregateFunc ?? "COUNT") === "COUNT") return 1;
    const value = Number(def.aggregateField ? record[def.aggregateField] : undefined);
    if (!Number.isFinite(value)) {
      throw new TypeError(`View '${def.viewName}' requires a finite numeric aggregate value`);
    }
    return value;
  }

  private removeValue(group: InternalViewGroup, value: number): void {
    const count = group.values.get(value) ?? 0;
    if (count <= 1) group.values.delete(value);
    else group.values.set(value, count - 1);
  }

  private refreshExtrema(group: InternalViewGroup): void {
    group.min = Infinity;
    group.max = -Infinity;
    for (const value of group.values.keys()) {
      if (value < group.min) group.min = value;
      if (value > group.max) group.max = value;
    }
  }

  private toViewRow(def: MaterializedViewDefinition<any>, group: InternalViewGroup): MaterializedViewRow {
    const func = def.aggregateFunc ?? "COUNT";
    const aggregateValue =
      func === "SUM"
        ? group.sum
        : func === "AVG"
          ? group.sum / group.count
          : func === "MIN"
            ? group.min
            : func === "MAX"
              ? group.max
              : group.count;
    return {
      groupKey: group.groupKey,
      aggregateValue,
      rowCount: group.count,
      lastUpdatedAt: group.lastUpdatedAt,
    };
  }
}
