/**
 * GALXAI Developer SDK: Auto-Paging & Cursor Pagination with BroccoliDB L1 Querying
 *
 * Implements the signature auto-pagination patterns popularized by Stripe and OpenAI,
 * supercharged with BroccoliDB reactive in-memory indexing, natural language querying (<0.1ms),
 * and single-pass statistical aggregation.
 */

import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../core/broccolidb/broccolidb-natural-query';
import type { DbQueryOptions, DbAggregateQuery, DbAggregateResult } from '../core/broccolidb/broccolidb.contracts';

export interface PageParams {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
  cursor?: string;
}

export interface PageResponseData<T> {
  data: T[];
  has_more?: boolean;
  hasMore?: boolean;
  next_cursor?: string | null;
  nextCursor?: string | null;
  object?: string;
  total?: number;
}

export type FetchPageFn<T = any> = (cursor?: string) => Promise<PageResponseData<T>>;

export class Page<T = any>
  implements AsyncIterable<T>, Iterable<T>, ArrayLike<T> {
  [index: number]: T;

  public readonly data: T[];
  public readonly hasMore: boolean;
  public readonly nextCursor?: string;
  public readonly total?: number;

  private readonly fetchNextPage?: FetchPageFn<T>;
  private _tableInstance?: BroccoliDbTable<any>;

  constructor(
    pageData: PageResponseData<T>,
    fetchNextPage?: FetchPageFn<T>
  ) {
    this.data = pageData.data || [];
    this.hasMore = Boolean(pageData.has_more ?? pageData.hasMore);
    this.nextCursor = pageData.next_cursor ?? pageData.nextCursor ?? undefined;
    this.total = pageData.total;
    this.fetchNextPage = fetchNextPage;

    // Allow array indexing on the page instance directly (e.g. page[0], page[1])
    for (let i = 0; i < this.data.length; i++) {
      (this as any)[i] = this.data[i];
    }
  }

  public get length(): number {
    return this.data.length;
  }

  /**
   * Synchronous iterator over items on the current page.
   */
  public [Symbol.iterator](): Iterator<T> {
    return this.data[Symbol.iterator]();
  }

  public find(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
    return this.data.find(predicate);
  }

  public map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[] {
    return this.data.map(callbackfn);
  }

  public filter(predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    return this.data.filter(predicate);
  }

  public forEach(callbackfn: (value: T, index: number, array: T[]) => void): void {
    this.data.forEach(callbackfn);
  }

  public slice(start?: number, end?: number): T[] {
    return this.data.slice(start, end);
  }

  public every(predicate: (value: T, index: number, array: T[]) => unknown): boolean {
    return this.data.every(predicate);
  }

  public some(predicate: (value: T, index: number, array: T[]) => unknown): boolean {
    return this.data.some(predicate);
  }

  /**
   * Lazily projects this page's dataset into a high-performance BroccoliDB L1 reactive table.
   */
  public toBroccoliTable(tableName = 'page_items'): BroccoliDbTable<any> {
    if (!this._tableInstance) {
      const table = new BroccoliDbTable(tableName);
      for (let i = 0; i < this.data.length; i++) {
        const item = this.data[i];
        if (item && typeof item === 'object') {
          const id = (item as any).id ? String((item as any).id) : `item_${i}`;
          table.put(id, item as Record<string, any>);
        } else {
          table.put(`item_${i}`, { id: `item_${i}`, value: item });
        }
      }
      this._tableInstance = table;
    }
    return this._tableInstance;
  }

  /**
   * Executes deterministic offline natural language queries over the items in this page (<0.1ms).
   *
   * @example
   * ```ts
   * const filtered = page.queryNatural('models with streaming support');
   * ```
   */
  public queryNatural(naturalQuery: string): Page<T> {
    const table = this.toBroccoliTable();
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, table.name);
    const results = table.query(parsed.queryOptions) as T[];
    return new Page<T>({
      data: results,
      has_more: false,
      total: results.length
    });
  }

  /**
   * Evaluates rich BroccoliDB operator filters ($gt, $between, $in, $regex) over the items in this page.
   */
  public filterDSL(options: DbQueryOptions): Page<T> {
    const table = this.toBroccoliTable();
    const results = table.query(options) as T[];
    return new Page<T>({
      data: results,
      has_more: false,
      total: results.length
    });
  }

  /**
   * Runs single-pass statistical aggregations ($sum, $avg, $min, $max, $count) over the items in this page.
   *
   * @example
   * ```ts
   * const stats = page.aggregate({
   *   metrics: {
   *     price_avg: { metric: 'avg', field: 'costPer1kInputTokens' }
   *   }
   * });
   * ```
   */
  public aggregate(query: DbAggregateQuery): DbAggregateResult {
    const table = this.toBroccoliTable();
    return table.aggregate(query);
  }

  /**
   * Subscribes to real-time Change-Data-Capture (CDC) events on this page's underlying BroccoliDB table.
   * Returns an unsubscribe function.
   */
  public subscribe(callback: (event: any) => void): () => void {
    const table = this.toBroccoliTable();
    const sub = table.subscribe(callback);
    return () => sub.unsubscribe();
  }

  /**
   * Returns true if there are additional pages available to fetch.
   */
  public hasNextPage(): boolean {
    return this.hasMore && Boolean(this.fetchNextPage) && Boolean(this.nextCursor);
  }

  /**
   * Fetches the next page of results. Returns null if on the final page.
   */
  public async getNextPage(): Promise<Page<T> | null> {
    if (!this.hasNextPage() || !this.fetchNextPage) {
      return null;
    }

    const nextData = await this.fetchNextPage(this.nextCursor);
    return new Page<T>(nextData, this.fetchNextPage);
  }

  /**
   * Automatically iterates through every item across all subsequent pages.
   */
  public async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for (const item of this.data) {
      yield item;
    }

    let currentPage: Page<T> = this;
    while (currentPage.hasNextPage()) {
      const nextPage = await currentPage.getNextPage();
      if (!nextPage) break;
      for (const item of nextPage.data) {
        yield item;
      }
      currentPage = nextPage;
    }
  }

  /**
   * Stripe-style helper: iterates through items one by one across all pages.
   * Returning false from the callback stops further pagination.
   */
  public async autoPagingEach(
    callback: (item: T) => boolean | void | Promise<boolean | void>
  ): Promise<void> {
    for await (const item of this) {
      const result = await callback(item);
      if (result === false) {
        break;
      }
    }
  }

  /**
   * Stripe-style helper: accumulates all items across all pages into a single flat array.
   */
  public async autoPagingToArray(options: { limit?: number } = {}): Promise<T[]> {
    const results: T[] = [];
    const limit = options.limit ?? Infinity;

    for await (const item of this) {
      results.push(item);
      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }
}

export class CursorPage<T = any> extends Page<T> {}

/**
 * Cursor-based paginator helper for building paged API methods.
 */
export async function createCursorPage<T = any>(
  fetchPage: FetchPageFn<T>,
  initialCursor?: string
): Promise<Page<T>> {
  const initialData = await fetchPage(initialCursor);
  return new Page<T>(initialData, fetchPage);
}
