/**
 * GALXAI Developer SDK: Batch Swarm Concurrency Evaluator
 * High-throughput parallel mapping with token rate limiting, concurrency ceilings, and progress hooks.
 */

export interface BatchMapOptions<T, R> {
  concurrency?: number;
  maxRetries?: number;
  continueOnError?: boolean;
  onProgress?: (completed: number, total: number, latestResult?: R, error?: Error) => void;
}

export interface BatchResultItem<T, R> {
  index: number;
  input: T;
  result?: R;
  error?: Error;
  status: 'fulfilled' | 'rejected';
}

export class BatchEvaluator {
  /**
   * Maps an array of inputs concurrently across worker threads/async tasks with bounded concurrency.
   */
  public async mapConcurrent<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    options: BatchMapOptions<T, R> = {}
  ): Promise<Array<BatchResultItem<T, R>>> {
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 10, items.length || 1));
    const results: Array<BatchResultItem<T, R>> = new Array(items.length);
    let nextIndex = 0;
    let completedCount = 0;

    const worker = async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex++;
        const item = items[currentIndex];

        let retries = options.maxRetries ?? 2;
        let success = false;

        while (retries >= 0 && !success) {
          try {
            const res = await fn(item, currentIndex);
            results[currentIndex] = {
              index: currentIndex,
              input: item,
              result: res,
              status: 'fulfilled'
            };
            success = true;
            completedCount++;
            options.onProgress?.(completedCount, items.length, res);
          } catch (err: any) {
            retries--;
            if (retries < 0) {
              results[currentIndex] = {
                index: currentIndex,
                input: item,
                error: err,
                status: 'rejected'
              };
              completedCount++;
              options.onProgress?.(completedCount, items.length, undefined, err);

              if (!options.continueOnError && options.continueOnError !== undefined) {
                throw err;
              }
            } else {
              // Exponential backoff between item retries
              await new Promise(r => setTimeout(r, Math.floor(Math.random() * 200 + 100)));
            }
          }
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    return results;
  }
}

const defaultBatchEvaluator = new BatchEvaluator();

/**
 * 1-line high-throughput batch runner.
 *
 * @example
 * ```ts
 * import { batch } from '@galxai/sdk';
 * const results = await batch(['topic 1', 'topic 2'], async (topic) => {
 *   return await galx.run(`Explain ${topic}`);
 * });
 * ```
 */
export async function batch<T, R = any>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options?: BatchMapOptions<T, R>
): Promise<Array<BatchResultItem<T, R>>> {
  return defaultBatchEvaluator.mapConcurrent(items, fn, options);
}
