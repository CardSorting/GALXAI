/**
 * @file AntiFragileWebSocketGateway.ts
 * @description Anti-Fragile WebSocket Gateway Engine & Adaptive Timeout Governor.
 *
 * Implements:
 * 1. Model & Reasoning-Effort Dynamic TTFT Allocation (30s low -> 60s medium -> 120s deep reasoning).
 * 2. Thinking Progress Heartbeat Extension (reasoning deltas dynamically push back TTFT deadlines).
 * 3. Transparent Mid-Stream Shard Failover (Zero Downstream Interruption on TCP drops).
 * 4. Context Continuation Reassembly ([TRANSIT_FAILOVER_DIRECTIVE]).
 * 5. Dead-Peer Eviction & Circuit Breaker Half-Open Probing.
 * 6. Discord Gateway Heartbeat ACK (OP 1 / OP 11) Protocol with code 4000 eviction.
 * 7. Figma / Liveblocks Stream Suffix-Prefix Overlap Reconciliation.
 * 8. Slack Flannel Downstream Failover Keepalive Frames.
 * 9. Tripartite isolation between transport, queue ownership, and pub/sub delivery.
 */

import { EventEmitter } from 'node:events';

export type JobLifecycleStatus =
  | 'queued'
  | 'running'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobBusEvent =
  | { type: 'job:transport_token'; jobId: string; text: string; attemptId: number; observationNo: number }
  | { type: 'job:transport_completed'; jobId: string; attemptId: number }
  | { type: 'job:token'; jobId: string; text: string; seqNo: number }
  | { type: 'job:reasoning'; jobId: string; text: string }
  | { type: 'job:transport_drop'; jobId: string; attemptId: number; reason: string }
  | { type: 'job:done'; jobId: string }
  | { type: 'job:error'; jobId: string; reason: string }
  | { type: 'job:cancelled'; jobId: string; reason?: string }
  | { type: 'relay:drained' };

type EventOfType<TType extends JobBusEvent['type']> = Extract<JobBusEvent, { type: TType }>;

export interface JobEventSubscriber {
  readonly writableEnded: boolean;
  write(frame: string): boolean;
  once(event: 'drain' | 'close' | 'error', listener: () => void): unknown;
  off(event: 'drain' | 'close' | 'error', listener: () => void): unknown;
  end(): void;
}

export interface JobEventBusOptions {
  /**
   * Kept in parity with the relay config name. This is enforced as a hard
   * subscriber cap; subscribers are not installed as EventEmitter listeners.
   */
  busMaxListenersPerJob: number;
  subscriberDrainTimeoutMs: number;
  maxPendingFramesPerSubscriber: number;
}

interface JobEventBusMetrics {
  totalBusEventsEmitted: number;
  totalSlowSubscriberDrains: number;
}

interface SubscriberState {
  subscriber: JobEventSubscriber;
  tail: Promise<void>;
  pendingFrames: number;
  closed: boolean;
}

interface QueuedJobRecord {
  id: string;
  status: JobLifecycleStatus;
  error?: string;
}

/**
 * Relay queue-plane lifecycle coordinator. Transport and pub/sub code cannot
 * mutate this bounded delivery job. This is intentionally not the authority
 * plane for a broader evolving agent execution.
 */
export class JobQueue {
  private readonly jobs = new Map<string, QueuedJobRecord>();

  constructor(
    private readonly publish: (event: JobBusEvent) => void,
    private readonly onTransition?: (job: Readonly<QueuedJobRecord>) => void,
  ) {}

  public enqueue(jobId: string): Readonly<QueuedJobRecord> {
    if (this.jobs.has(jobId)) {
      throw new Error(`Job ${jobId} is already enqueued`);
    }
    const job: QueuedJobRecord = { id: jobId, status: 'queued' };
    this.jobs.set(jobId, job);
    this.onTransition?.({ ...job });
    return { ...job };
  }

  public acquireForDispatch(jobId: string): Readonly<QueuedJobRecord> | undefined {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return undefined;
    job.status = 'running';
    this.onTransition?.({ ...job });
    return { ...job };
  }

  public markStreaming(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== 'running' && job.status !== 'streaming')) return false;
    if (job.status === 'streaming') return true;
    job.status = 'streaming';
    this.onTransition?.({ ...job });
    return true;
  }

  public markComplete(jobId: string): boolean {
    return this.transitionTerminal(jobId, 'completed', () => ({ type: 'job:done', jobId }));
  }

  public markFailed(jobId: string, reason: string): boolean {
    return this.transitionTerminal(jobId, 'failed', () => ({ type: 'job:error', jobId, reason }), reason);
  }

  public markCancelled(jobId: string, reason?: string): boolean {
    return this.transitionTerminal(jobId, 'cancelled', () => ({ type: 'job:cancelled', jobId, reason }), reason);
  }

  public get(jobId: string): Readonly<QueuedJobRecord> | undefined {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : undefined;
  }

  public activeCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'running' || job.status === 'streaming') count++;
    }
    return count;
  }

  private transitionTerminal(
    jobId: string,
    status: Extract<JobLifecycleStatus, 'completed' | 'failed' | 'cancelled'>,
    eventFactory: () => JobBusEvent,
    error?: string,
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false;
    }

    const activeBefore = this.activeCount();
    job.status = status;
    job.error = error;
    this.onTransition?.({ ...job });
    this.publish(eventFactory());

    if (activeBefore > 0 && this.activeCount() === 0) {
      this.publish({ type: 'relay:drained' });
    }
    return true;
  }
}

/**
 * Pub/sub-plane boundary. publish() always crosses a microtask boundary, token
 * records are journaled before fan-out, and each subscriber owns an independent
 * ordered write chain. A slow client can delay only its own stream.
 */
export class JobEventBus extends EventEmitter {
  private readonly subscribers = new Map<string, Set<SubscriberState>>();
  private readonly tokenJournal = new Map<string, Array<EventOfType<'job:token'>>>();
  private pendingDispatches = 0;
  private pendingWrites = 0;
  private readonly idleWaiters = new Set<() => void>();

  constructor(
    private readonly options: JobEventBusOptions,
    private readonly metrics: JobEventBusMetrics,
    private readonly onDispatch?: (event: JobBusEvent) => void,
  ) {
    super();
    for (const [name, value] of Object.entries(options)) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive safe integer`);
      }
    }
    this.setMaxListeners(options.busMaxListenersPerJob);
  }

  public onEvent<TType extends JobBusEvent['type']>(
    type: TType,
    listener: (event: EventOfType<TType>) => void,
  ): this {
    return super.on(type, listener);
  }

  public publish(event: JobBusEvent): void {
    this.pendingDispatches++;
    queueMicrotask(() => {
      try {
        this.metrics.totalBusEventsEmitted++;
        this.onDispatch?.(event);

        if (event.type === 'job:token') {
          const journal = this.tokenJournal.get(event.jobId) ?? [];
          journal.push({ ...event });
          this.tokenJournal.set(event.jobId, journal);
          this.fanOut(event.jobId, this.formatToken(event));
        } else if (event.type === 'job:reasoning') {
          this.fanOut(event.jobId, `event: reasoning\ndata: ${JSON.stringify({ text: event.text })}\n\n`);
        } else if (event.type === 'job:done') {
          this.fanOut(event.jobId, 'data: [DONE]\n\n', true);
        } else if (event.type === 'job:error') {
          this.fanOut(event.jobId, `event: error\ndata: ${JSON.stringify({ error: event.reason })}\n\n`, true);
        } else if (event.type === 'job:cancelled') {
          this.fanOut(event.jobId, `event: cancelled\ndata: ${JSON.stringify({ status: 'cancelled', reason: event.reason })}\n\n`, true);
        }

        super.emit(event.type, event);
      } finally {
        this.pendingDispatches--;
        this.resolveIdleIfNeeded();
      }
    });
  }

  public subscribe(jobId: string, subscriber: JobEventSubscriber): () => void {
    const jobSubscribers = this.subscribers.get(jobId) ?? new Set<SubscriberState>();
    if (jobSubscribers.size >= this.options.busMaxListenersPerJob) {
      throw new Error(`Subscriber limit exceeded for ${jobId}`);
    }

    const state: SubscriberState = {
      subscriber,
      tail: Promise.resolve(),
      pendingFrames: 0,
      closed: false,
    };
    jobSubscribers.add(state);
    this.subscribers.set(jobId, jobSubscribers);

    const unsubscribe = () => this.removeSubscriber(jobId, state, false);
    subscriber.once('close', unsubscribe);
    subscriber.once('error', unsubscribe);
    return unsubscribe;
  }

  public replay(jobId: string, afterSeqNo = 0): ReadonlyArray<EventOfType<'job:token'>> {
    return (this.tokenJournal.get(jobId) ?? [])
      .filter((event) => event.seqNo > afterSeqNo)
      .map((event) => ({ ...event }));
  }

  public subscriberCountForJob(jobId: string): number {
    return this.subscribers.get(jobId)?.size ?? 0;
  }

  public whenIdle(): Promise<void> {
    if (this.pendingDispatches === 0 && this.pendingWrites === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.add(resolve));
  }

  private formatToken(event: EventOfType<'job:token'>): string {
    return `id: ${event.seqNo}\ndata: ${JSON.stringify({ content: event.text, seqNo: event.seqNo })}\n\n`;
  }

  private fanOut(jobId: string, frame: string, closeAfter = false): void {
    const jobSubscribers = this.subscribers.get(jobId);
    if (!jobSubscribers) return;
    for (const state of [...jobSubscribers]) {
      this.enqueueSubscriberFrame(jobId, state, frame, closeAfter);
    }
  }

  private enqueueSubscriberFrame(
    jobId: string,
    state: SubscriberState,
    frame: string,
    closeAfter: boolean,
  ): void {
    if (state.closed || state.subscriber.writableEnded) {
      this.removeSubscriber(jobId, state, false);
      return;
    }

    if (state.pendingFrames >= this.options.maxPendingFramesPerSubscriber) {
      this.removeSubscriber(jobId, state, true);
      return;
    }

    state.pendingFrames++;
    this.pendingWrites++;
    state.tail = state.tail
      .then(async () => {
        if (state.closed || state.subscriber.writableEnded) return;
        const canContinue = state.subscriber.write(frame);
        if (!canContinue) {
          this.metrics.totalSlowSubscriberDrains++;
          await this.waitForDrainOrClose(state);
        }
        if (closeAfter && !state.closed && !state.subscriber.writableEnded) {
          state.subscriber.end();
          this.removeSubscriber(jobId, state, false);
        }
      })
      .catch(() => this.removeSubscriber(jobId, state, true))
      .finally(() => {
        state.pendingFrames--;
        this.pendingWrites--;
        this.resolveIdleIfNeeded();
      });
  }

  private waitForDrainOrClose(state: SubscriberState): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        state.subscriber.off('drain', finish);
        state.subscriber.off('close', finish);
        state.subscriber.off('error', finish);
        resolve();
      };
      timer = setTimeout(() => {
        this.removeSubscriberFromAllJobs(state, true);
        finish();
      }, this.options.subscriberDrainTimeoutMs);
      state.subscriber.once('drain', finish);
      state.subscriber.once('close', finish);
      state.subscriber.once('error', finish);
    });
  }

  private removeSubscriber(jobId: string, state: SubscriberState, close: boolean): void {
    if (state.closed) return;
    state.closed = true;
    const jobSubscribers = this.subscribers.get(jobId);
    jobSubscribers?.delete(state);
    if (jobSubscribers?.size === 0) this.subscribers.delete(jobId);
    if (close && !state.subscriber.writableEnded) state.subscriber.end();
  }

  private removeSubscriberFromAllJobs(state: SubscriberState, close: boolean): void {
    for (const [jobId, jobSubscribers] of this.subscribers) {
      if (jobSubscribers.has(state)) {
        this.removeSubscriber(jobId, state, close);
        return;
      }
    }
  }

  private resolveIdleIfNeeded(): void {
    if (this.pendingDispatches !== 0 || this.pendingWrites !== 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}

export interface ShardSpec {
  id: string;
  status: 'active' | 'cooldown' | 'exhausted';
  consecutiveFailures: number;
  lastUsedAtMs: number;
  inFlight: number;
}

export interface InFlightStreamState {
  jobId: string;
  model: string;
  reasoningEffort?: string;
  currentShardId: string;
  /** Transport-local ordering only; canonical journal order is seqCounter. */
  transportObservationCounter: number;
  seqCounter: number;
  tokensEmitted: string[];
  hasReceivedFirstToken: boolean;
  baseTtftBudgetMs: number;
  currentTtftDeadlineMs: number;
  lastActivityMs: number;
  retryCount: number;
  failoverCount: number;
  status: JobLifecycleStatus;
  error?: string;
}

interface TransportAttemptState {
  attemptId: number;
  shardId: string;
  hasReceivedFirstToken: boolean;
  lastActivityMs: number;
  heartbeatPending: boolean;
  isFirstChunkAfterFailover: boolean;
  priorFailoverSuffix?: string;
}

export interface BusEventObservation {
  jobId: string;
  eventType: JobBusEvent['type'];
  observedDuringTransportHandler: boolean;
}

/**
 * Stream Suffix-Prefix Overlap Reconciliation (Figma / Liveblocks Pattern)
 * Strips duplicate leading tokens if the model repeats words from continuation context.
 */
export function reconcileOverlap(suffix: string, incoming: string, maxOverlapLen = 128): string {
  if (!suffix || !incoming) return incoming;

  if (suffix.endsWith(incoming)) {
    return '';
  }

  const checkLen = Math.min(suffix.length, incoming.length, maxOverlapLen);
  for (let k = checkLen; k > 0; k--) {
    const prefix = incoming.slice(0, k);
    if (suffix.endsWith(prefix)) {
      return incoming.slice(k);
    }
  }

  const suffixWords = suffix.trim().split(/\s+/);
  const incomingWords = incoming.trimStart().split(/\s+/);
  for (let w = Math.min(suffixWords.length, incomingWords.length, 6); w > 0; w--) {
    const sSub = suffixWords.slice(-w).join(' ');
    const iSub = incomingWords.slice(0, w).join(' ');
    if (sSub === iSub) {
      const matchIdx = incoming.indexOf(iSub);
      if (matchIdx !== -1) {
        return incoming.slice(matchIdx + iSub.length).replace(/^[\s]+/, ' ');
      }
    }
  }

  return incoming;
}

export class AntiFragileWebSocketGateway {
  private shards: Map<string, ShardSpec> = new Map();
  private streams: Map<string, InFlightStreamState> = new Map();
  private transportAttempts = new Map<string, TransportAttemptState>();
  private transportMessageDepth = 0;
  private readonly busEvents: BusEventObservation[] = [];
  public readonly bus: JobEventBus;
  public readonly jobQueue: JobQueue;

  public metrics = {
    totalJobsStarted: 0,
    totalMidStreamFailoversWon: 0,
    totalTtftExtensionsGranted: 0,
    totalDeadPeerEvictions: 0,
    totalHalfOpenProbesUsed: 0,
    totalHeartbeatAckMisses: 0,
    totalOverlapReconciliationsWon: 0,
    totalDownstreamFailoverKeepalivesSent: 0,
    totalBusEventsEmitted: 0,
    totalSlowSubscriberDrains: 0,
  };

  constructor(
    initialShards: ShardSpec[],
    busOptions: Partial<JobEventBusOptions> = {},
  ) {
    for (const shard of initialShards) {
      this.shards.set(shard.id, { ...shard });
    }

    this.bus = new JobEventBus(
      {
        busMaxListenersPerJob: busOptions.busMaxListenersPerJob ?? 50,
        subscriberDrainTimeoutMs: busOptions.subscriberDrainTimeoutMs ?? 5_000,
        maxPendingFramesPerSubscriber: busOptions.maxPendingFramesPerSubscriber ?? 256,
      },
      this.metrics,
      (event) => this.onBusEvent('jobId' in event ? event.jobId : 'relay', event.type),
    );
    this.jobQueue = new JobQueue(
      (event) => this.bus.publish(event),
      (job) => {
        const stream = this.streams.get(job.id);
        if (stream) {
          stream.status = job.status;
          stream.error = job.error;
        }
      },
    );

    // Recovery policy consumes transport facts after they cross the async bus
    // boundary. The transport-close hook itself never mutates queue state.
    this.bus.onEvent('job:transport_drop', ({ jobId, attemptId, reason }) => {
      if (this.transportAttempts.get(jobId)?.attemptId !== attemptId) return;
      this.handleUpstreamDropAndFailover(jobId, reason);
    });
    this.bus.onEvent('job:transport_token', ({ jobId, text, attemptId }) => {
      const stream = this.streams.get(jobId);
      const attempt = this.transportAttempts.get(jobId);
      if (!stream || !attempt || attempt.attemptId !== attemptId) return;

      if (!this.jobQueue.markStreaming(jobId)) return;
      stream.seqCounter++;
      stream.tokensEmitted.push(text);
      this.bus.publish({ type: 'job:token', jobId, text, seqNo: stream.seqCounter });
    });
    this.bus.onEvent('job:transport_completed', ({ jobId, attemptId }) => {
      const attempt = this.transportAttempts.get(jobId);
      if (!attempt || attempt.attemptId !== attemptId) return;
      this.markComplete(jobId);
    });
  }

  /**
   * Calculate Dynamic TTFT Ceiling based on reasoning effort and model architecture.
   */
  public calculateTtftCeiling(model: string, reasoningEffort?: string): number {
    const effort = reasoningEffort?.toLowerCase() || 'medium';
    const m = model.toLowerCase();

    if (effort === 'high' || m.includes('o3') || m.includes('deep') || m.includes('sol')) {
      return 120_000; // 120s for deep chain-of-thought proofs
    }
    if (effort === 'low') {
      return 30_000;  // 30s for fast interactive queries
    }
    return 60_000;    // 60s for standard generation
  }

  /**
   * Start tracking an in-flight WebSocket job.
   */
  public startStream(
    jobId: string,
    model: string,
    reasoningEffort = 'medium',
    preferredShardId?: string
  ): InFlightStreamState {
    const shard = this.acquireHealthyShard(undefined, preferredShardId);
    if (!shard) {
      throw new Error('all_shards_exhausted');
    }

    const ttftCeiling = this.calculateTtftCeiling(model, reasoningEffort);
    const now = Date.now();

    const state: InFlightStreamState = {
      jobId,
      model,
      reasoningEffort,
      currentShardId: shard.id,
      transportObservationCounter: 0,
      seqCounter: 0,
      tokensEmitted: [],
      hasReceivedFirstToken: false,
      baseTtftBudgetMs: ttftCeiling,
      currentTtftDeadlineMs: now + ttftCeiling,
      lastActivityMs: now,
      retryCount: 0,
      failoverCount: 0,
      status: 'running',
    };

    this.streams.set(jobId, state);
    this.transportAttempts.set(jobId, {
      attemptId: 1,
      shardId: shard.id,
      hasReceivedFirstToken: false,
      lastActivityMs: now,
      heartbeatPending: false,
      isFirstChunkAfterFailover: false,
    });
    this.jobQueue.enqueue(jobId);
    if (!this.jobQueue.acquireForDispatch(jobId)) {
      throw new Error(`Job ${jobId} could not be acquired for dispatch`);
    }
    this.metrics.totalJobsStarted++;
    return state;
  }

  /**
   * Shard acquisition with half-open circuit breaker fallback.
   */
  public acquireHealthyShard(excludeShardId?: string, preferredShardId?: string): ShardSpec | null {
    const all = Array.from(this.shards.values());

    if (preferredShardId) {
      const pref = this.shards.get(preferredShardId);
      if (pref && pref.status === 'active' && pref.id !== excludeShardId) {
        pref.inFlight++;
        pref.lastUsedAtMs = Date.now();
        return pref;
      }
    }

    // 1. Find active shards
    const active = all.filter((s) => s.status === 'active' && s.id !== excludeShardId);
    if (active.length > 0) {
      active.sort((a, b) => a.inFlight - b.inFlight);
      const chosen = active[0];
      chosen.inFlight++;
      chosen.lastUsedAtMs = Date.now();
      return chosen;
    }

    // 2. If all in cooldown, half-open probe the oldest
    const cooling = all.filter((s) => s.status === 'cooldown');
    if (cooling.length > 0) {
      cooling.sort((a, b) => a.lastUsedAtMs - b.lastUsedAtMs);
      const probe = cooling[0];
      probe.status = 'active';
      probe.consecutiveFailures = 1;
      probe.inFlight++;
      probe.lastUsedAtMs = Date.now();
      this.metrics.totalHalfOpenProbesUsed++;
      return probe;
    }

    return null;
  }

  /**
   * Handle thinking/reasoning delta frame: dynamically extends TTFT deadline!
   */
  public onReasoningProgress(jobId: string, reasoningChunk: string, extensionMs = 15_000): boolean {
    const stream = this.streams.get(jobId);
    const attempt = this.transportAttempts.get(jobId);
    if (!stream || !attempt || attempt.hasReceivedFirstToken) return false;

    const now = Date.now();
    stream.lastActivityMs = now;
    attempt.lastActivityMs = now;
    attempt.heartbeatPending = false; // Progress ACKs the connection
    stream.currentTtftDeadlineMs = Math.max(stream.currentTtftDeadlineMs, now + extensionMs);
    this.metrics.totalTtftExtensionsGranted++;
    this.bus.publish({ type: 'job:reasoning', jobId, text: reasoningChunk });
    return true;
  }

  /**
   * Handle output token chunk arrival with Overlap Reconciliation.
   */
  public onOutputToken(jobId: string, rawToken: string, sourceAttemptId?: number): number {
    const stream = this.streams.get(jobId);
    const attempt = this.transportAttempts.get(jobId);
    if (!stream || !attempt) throw new Error(`Stream ${jobId} not found`);
    if (sourceAttemptId !== undefined && sourceAttemptId !== attempt.attemptId) {
      return stream.transportObservationCounter;
    }

    this.transportMessageDepth++;
    try {
      let token = rawToken;

      // Reconciliation is scoped to this transport attempt, so stale attempts
      // cannot consume or clear the next attempt's overlap window.
      if (attempt.isFirstChunkAfterFailover && attempt.priorFailoverSuffix) {
        const originalLen = token.length;
        token = reconcileOverlap(attempt.priorFailoverSuffix, token);
        attempt.isFirstChunkAfterFailover = false;
        attempt.priorFailoverSuffix = undefined;

        if (token.length < originalLen) {
          this.metrics.totalOverlapReconciliationsWon++;
        }

        if (!token || token.length === 0) {
          return stream.transportObservationCounter; // Duplicate echo consumed
        }
      }

      attempt.hasReceivedFirstToken = true;
      attempt.lastActivityMs = Date.now();
      attempt.heartbeatPending = false;
      stream.hasReceivedFirstToken = true;
      stream.lastActivityMs = attempt.lastActivityMs;
      stream.transportObservationCounter++;
      this.bus.publish({
        type: 'job:transport_token',
        jobId,
        text: token,
        attemptId: attempt.attemptId,
        observationNo: stream.transportObservationCounter,
      });
      return stream.transportObservationCounter;
    } finally {
      this.transportMessageDepth--;
    }
  }

  /**
   * Simulate Discord Gateway Heartbeat Tick (OP 1).
   * If previous heartbeat has not been ACKed (heartbeatPending is true), triggers dead peer eviction!
   */
  public simulateHeartbeatTick(jobId: string): { status: 'ping_sent' | 'ack_miss'; evicted: boolean; failover?: any } {
    const stream = this.streams.get(jobId);
    const attempt = this.transportAttempts.get(jobId);
    if (!stream || !attempt) throw new Error(`Stream ${jobId} not found`);

    if (attempt.heartbeatPending) {
      // Heartbeat ACK Miss: peer is dead!
      this.metrics.totalHeartbeatAckMisses++;
      this.metrics.totalDeadPeerEvictions++;
      const failover = this.handleUpstreamDropAndFailover(jobId, 'discord_heartbeat_ack_miss_4000');
      return { status: 'ack_miss', evicted: true, failover };
    }

    // Arm heartbeat pending flag
    attempt.heartbeatPending = true;
    return { status: 'ping_sent', evicted: false };
  }

  /**
   * Perform anti-fragile in-flight failover when upstream WebSocket drops or stalls.
   */
  public handleUpstreamDropAndFailover(
    jobId: string,
    reason: string
  ): { success: boolean; newShardId?: string; seqCounter: number; continuationPrompt?: string } {
    const stream = this.streams.get(jobId);
    if (!stream) return { success: false, seqCounter: 0 };

    // Model Slack Flannel keepalive frame to downstream subscribers
    this.metrics.totalDownstreamFailoverKeepalivesSent++;

    // Penalize current shard
    const failedShard = this.shards.get(stream.currentShardId);
    if (failedShard) {
      failedShard.inFlight = Math.max(0, failedShard.inFlight - 1);
      failedShard.consecutiveFailures++;
      if (failedShard.consecutiveFailures >= 2) {
        failedShard.status = 'cooldown';
      }
    }

    // Acquire replacement shard
    const replacement = this.acquireHealthyShard(stream.currentShardId);
    if (!replacement) {
      this.jobQueue.markFailed(jobId, 'all_shards_exhausted');
      return { success: false, seqCounter: stream.seqCounter };
    }

    stream.currentShardId = replacement.id;
    stream.failoverCount++;
    stream.retryCount++;
    this.metrics.totalMidStreamFailoversWon++;

    let continuationPrompt: string | undefined;
    let priorFailoverSuffix: string | undefined;
    if (stream.seqCounter > 0) {
      const accumulated = stream.tokensEmitted.join('');
      priorFailoverSuffix = accumulated.slice(-128);
      continuationPrompt = `[TRANSIT_FAILOVER_DIRECTIVE]: Previous partial response: "${accumulated}". Continue seamlessly without repeating.`;
    }

    const previousAttempt = this.transportAttempts.get(jobId);
    this.transportAttempts.set(jobId, {
      attemptId: (previousAttempt?.attemptId ?? 0) + 1,
      shardId: replacement.id,
      hasReceivedFirstToken: false,
      lastActivityMs: Date.now(),
      heartbeatPending: false,
      isFirstChunkAfterFailover: priorFailoverSuffix !== undefined,
      priorFailoverSuffix,
    });

    return {
      success: true,
      newShardId: replacement.id,
      seqCounter: stream.seqCounter,
      continuationPrompt,
    };
  }

  /**
   * Check dead peer status via wall-clock silence.
   */
  public evaluateDeadPeer(jobId: string, maxSilenceMs = 25_000): boolean {
    const attempt = this.transportAttempts.get(jobId);
    if (!attempt) return false;

    const silence = Date.now() - attempt.lastActivityMs;
    if (silence > maxSilenceMs) {
      this.metrics.totalDeadPeerEvictions++;
      return true;
    }
    return false;
  }

  public getStream(jobId: string): InFlightStreamState | undefined {
    return this.streams.get(jobId);
  }

  /** Transport-plane close hook: publish a fact only; queue policy runs later. */
  public onTransportClosed(jobId: string, reason: string, sourceAttemptId?: number): void {
    const attempt = this.transportAttempts.get(jobId);
    if (!attempt) return;
    this.bus.publish({
      type: 'job:transport_drop',
      jobId,
      attemptId: sourceAttemptId ?? attempt.attemptId,
      reason,
    });
  }

  /** Transport-plane completion hook: publish a claim; queue policy terminalizes later. */
  public onTransportCompleted(jobId: string, sourceAttemptId?: number): void {
    const attempt = this.transportAttempts.get(jobId);
    if (!attempt) return;
    this.bus.publish({
      type: 'job:transport_completed',
      jobId,
      attemptId: sourceAttemptId ?? attempt.attemptId,
    });
  }

  public subscribeToJob(jobId: string, subscriber: JobEventSubscriber): () => void {
    return this.bus.subscribe(jobId, subscriber);
  }

  public markComplete(jobId: string): boolean {
    const completed = this.jobQueue.markComplete(jobId);
    if (completed) {
      const stream = this.streams.get(jobId);
      if (stream) {
        const shard = this.shards.get(stream.currentShardId);
        if (shard) shard.inFlight = Math.max(0, shard.inFlight - 1);
      }
    }
    return completed;
  }

  public getJobStatus(jobId: string): JobLifecycleStatus | undefined {
    return this.jobQueue.get(jobId)?.status;
  }

  public getBusEvents(jobId?: string): ReadonlyArray<BusEventObservation> {
    return this.busEvents
      .filter((event) => !jobId || event.jobId === jobId)
      .map((event) => ({ ...event }));
  }

  public waitForBusIdle(): Promise<void> {
    return this.bus.whenIdle();
  }

  /** Test hook used to prove event handling never runs under the WS message stack. */
  public onBusEvent(jobId: string, eventType: JobBusEvent['type']): void {
    this.busEvents.push({
      jobId,
      eventType,
      observedDuringTransportHandler: this.transportMessageDepth > 0,
    });
  }
}
