/**
 * @file SingleFlightCoalescer.ts
 * @description Production Go-style SingleFlight coalescing with caller cancellation isolation
 * and Stripe-style idempotency result caching.
 */

import { AdmissionResult, ClientRequest } from './types';

interface InFlightFlight {
  key: string;
  promise: Promise<AdmissionResult>;
  callers: Set<{
    resolve: (res: AdmissionResult) => void;
    reject: (err: any) => void;
    signal?: AbortSignal;
  }>;
}

interface IdempotentCachedEntry {
  result: AdmissionResult;
  cachedAtMs: number;
}

export class SingleFlightCoalescer {
  private readonly inFlightFlights: Map<string, InFlightFlight> = new Map();
  private readonly idempotencyCache: Map<string, IdempotentCachedEntry> = new Map();
  private readonly idempotencyTtlMs: number;
  private coalescedCount = 0;
  private idempotentHitCount = 0;

  constructor(idempotencyTtlMs = 5000) {
    this.idempotencyTtlMs = idempotencyTtlMs;
  }

  /**
   * Execute or join an in-flight execution with caller-isolated cancellation and idempotency caching.
   */
  public async executeOrJoin(
    req: ClientRequest,
    factory: () => Promise<AdmissionResult>
  ): Promise<{ result: AdmissionResult; wasCoalesced: boolean; wasCachedIdempotent: boolean }> {
    const key = req.idempotencyKey || req.promptHash;
    const now = Date.now();

    // 1. Stripe-Style Idempotency Check: Was this exact key completed recently?
    const cached = this.idempotencyCache.get(key);
    if (cached && now - cached.cachedAtMs < this.idempotencyTtlMs) {
      this.idempotentHitCount++;
      return {
        result: {
          ...cached.result,
          status: 'idempotent_hit',
          wasCachedIdempotent: true
        },
        wasCoalesced: false,
        wasCachedIdempotent: true
      };
    }

    // 2. SingleFlight In-Flight Join Check
    const existingFlight = this.inFlightFlights.get(key);
    if (existingFlight) {
      this.coalescedCount++;

      return new Promise((resolve, reject) => {
        let isSettled = false;
        const callerRecord = {
          resolve: (res: AdmissionResult) => {
            if (isSettled) return;
            isSettled = true;
            resolve({
              result: { ...res, status: 'coalesced' },
              wasCoalesced: true,
              wasCachedIdempotent: false
            });
          },
          reject: (err: any) => {
            if (isSettled) return;
            isSettled = true;
            reject(err);
          },
          signal: req.signal
        };

        // Caller Cancellation Isolation:
        // If this specific caller aborts, remove only this caller without terminating the flight
        if (req.signal) {
          const abortHandler = () => {
            if (isSettled) return;
            isSettled = true;
            existingFlight.callers.delete(callerRecord);
            resolve({
              result: {
                status: 'cancelled',
                queueLatencyMs: Date.now() - req.enqueuedAtMs,
                error: 'Client caller aborted in-flight joined request'
              },
              wasCoalesced: true,
              wasCachedIdempotent: false
            });
          };

          if (req.signal.aborted) {
            abortHandler();
            return;
          }

          req.signal.addEventListener('abort', abortHandler, { once: true });
        }

        existingFlight.callers.add(callerRecord);
      });
    }

    // 3. New Flight: Create in-flight entry
    const callers = new Set<{
      resolve: (res: AdmissionResult) => void;
      reject: (err: any) => void;
      signal?: AbortSignal;
    }>();

    const flightPromise = factory()
      .then((res) => {
        // Cache result for idempotency TTL
        this.idempotencyCache.set(key, {
          result: res,
          cachedAtMs: Date.now()
        });

        // Fan-out to joined callers
        for (const caller of callers) {
          caller.resolve(res);
        }

        return res;
      })
      .catch((err) => {
        for (const caller of callers) {
          caller.reject(err);
        }
        throw err;
      })
      .finally(() => {
        this.inFlightFlights.delete(key);
      });

    this.inFlightFlights.set(key, {
      key,
      promise: flightPromise,
      callers
    });

    // Caller Cancellation Isolation for the primary initiator
    return new Promise<{ result: AdmissionResult; wasCoalesced: boolean; wasCachedIdempotent: boolean }>(
      (resolve, reject) => {
        let isSettled = false;

        if (req.signal) {
          const abortHandler = () => {
            if (isSettled) return;
            isSettled = true;
            resolve({
              result: {
                status: 'cancelled',
                queueLatencyMs: Date.now() - req.enqueuedAtMs,
                error: 'Client caller aborted in-flight primary request'
              },
              wasCoalesced: false,
              wasCachedIdempotent: false
            });
          };

          if (req.signal.aborted) {
            abortHandler();
            return;
          }

          req.signal.addEventListener('abort', abortHandler, { once: true });
        }

        flightPromise
          .then((result) => {
            if (isSettled) return;
            isSettled = true;
            resolve({ result, wasCoalesced: false, wasCachedIdempotent: false });
          })
          .catch((err) => {
            if (isSettled) return;
            isSettled = true;
            reject(err);
          });
      }
    );
  }

  public getCoalescedCount(): number {
    return this.coalescedCount;
  }

  public getIdempotentHitCount(): number {
    return this.idempotentHitCount;
  }

  public clearCache(): void {
    this.idempotencyCache.clear();
    this.inFlightFlights.clear();
  }
}
