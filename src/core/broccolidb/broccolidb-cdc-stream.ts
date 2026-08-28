/**
 * GALXAI: BroccoliCdcStream (Zenith Tier)
 *
 * Change Data Capture (CDC) Stream Engine for BroccoliDB.
 * Captures transactional data mutations with Log Sequence Numbers (LSN) and powers reactive zero-polling subscriptions.
 */

import type {
  BroccoliCdcCallback,
  BroccoliCdcEvent,
  BroccoliCdcFilter,
  BroccoliCdcOp,
  BroccoliCdcSubscription,
  IBroccoliCdcStream,
} from "./broccolidb.contracts";
import { randomUUID } from "node:crypto";

export class CdcHistoryGapError extends Error {
  constructor(requestedLsn: number, earliestAvailableLsn: number) {
    super(`CDC history before LSN ${earliestAvailableLsn} is no longer retained (requested ${requestedLsn})`);
    this.name = "CdcHistoryGapError";
  }
}

export class BroccoliCdcStream implements IBroccoliCdcStream {
  private currentLsn = 0;
  private readonly events: BroccoliCdcEvent<Record<string, unknown>>[] = [];
  private readonly maxEventHistory: number;
  private readonly subscribers = new Map<string, {
    filter: BroccoliCdcFilter;
    callback: BroccoliCdcCallback;
  }>();

  constructor(maxEventHistory = 10000) {
    if (!Number.isSafeInteger(maxEventHistory) || maxEventHistory <= 0) {
      throw new RangeError("maxEventHistory must be a positive integer");
    }
    this.maxEventHistory = maxEventHistory;
  }

  public emitEvent<T extends Record<string, unknown>>(
    table: string,
    op: BroccoliCdcOp,
    recordId: string,
    before?: T,
    after?: T,
    txId?: number
  ): BroccoliCdcEvent<T> {
    if (!table.trim() || !recordId.trim()) throw new TypeError("table and recordId must be non-empty");
    const lsn = ++this.currentLsn;
    const event: BroccoliCdcEvent<T> = {
      lsn,
      timestamp: Date.now(),
      table,
      op,
      recordId,
      before: before ? { ...before } : undefined,
      after: after ? { ...after } : undefined,
      txId,
    };

    this.events.push(event as BroccoliCdcEvent<Record<string, unknown>>);
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }

    // Dispatch to subscribers
    for (const sub of this.subscribers.values()) {
      if (this.matchesFilter(event, sub.filter)) {
        try {
          sub.callback(this.cloneEvent(event));
        } catch {
          // Prevent consumer error from failing event stream
        }
      }
    }

    return this.cloneEvent(event) as BroccoliCdcEvent<T>;
  }

  public subscribe(filter: BroccoliCdcFilter, callback: BroccoliCdcCallback): BroccoliCdcSubscription {
    const subscriptionId = `sub_cdc_${randomUUID()}`;
    this.subscribers.set(subscriptionId, { filter, callback });

    try {
      if (filter.fromLsn !== undefined) {
        const historical = this.getEvents(filter.fromLsn, this.maxEventHistory);
        for (const ev of historical) {
          if (this.matchesFilter(ev, filter)) callback(ev);
        }
      }
    } catch (error) {
      this.subscribers.delete(subscriptionId);
      throw error;
    }

    return {
      subscriptionId,
      unsubscribe: () => {
        this.subscribers.delete(subscriptionId);
      },
    };
  }

  public getEvents(fromLsn = 1, limit = 100): readonly BroccoliCdcEvent[] {
    if (!Number.isSafeInteger(fromLsn) || fromLsn < 1) throw new RangeError("fromLsn must be a positive integer");
    if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError("limit must be a non-negative integer");
    const earliest = this.events[0]?.lsn;
    if (earliest !== undefined && fromLsn < earliest) throw new CdcHistoryGapError(fromLsn, earliest);
    return this.events
      .filter((e) => e.lsn >= fromLsn)
      .slice(0, limit)
      .map((event) => this.cloneEvent(event));
  }

  public getLatestLsn(): number {
    return this.currentLsn;
  }

  private matchesFilter(event: BroccoliCdcEvent, filter: BroccoliCdcFilter): boolean {
    if (filter.tables && filter.tables.length > 0 && !filter.tables.includes(event.table)) {
      return false;
    }

    if (filter.ops && filter.ops.length > 0 && !filter.ops.includes(event.op)) {
      return false;
    }

    return true;
  }

  private cloneEvent<T extends Record<string, unknown>>(event: BroccoliCdcEvent<T>): BroccoliCdcEvent<T> {
    return {
      ...event,
      before: event.before ? { ...event.before } : undefined,
      after: event.after ? { ...event.after } : undefined,
    };
  }
}
