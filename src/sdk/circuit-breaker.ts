/**
 * GALXAI Developer SDK: Adaptive Circuit Breaker & Route-Isolated Failover
 * Backed by BroccoliDB L1 Reactive Tables for tracking request failure rates over rolling windows.
 * Prevents cascading failures, socket pool exhaustion, and stampedes when upstreams degrade.
 * Supports per-route failure domain isolation (e.g., image generation outage won't trip chat completions)
 * and canary probing in HALF_OPEN recovery state.
 * Pattern inspired by Netflix Hystrix, AWS SDK, and Stripe resilient network architecture.
 */

import { GalxError } from './errors';
import type { GalxPlugin, MiddlewareRequestContext, MiddlewareResponseContext, MiddlewareErrorContext } from './middleware';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerOpenError extends GalxError {
  public readonly resetInMs: number;
  public readonly route?: string;

  constructor(message: string, resetInMs: number, route?: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.resetInMs = resetInMs;
    this.route = route;
  }
}

export interface CircuitAttemptRecord {
  id: string;
  route: string;
  timestampMs: number;
  success: boolean;
  statusCode?: number;
  durationMs: number;
  errorMessage?: string;
}

export interface CircuitBreakerConfig {
  /** Percentage of failed requests within sliding window required to trip circuit (0-100). Default: 50% */
  failureThresholdPercentage?: number;
  /** Minimum number of attempts within sliding window before evaluating trip condition. Default: 5 */
  minAttempts?: number;
  /** Duration in milliseconds that circuit remains OPEN before probing upstream in HALF_OPEN. Default: 10,000ms */
  resetTimeoutMs?: number;
  /** Maximum number of recent attempts retained in the sliding window. Default: 20 */
  slidingWindowSize?: number;
  /** Enable per-route failure isolation instead of global circuit breaker. Default: true */
  isolateRoutes?: boolean;
  /** Custom callback when circuit state changes */
  onStateChange?: (from: CircuitState, to: CircuitState, route: string) => void;
}

interface RouteCircuitInfo {
  state: CircuitState;
  openedAt: number;
  canaryInFlight: boolean;
}

export class CircuitBreaker {
  private readonly attemptsTable: BroccoliDbTable<CircuitAttemptRecord>;
  private readonly attemptIds: string[] = [];
  private readonly routeCircuits = new Map<string, RouteCircuitInfo>();
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThresholdPercentage: config.failureThresholdPercentage ?? 50,
      minAttempts: config.minAttempts ?? 5,
      resetTimeoutMs: config.resetTimeoutMs ?? 10_000,
      slidingWindowSize: config.slidingWindowSize ?? 20,
      isolateRoutes: config.isolateRoutes ?? true,
      onStateChange: config.onStateChange ?? (() => {})
    };

    this.attemptsTable = new BroccoliDbTable<CircuitAttemptRecord>('circuit_breaker_attempts');
    this.attemptsTable.createIndex('route');
    this.attemptsTable.createIndex('success');
    this.attemptsTable.createSortedIndex('timestampMs');
  }

  private normalizeRoute(route?: string): string {
    if (!this.config.isolateRoutes || !route) return 'global';
    const clean = route.split('?')[0];
    if (clean.includes('/chat/completions')) return '/chat/completions';
    if (clean.includes('/embeddings')) return '/embeddings';
    if (clean.includes('/images')) return '/images';
    if (clean.includes('/moderations')) return '/moderations';
    if (clean.includes('/batches')) return '/batches';
    return clean;
  }

  private getOrCreateCircuit(routeKey: string): RouteCircuitInfo {
    let circuit = this.routeCircuits.get(routeKey);
    if (!circuit) {
      circuit = { state: 'CLOSED', openedAt: 0, canaryInFlight: false };
      this.routeCircuits.set(routeKey, circuit);
    }
    return circuit;
  }

  /**
   * Returns current state for a given route, or global circuit state.
   */
  public getState(route?: string): CircuitState {
    const routeKey = this.normalizeRoute(route);
    const circuit = this.getOrCreateCircuit(routeKey);

    if (circuit.state === 'OPEN') {
      const elapsed = Date.now() - circuit.openedAt;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.transitionTo(routeKey, 'HALF_OPEN');
      }
    }
    return circuit.state;
  }

  /**
   * Evaluates circuit before sending a request. Throws CircuitBreakerOpenError if OPEN or if canary in-flight.
   */
  public checkBeforeRequest(route?: string): void {
    const routeKey = this.normalizeRoute(route);
    const currentState = this.getState(routeKey);
    const circuit = this.getOrCreateCircuit(routeKey);

    if (currentState === 'OPEN') {
      const remainingMs = Math.max(0, this.config.resetTimeoutMs - (Date.now() - circuit.openedAt));
      throw new CircuitBreakerOpenError(
        `GALXAI Circuit Breaker is OPEN for route [${routeKey}]. Fail-fast active; resets in ${remainingMs}ms.`,
        remainingMs,
        routeKey
      );
    }

    if (currentState === 'HALF_OPEN') {
      if (circuit.canaryInFlight) {
        // Another concurrent request is already acting as canary probe
        throw new CircuitBreakerOpenError(
          `GALXAI Circuit Breaker is probing upstream health [${routeKey}] via canary request. Concurrent requests paused.`,
          500,
          routeKey
        );
      }
      // Designate this request as the canary probe
      circuit.canaryInFlight = true;
    }
  }

  /**
   * Records an attempt and updates the state machine accordingly.
   */
  public recordAttempt(
    success: boolean,
    routeOrDuration?: string | number,
    durationOrStatus?: number,
    statusCode?: number,
    errorMessage?: string
  ): void {
    let route = 'global';
    let durationMs = 0;

    if (typeof routeOrDuration === 'string') {
      route = routeOrDuration;
      durationMs = durationOrStatus ?? 0;
    } else if (typeof routeOrDuration === 'number') {
      durationMs = routeOrDuration;
      if (typeof durationOrStatus === 'number') {
        statusCode = durationOrStatus;
      }
    }

    const routeKey = this.normalizeRoute(route);
    const circuit = this.getOrCreateCircuit(routeKey);
    const now = Date.now();
    const id = `att_${now}_${Math.random().toString(36).slice(2, 6)}`;

    this.attemptsTable.put(id, {
      id,
      route: routeKey,
      timestampMs: now,
      success,
      durationMs,
      statusCode,
      errorMessage
    });
    this.attemptIds.push(id);

    // Evict beyond sliding window size
    if (this.attemptIds.length > this.config.slidingWindowSize) {
      const oldestId = this.attemptIds.shift();
      if (oldestId) {
        this.attemptsTable.delete(oldestId);
      }
    }

    const currentState = this.getState(routeKey);

    if (currentState === 'HALF_OPEN') {
      circuit.canaryInFlight = false;
      if (success) {
        // Canary succeeded: heal circuit to CLOSED
        this.transitionTo(routeKey, 'CLOSED');
      } else {
        // Canary failed: trip back to OPEN
        this.transitionTo(routeKey, 'OPEN');
      }
      return;
    }

    if (currentState === 'CLOSED') {
      const attempts = (this.attemptsTable.query({
        where: { route: routeKey }
      }) as CircuitAttemptRecord[]) || [];

      if (attempts.length >= this.config.minAttempts) {
        const failureCount = attempts.filter(a => !a.success).length;
        const failurePct = (failureCount / attempts.length) * 100;

        if (failurePct >= this.config.failureThresholdPercentage) {
          this.transitionTo(routeKey, 'OPEN');
        }
      }
    }
  }

  private transitionTo(routeKey: string, newState: CircuitState): void {
    const circuit = this.getOrCreateCircuit(routeKey);
    if (circuit.state === newState) return;
    const oldState = circuit.state;
    circuit.state = newState;

    if (newState === 'OPEN') {
      circuit.openedAt = Date.now();
      circuit.canaryInFlight = false;
    } else if (newState === 'CLOSED') {
      circuit.canaryInFlight = false;
      // Clear recent failures for this route
      const attempts = this.attemptsTable.query({ where: { route: routeKey } }) as CircuitAttemptRecord[];
      for (const a of attempts) {
        this.attemptsTable.delete(a.id);
      }
    }

    this.config.onStateChange(oldState, newState, routeKey);
  }

  /**
   * Manually resets circuit breaker to CLOSED state for a route or all routes.
   */
  public reset(route?: string): void {
    if (route) {
      const routeKey = this.normalizeRoute(route);
      this.transitionTo(routeKey, 'CLOSED');
    } else {
      for (const key of this.routeCircuits.keys()) {
        this.transitionTo(key, 'CLOSED');
      }
    }
  }

  /**
   * Converts the circuit breaker into a client middleware plugin.
   */
  public toPlugin(): GalxPlugin {
    const self = this;
    return {
      name: 'CircuitBreakerPlugin',

      onRequest: (ctx: MiddlewareRequestContext) => {
        self.checkBeforeRequest(ctx.path);
      },

      onResponse: (ctx: MiddlewareResponseContext) => {
        const isSuccess = ctx.statusCode >= 200 && ctx.statusCode < 400;
        self.recordAttempt(isSuccess, ctx.path, ctx.durationMs, ctx.statusCode);
      },

      onError: (ctx: MiddlewareErrorContext) => {
        if (ctx.error.name !== 'CircuitBreakerOpenError' && ctx.error.name !== 'UserAbortError') {
          self.recordAttempt(false, ctx.path, ctx.durationMs, undefined, ctx.error.message);
        }
      }
    };
  }
}

export function createCircuitBreakerPlugin(config: CircuitBreakerConfig = {}): GalxPlugin {
  const breaker = new CircuitBreaker(config);
  return breaker.toPlugin();
}
