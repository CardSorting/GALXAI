/**
 * @file LUMI-NEW/src/relay/relay-server.ts
 * @description Hardened Enterprise VM Relay Server & WebSocket Streaming Gateway powered by BroccoliDB.
 *
 * Architecture & Security Hardening:
 * 1. Zero-Trust Security & API Key Authentication:
 *    - Constant-time timing-safe credential verification (crypto.timingSafeEqual) against side-channel attacks.
 *    - Hardware-grade AES-256-GCM envelope decryption for encrypted shard fleets (.galx-shards.json) with AAD binding.
 *    - 2 MB maximum payload guardrail (HTTP 413) & 10s Slowloris read timeout.
 * 2. Multi-Tenant Token-Bucket Rate Governor:
 *    - Per-tenant / per-key continuous leaky bucket with burst absorption and Retry-After headers.
 * 3. BroccoliDB Zenith-Tier Storage & Crash-Resilient Checkpointing:
 *    - relay_jobs: Sub-microsecond secondary indexes on status, model, shardId, and sorted createdAtMs.
 *    - relay_tokens: Sub-microsecond indexed lookups for Last-Event-ID token replay with native TTL auto-eviction.
 *    - relay_idempotency: Atomic Idempotent Stream Attachment via SHA-256 promptHash collapsing.
 *    - relay_shards: SWRR quota tracking & sliding 3-hour window meter.
 *    - Atomic file checkpointing (.broccolidb/relay-snapshot.json.tmp -> rename) for zero-corruption state recovery.
 * 4. Circuit Breakers & Outlier Detection:
 *    - 3-strike shard isolation on 5xx/429/TLS failures with 60s cooldown and AWS full-jitter backoff.
 * 5. Two-Tier Disconnect Protocol:
 *    - 15s Reconnect Grace Window for dirty drops vs instant <5ms wire abort for clean cancellations (Figma / Liveblocks).
 * 6. Dual-Heartbeat & Dead-Peer Detection:
 *    - Discord-style full-jitter WS pings with 5s pong deadline; instant TCP RST termination (ws.terminate()).
 *    - Periodic SSE comment heartbeats (: ping\n\n) to permanently defeat Cloudflare 100s idle timeouts.
 * 7. 7-Layer WebSocket Timeout Hierarchy (Connect, Model-Adaptive TTFT, EWMA ITL Gap, Intra-Chunk, Grace, Proxy Keepalive, Wall-Time).
 * 8. Downstream Backpressure Flow Control with High-Water Mark Bounded RingBuffer (Slack Flannel pattern).
 * 9. Graceful Drain on SIGTERM/SIGINT with 30s in-flight completion window.
 * 10. Authority Boundary:
 *    - JobQueue governs only bounded relay-delivery lifecycle; it is not authoritative agent-execution state.
 *    - Governed executions arrive as supervisor-authorized intents; WS/SSE remain projections and observations.
 */

import * as http from 'node:http';
import type { Socket } from 'node:net';
import * as url from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { readJsonBody, validateModelRequest, RequestError, RetryBudget } from './request-policy.js';
import { RelayTelemetry } from './telemetry.js';
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { classifyUpstreamError, cooldownDeadline, parseProviderLimits, retryDeadline, type ProviderLimit } from './quota-policy.js';
import { registryConfig, readShardRegistry, decryptRegistryShard } from './shard-registry.js';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table.js';

// ============================================================================
// CONFIGURATION & TIMEOUT TAXONOMY (Layer 0 through Layer 6)
// ============================================================================

export interface RelayConfig {
  port: number;
  maxConcurrentRequests: number;
  maxRssBytes: number;
  host: string;
  wsEndpoint: string;
  shardsJsonPath?: string;
  stateSnapshotPath: string;
  masterSecret?: string;
  shardConcurrency: number;
  discoverHostCredentials: boolean;
  registryEnabled: boolean;
  apiKeys?: string[];
  adminApiKeys?: string[];
  allowedOrigins?: string[];
  maxPayloadBytes: number;
  httpBodyTimeoutMs: number;
  // Multi-Tenant Rate Governance
  tenantRateLimitPerSec: number;
  tenantBurstCapacity: number;
  // 7-Layer Timeout Hierarchy & Anti-Fragility
  wsConnectTimeoutMs: number;          // Layer 0: TCP + TLS + Upgrade handshake budget (15s)
  wsTtftTimeoutMs: number;             // Layer 1: Time-To-First-Token base ceiling (60s)
  deepReasoningTtftMultiplier: number; // Layer 1: Multiplier for high-effort reasoning (2.0 = 120s)
  reasoningActivityExtensionMs: number;// Layer 1: Extension on receiving thinking progress (15s)
  itlGapThresholdMs: number;           // Layer 2: Inter-token latency stall trigger (8s)
  itlConsecutiveLimit: number;         // Layer 2: Hard abort after N consecutive ITL gaps (3)
  wsIntraChunkTimeoutMs: number;       // Layer 3: Silence between chunks (45s) - RESETS ON EVERY CHUNK
  clientDisconnectGraceMs: number;     // Layer 4: Wi-Fi glitch / cellular handoff grace window (15s)
  sseKeepaliveIntervalMs: number;      // Layer 5: SSE comment heartbeat interval (: ping\n\n) (15s)
  wsDeadPeerPingIntervalMs: number;    // Layer 5: Outbound WS ping interval with jitter (20s)
  wsDeadPeerPongTimeoutMs: number;     // Layer 5: WS pong ACK timeout before eviction (5s)
  jobMaxWallTimeMs: number;            // Layer 6: Absolute safety wall-clock cap (300s / 5 min)
  // Anti-Fragile Failover & Recovery
  maxUpstreamRetries: number;          // In-flight shard failovers before failing job (3)
  retryBaseDelayMs: number;            // Base backoff delay for retries (500ms)
  retryMaxDelayMs: number;             // Backoff ceiling for full jitter (5000ms)
  deDuplicationOverlapWindowChars: number; // Suffix window length for overlap reconciliation (128 chars)
  // Memory & Buffer Limits
  jobTokenRetentionMs: number;         // Post-completion buffer retention (10 min)
  maxBufferedTokensPerJob: number;     // Ring-buffer high-water mark
  busMaxListenersPerJob: number;       // Maximum SSE subscribers admitted per job
  maxPendingFramesPerSubscriber: number; // Per-subscriber outbound queue cap
  subscriberDrainTimeoutMs: number;    // Evict a subscriber that never drains
  drainTimeoutMs: number;              // Graceful shutdown drain deadline (30s)
  idempotencyTtlMs: number;            // Prompt deduplication TTL (120s)
  snapshotIntervalMs: number;          // Periodic disk checkpoint interval (60s)
  // Dynamic Sliding Window Quota Governance
  quotaWindowMaxCalls: number;         // Optional operator limit; 0 means no local call cap
  quotaWindowDurationMs: number;       // Duration of rolling window (default: 3h / 10800000ms)
}

const DEFAULT_CONFIG: RelayConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  maxConcurrentRequests: Number(process.env.RELAY_MAX_CONCURRENT_REQUESTS || 64),
  maxRssBytes: Number(process.env.RELAY_MAX_RSS_MB || 384) * 1024 * 1024,
  host: process.env.HOST || '127.0.0.1',
  wsEndpoint: process.env.CODEX_WS_ENDPOINT || 'wss://chatgpt.com/backend-api/codex/responses',
  shardsJsonPath: process.env.GALX_SHARDS_JSON_PATH || path.join(process.cwd(), '.galx-shards.json'),
  stateSnapshotPath: process.env.RELAY_STATE_SNAPSHOT_PATH || path.join(process.cwd(), '.broccolidb', 'relay-snapshot.json'),
  masterSecret: process.env.GALX_VAULT_MASTER_SECRET || process.env.GALX_VAULT_KEY,
  apiKeys: process.env.RELAY_API_KEYS ? process.env.RELAY_API_KEYS.split(',').map((k) => k.trim()) : undefined,
  adminApiKeys: process.env.RELAY_ADMIN_API_KEYS ? process.env.RELAY_ADMIN_API_KEYS.split(',').map(k => k.trim()) : undefined,
  allowedOrigins: process.env.RELAY_ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean),
  shardConcurrency: Number(process.env.RELAY_SHARD_CONCURRENCY || 4),
  discoverHostCredentials: process.env.RELAY_DISCOVER_HOST_CREDENTIALS === 'true',
  registryEnabled: Boolean(registryConfig().databaseUrl || registryConfig().url || registryConfig().key),
  maxPayloadBytes: parseInt(process.env.MAX_PAYLOAD_BYTES || '2097152', 10), // 2 MB
  httpBodyTimeoutMs: parseInt(process.env.HTTP_BODY_TIMEOUT_MS || '10000', 10), // 10s
  tenantRateLimitPerSec: parseFloat(process.env.TENANT_RATE_LIMIT_PER_SEC || '50.0'),
  tenantBurstCapacity: parseInt(process.env.TENANT_BURST_CAPACITY || '100', 10),
  wsConnectTimeoutMs: parseInt(process.env.WS_CONNECT_TIMEOUT_MS || '15000', 10),
  wsTtftTimeoutMs: parseInt(process.env.WS_TTFT_TIMEOUT_MS || '60000', 10),
  deepReasoningTtftMultiplier: parseFloat(process.env.DEEP_REASONING_TTFT_MULTIPLIER || '2.0'),
  reasoningActivityExtensionMs: parseInt(process.env.REASONING_ACTIVITY_EXTENSION_MS || '15000', 10),
  itlGapThresholdMs: parseInt(process.env.ITL_GAP_THRESHOLD_MS || '8000', 10),
  itlConsecutiveLimit: parseInt(process.env.ITL_CONSECUTIVE_LIMIT || '3', 10),
  wsIntraChunkTimeoutMs: parseInt(process.env.WS_INTRA_CHUNK_TIMEOUT_MS || '45000', 10),
  clientDisconnectGraceMs: parseInt(process.env.CLIENT_DISCONNECT_GRACE_MS || '15000', 10),
  sseKeepaliveIntervalMs: parseInt(process.env.SSE_KEEPALIVE_INTERVAL_MS || '15000', 10),
  wsDeadPeerPingIntervalMs: parseInt(process.env.WS_DEAD_PEER_PING_INTERVAL_MS || '20000', 10),
  wsDeadPeerPongTimeoutMs: parseInt(process.env.WS_DEAD_PEER_PONG_TIMEOUT_MS || '5000', 10),
  jobMaxWallTimeMs: parseInt(process.env.JOB_MAX_WALL_TIME_MS || '300000', 10),
  maxUpstreamRetries: parseInt(process.env.MAX_UPSTREAM_RETRIES || '3', 10),
  retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '500', 10),
  retryMaxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '5000', 10),
  deDuplicationOverlapWindowChars: parseInt(process.env.DEDUPLICATION_OVERLAP_WINDOW_CHARS || '128', 10),
  jobTokenRetentionMs: parseInt(process.env.JOB_TOKEN_RETENTION_MS || '600000', 10),
  maxBufferedTokensPerJob: parseInt(process.env.MAX_BUFFERED_TOKENS_PER_JOB || '10000', 10),
  busMaxListenersPerJob: parseInt(process.env.BUS_MAX_LISTENERS_PER_JOB || '50', 10),
  maxPendingFramesPerSubscriber: parseInt(process.env.MAX_PENDING_FRAMES_PER_SUBSCRIBER || '256', 10),
  subscriberDrainTimeoutMs: parseInt(process.env.SUBSCRIBER_DRAIN_TIMEOUT_MS || '5000', 10),
  drainTimeoutMs: parseInt(process.env.DRAIN_TIMEOUT_MS || '30000', 10),
  idempotencyTtlMs: parseInt(process.env.IDEMPOTENCY_TTL_MS || '120000', 10),
  snapshotIntervalMs: parseInt(process.env.SNAPSHOT_INTERVAL_MS || '60000', 10),
  quotaWindowMaxCalls: parseInt(process.env.RELAY_QUOTA_WINDOW_MAX || '0', 10),
  quotaWindowDurationMs: parseInt(process.env.RELAY_QUOTA_WINDOW_MS || String(3 * 60 * 60 * 1000), 10),
};

// ============================================================================
// BROCCOLIDB DATA CONTRACTS & SCHEMAS
// ============================================================================

export interface JobRecord extends Record<string, unknown> {
  id: string;
  model: string;
  prompt: string;
  promptHash: string;
  traceId?: string;
  tenantId: string;
  status: 'queued' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  createdAtMs: number;
  startedAtMs?: number;
  completedAtMs?: number;
  shardId?: string;
  seqCounter: number;
  isDetached: boolean;
  error?: string;
  estimatedTokens: number;
  messagesJson: string;
  reasoningEffort?: string;
  retryCount?: number;
  failoverCount?: number;
  lastShardId?: string;
}

export interface JobTokenRecord extends Record<string, unknown> {
  id: string; // `${jobId}_${seqNo}`
  jobId: string;
  seqNo: number;
  text: string;
  isFinal: boolean;
  timestampMs: number;
}

export interface IdempotencyRecord extends Record<string, unknown> {
  id: string; // promptHash
  jobId: string;
  createdAtMs: number;
}

export type QuotaMode = 'conservative' | 'balanced' | 'turbo' | 'adaptive';

export interface QuotaProfileConfig {
  mode: QuotaMode;
  maxCalls: number;
  windowDurationMs: number;
  dripRefillSec: number;
  elasticBurstAllowance: number;
  adaptiveBackoffOn429: boolean;
}

export const QUOTA_PRESETS: Record<QuotaMode, QuotaProfileConfig> = {
  conservative: {
    mode: 'conservative',
    maxCalls: 40,
    windowDurationMs: 3 * 3600 * 1000,
    dripRefillSec: 270, // 1 token every 4.5m
    elasticBurstAllowance: 5,
    adaptiveBackoffOn429: true,
  },
  balanced: {
    mode: 'balanced',
    maxCalls: 100,
    windowDurationMs: 3 * 3600 * 1000,
    dripRefillSec: 108, // 1 token every 1.8m
    elasticBurstAllowance: 20,
    adaptiveBackoffOn429: true,
  },
  turbo: {
    mode: 'turbo',
    maxCalls: 250,
    windowDurationMs: 3 * 3600 * 1000,
    dripRefillSec: 43.2, // 1 token every 43.2s
    elasticBurstAllowance: 50,
    adaptiveBackoffOn429: true,
  },
  adaptive: {
    mode: 'adaptive',
    maxCalls: 0,
    windowDurationMs: 3 * 3600 * 1000,
    dripRefillSec: 0,
    elasticBurstAllowance: 0,
    adaptiveBackoffOn429: true,
  },
};

export interface ShardRecord extends Record<string, unknown> {
  id: string; // shardId
  accountId: string;
  accessToken: string;
  status: 'active' | 'exhausted' | 'cooldown' | 'disabled';
  consecutiveFailures: number;
  lastUsedAtMs: number;
  inFlight: number;
  slidingWindowTimestamps: number[];
  availableDripTokens?: number;
  lastDripRefillMs?: number;
  cooldownUntilMs?: number;
  quotaFailures?: number;
  probeInFlight?: boolean;
  providerLimits?: ProviderLimit[];
  source?: string;
  expiresAtMs?: number;
  credentialFingerprint?: string;
}

interface TransientJobSession {
  abortController: AbortController;
  graceTimer?: NodeJS.Timeout;
  upstreamWs?: any;
  connectTimer?: NodeJS.Timeout;
  ttftTimer?: NodeJS.Timeout;
  retryTimer?: NodeJS.Timeout;
  intraChunkTimer?: NodeJS.Timeout;
  wallTimer?: NodeJS.Timeout;
  wsPingTimer?: NodeJS.Timeout;
  heartbeatAckTimeoutTimer?: NodeJS.Timeout;
  downstreamFailoverKeepaliveTimer?: NodeJS.Timeout;
  lastChunkAtMs: number;
  ewmaItlMs: number;
  consecutiveItlStalls: number;
  retryCount: number;
  retryAtMs?: number;
  lastSeenAliveMs: number;
  activeTtftDeadlineMs: number;
  currentShardId?: string;
  attemptedShardIds: Set<string>;
  activeAttemptId: number;
}

interface TransportAttempt {
  id: number;
  shardId: string;
  hasReceivedFirstToken: boolean;
  heartbeatPending: boolean;
  completionObserved: boolean;
  isFirstChunkAfterFailover: boolean;
  priorFailoverSuffix?: string;
}

type JobBusEvent =
  | { type: 'job:transport_token'; jobId: string; attemptId: number; shardId: string; text: string; timestampMs: number }
  | { type: 'job:transport_completed'; jobId: string; attemptId: number; shardId: string }
  | { type: 'job:token'; jobId: string; token: JobTokenRecord }
  | { type: 'job:reasoning'; jobId: string; text: string }
  | { type: 'job:keepalive'; jobId: string; text: string }
  | { type: 'job:transport_drop'; jobId: string; attemptId: number; shardId: string; reason: string; isQuotaError?: boolean; retryAtMs?: number; unauthorized?: boolean; retryable?: boolean }
  | { type: 'job:done'; jobId: string }
  | { type: 'job:error'; jobId: string; reason: string }
  | { type: 'job:cancelled'; jobId: string; reason?: string }
  | { type: 'relay:drained' };

type JobBusEventOf<T extends JobBusEvent['type']> = Extract<JobBusEvent, { type: T }>;

interface BusSubscriber {
  res: http.ServerResponse;
  tail: Promise<void>;
  pendingFrames: number;
  closed: boolean;
}

/**
 * Pub/sub plane. Public publication always crosses a microtask boundary.
 * Tokens are committed before fan-out and every SSE subscriber owns an
 * independent ordered write chain.
 */
class JobEventBus extends EventEmitter {
  private readonly subscribers = new Map<string, Set<BusSubscriber>>();
  private pendingDispatches = 0;
  private pendingWrites = 0;
  private readonly idleWaiters = new Set<() => void>();
  private readonly jobsTable: BroccoliDbTable<JobRecord>;
  private readonly tokensTable: BroccoliDbTable<JobTokenRecord>;
  private readonly config: RelayConfig;
  private readonly countEvent: () => void;
  private readonly countSlowDrain: () => void;

  constructor(
    jobsTable: BroccoliDbTable<JobRecord>,
    tokensTable: BroccoliDbTable<JobTokenRecord>,
    config: RelayConfig,
    countEvent: () => void,
    countSlowDrain: () => void,
  ) {
    super();
    for (const [name, value] of Object.entries({
      busMaxListenersPerJob: config.busMaxListenersPerJob,
      maxPendingFramesPerSubscriber: config.maxPendingFramesPerSubscriber,
      subscriberDrainTimeoutMs: config.subscriberDrainTimeoutMs,
      maxBufferedTokensPerJob: config.maxBufferedTokensPerJob,
      jobTokenRetentionMs: config.jobTokenRetentionMs,
    })) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive safe integer`);
      }
    }
    this.jobsTable = jobsTable;
    this.tokensTable = tokensTable;
    this.config = config;
    this.countEvent = countEvent;
    this.countSlowDrain = countSlowDrain;
    this.setMaxListeners(config.busMaxListenersPerJob);
  }

  public onEvent<T extends JobBusEvent['type']>(
    type: T,
    listener: (event: JobBusEventOf<T>) => void,
  ): this {
    return super.on(type, listener);
  }

  public publish(event: JobBusEvent): void {
    this.pendingDispatches++;
    queueMicrotask(() => {
      try {
        this.countEvent();
        this.dispatch(event);
        super.emit(event.type, event);
      } finally {
        this.pendingDispatches--;
        this.resolveIdleIfNeeded();
      }
    });
  }

  public subscribe(jobId: string, res: http.ServerResponse): () => void {
    const jobSubscribers = this.subscribers.get(jobId) ?? new Set<BusSubscriber>();
    if (jobSubscribers.size >= this.config.busMaxListenersPerJob) {
      throw new Error('job_subscriber_limit_exceeded');
    }

    const subscriber: BusSubscriber = {
      res,
      tail: Promise.resolve(),
      pendingFrames: 0,
      closed: false,
    };
    jobSubscribers.add(subscriber);
    this.subscribers.set(jobId, jobSubscribers);

    const unsubscribe = () => this.removeSubscriber(jobId, subscriber, false);
    res.once('close', unsubscribe);
    res.once('error', unsubscribe);
    return unsubscribe;
  }

  public replay(jobId: string, res: http.ServerResponse, afterSeqNo: number, onReplayed: () => void): void {
    const subscriber = [...(this.subscribers.get(jobId) ?? [])].find((entry) => entry.res === res);
    if (!subscriber) return;
    const tokens = this.tokensTable.query({
      where: { jobId },
      sortBy: 'seqNo',
      sortOrder: 'asc',
    });
    for (const token of tokens) {
      if (token.seqNo <= afterSeqNo) continue;
      this.enqueue(jobId, subscriber, this.formatToken(jobId, token), false);
      onReplayed();
    }
  }

  public subscriberCount(jobId: string): number {
    return this.subscribers.get(jobId)?.size ?? 0;
  }

  public sendToSubscriber(jobId: string, res: http.ServerResponse, frame: string, closeAfter = false): void {
    const subscriber = [...(this.subscribers.get(jobId) ?? [])].find((entry) => entry.res === res);
    if (subscriber) this.enqueue(jobId, subscriber, frame, closeAfter);
  }

  public whenIdle(): Promise<void> {
    if (this.pendingDispatches === 0 && this.pendingWrites === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.add(resolve));
  }

  private dispatch(event: JobBusEvent): void {
    if (event.type === 'job:token') {
      this.tokensTable.put(event.token.id, event.token, { ttlMs: this.config.jobTokenRetentionMs });
      if (event.token.seqNo > this.config.maxBufferedTokensPerJob) {
        this.tokensTable.delete(`${event.jobId}_${event.token.seqNo - this.config.maxBufferedTokensPerJob}`);
      }
      this.fanOut(event.jobId, this.formatToken(event.jobId, event.token));
      return;
    }
    if (event.type === 'job:reasoning') {
      const job = this.jobsTable.get(event.jobId);
      if (!job) return;
      const payload = JSON.stringify({
        id: job.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: job.model,
        choices: [{ index: 0, delta: { reasoning_content: event.text }, finish_reason: null }],
      });
      this.fanOut(event.jobId, `data: ${payload}\n\n`);
      return;
    }
    if (event.type === 'job:keepalive') {
      this.fanOut(event.jobId, event.text);
      return;
    }
    if (event.type === 'job:done') {
      this.fanOut(event.jobId, 'data: [DONE]\n\n', true);
      return;
    }
    if (event.type === 'job:error') {
      this.fanOut(event.jobId, `event: error\ndata: ${JSON.stringify({ error: event.reason })}\n\n`, true);
      return;
    }
    if (event.type === 'job:cancelled') {
      this.fanOut(
        event.jobId,
        `event: cancelled\ndata: ${JSON.stringify({ status: 'cancelled', reason: event.reason })}\n\n`,
        true,
      );
    }
  }

  private formatToken(jobId: string, token: JobTokenRecord): string {
    const job = this.jobsTable.get(jobId);
    const payload = JSON.stringify({
      id: jobId,
      object: 'chat.completion.chunk',
      created: Math.floor(token.timestampMs / 1000),
      model: job?.model ?? 'unknown',
      choices: [{
        index: 0,
        delta: token.text ? { content: token.text } : {},
        finish_reason: token.isFinal ? 'stop' : null,
      }],
      seqNo: token.seqNo,
    });
    return `id: ${token.seqNo}\ndata: ${payload}\n\n`;
  }

  private fanOut(jobId: string, frame: string, closeAfter = false): void {
    for (const subscriber of [...(this.subscribers.get(jobId) ?? [])]) {
      this.enqueue(jobId, subscriber, frame, closeAfter);
    }
  }

  private enqueue(jobId: string, subscriber: BusSubscriber, frame: string, closeAfter: boolean): void {
    if (subscriber.closed || subscriber.res.writableEnded) {
      this.removeSubscriber(jobId, subscriber, false);
      return;
    }
    if (subscriber.pendingFrames >= this.config.maxPendingFramesPerSubscriber) {
      this.removeSubscriber(jobId, subscriber, true);
      return;
    }

    subscriber.pendingFrames++;
    this.pendingWrites++;
    subscriber.tail = subscriber.tail
      .then(async () => {
        if (subscriber.closed || subscriber.res.writableEnded) return;
        if (!subscriber.res.write(frame)) {
          this.countSlowDrain();
          await this.waitForDrainOrClose(jobId, subscriber);
        }
        if (closeAfter && !subscriber.closed && !subscriber.res.writableEnded) {
          subscriber.res.end();
          this.removeSubscriber(jobId, subscriber, false);
        }
      })
      .catch(() => this.removeSubscriber(jobId, subscriber, true))
      .finally(() => {
        subscriber.pendingFrames--;
        this.pendingWrites--;
        this.resolveIdleIfNeeded();
      });
  }

  private waitForDrainOrClose(jobId: string, subscriber: BusSubscriber): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        subscriber.res.off('drain', finish);
        subscriber.res.off('close', finish);
        subscriber.res.off('error', finish);
        resolve();
      };
      timer = setTimeout(() => {
        this.removeSubscriber(jobId, subscriber, true);
        finish();
      }, this.config.subscriberDrainTimeoutMs);
      subscriber.res.once('drain', finish);
      subscriber.res.once('close', finish);
      subscriber.res.once('error', finish);
    });
  }

  private removeSubscriber(jobId: string, subscriber: BusSubscriber, close: boolean): void {
    if (subscriber.closed) return;
    subscriber.closed = true;
    const jobSubscribers = this.subscribers.get(jobId);
    jobSubscribers?.delete(subscriber);
    if (jobSubscribers?.size === 0) this.subscribers.delete(jobId);
    if (close && !subscriber.res.writableEnded) subscriber.res.end();
  }

  private resolveIdleIfNeeded(): void {
    if (this.pendingDispatches !== 0 || this.pendingWrites !== 0) return;
    for (const resolve of this.idleWaiters) resolve();
    this.idleWaiters.clear();
  }
}

/**
 * Relay queue-plane lifecycle coordinator. This owns only the operational
 * lifecycle of a bounded relay delivery job; authoritative evolving agent
 * execution state belongs to the upstream ExecutionSupervisor and ledger.
 */
class JobQueue {
  private readonly jobsTable: BroccoliDbTable<JobRecord>;
  private readonly bus: JobEventBus;

  constructor(
    jobsTable: BroccoliDbTable<JobRecord>,
    bus: JobEventBus,
    private readonly retentionMs = 600000,
  ) {
    this.jobsTable = jobsTable;
    this.bus = bus;
  }

  public enqueue(job: JobRecord): JobRecord {
    if (this.jobsTable.get(job.id)) throw new Error(`job_already_exists_${job.id}`);
    return this.jobsTable.put(job.id, { ...job, status: 'queued' });
  }

  public restore(job: JobRecord): JobRecord {
    return this.jobsTable.put(job.id, job, this.isTerminal(job.status) ? { ttlMs: this.retentionMs } : undefined);
  }

  public acquireForDispatch(jobId: string, shardId: string, retryCount: number): JobRecord | undefined {
    const job = this.jobsTable.get(jobId);
    if (!job || this.isTerminal(job.status)) return undefined;
    return this.jobsTable.put(jobId, {
      ...job,
      shardId,
      lastShardId: shardId,
      status: job.seqCounter > 0 ? 'streaming' : 'running',
      startedAtMs: job.startedAtMs || Date.now(),
      retryCount,
    });
  }

  public recordToken(jobId: string): { job: JobRecord; seqNo: number } | undefined {
    const job = this.jobsTable.get(jobId);
    if (!job || this.isTerminal(job.status)) return undefined;
    const seqNo = job.seqCounter + 1;
    const updated = this.jobsTable.put(jobId, { ...job, status: 'streaming', seqCounter: seqNo });
    return { job: updated, seqNo };
  }

  public updateForFailover(jobId: string, updates: Partial<JobRecord>): JobRecord | undefined {
    const job = this.jobsTable.get(jobId);
    if (!job || this.isTerminal(job.status)) return undefined;
    return this.jobsTable.put(jobId, { ...job, ...updates });
  }

  public setDetached(jobId: string, isDetached: boolean): JobRecord | undefined {
    const job = this.jobsTable.get(jobId);
    if (!job || this.isTerminal(job.status)) return undefined;
    return this.jobsTable.put(jobId, { ...job, isDetached });
  }

  public markComplete(jobId: string): boolean {
    return this.transitionTerminal(jobId, 'completed', undefined);
  }

  public markFailed(jobId: string, reason: string): boolean {
    return this.transitionTerminal(jobId, 'failed', reason);
  }

  public markCancelled(jobId: string, reason?: string): boolean {
    return this.transitionTerminal(jobId, 'cancelled', reason);
  }

  public activeCount(): number {
    return this.jobsTable.getAll().filter(
      (job) => job.status === 'queued' || job.status === 'running' || job.status === 'streaming',
    ).length;
  }

  private transitionTerminal(
    jobId: string,
    status: Extract<JobRecord['status'], 'completed' | 'failed' | 'cancelled'>,
    reason?: string,
  ): boolean {
    const job = this.jobsTable.get(jobId);
    if (!job || this.isTerminal(job.status)) return false;
    const activeBefore = this.activeCount();
    this.jobsTable.put(jobId, {
      ...job,
      status,
      error: reason,
      completedAtMs: Date.now(),
    }, { ttlMs: this.retentionMs });
    if (status === 'completed') this.bus.publish({ type: 'job:done', jobId });
    if (status === 'failed') this.bus.publish({ type: 'job:error', jobId, reason: reason ?? 'unknown_failure' });
    if (status === 'cancelled') this.bus.publish({ type: 'job:cancelled', jobId, reason });
    if (activeBefore > 0 && this.activeCount() === 0) this.bus.publish({ type: 'relay:drained' });
    return true;
  }

  private isTerminal(status: JobRecord['status']): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }
}

// ============================================================================
// STREAM SUFFIX-PREFIX OVERLAP RECONCILIATION (Figma / Liveblocks / CRDT Pattern)
// ============================================================================

export function reconcileOverlap(suffix: string, incoming: string, maxOverlapLen = 128): string {
  if (!suffix || !incoming) return incoming;

  // 1. Direct identical match: entire chunk was a duplicate echo from continuation prompt
  if (suffix.endsWith(incoming)) {
    return '';
  }

  const checkLen = Math.min(suffix.length, incoming.length, maxOverlapLen);

  // 2. Greedy character-level suffix-prefix overlap search
  for (let k = checkLen; k > 0; k--) {
    const incomingPrefix = incoming.slice(0, k);
    if (suffix.endsWith(incomingPrefix)) {
      return incoming.slice(k);
    }
  }

  // 3. Word-boundary fuzzy overlap search (handling trailing space variations)
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

// ============================================================================
// CRYPTOGRAPHIC ENVELOPE DECRYPTION (AES-256-GCM + HKDF)
// ============================================================================

function decryptShardPayload(
  enc: { ciphertext: string; iv: string; tag: string; keyVersion?: string },
  masterSecret: string,
  tenantUid: string,
  shardId: string,
  provider = 'openai'
): Record<string, any> | null {
  try {
    const key = Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(masterSecret, 'utf-8'),
        Buffer.from('galx-vault-salt-2026', 'utf-8'),
        Buffer.from(`galx-shard-isolation-${enc.keyVersion || 'v1'}`, 'utf-8'),
        32
      )
    );

    const iv = Buffer.from(enc.iv, 'hex');
    const tag = Buffer.from(enc.tag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    const aad = Buffer.from(`${tenantUid}:${shardId}:${provider}`, 'utf-8');
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(enc.ciphertext, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// ============================================================================
// HARDENED RELAY SERVER POWERED BY BROCCOLIDB
// ============================================================================

export class GalxaiRelayServer extends EventEmitter {
  private config: RelayConfig;
  private server: http.Server;
  private readonly telemetry = new RelayTelemetry();
  private readonly eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
  private readonly retryBudget = new RetryBudget();
  private readonly pendingImages = new Map<string, string>();
  private readonly imageControllers = new Set<AbortController>();
  private readonly principals = new WeakMap<http.IncomingMessage, string>();
  private readonly requestTraces = new WeakMap<http.IncomingMessage, string>();

  // BroccoliDB Zenith-Tier Tables
  private readonly jobsTable: BroccoliDbTable<JobRecord>;
  private readonly tokensTable: BroccoliDbTable<JobTokenRecord>;
  private readonly idempotencyTable: BroccoliDbTable<IdempotencyRecord>;
  private readonly shardsTable: BroccoliDbTable<ShardRecord>;
  private readonly jobBus: JobEventBus;
  private readonly jobQueue: JobQueue;

  // Multi-Tenant Rate Governor (Token Bucket)
  private readonly tenantBuckets = new Map<string, { tokens: number; lastRefillMs: number }>();

  // Dynamic Shard Quota & Continuous Drip Engine
  private currentQuotaProfile: QuotaProfileConfig = { ...QUOTA_PRESETS.adaptive };
  private shardCursor = 0;
  private registryRefresh?: Promise<void>;
  private registryRefreshedAtMs = 0;
  private registryError: string | null = null;
  private registryCounts = { total: 0, skipped: 0 };
  private recoveredShardState = new Map<string, Partial<ShardRecord>>();

  // Ephemeral In-Flight Sessions
  private readonly sessions = new Map<string, TransientJobSession>();
  private isDraining = false;
  private admittedRequests = 0;
  private stopping?: Promise<void>;
  private readonly sockets = new Set<Socket>();
  private snapshotIntervalTimer?: NodeJS.Timeout;

  // Prometheus Telemetry Counters
  private metrics = {
    totalJobsSubmitted: 0,
    totalJobsCompleted: 0,
    totalJobsCancelled: 0,
    totalJobsFailed: 0,
    totalAttachedDuplicates: 0,
    totalTokensEmitted: 0,
    totalTokensServedFromBuffer: 0,
    totalReconnections: 0,
    totalGracePeriodsEntered: 0,
    totalGraceReconnectionsWon: 0,
    totalZombieLeashAborts: 0,
    totalItlStallsDetected: 0,
    totalTtftDeadlocks: 0,
    totalRateLimitDrops: 0,
    totalAuthFailures: 0,
    totalUpstreamRetries: 0,
    totalMidStreamFailoversWon: 0,
    totalShardCooldownEjections: 0,
    totalDeadPeerRecoveries: 0,
    totalReasoningChunksReceived: 0,
    totalHeartbeatAckMisses: 0,
    totalOverlapReconciliationsWon: 0,
    totalDownstreamFailoverKeepalivesSent: 0,
    totalProactiveRateLimitCooldowns: 0,
    totalBusEventsEmitted: 0,
    totalSlowSubscriberDrains: 0,
    totalImageJobsSubmitted: 0,
    totalImageJobsCompleted: 0,
    totalImageJobsFailed: 0,
    startTimeMs: Date.now(),
  };

  constructor(config: Partial<RelayConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    for (const name of ['apiKeys', 'adminApiKeys'] as const) {
      if (this.config[name]?.some(key => typeof key !== 'string' || !key.trim())) throw new TypeError(`${name} must contain nonempty keys`);
    }
    // Existing single-key installations retain admin access; additional keys are inference-only.
    this.config.adminApiKeys ??= this.config.apiKeys?.slice(0, 1);
    if (!['127.0.0.1', '::1', 'localhost'].includes(this.config.host) && !this.config.apiKeys?.length && !this.config.adminApiKeys?.length) {
      throw new TypeError('Non-loopback relay listeners require RELAY_API_KEYS or RELAY_ADMIN_API_KEYS');
    }
    for (const origin of this.config.allowedOrigins ?? []) {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new TypeError('allowedOrigins must contain exact HTTP(S) origins');
    }
    for (const name of ['maxConcurrentRequests', 'maxRssBytes', 'jobMaxWallTimeMs', 'httpBodyTimeoutMs', 'maxPayloadBytes'] as const) {
      if (!Number.isSafeInteger(this.config[name]) || this.config[name] <= 0) throw new TypeError(`${name} must be a positive safe integer`);
    }
    if (!Number.isSafeInteger(this.config.maxUpstreamRetries) || this.config.maxUpstreamRetries < 0 || this.config.maxUpstreamRetries > 32) {
      throw new TypeError('maxUpstreamRetries must be an integer between 0 and 32');
    }
    for (const name of ['retryBaseDelayMs', 'retryMaxDelayMs', 'wsConnectTimeoutMs', 'wsTtftTimeoutMs', 'wsIntraChunkTimeoutMs', 'jobMaxWallTimeMs'] as const) {
      if (!Number.isSafeInteger(this.config[name]) || this.config[name] < 1 || this.config[name] > 2147483647) {
        throw new TypeError(`${name} must be an integer between 1 and 2147483647 milliseconds`);
      }
    }
    if (this.config.retryBaseDelayMs > this.config.retryMaxDelayMs) throw new TypeError('retryBaseDelayMs must not exceed retryMaxDelayMs');
    if (!Number.isSafeInteger(this.config.drainTimeoutMs) || this.config.drainTimeoutMs <= 0) {
      throw new TypeError('drainTimeoutMs must be a positive safe integer');
    }
    if (!Number.isSafeInteger(this.config.shardConcurrency) || this.config.shardConcurrency < 1) throw new TypeError('shardConcurrency must be positive');
    if (!Number.isSafeInteger(this.config.quotaWindowMaxCalls) || this.config.quotaWindowMaxCalls < 0) throw new TypeError('quotaWindowMaxCalls must be nonnegative');
    if (!Number.isSafeInteger(this.config.quotaWindowDurationMs) || this.config.quotaWindowDurationMs <= 0) throw new TypeError('quotaWindowDurationMs must be positive');
    this.currentQuotaProfile = {
      ...QUOTA_PRESETS.adaptive,
      maxCalls: this.config.quotaWindowMaxCalls,
      windowDurationMs: this.config.quotaWindowDurationMs,
    };
    this.server = http.createServer((req, res) => {
      void this.handleHttpRequest(req, res).catch(() => {
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
        if (!res.writableEnded) res.end(JSON.stringify({ error: { code: 'internal_error', message: 'Relay request failed. Inspect its trace ID.' } }));
      });
    });
    this.server.keepAliveTimeout = 300000; // 5 minutes keepalive for deep reasoning
    this.server.headersTimeout = 305000;   // 5 min + 5s buffer
    this.server.requestTimeout = 0;        // Never timeout active reasoning sockets
    this.server.maxHeadersCount = 200;

    this.server.on('connection', socket => {
      this.sockets.add(socket);
      socket.once('close', () => this.sockets.delete(socket));
    });

    this.server.on('error', (err: any) => {
      console.error('[BroccoliDB Relay] Server socket error:', err.message);
    });

    this.server.on('clientError', (err: any, socket) => {
      if (err.code === 'ECONNRESET' || !socket.writable) return;
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    // Initialize BroccoliDB Tables with Secondary & Sorted Indexes
    this.jobsTable = new BroccoliDbTable<JobRecord>('relay_jobs');
    this.jobsTable.createIndex('status');
    this.jobsTable.createIndex('model');
    this.jobsTable.createIndex('shardId');
    this.jobsTable.createSortedIndex('createdAtMs');

    this.tokensTable = new BroccoliDbTable<JobTokenRecord>('relay_tokens');
    this.tokensTable.createIndex('jobId');
    this.tokensTable.createSortedIndex('seqNo');

    this.idempotencyTable = new BroccoliDbTable<IdempotencyRecord>('relay_idempotency');

    this.shardsTable = new BroccoliDbTable<ShardRecord>('relay_shards');
    this.shardsTable.createIndex('status');
    this.shardsTable.createSortedIndex('inFlight');

    this.jobBus = new JobEventBus(
      this.jobsTable,
      this.tokensTable,
      this.config,
      () => { this.metrics.totalBusEventsEmitted++; },
      () => { this.metrics.totalSlowSubscriberDrains++; },
    );
    this.jobQueue = new JobQueue(this.jobsTable, this.jobBus, this.config.jobTokenRetentionMs);
    this.jobBus.onEvent('job:transport_token', (event) => this.handleTransportToken(event));
    this.jobBus.onEvent('job:transport_completed', (event) => this.handleTransportCompleted(event));
    this.jobBus.onEvent('job:transport_drop', (event) => this.handleTransportDrop(event));

    // Subscribe to BroccoliDB CDC Stream for Reactive Job Lifecycle Logging
    this.jobsTable.subscribe((change) => {
      if (change.after && ['completed', 'failed', 'cancelled'].includes(change.after.status)) {
        this.telemetry.finish(change.after.id, change.after.status as 'completed' | 'failed' | 'cancelled', change.after.error);
        const session = this.sessions.get(change.after.id);
        if (session) {
          for (const [key, timer] of Object.entries(session)) if (key.endsWith('Timer')) clearTimeout(timer as NodeJS.Timeout);
          this.sessions.delete(change.after.id);
        }
      }
      if (change.operation === 'UPDATE' && change.after?.status === 'completed') {
        this.emit('job:completed', change.after);
      }
    });

    this.recoverStateSnapshot();
    this.loadShardFleet();
    this.startPeriodicSnapshot();
  }

  // --------------------------------------------------------------------------
  // ZERO-TRUST SECURITY: AUTHENTICATION & RATE GOVERNANCE
  // --------------------------------------------------------------------------

  private verifyAuthorization(req: http.IncomingMessage, admin = false): boolean {
    const keys = admin ? this.config.adminApiKeys ?? [] : [...(this.config.apiKeys ?? []), ...(this.config.adminApiKeys ?? [])];
    if (!this.config.apiKeys?.length && !this.config.adminApiKeys?.length) {
      return true; // Open access in dev/local mode
    }

    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-galx-api-key'] as string;
    let providedToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.slice(7).trim();
    } else if (apiKeyHeader) {
      providedToken = apiKeyHeader.trim();
    }

    if (!providedToken) {
      this.metrics.totalAuthFailures++;
      return false;
    }

    // Timing-Safe Constant-Time Verification against configured keys
    const providedBuffer = Buffer.from(providedToken, 'utf-8');
    for (const validKey of keys) {
      const validBuffer = Buffer.from(validKey, 'utf-8');
      if (providedBuffer.length === validBuffer.length && crypto.timingSafeEqual(providedBuffer, validBuffer)) {
        this.principals.set(req, crypto.createHash('sha256').update(validKey).digest('hex'));
        return true;
      }
    }

    this.metrics.totalAuthFailures++;
    return false;
  }

  private checkTenantRateLimit(tenantId: string): boolean {
    const now = Date.now();
    let bucket = this.tenantBuckets.get(tenantId);

    if (!bucket) {
      bucket = { tokens: this.config.tenantBurstCapacity, lastRefillMs: now };
      this.tenantBuckets.set(tenantId, bucket);
    } else {
      const elapsedSec = (now - bucket.lastRefillMs) / 1000;
      bucket.tokens = Math.min(
        this.config.tenantBurstCapacity,
        bucket.tokens + elapsedSec * this.config.tenantRateLimitPerSec
      );
      bucket.lastRefillMs = now;
    }

    if (bucket.tokens >= 1.0) {
      bucket.tokens -= 1.0;
      return true;
    }

    this.metrics.totalRateLimitDrops++;
    return false;
  }

  // --------------------------------------------------------------------------
  // SHARD FLEET MANAGEMENT (Governed by BroccoliDB + Vault Decryption)
  // --------------------------------------------------------------------------

  private installFleet(items: Array<Partial<ShardRecord> & { accessToken: string; accountId: string }>): void {
    const previous = this.shardsTable.getAll();
    const seen = new Set<string>();
    const next: ShardRecord[] = [];
    // Decode expiry only as an exclusion hint; upstream still authenticates tokens.
    items = items.map(item => {
      let tokenExpiry: number | undefined;
      try {
        const exp = JSON.parse(Buffer.from(item.accessToken.split('.')[1], 'base64url').toString()).exp;
        if (typeof exp === 'number' && Number.isFinite(exp)) tokenExpiry = exp * 1000;
      } catch {}
      const expiries = [item.expiresAtMs, tokenExpiry].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      return { ...item, expiresAtMs: expiries.length ? Math.min(...expiries) : undefined };
    });
    // Prefer the newest credential for each account over expired duplicate rows.
    for (const item of [...items].sort((a, b) => (b.expiresAtMs ?? 0) - (a.expiresAtMs ?? 0))) {
      // Account identity survives token rotation and copies in multiple sources.
      const identity = item.accountId.startsWith('acc_')
        ? crypto.createHash('sha256').update(item.accessToken).digest('hex') : item.accountId;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const id = item.id || `shard_${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 16)}`;
      const old = previous.find(s => s.id === id || (s.accountId === item.accountId && !s.accountId.startsWith('acc_')) || s.accessToken === item.accessToken);
      const state = old ?? this.recoveredShardState.get(id);
      const credentialFingerprint = crypto.createHash('sha256').update(item.accessToken).digest('hex');
      const rotated = old ? old.accessToken !== item.accessToken
        : Boolean(state?.credentialFingerprint && state.credentialFingerprint !== credentialFingerprint);
      next.push({
        id: old?.id ?? id, accountId: item.accountId, accessToken: item.accessToken,
        source: item.source, expiresAtMs: item.expiresAtMs, credentialFingerprint,
        status: state?.status === 'disabled' && rotated ? 'active' : state?.status ?? item.status ?? 'active',
        consecutiveFailures: state?.consecutiveFailures ?? 0,
        quotaFailures: state?.quotaFailures ?? 0,
        lastUsedAtMs: state?.lastUsedAtMs ?? 0,
        inFlight: old?.inFlight ?? 0,
        probeInFlight: old?.probeInFlight ?? false,
        cooldownUntilMs: Math.max(state?.cooldownUntilMs ?? 0, item.cooldownUntilMs ?? 0),
        providerLimits: state?.providerLimits ?? [],
        slidingWindowTimestamps: state?.slidingWindowTimestamps ?? [],
      });
    }
    this.shardsTable.clear();
    for (const shard of next) this.shardsTable.put(shard.id, shard);
  }

  private loadShardFleet(): void {
    if (this.config.registryEnabled) return;
    const items: Array<Partial<ShardRecord> & { accessToken: string; accountId: string }> = [];
    const add = (item: any, source: string) => {
      if (!item || item.permissionRetracted || ['revoked', 'disabled', 'expired'].includes(item.status)) return;
      if (item.provider && item.provider !== 'openai') return;
      let secret = item.tokens ?? item;
      const enc = item.encryptedPayload || item.encryptedSecrets;
      if (enc && this.config.masterSecret) secret = decryptShardPayload(enc, this.config.masterSecret, item.userId, item.id, item.provider) ?? {};
      const accessToken = secret.accessToken || secret.access_token || secret.token;
      if (typeof accessToken !== 'string' || !accessToken) return;
      let accountId = secret.accountId || secret.account_id || item.accountId || item.account_id;
      try { accountId ||= JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString())['https://api.openai.com/auth']?.chatgpt_account_id; } catch {}
      let expiresAtMs = Number(secret.expiresAtMs || item.expiresAtMs) || undefined;
      try { expiresAtMs ||= JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()).exp * 1000 || undefined; } catch {}
      items.push({ id: item.id, accessToken, accountId: accountId || 'acc_unknown', source, expiresAtMs });
    };
    if (this.config.discoverHostCredentials) {
      add({ accessToken: process.env.OPENAI_ACCESS_TOKEN || process.env.CODEX_ACCESS_TOKEN, accountId: process.env.CHATGPT_ACCOUNT_ID }, 'environment');
    }
    const paths = [this.config.shardsJsonPath, ...(this.config.discoverHostCredentials ? [
      path.join(os.homedir(), '.codex', 'auth.json'),
      path.join(os.homedir(), '.lumi', 'config.json'),
      path.join(os.homedir(), '.dietcode', 'config.json'),
    ] : [])].filter(Boolean) as string[];
    for (const filename of new Set(paths)) {
      if (!fs.existsSync(filename)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        const source = path.basename(path.dirname(filename)) + '/' + path.basename(filename);
        if (Array.isArray(data)) data.forEach(item => add(item, source));
        else {
          add(data, source);
          if (data.codexOAuth) add(data.codexOAuth, source);
          if (data.codexOAuthPool) Object.values(data.codexOAuthPool).forEach(item => add(item, source));
          if (Array.isArray(data.shards)) data.shards.forEach((item: any) => add(item, source));
        }
      } catch { console.warn('[Relay:Shards] Could not read a configured credential file'); }
    }
    this.installFleet(items);
    console.log(`[Relay:Shards] Loaded ${this.shardsTable.count()} unique account(s).`);
  }

  private async refreshShardRegistry(force = false): Promise<void> {
    if (!this.config.registryEnabled) return;
    if (this.registryRefresh) return this.registryRefresh;
    if (!force && Date.now() - this.registryRefreshedAtMs < 5000) {
      if (this.registryError) throw new Error(this.registryError);
      return;
    }
    this.registryRefresh = (async () => {
      try {
        const rows = await readShardRegistry();
        const items: Array<Partial<ShardRecord> & { accessToken: string; accountId: string }> = [];
        for (const row of rows) {
          if (row.provider !== 'openai' || row.permission_retracted || !['active', 'healthy', 'warming_up', 'half_open', 'cooldown', 'exhausted', 'rate_limited'].includes(row.status)) continue;
          const secret = decryptRegistryShard(row);
          if (!secret?.accessToken || !secret?.accountId) continue;
          items.push({ id: row.id, accessToken: secret.accessToken, accountId: secret.accountId,
            source: 'PostgreSQL registry', expiresAtMs: Number(row.credential_expires_at_ms) || Number(secret.expiresAtMs) || undefined,
            cooldownUntilMs: Number(row.cooldown_until_ms) || 0,
            status: Number(row.cooldown_until_ms) > Date.now() ? 'cooldown' : 'active',
          });
        }
        this.installFleet(items);
        this.registryCounts = { total: rows.length, skipped: rows.length - items.length };
        this.registryError = null;
      } catch (error) {
        this.registryError = error instanceof Error ? error.message : 'Shard registry unavailable';
        throw error;
      } finally {
        this.registryRefreshedAtMs = Date.now();
        this.registryRefresh = undefined;
      }
    })();
    return this.registryRefresh;
  }

  private tuneSocket(ws: any): void {
    try {
      const sock = ws._socket || ws.socket || (ws._client && ws._client._socket);
      if (sock) {
        if (typeof sock.setNoDelay === 'function') {
          sock.setNoDelay(true); // Disable Nagle's algorithm for sub-millisecond token dispatch
        }
        if (typeof sock.setKeepAlive === 'function') {
          sock.setKeepAlive(true, 10_000); // 10s transport TCP keep-alive probe
        }
      }
    } catch {}
  }

  private safeCloseSocket(ws: any, code = 1000, reason = 'Normal closure'): void {
    if (!ws) return;
    try {
      // Detach listeners to prevent memory leaks and zombie callback re-entry
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (typeof ws.removeAllListeners === 'function') {
        ws.removeAllListeners();
        // terminate() can emit an asynchronous error while the handshake closes.
        ws.on('error', () => {});
      }
      if (typeof ws.terminate === 'function') {
        ws.terminate();
      } else if (typeof ws.close === 'function') {
        ws.close(code, reason);
      }
    } catch {}
  }

  private shardReadyAt(shard: ShardRecord, now = Date.now()): number {
    if (shard.status === 'disabled' || (shard.expiresAtMs && shard.expiresAtMs <= now)) return Infinity;
    let deadline = shard.cooldownUntilMs ?? 0;
    if (shard.status === 'cooldown' && !deadline) deadline = shard.lastUsedAtMs + 60_000;
    const cap = this.currentQuotaProfile.maxCalls;
    const usage = shard.slidingWindowTimestamps.filter(t => t > now - this.currentQuotaProfile.windowDurationMs);
    if (cap > 0 && usage.length >= cap) deadline = Math.max(deadline, usage[usage.length - cap] + this.currentQuotaProfile.windowDurationMs);
    return deadline;
  }

  private fleetRetryAfter(): number | null {
    const now = Date.now();
    const deadlines = this.shardsTable.getAll().map(s => this.shardReadyAt(s, now)).filter(Number.isFinite);
    return deadlines.length ? Math.max(1, Math.ceil((Math.min(...deadlines) - now) / 1000)) : null;
  }

  private acquireHealthyShard(exclude?: string | Set<string>): ShardRecord | null {
    const now = Date.now();
    if (this.config.registryEnabled && (this.registryError || now - this.registryRefreshedAtMs > 5000)) return null;
    const all = this.shardsTable.getAll();
    let candidate: ShardRecord | null = null;
    let selectedIndex = 0;
    for (let step = 0; step < all.length; step++) {
      const index = (this.shardCursor + step) % all.length;
      const shard = all[index];
      if (typeof exclude === 'string' ? shard.id === exclude : exclude?.has(shard.id)) continue;
      if (this.shardReadyAt(shard, now) > now || shard.probeInFlight || shard.inFlight >= this.config.shardConcurrency) continue;
      // After a cooldown, admit exactly one probe only when previous work drained.
      if ((shard.quotaFailures || shard.consecutiveFailures >= 3) && shard.inFlight > 0) continue;
      if (!candidate || shard.inFlight < candidate.inFlight) { candidate = shard; selectedIndex = index; }
    }
    if (!candidate) return null;
    this.shardCursor = (selectedIndex + 1) % all.length;
    const probe = Boolean(candidate.quotaFailures || candidate.consecutiveFailures >= 3);
    const updated: ShardRecord = {
      ...candidate, status: 'active', probeInFlight: probe,
      inFlight: candidate.inFlight + 1, lastUsedAtMs: now,
      slidingWindowTimestamps: [...candidate.slidingWindowTimestamps.filter(t => t > now - this.currentQuotaProfile.windowDurationMs), now],
      providerLimits: (candidate.providerLimits ?? []).filter(l => !l.resetAtMs || l.resetAtMs > now).map(l => ({
        ...l, remaining: /request/i.test(l.name) ? Math.max(0, l.remaining - 1) : l.remaining,
      })),
    };
    const depleted = (updated.providerLimits ?? []).filter(l => l.remaining === 0);
    if (depleted.length) {
      updated.cooldownUntilMs = Math.max(updated.cooldownUntilMs ?? 0, ...depleted.map(l => l.resetAtMs ?? now + 60_000));
      updated.status = 'cooldown';
      updated.quotaFailures = Math.max(1, updated.quotaFailures ?? 0);
    }
    this.shardsTable.put(updated.id, updated);
    return updated;
  }

  private recordQuotaFailure(shardId: string, providerDeadline?: number, release = true): void {
    const shard = this.shardsTable.get(shardId);
    if (!shard) return;
    const failures = (shard.quotaFailures ?? 0) + 1;
    this.shardsTable.put(shardId, { ...shard,
      status: shard.status === 'disabled' ? 'disabled' : 'cooldown', quotaFailures: failures, probeInFlight: false,
      inFlight: Math.max(0, shard.inFlight - (release ? 1 : 0)),
      cooldownUntilMs: Math.max(shard.cooldownUntilMs ?? 0, cooldownDeadline(failures, Date.now(), providerDeadline)),
    });
  }

  private recordShardFailure(shardId: string, unauthorized = false): void {
    const shard = this.shardsTable.get(shardId);
    if (!shard) return;
    const failures = shard.consecutiveFailures + 1;
    this.shardsTable.put(shardId, { ...shard,
      inFlight: Math.max(0, shard.inFlight - 1), probeInFlight: false,
      consecutiveFailures: failures,
      status: unauthorized || shard.status === 'disabled' ? 'disabled' : failures >= 3 ? 'cooldown' : shard.status,
      cooldownUntilMs: failures >= 3 ? Math.max(shard.cooldownUntilMs ?? 0, cooldownDeadline(failures - 2, Date.now())) : shard.cooldownUntilMs,
    });
    if (unauthorized) this.saveStateSnapshot();
  }

  private releaseShard(shardId: string, succeeded = false): void {
    const shard = this.shardsTable.get(shardId);
    if (shard && shard.inFlight > 0) this.shardsTable.put(shardId, { ...shard,
      inFlight: shard.inFlight - 1, probeInFlight: false,
      ...(succeeded && (shard.cooldownUntilMs ?? 0) <= Date.now() ? { consecutiveFailures: 0, quotaFailures: 0, status: shard.status === 'disabled' ? 'disabled' as const : 'active' as const } : {}),
    });
  }

  private getRateLimitHeaders(): Record<string, string> {
    const cap = this.currentQuotaProfile.maxCalls;
    return {
      'X-RateLimit-Mode': this.currentQuotaProfile.mode,
      'X-RateLimit-Policy': cap > 0 ? `${cap};w=${this.currentQuotaProfile.windowDurationMs / 1000}` : 'provider-feedback;local-cap=none',
      ...(cap > 0 ? { 'X-RateLimit-Limit': String(cap * this.shardsTable.count()) } : {}),
    };
  }

  private rejectUnavailableFleet(res: http.ServerResponse): void {
    const retry = this.fleetRetryAfter();
    res.writeHead(503, { 'Content-Type': 'application/json', ...(retry === null ? {} : { 'Retry-After': String(retry) }), ...this.getRateLimitHeaders() });
    res.end(JSON.stringify({ error: {
      code: 'all_shards_unavailable',
      message: retry === null ? 'No usable credentials. Refresh or enroll an account.' : `No shard is ready. Retry after ${retry}s.`,
      retry_after_seconds: retry,
    } }));
  }

  // --------------------------------------------------------------------------
  // HTTP INGRESS ROUTER
  // --------------------------------------------------------------------------

  private admissionState() {
    const rssBytes = process.memoryUsage().rss;
    const reason = this.isDraining ? 'server_draining'
      : rssBytes >= this.config.maxRssBytes ? 'relay_memory_pressure'
      : this.admittedRequests >= this.config.maxConcurrentRequests ? 'relay_overloaded' : null;
    return { accepting: reason === null, reason, activeRequests: this.admittedRequests,
      maxConcurrentRequests: this.config.maxConcurrentRequests, rssBytes, maxRssBytes: this.config.maxRssBytes };
  }

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const method = req.method?.toUpperCase() || 'GET';

    const isInference = method === 'POST' && /^\/(v1\/)?(chat\/completions|images\/generations)$/.test(pathname);
    if (isInference) {
      const traceId = this.telemetry.start(pathname.includes('images') ? 'Image generation' : 'Chat completion', req.headers['x-galx-task-id']);
      this.requestTraces.set(req, traceId);
      res.setHeader('X-Galx-Trace-Id', traceId);
      res.once('finish', () => {
        this.telemetry.http(traceId, res.statusCode);
        if (res.statusCode !== 202) this.telemetry.finish(traceId, res.statusCode < 400 ? 'completed' : 'failed',
          res.statusCode >= 400 ? `http_${res.statusCode}` : undefined,
          [400, 401, 408, 409, 413, 422].includes(res.statusCode) ? 'client' : 'relay');
      });
      res.once('close', () => {
        if (!res.writableFinished) this.telemetry.finish(traceId, 'cancelled', 'client_disconnect', 'client');
      });
    }
    res.setHeader('Access-Control-Expose-Headers', 'X-Galx-Trace-Id, X-Galx-Job-Id, Retry-After, Location, Operation-Location');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
    res.setHeader('Vary', 'Origin');
    const authenticatedMode = Boolean(this.config.apiKeys?.length || this.config.adminApiKeys?.length);
    let host: URL;
    try { host = new URL(`http://${req.headers.host}`); } catch {
      res.writeHead(400); res.end('Invalid Host header'); return;
    }
    if (!authenticatedMode && !['localhost', '127.0.0.1', '[::1]'].includes(host.hostname)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'untrusted_host', message: 'Local unauthenticated access requires a loopback hostname.' } })); return;
    }
    const origin = req.headers.origin;
    const sameOrigin = origin === `http://${host.host}` || origin === `https://${host.host}`;
    const allowedOrigin = typeof origin === 'string' && (sameOrigin || (authenticatedMode && this.config.allowedOrigins?.includes(origin)));
    if ((origin && !allowedOrigin) || (!origin && req.headers['sec-fetch-site'] === 'cross-site')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'origin_not_allowed', message: 'This browser origin is not allowed to access the relay.' } })); return;
    }
    if (origin && allowedOrigin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID, X-Requested-With, X-Tenant-Id, X-Galx-Api-Key, X-Galx-Task-Id, Idempotency-Key');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/health' || pathname === '/health/ready' || pathname === '/health/live') {
      this.handleHealth(res, pathname === '/health/ready');
      return;
    }

    if (pathname === '/telemetry' || pathname === '/telemetry/') {
      this.handleDashboard(res, 'telemetry.html');
      return;
    }

    if (pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/') {
      this.handleDashboard(res);
      return;
    }

    if (!this.verifyAuthorization(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Invalid or missing API key' } }));
      return;
    }
    if ((pathname.startsWith('/api/') || pathname === '/metrics') && !this.verifyAuthorization(req, true)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'admin_access_required', message: 'Use a relay administrator key for fleet controls and telemetry.' } })); return;
    }
    if (pathname.startsWith('/api/') && !this.checkTenantRateLimit(`admin:${this.principals.get(req) ?? req.socket.remoteAddress}`)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
      res.end(JSON.stringify({ error: { code: 'management_rate_limited', message: 'Too many management requests. Retry after one second.' } })); return;
    }
    if (pathname === '/metrics') { this.handleMetrics(res); return; }
    if (pathname === '/api/telemetry' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ...this.telemetry.snapshot(), server: { admission: this.admissionState(), uptimeSec: process.uptime(), rssBytes: process.memoryUsage().rss, retryBudget: this.retryBudget.snapshot(), eventLoopP99Ms: this.eventLoopDelay.count ? this.eventLoopDelay.percentile(99) / 1e6 : null } }));
      return;
    }
    if (isInference || (method === 'POST' && pathname.startsWith('/api/'))) {
      const admission = this.admissionState();
      if (!admission.accepting) {
        const traceId = this.requestTraces.get(req);
        if (traceId) this.telemetry.finish(traceId, 'failed', admission.reason!, 'relay');
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '2', 'Connection': 'close' });
        res.end(JSON.stringify({ error: { code: admission.reason, message: admission.reason === 'server_draining'
          ? 'Relay is restarting. Retry after 2 seconds.'
          : 'Relay is at capacity. Retry after 2 seconds; no provider request was started.' } }));
        return;
      }
      this.admittedRequests++;
      let released = false;
      const release = () => { if (!released) { released = true; this.admittedRequests--; } };
      res.once('finish', release); res.once('close', release);
    }
    // Job controls must remain available when credential discovery is down.
    try { if (isInference || pathname.startsWith('/api/')) await this.refreshShardRegistry(); }
    catch {
      if (!pathname.startsWith('/api/')) {
        const traceId = this.requestTraces.get(req);
        if (traceId) this.telemetry.finish(traceId, 'failed', 'shard_registry_unavailable');
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '5' });
        res.end(JSON.stringify({ error: { code: 'shard_registry_unavailable', message: 'Shard registry unavailable. Retry after 5s.' } }));
        return;
      }
    }

    if (pathname === '/api/dashboard/stats') {
      this.handleDashboardStats(res);
      return;
    }

    if (pathname === '/api/quota/profile' && method === 'POST') {
      await this.handleSetQuotaProfile(req, res);
      return;
    }

    if (pathname === '/api/quota/reset' && method === 'POST') {
      await this.handleResetQuota(req, res);
      return;
    }

    if (pathname === '/api/quota/status' && method === 'GET') {
      this.handleQuotaStatus(res);
      return;
    }

    if (pathname === '/api/shards/sync' && method === 'POST') {
      await this.handleSyncShards(req, res);
      return;
    }

    if (pathname === '/api/shards/enroll' && method === 'POST') {
      await this.handleEnrollShard(req, res);
      return;
    }

    if (pathname === '/api/shards' && method === 'GET') {
      this.handleListShards(res);
      return;
    }

    // Multi-Tenant Rate Limiting Gate
    const tenantId = this.principals.get(req) || req.socket.remoteAddress || 'tenant_default';
    if (!this.checkTenantRateLimit(tenantId)) {
      const traceId = this.requestTraces.get(req);
      if (traceId) this.telemetry.finish(traceId, 'failed', 'relay_rate_limited', 'relay');
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': '1',
        ...this.getRateLimitHeaders(),
      });
      res.end(JSON.stringify({ error: { message: 'Rate limit exceeded. Please retry in 1s.', code: 'rate_limited' } }));
      return;
    }

    if (this.isDraining && isInference) {
      const traceId = this.requestTraces.get(req);
      if (traceId) this.telemetry.finish(traceId, 'failed', 'server_draining');
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Relay server is draining for reload', code: 'server_draining' } }));
      return;
    }

    if (method === 'POST' && (pathname === '/v1/chat/completions' || pathname === '/chat/completions')) {
      await this.handleChatCompletions(req, res, tenantId);
      return;
    }

    if (method === 'POST' && (pathname === '/v1/images/generations' || pathname === '/images/generations')) {
      await this.handleImageGenerations(req, res, tenantId);
      return;
    }

    const ownedJobRoute = pathname.match(/^\/v1\/jobs\/([^/]+)(?:\/(?:stream|cancel))?$/);
    if (ownedJobRoute) {
      const job = this.jobsTable.get(ownedJobRoute[1]);
      if (!job || job.tenantId !== tenantId) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'job_not_found', message: 'Job not found or no longer retained.' } }));
        return;
      }
    }
    const streamMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/stream$/);
    if (method === 'GET' && streamMatch) {
      const jobId = streamMatch[1];
      this.handleJobStream(jobId, req, res, parsedUrl.query);
      return;
    }

    const jobMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
    if (method === 'GET' && jobMatch) {
      const jobId = jobMatch[1];
      this.handleJobStatus(jobId, res);
      return;
    }

    const cancelMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      const jobId = cancelMatch[1];
      this.handleJobCancel(jobId, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `Route not found: ${method} ${pathname}`, code: 'not_found' } }));
  }

  // --------------------------------------------------------------------------
  // ATOMIC IDEMPOTENT ATTACHMENT & HTTP 202 ASYNC DECOUPLING
  // --------------------------------------------------------------------------

  private async handleChatCompletions(req: http.IncomingMessage, res: http.ServerResponse, tenantId: string): Promise<void> {
    try {
        const body = await readJsonBody(req, this.config.maxPayloadBytes, this.config.httpBodyTimeoutMs);
        if (this.isDraining) throw new RequestError(503, 'server_draining', 'Relay is restarting. Submit the request again after it is ready.');
        validateModelRequest(body, false);
        const requestedModel = body.model || 'gpt-5.6-terra';
        // ChatGPT session tokens support gpt-5.6-terra, gpt-5.6-luna; map sol -> terra for OAuth scope compliance
        const model = requestedModel === 'gpt-5.6-sol' ? 'gpt-5.6-terra' : requestedModel;
        this.telemetry.model(this.requestTraces.get(req), requestedModel, model);
        const messages = body.messages || [{ role: 'user', content: 'Hello' }];
        const prompt = messages[messages.length - 1]?.content || '';
        const reasoningEffort = body.reasoning_effort || body.reasoningEffort || 'medium';

        // Atomic Idempotent Stream Attachment via BroccoliDB
        const promptHash = crypto.createHash('sha256').update(JSON.stringify([tenantId, model, reasoningEffort, body.max_tokens ?? 3500, messages])).digest('hex');
        const existingIdempotency = this.idempotencyTable.get(promptHash);

        if (existingIdempotency) {
          const existingJob = this.jobsTable.get(existingIdempotency.jobId);
          if (existingJob && (existingJob.status === 'queued' || existingJob.status === 'running' || existingJob.status === 'streaming')) {
            this.metrics.totalAttachedDuplicates++;
            const duplicateTrace = this.requestTraces.get(req);
            if (duplicateTrace) {
              this.telemetry.attach(duplicateTrace, existingJob.id);
            }
            const streamUrl = `/v1/jobs/${existingJob.id}/stream`;
            res.writeHead(202, {
              'Content-Type': 'application/json',
              'Location': streamUrl,
              'X-Attached-Stream': 'true',
              'X-Galx-Job-Id': existingJob.id,
              'Operation-Location': `/v1/jobs/${existingJob.id}`,
              'Retry-After': '2',
              ...this.getRateLimitHeaders(),
            });
            res.end(JSON.stringify({
              id: existingJob.id,
              object: 'chat.completion.job',
              status: existingJob.status,
              model: existingJob.model,
              streamUrl,
              isAttachedDuplicate: true,
              statusUrl: `/v1/jobs/${existingJob.id}`,
              traceId: this.requestTraces.get(req),
              pollAfterMs: 2000,
              queuePosition: null,
              estimatedWaitSec: null,
              createdAt: Math.floor(existingJob.createdAtMs / 1000),
            }));
            return;
          }
        }

        if (!this.shardsTable.getAll().some(s => this.shardReadyAt(s) <= Date.now() && !s.probeInFlight && s.inFlight < this.config.shardConcurrency)) {
          const traceId = this.requestTraces.get(req);
          if (traceId) this.telemetry.finish(traceId, 'failed', 'all_shards_unavailable');
          this.rejectUnavailableFleet(res);
          return;
        }

        // Register Fresh Job in BroccoliDB
        const jobId = `job_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
        const jobRecord: JobRecord = {
          id: jobId,
          model,
          prompt,
          promptHash,
          tenantId,
          messagesJson: JSON.stringify(messages),
          reasoningEffort,
          status: 'queued',
          createdAtMs: Date.now(),
          seqCounter: 0,
          isDetached: false,
          estimatedTokens: body.max_tokens || 3500,
        };

        const traceId = this.requestTraces.get(req);
        if (traceId) { jobRecord.traceId = traceId; this.telemetry.bind(traceId, jobId); this.telemetry.phase(traceId, 'Shard selection', 'relay'); }
        this.jobQueue.enqueue(jobRecord);
        this.idempotencyTable.put(promptHash, { id: promptHash, jobId, createdAtMs: Date.now() }, { ttlMs: this.config.idempotencyTtlMs });

        const session: TransientJobSession = {
          abortController: new AbortController(),
          lastChunkAtMs: 0,
          ewmaItlMs: 0,
          consecutiveItlStalls: 0,
          retryCount: 0,
          lastSeenAliveMs: Date.now(),
          activeTtftDeadlineMs: this.config.wsTtftTimeoutMs,
          activeAttemptId: 0,
          attemptedShardIds: new Set(),
        };

        // Layer 6: Absolute Wall Clock Ceiling (300s) attached to session across failovers
        session.wallTimer = setTimeout(() => {
          if (this.jobQueue.markFailed(jobId, 'job_wall_time_exceeded')) this.metrics.totalJobsFailed++;
          if (session.downstreamFailoverKeepaliveTimer) {
            clearInterval(session.downstreamFailoverKeepaliveTimer);
            session.downstreamFailoverKeepaliveTimer = undefined;
          }
          session.abortController.abort(new Error('Job wall time exceeded 300s'));
          this.safeCloseSocket(session.upstreamWs);
          if (session.currentShardId) {
            this.releaseShard(session.currentShardId);
          }
        }, this.config.jobMaxWallTimeMs);

        this.sessions.set(jobId, session);

        this.metrics.totalJobsSubmitted++;
        this.dispatchJobToUpstream(jobId);

        const streamUrl = `/v1/jobs/${jobId}/stream`;
        res.writeHead(202, {
          'Content-Type': 'application/json',
          'Location': streamUrl,
          'X-Galx-Job-Id': jobId,
          'Operation-Location': `/v1/jobs/${jobId}`,
          'Retry-After': '2',
          ...this.getRateLimitHeaders(),
        });
        res.end(JSON.stringify({
          id: jobId,
          object: 'chat.completion.job',
          status: 'queued',
          model,
          streamUrl,
          isAttachedDuplicate: false,
          statusUrl: `/v1/jobs/${jobId}`,
          traceId: this.requestTraces.get(req),
          pollAfterMs: 2000,
          queuePosition: null,
          estimatedWaitSec: null,
          createdAt: Math.floor(jobRecord.createdAtMs / 1000),
        }));
      } catch (err: unknown) {
        if (res.writableEnded || res.destroyed) return;
        const failure = err instanceof RequestError ? err : new RequestError(500, 'internal_error', 'Relay could not process this request. Use the trace ID to investigate.');
        res.writeHead(failure.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: failure.message, code: failure.code } }));
      }
  }

  // --------------------------------------------------------------------------
  // LIVE WIRE IMAGE GENERATION & SYNTHESIS GATEWAY
  // --------------------------------------------------------------------------

  private async handleImageGenerations(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    tenantId: string
  ): Promise<void> {
    try {
        const body = await readJsonBody(req, this.config.maxPayloadBytes, this.config.httpBodyTimeoutMs);
        if (this.isDraining) throw new RequestError(503, 'server_draining', 'Relay is restarting. Submit the request again after it is ready.');
        validateModelRequest(body, true);
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Missing required parameter: prompt', code: 'missing_prompt' } }));
          return;
        }

        const requestedModel = body.model || 'gpt-5.6-terra';
        // Map any DALL-E / GPT-Image alias to gpt-5.6-terra for Codex OAuth backend compatibility
        const model = (requestedModel === 'gpt-5.6-sol' || requestedModel.startsWith('dall-e') || requestedModel.startsWith('gpt-image'))
          ? 'gpt-5.6-terra'
          : requestedModel;

        const suppliedKey = req.headers['idempotency-key'] || body.idempotency_key;
        if (suppliedKey && (typeof suppliedKey !== 'string' || suppliedKey.length > 128)) throw new RequestError(400, 'invalid_request', 'Idempotency-Key must have at most 128 characters.');
        const imageFingerprint = crypto.createHash('sha256').update(JSON.stringify([prompt, requestedModel, body.size, body.quality, body.n, body.response_format])).digest('hex');
        const idempotencyKey = suppliedKey ? crypto.createHash('sha256').update(JSON.stringify(['image', tenantId, suppliedKey])).digest('hex') : undefined;
        if (idempotencyKey) {
          const cached = this.idempotencyTable.get(idempotencyKey);
          if (cached && (cached as any).imageFingerprint !== imageFingerprint) throw new RequestError(409, 'idempotency_conflict', 'This idempotency key was used with different image parameters. Use a new key.');
          if (this.pendingImages.has(idempotencyKey)) {
            res.setHeader('Retry-After', '2');
            throw new RequestError(409, 'image_request_in_progress', 'An image request with this key is already in progress. Retry with the same key after 2 seconds.');
          }
          if (cached && (cached as any).imageResponse) {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Galx-Idempotency-Hit': 'true',
            });
            res.end(JSON.stringify((cached as any).imageResponse));
            return;
          }
        }

        const traceId = this.requestTraces.get(req);
        this.telemetry.model(traceId, requestedModel, model);
        this.metrics.totalImageJobsSubmitted++;

        if (idempotencyKey) this.pendingImages.set(idempotencyKey, imageFingerprint);
        let shardId: string;
        const controller = new AbortController();
        this.imageControllers.add(controller);
        const deadline = setTimeout(() => controller.abort(new Error('image_wall_time_exceeded')), this.config.jobMaxWallTimeMs);
        const onClose = () => { if (!res.writableFinished) controller.abort(new Error('client_disconnect')); };
        res.once('close', onClose);
        try {
          const dispatched = await this.synthesizeImageWithFailover(prompt, body, model, traceId, controller.signal);
          const synthesisResult = dispatched.result;
          shardId = dispatched.shardId;
          if (res.destroyed || controller.signal.aborted) return;
          this.metrics.totalImageJobsCompleted++;
          if (traceId) this.telemetry.finish(traceId, 'completed');

          const responseData = {
            created: Math.floor(Date.now() / 1000),
            data: [
              {
                b64_json: synthesisResult.b64_json,
                revised_prompt: synthesisResult.revised_prompt || prompt,
              },
            ],
            model: requestedModel,
          };

          if (idempotencyKey) {
            this.idempotencyTable.put(idempotencyKey, {
              id: idempotencyKey,
              jobId: `img_${Date.now()}`,
              createdAtMs: Date.now(),
              imageResponse: responseData,
              imageFingerprint,
            } as any, { ttlMs: this.config.idempotencyTtlMs });
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Galx-Shard-Id': shardId,
            ...this.getRateLimitHeaders(),
          });
          res.end(JSON.stringify(responseData));
        } catch (err: any) {
          this.metrics.totalImageJobsFailed++;
          if (traceId) this.telemetry.finish(traceId, 'failed', controller.signal.aborted ? String(controller.signal.reason?.message || 'image_wall_time_exceeded') : err.telemetryReason || err.message);
          if (res.destroyed || res.writableEnded) return;
          if (err.message === 'all_shards_unavailable') { this.rejectUnavailableFleet(res); return; }
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: {
              message: 'Image generation failed. Inspect the trace for provider, connection or deadline evidence.',
              code: 'upstream_image_synthesis_failed',
            },
          }));
        } finally {
          clearTimeout(deadline);
          res.off('close', onClose);
          this.imageControllers.delete(controller);
          if (idempotencyKey) this.pendingImages.delete(idempotencyKey);
        }
      } catch (err: unknown) {
        if (res.writableEnded || res.destroyed) return;
        const failure = err instanceof RequestError ? err : new RequestError(500, 'internal_error', 'Relay could not process this request. Use the trace ID to investigate.');
        res.writeHead(failure.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: failure.message, code: failure.code } }));
      }
  }

  private async synthesizeImageWithFailover(prompt: string, body: Record<string, unknown>, model: string, traceId?: string, signal: AbortSignal = AbortSignal.timeout(this.config.jobMaxWallTimeMs)) {
    const attempted = new Set<string>();
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxUpstreamRetries; attempt++) {
      signal.throwIfAborted();
      await this.refreshShardRegistry();
      signal.throwIfAborted();
      const shard = this.acquireHealthyShard(attempted);
      if (!shard) throw new Error('all_shards_unavailable');
      attempted.add(shard.id);
      this.telemetry.attempt(traceId, shard.id, shard.accessToken.startsWith('sk-') ? 'http' : 'websocket');
      if (shard.accessToken.startsWith('sk-')) this.telemetry.model(traceId, body.model, body.model || 'dall-e-3');
      try {
        const result = shard.accessToken.startsWith('sk-')
          ? await this.synthesizeImageViaOpenAiRest(prompt, body, shard.accessToken, signal)
          : await this.synthesizeImageViaCodex(prompt, model, shard, traceId, signal);
        this.releaseShard(shard.id, true);
        this.retryBudget.success();
        return { result, shardId: shard.id };
      } catch (error: any) {
        if (signal.aborted) { this.releaseShard(shard.id); throw signal.reason; }
        const failure = classifyUpstreamError(error.upstream ?? { message: error.message });
        error.telemetryReason = error.upstream ? `upstream_error_${failure.code}` : error.message;
        this.telemetry.failedAttempt(traceId, error.telemetryReason);
        if (!failure.retryable) { this.releaseShard(shard.id); throw error; }
        if (failure.quota) this.recordQuotaFailure(shard.id, failure.deadline);
        else this.recordShardFailure(shard.id, failure.unauthorized);
        lastError = error;
        if (attempt < this.config.maxUpstreamRetries) {
          if (!this.retryBudget.take()) throw new Error('relay_retry_budget_exhausted');
          const backoff = Math.floor(Math.random() * (Math.min(this.config.retryMaxDelayMs, this.config.retryBaseDelayMs * 2 ** attempt) + 1));
          await delay(backoff, undefined, { signal });
        }
      }
    }
    throw lastError;
  }

  private synthesizeImageViaCodex(
    prompt: string,
    model: string,
    shard: ShardRecord,
    traceId?: string,
    signal?: AbortSignal
  ): Promise<{ b64_json: string; revised_prompt?: string }> {
    return new Promise((resolve, reject) => {
      const WebSocketClass = WebSocket;
      if (!WebSocketClass) {
        return reject(new Error('WebSocket runtime is missing in environment'));
      }

      const wsHeaders: Record<string, string> = {
        Authorization: `Bearer ${shard.accessToken}`,
        'User-Agent': 'Codex-CLI/0.150.1 (darwin; arm64)',
        'X-Codex-Originator': 'codex_cli',
        'OpenAI-Beta': 'responses_websockets=2026-02-06',
        'X-OpenAI-Product-Sku': 'codex',
        'ChatGPT-Account-Id': shard.accountId,
      };

      let ws: any;
      let settled = false;
      let pingInterval: NodeJS.Timeout | null = null;
      let watchdogTimer: NodeJS.Timeout | null = null;

      let b64Result = '';
      let revisedPrompt = '';

      const onAbort = () => finishError(signal?.reason || new Error('image_cancelled'));
      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        if (ws) {
          this.safeCloseSocket(ws, 1000, 'Image synthesis complete');
        }
      };

      const finishSuccess = (b64: string, revised?: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ b64_json: b64, revised_prompt: revised });
      };

      const finishError = (err: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      };

      if (signal?.aborted) { onAbort(); return; }
      signal?.addEventListener('abort', onAbort, { once: true });

      // Watchdog timeout (90s ceiling for neural visual synthesis)
      watchdogTimer = setTimeout(() => {
        finishError(new Error('Upstream visual synthesis timed out after 90s'));
      }, 90_000);

      try {
        ws = new WebSocketClass(this.config.wsEndpoint, { headers: wsHeaders, maxPayload: this.config.maxPayloadBytes, followRedirects: false });
        ws.on('unexpected-response', (_request: unknown, response: http.IncomingMessage) => {
          response.resume();
          finishError(Object.assign(new Error(`Upstream HTTP ${response.statusCode}`), {
            upstream: { status: response.statusCode, headers: { 'retry-after': response.headers['retry-after'] } },
          }));
        });
        this.tuneSocket(ws);
      } catch (err: any) {
        return finishError(err);
      }

      ws.onopen = () => {
        this.telemetry.phase(traceId, 'Generate image (includes network)', 'provider');
        pingInterval = setInterval(() => {
          try {
            if (typeof ws.ping === 'function') {
              ws.ping();
            }
          } catch {}
        }, 15_000);

        const initPayload = {
          type: 'response.create',
          model: model || 'gpt-5.6-terra',
          stream: true,
          input: [
            {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: prompt,
                },
              ],
            },
          ],
          tools: [
            {
              type: 'image_generation',
            },
          ],
        };

        try {
          ws.send(JSON.stringify(initPayload));
        } catch (err: any) {
          finishError(new Error(`Failed to send initial image request frame: ${err.message}`));
        }
      };

      ws.onmessage = (event: any) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data?.toString?.('utf-8');
          if (!raw) return;
          const frame = JSON.parse(raw);

          // Capture image result from completed image_generation_call output item
          if (frame.type === 'response.output_item.done' && frame.item?.type === 'image_generation_call') {
            if (frame.item.result) {
              b64Result = frame.item.result;
            }
            if (frame.item.revised_prompt) {
              revisedPrompt = frame.item.revised_prompt;
            }
          }

          if (frame.type === 'response.completed' || frame.type === 'response.done') {
            if (b64Result) {
              finishSuccess(b64Result, revisedPrompt);
            } else {
              finishError(new Error('Codex completed stream without returning image data'));
            }
          }

          if (frame.type === 'error' || (frame.type === 'response.failed' && frame.response?.error)) {
            const errorMsg = frame.error?.message || frame.response?.error?.message || JSON.stringify(frame);
            finishError(Object.assign(new Error(`Codex WebSocket error: ${errorMsg}`), { upstream: frame }));
          }
        } catch (err: any) {
          // Ignore partial non-JSON frames
        }
      };

      ws.onerror = (err: any) => {
        finishError(new Error(`Codex WebSocket transport error: ${err.message || 'connection failed'}`));
      };

      ws.onclose = (event: any) => {
        if (!settled) {
          if (b64Result) {
            finishSuccess(b64Result, revisedPrompt);
          } else {
            finishError(new Error(`Codex WebSocket closed prematurely (code: ${event?.code || 1006}, reason: ${event?.reason || 'none'})`));
          }
        }
      };
    });
  }

  private async synthesizeImageViaOpenAiRest(
    prompt: string,
    body: Record<string, unknown>,
    apiKey: string,
    signal: AbortSignal = AbortSignal.timeout(this.config.jobMaxWallTimeMs)
  ): Promise<{ b64_json: string; revised_prompt?: string }> {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      signal,
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: body.model || 'dall-e-3',
        size: body.size || '1024x1024',
        quality: body.quality || 'standard',
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw Object.assign(new Error(`OpenAI REST returned ${resp.status}: ${errText}`), { upstream: { status: resp.status, headers: { 'retry-after': resp.headers.get('retry-after') } } });
    }

    const data = await resp.json() as any;
    const item = data.data?.[0];
    if (!item?.b64_json) {
      throw new Error('OpenAI REST response did not contain b64_json');
    }

    return {
      b64_json: item.b64_json,
      revised_prompt: item.revised_prompt,
    };
  }

  // --------------------------------------------------------------------------
  // RESUMABLE SSE STREAM BUS (W3C Last-Event-ID + BroccoliDB Replay)
  // --------------------------------------------------------------------------

  private handleJobStream(
    jobId: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    query: Record<string, string | string[] | undefined>
  ): void {
    const job = this.jobsTable.get(jobId);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Job ${jobId} not found`, code: 'job_not_found' } }));
      return;
    }

    const session = this.sessions.get(jobId);

    const lastEventIdHeader = req.headers['last-event-id'];
    const cursor = lastEventIdHeader ?? query['last_event_id'] ?? '0';
    const lastSeqNo = Number(cursor);
    if (typeof cursor !== 'string' || !/^\d+$/.test(cursor) || !Number.isSafeInteger(lastSeqNo) || lastSeqNo > job.seqCounter) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'invalid_replay_cursor', message: 'Last-Event-ID must be a nonnegative sequence number already emitted by this job.' } }));
      return;
    }
    const firstRetained = this.tokensTable.query({ where: { jobId }, sortBy: 'seqNo', sortOrder: 'asc', limit: 1 })[0];
    if (lastSeqNo < job.seqCounter && (!firstRetained || lastSeqNo < firstRetained.seqNo - 1)) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'replay_window_expired', message: 'Earlier output is no longer retained. Start a new request; replaying this cursor would omit output.' } }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Galx-Transport': 'broccolidb-resumable-sse-bus',
    });

    let unsubscribe: () => void;
    try {
      unsubscribe = this.jobBus.subscribe(jobId, res);
    } catch {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'job_subscriber_limit_exceeded' })}\n\n`);
      res.end();
      return;
    }
    if (job.isDetached && session?.graceTimer) {
      clearTimeout(session.graceTimer);
      session.graceTimer = undefined;
      this.jobQueue.setDetached(jobId, false);
      this.metrics.totalGraceReconnectionsWon++;
      this.metrics.totalReconnections++;
    }

    this.jobBus.replay(jobId, res, lastSeqNo, () => this.metrics.totalTokensServedFromBuffer++);

    if (job.status === 'completed') {
      this.jobBus.sendToSubscriber(jobId, res, 'data: [DONE]\n\n', true);
      return;
    }
    if (job.status === 'failed') {
      this.jobBus.sendToSubscriber(
        jobId,
        res,
        `event: error\ndata: ${JSON.stringify({ error: job.error || job.status })}\n\n`,
        true,
      );
      return;
    }
    if (job.status === 'cancelled') {
      this.jobBus.sendToSubscriber(
        jobId,
        res,
        `event: cancelled\ndata: ${JSON.stringify({ status: 'cancelled', reason: job.error })}\n\n`,
        true,
      );
      return;
    }

    // Edge Keepalive Heartbeats (: ping\n\n) to defeat Cloudflare 100s idle drops
    const keepaliveTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(keepaliveTimer);
        return;
      }
      this.jobBus.sendToSubscriber(jobId, res, ': ping\n\n');
    }, this.config.sseKeepaliveIntervalMs);

    // Two-Tier Disconnect Protocol: 15s Grace Window for dirty drops
    req.on('close', () => {
      clearInterval(keepaliveTimer);
      unsubscribe();
      if (session) {
        if (this.jobBus.subscriberCount(jobId) === 0) {
          const latestJob = this.jobsTable.get(jobId);
          if (latestJob && (latestJob.status === 'running' || latestJob.status === 'streaming')) {
            this.jobQueue.setDetached(jobId, true);
            this.metrics.totalGracePeriodsEntered++;

            session.graceTimer = setTimeout(() => {
              const currentJob = this.jobsTable.get(jobId);
              if (currentJob && currentJob.isDetached && this.jobBus.subscriberCount(jobId) === 0) {
                // Hard Abort on Grace Window Expiry (Anti-Zombie Leash)
                this.metrics.totalZombieLeashAborts++;
                if (this.jobQueue.markCancelled(jobId, 'client_disconnect_grace_expired')) {
                  this.metrics.totalJobsCancelled++;
                }
                session.abortController.abort(new Error('Client disconnect grace window expired'));
                this.safeCloseSocket(session.upstreamWs);
                if (session.currentShardId) {
                  this.releaseShard(session.currentShardId);
                  session.currentShardId = undefined;
                }
              }
            }, this.config.clientDisconnectGraceMs);
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // UPSTREAM CODEX WEBSOCKET CLIENT & 7-LAYER TIMEOUT CONTROLLER
  // --------------------------------------------------------------------------

  private async dispatchJobToUpstream(jobId: string): Promise<void> {
    const session = this.sessions.get(jobId);
    if (!session) return;
    if (session.abortController.signal.aborted) return;
    const queuedJob = this.jobsTable.get(jobId);
    if (!queuedJob) return;

    try { await this.refreshShardRegistry(); } catch {
      if (this.jobQueue.markFailed(jobId, 'shard_registry_unavailable')) this.metrics.totalJobsFailed++;
      return;
    }
    if (session.abortController.signal.aborted || this.sessions.get(jobId) !== session) return;
    // Acquire healthy shard (exclude every previously attempted account)
    const shard = this.acquireHealthyShard(session.attemptedShardIds);
    if (!shard) {
      if (this.jobQueue.markFailed(jobId, 'all_shards_exhausted')) this.metrics.totalJobsFailed++;
      return;
    }

    session.currentShardId = shard.id;
    session.attemptedShardIds.add(shard.id);
    session.lastSeenAliveMs = Date.now();
    const job = this.jobQueue.acquireForDispatch(jobId, shard.id, session.retryCount);
    if (!job) {
      this.releaseShard(shard.id);
      return;
    }
    const attempt: TransportAttempt = {
      id: ++session.activeAttemptId,
      shardId: shard.id,
      hasReceivedFirstToken: false,
      heartbeatPending: false,
      completionObserved: false,
      isFirstChunkAfterFailover: false,
    };

    await this._openUpstreamTransport(job, shard, attempt);
  }

  private async _openUpstreamTransport(
    job: JobRecord,
    shard: ShardRecord,
    attempt: TransportAttempt,
  ): Promise<void> {
    const session = this.sessions.get(job.id);
    if (!session || session.abortController.signal.aborted || session.activeAttemptId !== attempt.id) return;

    this.telemetry.attempt(job.id, shard.id);
    const WebSocketClass = WebSocket;
    if (!WebSocketClass) {
      if (session.downstreamFailoverKeepaliveTimer) {
        clearInterval(session.downstreamFailoverKeepaliveTimer);
        session.downstreamFailoverKeepaliveTimer = undefined;
      }
      this.jobBus.publish({
        type: 'job:transport_drop',
        jobId: job.id,
        attemptId: attempt.id,
        shardId: shard.id,
        reason: 'websocket_runtime_missing',
      });
      return;
    }

    const messages: Array<{ role: string; content: any }> = JSON.parse(job.messagesJson || '[]');
    const inputList: Array<{ type: string; role: string; content: Array<{ type: string; text: string }> }> = [];
    let instructions = '';
    for (const msg of messages) {
      const textContent = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
        ? msg.content.map((c: any) => (typeof c === 'string' ? c : c?.text || JSON.stringify(c))).join('\n')
        : (msg.content ? JSON.stringify(msg.content) : '');

      if (msg.role === 'system' || msg.role === 'developer') {
        instructions = instructions ? `${instructions}\n\n${textContent}` : textContent;
      } else {
        inputList.push({
          type: 'message',
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: [{ type: 'input_text', text: textContent }],
        });
      }
    }

    const wsHeaders: Record<string, string> = {
      Authorization: `Bearer ${shard.accessToken}`,
      'User-Agent': 'Codex-CLI/0.150.1 (darwin; arm64)',
      'X-Codex-Originator': 'codex_cli',
      'OpenAI-Beta': 'responses_websockets=2026-02-06',
      'X-OpenAI-Product-Sku': 'codex',
      'ChatGPT-Account-Id': shard.accountId,
    };

    const cleanupTimers = () => {
      if (session.connectTimer) clearTimeout(session.connectTimer);
      if (session.ttftTimer) clearTimeout(session.ttftTimer);
      if (session.intraChunkTimer) clearTimeout(session.intraChunkTimer);
      if (session.wsPingTimer) clearInterval(session.wsPingTimer);
      if (session.heartbeatAckTimeoutTimer) clearTimeout(session.heartbeatAckTimeoutTimer);
      if (session.downstreamFailoverKeepaliveTimer) {
        clearInterval(session.downstreamFailoverKeepaliveTimer);
        session.downstreamFailoverKeepaliveTimer = undefined;
      }
    };

    // Calculate Adaptive TTFT ceiling based on reasoning effort and model
    const calculateTtftCeiling = (): number => {
      let base = this.config.wsTtftTimeoutMs;
      const effort = job.reasoningEffort?.toLowerCase() || '';
      const model = job.model?.toLowerCase() || '';
      if (effort === 'high' || model.includes('o3') || model.includes('deep') || model.includes('sol')) {
        return Math.max(base * this.config.deepReasoningTtftMultiplier, 120_000);
      }
      if (effort === 'low') {
        return Math.min(base, 30_000);
      }
      return base; // 60,000ms
    };

    session.activeTtftDeadlineMs = calculateTtftCeiling();

    // Transport failure publication. Retry and terminal policy runs from the
    // bus consumer after this WebSocket callback has returned.
    let failoverTriggered = false;
    const triggerFailover = (reason: string, isQuotaError = false, closeCode = 1006, retryAtMs?: number, unauthorized = false, retryable = true) => {
      if (failoverTriggered) return;
      failoverTriggered = true;

      cleanupTimers();
      this.safeCloseSocket(ws, closeCode, `Failover: ${reason}`);
      this.jobBus.publish({
        type: 'job:transport_drop',
        jobId: job.id,
        attemptId: attempt.id,
        shardId: shard.id,
        reason,
        isQuotaError, retryAtMs, unauthorized, retryable,
      });
    };

    // Layer 0: WebSocket Handshake Timeout (15s)
    session.connectTimer = setTimeout(() => {
      triggerFailover('ws_connect_handshake_timeout');
    }, this.config.wsConnectTimeoutMs);

    let ws: any;
    try {
      ws = new WebSocketClass(this.config.wsEndpoint, { headers: wsHeaders, maxPayload: this.config.maxPayloadBytes, followRedirects: false });
      session.upstreamWs = ws;
      ws.on('unexpected-response', (_request: unknown, response: http.IncomingMessage) => {
        response.resume();
        triggerFailover(`upstream_http_${response.statusCode}`, response.statusCode === 429, 1006,
          retryDeadline(response.headers['retry-after']), response.statusCode === 401 || response.statusCode === 403, ![400, 404, 405, 413, 422].includes(response.statusCode || 0));
      });
      this.tuneSocket(ws);
    } catch (err: any) {
      triggerFailover(`ws_init_error: ${err.message}`);
      return;
    }

    const refreshChunkTimer = () => {
      if (session.intraChunkTimer) clearTimeout(session.intraChunkTimer);
      session.intraChunkTimer = setTimeout(() => {
        triggerFailover('intra_chunk_silence_timeout');
      }, this.config.wsIntraChunkTimeoutMs);
    };

    const resetTtftTimer = (durationMs: number) => {
      if (session.ttftTimer) clearTimeout(session.ttftTimer);
      session.ttftTimer = setTimeout(() => {
        this.metrics.totalTtftDeadlocks++;
        triggerFailover('ttft_deadlock_timeout');
      }, durationMs);
    };

    ws.onopen = () => {
      if (session.activeAttemptId !== attempt.id) {
        this.safeCloseSocket(ws, 1000, 'Superseded transport attempt');
        return;
      }
      if (session.connectTimer) clearTimeout(session.connectTimer);
      this.tuneSocket(ws);
      session.lastSeenAliveMs = Date.now();
      this.telemetry.phase(job.id, 'Wait for first output', 'provider');
      attempt.heartbeatPending = false;

      // Handle RFC 6455 protocol-level pongs from Node.js 'ws'
      if (typeof (ws as any).on === 'function') {
        (ws as any).on('pong', () => {
          attempt.heartbeatPending = false;
          session.lastSeenAliveMs = Date.now();
          if (session.heartbeatAckTimeoutTimer) {
            clearTimeout(session.heartbeatAckTimeoutTimer);
            session.heartbeatAckTimeoutTimer = undefined;
          }
        });
      }

      // Layer 1: Adaptive TTFT Deadlock Timer (Calibrated by Reasoning Effort)
      resetTtftTimer(session.activeTtftDeadlineMs);

      // Layer 5: Discord Gateway Heartbeat ACK (OP 1 / OP 11) Protocol
      const jitterMs = Math.floor(Math.random() * 3000);
      session.wsPingTimer = setInterval(() => {
        if (session.abortController.signal.aborted || failoverTriggered) return;

        // Discord Heartbeat ACK Verification: If previous heartbeat was NOT acked, verify actual silence
        if (attempt.heartbeatPending) {
          const timeSinceLastActivity = Date.now() - session.lastSeenAliveMs;
          if (timeSinceLastActivity < this.config.wsIntraChunkTimeoutMs) {
            attempt.heartbeatPending = false;
          } else {
            this.metrics.totalHeartbeatAckMisses++;
            this.metrics.totalDeadPeerRecoveries++;
            console.warn(`[AntiFragileRelay] Shard ${shard.id} Heartbeat ACK Miss (zombie peer detected). Evicting with code 4000...`);
            triggerFailover('discord_heartbeat_ack_miss', false, 4000);
            return;
          }
        }

        // Arm pending heartbeat ACK flag
        attempt.heartbeatPending = true;

        try {
          if (typeof ws.ping === 'function') {
            ws.ping();
          } else if (typeof ws.send === 'function') {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        } catch {
          triggerFailover('ws_ping_send_error');
          return;
        }

        // Pong ACK Deadline Watchdog (Only evict if genuinely silent)
        session.heartbeatAckTimeoutTimer = setTimeout(() => {
          if (session.abortController.signal.aborted || failoverTriggered) return;
          if (attempt.heartbeatPending) {
            const timeSinceLastActivity = Date.now() - session.lastSeenAliveMs;
            if (timeSinceLastActivity < this.config.wsIntraChunkTimeoutMs) {
              attempt.heartbeatPending = false;
              return;
            }
            this.metrics.totalDeadPeerRecoveries++;
            console.warn(`[AntiFragileRelay] Shard ${shard.id} pong deadline expired (${this.config.wsDeadPeerPongTimeoutMs}ms); evicting dead peer.`);
            triggerFailover('dead_peer_pong_timeout', false, 4000);
          }
        }, this.config.wsDeadPeerPongTimeoutMs);
      }, this.config.wsDeadPeerPingIntervalMs + jitterMs);

      const createPayload: Record<string, any> = {
        type: 'response.create',
        model: job.model,
        input: inputList,
        stream: true,
      };
      if (instructions) createPayload.instructions = instructions;
      if (job.reasoningEffort && job.reasoningEffort !== 'none') {
        createPayload.reasoning = { effort: job.reasoningEffort };
      }

      try {
        ws.send(JSON.stringify(createPayload));
      } catch (err: any) {
        triggerFailover(`ws_send_payload_error: ${err.message}`);
      }
    };

    ws.onmessage = (event: any) => {
      try {
        if (session.activeAttemptId !== attempt.id) return;
        session.lastSeenAliveMs = Date.now();
        // Clear pending heartbeat on ANY frame arrival from upstream
        attempt.heartbeatPending = false;
        if (session.heartbeatAckTimeoutTimer) {
          clearTimeout(session.heartbeatAckTimeoutTimer);
          session.heartbeatAckTimeoutTimer = undefined;
        }
        // Stop downstream failover keepalive ticker if running
        if (session.downstreamFailoverKeepaliveTimer) {
          clearInterval(session.downstreamFailoverKeepaliveTimer);
          session.downstreamFailoverKeepaliveTimer = undefined;
        }

        const raw = typeof event.data === 'string' ? event.data : event.data.toString();
        const data = JSON.parse(raw);

        // Ping / Pong Protocol
        if (data.type === 'ping') {
          try { ws.send(JSON.stringify({ type: 'pong' })); } catch {}
          return;
        }
        if (data.type === 'pong' || data.type === 'response.pong') {
          attempt.heartbeatPending = false;
          session.lastSeenAliveMs = Date.now();
          if (session.heartbeatAckTimeoutTimer) {
            clearTimeout(session.heartbeatAckTimeoutTimer);
            session.heartbeatAckTimeoutTimer = undefined;
          }
          return;
        }

        // Dynamic Reasoning / Thinking Delta Handling
        if (data.type === 'response.reasoning.delta' || data.type === 'response.reasoning_text.delta') {
          this.metrics.totalReasoningChunksReceived++;
          // Active thinking in progress -> extend TTFT deadlock timer dynamically
          if (!attempt.hasReceivedFirstToken) {
            resetTtftTimer(this.config.reasoningActivityExtensionMs);
          }
          refreshChunkTimer();

          if (data.delta) {
            this.jobBus.publish({ type: 'job:reasoning', jobId: job.id, text: String(data.delta) });
          }
          return;
        }

        // Proactive Rate-Limit Handling via OpenAI Responses Wire Frames
        if (data.type === 'rate_limits.updated' && Array.isArray(data.rate_limits)) {
          const limits = parseProviderLimits(data.rate_limits);
          const current = this.shardsTable.get(shard.id);
          if (current) this.shardsTable.put(shard.id, { ...current, providerLimits: limits });
          const exhausted = limits.filter(l => l.remaining === 0);
          if (exhausted.length) {
            this.metrics.totalProactiveRateLimitCooldowns++;
            this.recordQuotaFailure(shard.id, Math.max(...exhausted.map(l => l.resetAtMs ?? 0)), false);
          }
          return;
        }

        // Progress / Keepalive Events
        if (data.type === 'response.in_progress' || data.type === 'response.output_item.added' || data.type === 'response.created') {
          if (!attempt.hasReceivedFirstToken) {
            resetTtftTimer(this.config.reasoningActivityExtensionMs);
          }
          return;
        }

        // Output Token Chunk Arrival (Text, Audio, Tool Arguments)
        const isOutputDelta = data.type === 'response.output_text.delta' ||
          data.type === 'response.audio.delta' ||
          data.type === 'response.function_call_arguments.delta';

        if (isOutputDelta && data.delta) {
          let chunkText = typeof data.delta === 'string' ? data.delta : (data.delta.text || '');

          // Figma / Liveblocks Suffix-Prefix Overlap Reconciliation
          if (attempt.isFirstChunkAfterFailover && attempt.priorFailoverSuffix) {
            const originalLength = chunkText.length;
            chunkText = reconcileOverlap(attempt.priorFailoverSuffix, chunkText, this.config.deDuplicationOverlapWindowChars);
            attempt.isFirstChunkAfterFailover = false;
            attempt.priorFailoverSuffix = undefined;

            if (chunkText.length < originalLength) {
              this.metrics.totalOverlapReconciliationsWon++;
              console.log(`[AntiFragileRelay] Overlap reconciliation won: trimmed ${originalLength - chunkText.length} duplicate characters.`);
            }

            if (!chunkText || chunkText.length === 0) {
              // Pure duplicate echo chunk; wait for next non-duplicate chunk
              return;
            }
            data.delta = chunkText;
          }

          const now = Date.now();

          if (!attempt.hasReceivedFirstToken) {
            attempt.hasReceivedFirstToken = true;
            if (session.ttftTimer) clearTimeout(session.ttftTimer);
          }

          // Layer 2: Inter-Token Latency (ITL) Watchdog
          if (session.lastChunkAtMs > 0) {
            const itlGap = now - session.lastChunkAtMs;
            session.ewmaItlMs = session.ewmaItlMs === 0 ? itlGap : 0.15 * itlGap + 0.85 * session.ewmaItlMs;

            if (itlGap > this.config.itlGapThresholdMs) {
              session.consecutiveItlStalls++;
              this.metrics.totalItlStallsDetected++;
              if (session.consecutiveItlStalls >= this.config.itlConsecutiveLimit) {
                console.warn(`[AntiFragileRelay] Job ${job.id}: 3 consecutive ITL stall violations. Triggering handover...`);
                triggerFailover('consecutive_itl_stalls_exceeded');
                return;
              }
            } else {
              session.consecutiveItlStalls = 0;
            }
          }
          session.lastChunkAtMs = now;

          // Layer 3: Reset Intra-Chunk Timer
          refreshChunkTimer();

          // The socket reports an observation only. Sequence allocation and
          // relay-job projection happen asynchronously after this callback.
          this.jobBus.publish({
            type: 'job:transport_token',
            jobId: job.id,
            attemptId: attempt.id,
            shardId: shard.id,
            text: chunkText,
            timestampMs: now,
          });
          return;
        }

        // Completion Arrival (response.completed or response.done)
        if (data.type === 'response.completed' || data.type === 'response.done') {
          attempt.completionObserved = true;
          cleanupTimers();
          if (session.wallTimer) clearTimeout(session.wallTimer);
          this.jobBus.publish({
            type: 'job:transport_completed',
            jobId: job.id,
            attemptId: attempt.id,
            shardId: shard.id,
          });
          return;
        }

        // Upstream Error Frame (429 Rate Limit / 5xx Overloaded)
        if (data.type === 'error' || data.type === 'response.failed') {
          const failure = classifyUpstreamError(data);
          triggerFailover(`upstream_error_${failure.code}`, failure.quota, 1006, failure.deadline, failure.unauthorized, failure.retryable);
          return;
        }
      } catch (err: any) {
        console.error('[BroccoliDB Relay] Error parsing WebSocket frame:', err.message);
      }
    };

    ws.onerror = (err: any) => {
      if (session.activeAttemptId !== attempt.id) return;
      triggerFailover(`ws_socket_error: ${err.message || 'unknown'}`);
    };

    ws.onclose = (event: any) => {
      if (session.activeAttemptId !== attempt.id || failoverTriggered) return;
      if (attempt.completionObserved) {
        cleanupTimers();
        return;
      }
      const currentJob = this.jobsTable.get(job.id);
      if (
        currentJob &&
        currentJob.status !== 'completed' &&
        currentJob.status !== 'cancelled' &&
        currentJob.status !== 'failed'
      ) {
        const isQuota = event?.code === 4029 || /quota|rate.?limit/.test(event?.reason || '');
        triggerFailover(`ws_abnormal_closure_${event?.code || 'unknown'}`, isQuota);
      } else {
        cleanupTimers();
        this.releaseShard(shard.id);
      }
    };
  }

  // --------------------------------------------------------------------------
  // ANTI-FRAGILE MID-STREAM SHARD FAILOVER & CONTEXT CONTINUATION
  // --------------------------------------------------------------------------

  private handleTransportToken(event: JobBusEventOf<'job:transport_token'>): void {
    const session = this.sessions.get(event.jobId);
    if (!session || session.abortController.signal.aborted || session.activeAttemptId !== event.attemptId) return;
    const allocation = this.jobQueue.recordToken(event.jobId);
    if (!allocation) return;
    this.telemetry.output(event.jobId);
    const token: JobTokenRecord = {
      id: `${event.jobId}_${allocation.seqNo}`,
      jobId: event.jobId,
      seqNo: allocation.seqNo,
      text: event.text,
      isFinal: false,
      timestampMs: event.timestampMs,
    };
    this.metrics.totalTokensEmitted++;
    this.jobBus.publish({ type: 'job:token', jobId: event.jobId, token });
  }

  private handleTransportCompleted(event: JobBusEventOf<'job:transport_completed'>): void {
    const session = this.sessions.get(event.jobId);
    if (!session || session.activeAttemptId !== event.attemptId) return;
    if (this.jobQueue.markComplete(event.jobId)) {
      this.metrics.totalJobsCompleted++;
      this.retryBudget.success();
      this.releaseShard(event.shardId, true);
      session.currentShardId = undefined;
      this.safeCloseSocket(session.upstreamWs);
      session.upstreamWs = undefined;
    }
  }

  private handleTransportDrop(event: JobBusEventOf<'job:transport_drop'>): void {
    const session = this.sessions.get(event.jobId);
    if (!session || session.abortController.signal.aborted || session.activeAttemptId !== event.attemptId) return;
    const job = this.jobsTable.get(event.jobId);
    if (
      !job ||
      job.status === 'completed' ||
      job.status === 'cancelled' ||
      job.status === 'failed'
    ) {
      return;
    }

    // This attempt returns its capacity once. A later cancellation during
    // retry backoff must not release another job's slot on the same shard.
    if (session.currentShardId !== event.shardId) return;
    session.currentShardId = undefined;
    this.telemetry.failedAttempt(event.jobId, event.reason);
    if (event.retryable === false) {
      this.releaseShard(event.shardId);
      if (this.jobQueue.markFailed(event.jobId, event.reason)) this.metrics.totalJobsFailed++;
      return;
    }
    if (event.isQuotaError) {
      this.metrics.totalShardCooldownEjections++;
      this.recordQuotaFailure(event.shardId, event.retryAtMs);
    } else {
      this.recordShardFailure(event.shardId, event.unauthorized);
    }

    if (session.retryCount >= this.config.maxUpstreamRetries) {
      if (this.jobQueue.markFailed(event.jobId, `retries_exhausted_${event.reason}`)) {
        this.metrics.totalJobsFailed++;
      }
      return;
    }

    if (!this.retryBudget.take()) {
      if (this.jobQueue.markFailed(event.jobId, 'relay_retry_budget_exhausted')) this.metrics.totalJobsFailed++;
      return;
    }
    session.retryCount++;
    this.metrics.totalUpstreamRetries++;
    const baseDelay = this.config.retryBaseDelayMs * Math.pow(2, session.retryCount - 1);
    const backoffMs = Math.floor(Math.random() * (Math.min(this.config.retryMaxDelayMs, baseDelay) + 1));
    console.warn(
      `[AntiFragileRelay] Upstream failure (${event.reason}) on shard ${event.shardId}. ` +
      `Scheduling queue-owned recovery ${session.retryCount}/${this.config.maxUpstreamRetries} in ${backoffMs}ms...`,
    );
    session.retryAtMs = Date.now() + backoffMs;
    session.retryTimer = setTimeout(() => {
      session.retryAtMs = undefined;
      if (!session.abortController.signal.aborted && session.activeAttemptId === event.attemptId) {
        void this.performInFlightFailover(event.jobId, event.reason, event.shardId).catch(() => {
          if (this.jobQueue.markFailed(event.jobId, 'relay_recovery_failed')) this.metrics.totalJobsFailed++;
        });
      }
    }, backoffMs);
  }

  private async performInFlightFailover(jobId: string, reason: string, failedShardId: string): Promise<void> {
    const session = this.sessions.get(jobId);
    if (!session || session.abortController.signal.aborted) return;

    const currentJob = this.jobsTable.get(jobId);
    if (
      !currentJob ||
      currentJob.status === 'cancelled' ||
      currentJob.status === 'completed' ||
      currentJob.status === 'failed'
    ) {
      return;
    }

    // Slack Flannel Downstream Failover Keepalive: Send immediate SSE comment to reset proxy idle timers
    this.metrics.totalDownstreamFailoverKeepalivesSent++;
    this.jobBus.publish({
      type: 'job:keepalive',
      jobId,
      text: `: transit_failover_in_progress reason=${reason}\n\n`,
    });

    // Start 1s keepalive heartbeat ticker during shard handover
    if (session.downstreamFailoverKeepaliveTimer) clearInterval(session.downstreamFailoverKeepaliveTimer);
    session.downstreamFailoverKeepaliveTimer = setInterval(() => {
      if (session.abortController.signal.aborted) {
        if (session.downstreamFailoverKeepaliveTimer) {
          clearInterval(session.downstreamFailoverKeepaliveTimer);
          session.downstreamFailoverKeepaliveTimer = undefined;
        }
        return;
      }
      this.metrics.totalDownstreamFailoverKeepalivesSent++;
      this.jobBus.publish({ type: 'job:keepalive', jobId, text: ': transit_failover_in_progress\n\n' });
    }, 1000);

    try { await this.refreshShardRegistry(); } catch {
      if (this.jobQueue.markFailed(jobId, 'shard_registry_unavailable')) this.metrics.totalJobsFailed++;
      return;
    }
    // A cancellation or deadline may have finished the job while refresh awaited I/O.
    if (session.abortController.signal.aborted || this.sessions.get(jobId) !== session) return;
    // 1. Acquire alternative healthy shard
    const newShard = this.acquireHealthyShard(session.attemptedShardIds);
    if (!newShard) {
      console.warn(`[AntiFragileRelay] In-flight failover failed: No alternate healthy shards available.`);
      if (session.downstreamFailoverKeepaliveTimer) {
        clearInterval(session.downstreamFailoverKeepaliveTimer);
        session.downstreamFailoverKeepaliveTimer = undefined;
      }
      if (this.jobQueue.markFailed(jobId, `all_shards_exhausted_during_failover_${reason}`)) {
        this.metrics.totalJobsFailed++;
      }
      return;
    }

    session.attemptedShardIds.add(newShard.id);
    this.metrics.totalMidStreamFailoversWon++;
    console.log(`[AntiFragileRelay] Seamless failover engaged for job ${jobId}: ${failedShardId} -> ${newShard.id} (Tokens emitted so far: ${currentJob.seqCounter})`);

    // 2. Prepare payload
    const jobUpdates: Partial<JobRecord> = {
      shardId: newShard.id,
      failoverCount: (currentJob.failoverCount || 0) + 1,
      status: currentJob.seqCounter > 0 ? 'streaming' : 'running',
    };
    let priorFailoverSuffix: string | undefined;

    // If tokens have already been emitted, augment conversation with partial assistant response + continuation prompt
    if (currentJob.seqCounter > 0) {
      const emittedTokens = this.tokensTable.query({
        where: { jobId },
        sortBy: 'seqNo',
        sortOrder: 'asc',
      });
      const accumulatedText = emittedTokens.map((t) => t.text).join('');

      // Arm Figma / Liveblocks Overlap Reconciliation for first chunk from new shard
      priorFailoverSuffix = accumulatedText.slice(-this.config.deDuplicationOverlapWindowChars);

      try {
        const originalMessages: Array<{ role: string; content: string }> = JSON.parse(currentJob.messagesJson || '[]');
        const resumedMessages = [
          ...originalMessages,
          { role: 'assistant', content: accumulatedText },
          {
            role: 'user',
            content: '[TRANSIT_FAILOVER_DIRECTIVE]: An upstream network connection interrupted your output stream. Please continue the response seamlessly from the exact word/character where you stopped above. Do not repeat any prior text.',
          },
        ];
        jobUpdates.messagesJson = JSON.stringify(resumedMessages);
      } catch {
        // Fallback to original messages
      }
    }

    const updatedJob = this.jobQueue.updateForFailover(jobId, jobUpdates);
    if (!updatedJob) {
      this.releaseShard(newShard.id);
      return;
    }
    session.currentShardId = newShard.id;
    const attempt: TransportAttempt = {
      id: ++session.activeAttemptId,
      shardId: newShard.id,
      hasReceivedFirstToken: false,
      heartbeatPending: false,
      completionObserved: false,
      isFirstChunkAfterFailover: priorFailoverSuffix !== undefined,
      priorFailoverSuffix,
    };

    // 3. Open exactly the acquired replacement shard. No second acquisition.
    await this._openUpstreamTransport(updatedJob, newShard, attempt);
  }

  // --------------------------------------------------------------------------
  // CLEAN CANCEL & JOB STATUS
  // --------------------------------------------------------------------------

  private jobRecovery(job: JobRecord) {
    const session = this.sessions.get(job.id);
    const terminal = ['completed', 'failed', 'cancelled'].includes(job.status);
    return {
      state: terminal ? 'stopped' : session?.retryAtMs !== undefined ? 'backoff' : 'running',
      retriesUsed: session?.retryCount ?? job.failoverCount ?? 0,
      maxRetries: this.config.maxUpstreamRetries,
      nextRetryAtMs: terminal ? null : session?.retryAtMs ?? null,
      deadlineAtMs: job.createdAtMs + this.config.jobMaxWallTimeMs,
      automaticRetry: !terminal && session?.retryAtMs !== undefined,
    };
  }

  private handleJobStatus(jobId: string, res: http.ServerResponse): void {
    const job = this.jobsTable.get(jobId);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Job ${jobId} not found`, code: 'job_not_found' } }));
      return;
    }

    const terminal = ['completed', 'failed', 'cancelled'].includes(job.status);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(!terminal ? { 'Retry-After': '2' } : {}) });
    res.end(JSON.stringify({
      id: job.id,
      model: job.model,
      status: job.status,
      outputChunks: job.seqCounter,
      tokensGenerated: null,
      traceId: job.traceId ?? null,
      terminal,
      recovery: this.jobRecovery(job),
      pollAfterMs: terminal ? null : 2000,
      createdAt: Math.floor(job.createdAtMs / 1000),
      durationMs: ((job.completedAtMs as number) || Date.now()) - job.createdAtMs,
      streamUrl: `/v1/jobs/${job.id}/stream`,
      error: job.error || null,
    }));
  }

  private handleJobCancel(jobId: string, res: http.ServerResponse): void {
    const job = this.jobsTable.get(jobId);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Job ${jobId} not found`, code: 'job_not_found' } }));
      return;
    }

    const session = this.sessions.get(jobId);
    if (session?.graceTimer) clearTimeout(session.graceTimer);

    const cancelled = this.jobQueue.markCancelled(jobId, 'user_cancelled');
    if (cancelled) this.metrics.totalJobsCancelled++;

    if (cancelled && session) {
      if (session.wallTimer) clearTimeout(session.wallTimer);
      if (session.downstreamFailoverKeepaliveTimer) {
        clearInterval(session.downstreamFailoverKeepaliveTimer);
        session.downstreamFailoverKeepaliveTimer = undefined;
      }
      session.abortController.abort(new Error('User cancelled job'));
      this.safeCloseSocket(session.upstreamWs);
    }

    if (cancelled && session?.currentShardId) {
      this.releaseShard(session.currentShardId);
      session.currentShardId = undefined;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: job.id,
      status: cancelled ? 'cancelled' : this.jobsTable.get(jobId)?.status,
      outputChunks: job.seqCounter,
      tokensGenerated: null,
      cancellationApplied: cancelled,
      refunded: null,
      refundStatus: 'not_managed_by_relay',
    }));
  }

  // --------------------------------------------------------------------------
  // ATOMIC CHECKPOINTING & CRASH RECOVERY (RocksDB / Redis Snapshot Pattern)
  // --------------------------------------------------------------------------

  private saveStateSnapshot(): void {
    try {
      const snapDir = path.dirname(this.config.stateSnapshotPath);
      if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
      }

      const activeJobs = this.jobsTable.getAll().filter(
        (j) => j.status === 'queued' || j.status === 'running' || j.status === 'streaming'
      );

      const snapshot = {
        timestampMs: Date.now(),
        jobs: activeJobs,
        shards: this.shardsTable.getAll().map(s => ({
          id: s.id, credentialFingerprint: s.credentialFingerprint, status: s.status, cooldownUntilMs: s.cooldownUntilMs,
          consecutiveFailures: s.consecutiveFailures, quotaFailures: s.quotaFailures,
          providerLimits: s.providerLimits, lastUsedAtMs: s.lastUsedAtMs,
          slidingWindowTimestamps: s.slidingWindowTimestamps,
        })),
        metrics: this.metrics,
      };

      const tmpPath = `${this.config.stateSnapshotPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmpPath, this.config.stateSnapshotPath); // Atomic POSIX rename
    } catch (err: any) {
      console.error('[BroccoliDB Relay] Snapshot checkpoint failed:', err.message);
    }
  }

  private recoverStateSnapshot(): void {
    if (!fs.existsSync(this.config.stateSnapshotPath)) return;

    try {
      const raw = fs.readFileSync(this.config.stateSnapshotPath, 'utf-8');
      const snap = JSON.parse(raw);

      for (const state of Array.isArray(snap.shards) ? snap.shards : []) {
        // Legacy local exhaustion without provider evidence is not a real quota.
        this.recoveredShardState.set(state.id, {
          credentialFingerprint: state.credentialFingerprint,
          status: state.status === 'disabled' ? 'disabled' : state.cooldownUntilMs > Date.now() ? 'cooldown' : 'active',
          cooldownUntilMs: state.cooldownUntilMs, quotaFailures: state.quotaFailures,
          consecutiveFailures: state.consecutiveFailures, lastUsedAtMs: state.lastUsedAtMs,
          providerLimits: state.providerLimits,
          slidingWindowTimestamps: (state.slidingWindowTimestamps ?? []).filter((t: number) => Number.isFinite(t)).sort((a: number, b: number) => a - b),
        });
      }
      if (Array.isArray(snap.jobs) && Number.isFinite(snap.timestampMs) && Date.now() - snap.timestampMs < this.config.jobTokenRetentionMs) {
        for (const job of snap.jobs) {
          if (!job || typeof job.id !== 'string' || typeof job.tenantId !== 'string') continue;
          // Transports and output buffers are not checkpointed. Never advertise
          // a resumable stream or silently repeat provider work after a crash.
          this.jobQueue.restore({
            ...job,
            isDetached: false,
            status: 'failed',
            completedAtMs: Date.now(),
            error: 'relay_restarted_start_new_request',
          });
        }
        console.log(`[BroccoliDB Relay] Recovered ${snap.jobs.length} in-flight jobs from checkpoint snapshot.`);
      }
    } catch {}
  }

  private startPeriodicSnapshot(): void {
    this.snapshotIntervalTimer = setInterval(() => {
      this.saveStateSnapshot();
    }, this.config.snapshotIntervalMs);
    this.snapshotIntervalTimer.unref?.();
  }

  // --------------------------------------------------------------------------
  // HEALTH & OBSERVABILITY
  // --------------------------------------------------------------------------

  private handleHealth(res: http.ServerResponse, readiness = false): void {
    const mem = process.memoryUsage();
    const activeJobs = this.jobsTable.getAll().filter(
      (record) => record.status === 'running' || record.status === 'streaming'
    );
    const allShards = this.shardsTable.getAll();

    const admission = this.admissionState();
    const healthData = {
      status: readiness && !admission.accepting ? 'not_ready' : 'ok',
      admission,
      service: 'galxai-relay',
      signature: 'galxai-zenith-relay',
      port: this.config.port,
      host: this.config.host,
      version: '2.6.0',
      storageEngine: 'BroccoliDB Zenith Tier',
      uptimeSec: Math.floor((Date.now() - this.metrics.startTimeMs) / 1000),
      shards: {
        total: allShards.length,
        active: allShards.filter((s) => this.shardStats(s).status === 'active').length,
        exhausted: allShards.filter((s) => this.shardStats(s).status === 'cooldown').length,
        cooldown: allShards.filter((s) => this.shardStats(s).status === 'cooldown').length,
        disabled: allShards.filter((s) => this.shardStats(s).status === 'disabled').length,
      },
      jobs: {
        active: activeJobs.length,
        totalSubmitted: this.metrics.totalJobsSubmitted,
        totalCompleted: this.metrics.totalJobsCompleted,
        attachedDuplicates: this.metrics.totalAttachedDuplicates,
      },
      antiFragility: {
        totalUpstreamRetries: this.metrics.totalUpstreamRetries,
        totalMidStreamFailoversWon: this.metrics.totalMidStreamFailoversWon,
        totalShardCooldownEjections: this.metrics.totalShardCooldownEjections,
        totalDeadPeerRecoveries: this.metrics.totalDeadPeerRecoveries,
        totalReasoningChunksReceived: this.metrics.totalReasoningChunksReceived,
        totalHeartbeatAckMisses: this.metrics.totalHeartbeatAckMisses,
        totalOverlapReconciliationsWon: this.metrics.totalOverlapReconciliationsWon,
        totalDownstreamFailoverKeepalivesSent: this.metrics.totalDownstreamFailoverKeepalivesSent,
        totalProactiveRateLimitCooldowns: this.metrics.totalProactiveRateLimitCooldowns,
        totalBusEventsEmitted: this.metrics.totalBusEventsEmitted,
        totalSlowSubscriberDrains: this.metrics.totalSlowSubscriberDrains,
      },
      security: {
        authEnabled: Boolean(this.config.apiKeys?.length || this.config.adminApiKeys?.length),
        rateGovernorActive: true,
        maxPayloadBytes: this.config.maxPayloadBytes,
      },
      broccolidb: {
        jobsTableCount: this.jobsTable.count(),
        tokensTableCount: this.tokensTable.count(),
        idempotencyTableCount: this.idempotencyTable.count(),
      },
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    };

    res.writeHead(readiness && !admission.accepting ? 503 : 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(healthData, null, 2));
  }

  private handleMetrics(res: http.ServerResponse): void {
    const activeJobs = this.jobsTable.getAll().filter(
      (record) => record.status === 'running' || record.status === 'streaming'
    );

    const lines = [
      '# HELP galxai_relay_jobs_in_flight Current active inference jobs',
      '# TYPE galxai_relay_jobs_in_flight gauge',
      `galxai_relay_jobs_in_flight ${activeJobs.length}`,
      '# HELP galxai_relay_jobs_submitted_total Total jobs submitted',
      '# TYPE galxai_relay_jobs_submitted_total counter',
      `galxai_relay_jobs_submitted_total ${this.metrics.totalJobsSubmitted}`,
      '# HELP galxai_relay_jobs_completed_total Total jobs completed',
      '# TYPE galxai_relay_jobs_completed_total counter',
      `galxai_relay_jobs_completed_total ${this.metrics.totalJobsCompleted}`,
      '# HELP galxai_relay_attached_duplicates_total Duplicate prompts attached to in-flight stream',
      '# TYPE galxai_relay_attached_duplicates_total counter',
      `galxai_relay_attached_duplicates_total ${this.metrics.totalAttachedDuplicates}`,
      '# HELP galxai_relay_tokens_emitted_total Total tokens emitted over wire',
      '# TYPE galxai_relay_tokens_emitted_total counter',
      `galxai_relay_tokens_emitted_total ${this.metrics.totalTokensEmitted}`,
      '# HELP galxai_relay_tokens_buffer_replayed_total Tokens served from BroccoliDB resume buffer',
      '# TYPE galxai_relay_tokens_buffer_replayed_total counter',
      `galxai_relay_tokens_buffer_replayed_total ${this.metrics.totalTokensServedFromBuffer}`,
      '# HELP galxai_relay_reconnections_total Total client stream reconnections',
      '# TYPE galxai_relay_reconnections_total counter',
      `galxai_relay_reconnections_total ${this.metrics.totalReconnections}`,
      '# HELP galxai_relay_grace_reconnections_total Reconnections saved by grace window',
      '# TYPE galxai_relay_grace_reconnections_total counter',
      `galxai_relay_grace_reconnections_total ${this.metrics.totalGraceReconnectionsWon}`,
      '# HELP galxai_relay_zombie_leash_aborts_total Total zombie upstream aborts',
      '# TYPE galxai_relay_zombie_leash_aborts_total counter',
      `galxai_relay_zombie_leash_aborts_total ${this.metrics.totalZombieLeashAborts}`,
      '# HELP galxai_relay_itl_stalls_total Total ITL stalls flagged',
      '# TYPE galxai_relay_itl_stalls_total counter',
      `galxai_relay_itl_stalls_total ${this.metrics.totalItlStallsDetected}`,
      '# HELP galxai_relay_ttft_deadlocks_total Total TTFT deadlocks detected',
      '# TYPE galxai_relay_ttft_deadlocks_total counter',
      `galxai_relay_ttft_deadlocks_total ${this.metrics.totalTtftDeadlocks}`,
      '# HELP galxai_relay_upstream_retries_total Total in-flight upstream failover retries',
      '# TYPE galxai_relay_upstream_retries_total counter',
      `galxai_relay_upstream_retries_total ${this.metrics.totalUpstreamRetries}`,
      '# HELP galxai_relay_midstream_failovers_won_total Seamless mid-stream failovers without client error',
      '# TYPE galxai_relay_midstream_failovers_won_total counter',
      `galxai_relay_midstream_failovers_won_total ${this.metrics.totalMidStreamFailoversWon}`,
      '# HELP galxai_relay_shard_cooldown_ejections_total Shards ejected to cooldown due to 429 or quota exhaustion',
      '# TYPE galxai_relay_shard_cooldown_ejections_total counter',
      `galxai_relay_shard_cooldown_ejections_total ${this.metrics.totalShardCooldownEjections}`,
      '# HELP galxai_relay_dead_peer_recoveries_total Half-open or dead TCP peer connections evicted',
      '# TYPE galxai_relay_dead_peer_recoveries_total counter',
      `galxai_relay_dead_peer_recoveries_total ${this.metrics.totalDeadPeerRecoveries}`,
      '# HELP galxai_relay_reasoning_chunks_received_total Reasoning delta progress frames processed',
      '# TYPE galxai_relay_reasoning_chunks_received_total counter',
      `galxai_relay_reasoning_chunks_received_total ${this.metrics.totalReasoningChunksReceived}`,
      '# HELP galxai_relay_heartbeat_ack_misses_total Discord-style Heartbeat ACK misses detecting dead peers',
      '# TYPE galxai_relay_heartbeat_ack_misses_total counter',
      `galxai_relay_heartbeat_ack_misses_total ${this.metrics.totalHeartbeatAckMisses}`,
      '# HELP galxai_relay_overlap_reconciliations_won_total LLM continuation overlaps deduplicated without stutter',
      '# TYPE galxai_relay_overlap_reconciliations_won_total counter',
      `galxai_relay_overlap_reconciliations_won_total ${this.metrics.totalOverlapReconciliationsWon}`,
      '# HELP galxai_relay_failover_keepalives_sent_total Downstream SSE failover keepalive comment frames sent',
      '# TYPE galxai_relay_failover_keepalives_sent_total counter',
      `galxai_relay_failover_keepalives_sent_total ${this.metrics.totalDownstreamFailoverKeepalivesSent}`,
      '# HELP galxai_relay_proactive_rate_limit_cooldowns_total Proactive shard cooldown transitions triggered by rate_limits.updated',
      '# TYPE galxai_relay_proactive_rate_limit_cooldowns_total counter',
      `galxai_relay_proactive_rate_limit_cooldowns_total ${this.metrics.totalProactiveRateLimitCooldowns}`,
      '# HELP galxai_relay_bus_events_emitted_total Events dispatched through the asynchronous job bus',
      '# TYPE galxai_relay_bus_events_emitted_total counter',
      `galxai_relay_bus_events_emitted_total ${this.metrics.totalBusEventsEmitted}`,
      '# HELP galxai_relay_slow_subscriber_drains_total Subscriber writes that entered independent drain handling',
      '# TYPE galxai_relay_slow_subscriber_drains_total counter',
      `galxai_relay_slow_subscriber_drains_total ${this.metrics.totalSlowSubscriberDrains}`,
      '# HELP galxai_relay_rate_limit_drops_total Total requests dropped by token bucket rate limiter',
      '# TYPE galxai_relay_rate_limit_drops_total counter',
      `galxai_relay_rate_limit_drops_total ${this.metrics.totalRateLimitDrops}`,
      '# HELP galxai_relay_auth_failures_total Total 401 unauthorized requests',
      '# TYPE galxai_relay_auth_failures_total counter',
      `galxai_relay_auth_failures_total ${this.metrics.totalAuthFailures}`,
      '# HELP galxai_relay_broccolidb_tokens_count Active token records in BroccoliDB',
      '# TYPE galxai_relay_broccolidb_tokens_count gauge',
      `galxai_relay_broccolidb_tokens_count ${this.tokensTable.count()}`,
    ];

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    res.end(lines.join('\n') + '\n');
  }

  private handleDashboard(res: http.ServerResponse, filename = 'dashboard.html'): void {
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'src', 'relay', filename),
        path.join(process.cwd(), filename),
        path.join('/app/src/relay', filename),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const html = fs.readFileSync(p, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          });
          res.end(html);
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Dashboard HTML file not found.');
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error loading dashboard: ${err.message}`);
    }
  }

  private handleDashboardStats(res: http.ServerResponse): void {
    const allShards = this.shardsTable.getAll();
    const activeJobs = this.jobsTable.getAll().filter(
      (j) => j.status === 'running' || j.status === 'streaming'
    );
    const recentJobs = [...this.jobsTable.getAll()].sort((a, b) => b.createdAtMs - a.createdAtMs).slice(0, 20);

    const now = Date.now();
    const effectiveCap = this.currentQuotaProfile.maxCalls || null;
    const windowDurationMs = this.currentQuotaProfile.windowDurationMs;

    const firstOutputs = this.telemetry.snapshot().traces.flatMap(t => t.firstOutputMs === undefined ? [] : [t.firstOutputMs]);
    const stats = {
      status: 'ok',
      service: 'galxai-relay',
      signature: 'galxai-zenith-relay',
      security: { authenticationRequired: Boolean(this.config.apiKeys?.length || this.config.adminApiKeys?.length), administratorAccess: true },
      port: this.config.port,
      host: this.config.host,
      activeStreams: activeJobs.length,
      totalRequests: this.metrics.totalJobsCompleted + this.metrics.totalImageJobsCompleted,
      avgTtftMs: firstOutputs.length ? Math.round(firstOutputs.reduce((a, b) => a + b, 0) / firstOutputs.length) : null,
      uptimeSec: Math.floor((Date.now() - this.metrics.startTimeMs) / 1000),
      memory: process.memoryUsage(),
      registry: { source: this.config.registryEnabled ? 'PostgreSQL registry' : 'local credentials',
        error: this.registryError, ...this.registryCounts },
      quotaEngine: {
        mode: this.currentQuotaProfile.mode, baseCap: effectiveCap, effectiveCap,
        uncapped: effectiveCap === null, windowDurationMs,
        fleetTotalCap: effectiveCap === null ? null : allShards.length * effectiveCap,
        maxUpstreamRetries: this.config.maxUpstreamRetries,
        shardConcurrency: this.config.shardConcurrency,
        retryAfterSec: this.fleetRetryAfter(),
      },
      shards: allShards.map(s => this.shardStats(s, now)),
      database: {
        jobs: this.jobsTable.count(),
        tokens: this.tokensTable.count(),
        shards: this.shardsTable.count(),
        idempotency: this.idempotencyTable.count(),
      },
      activeJobsList: recentJobs.map((j) => ({
        id: j.id,
        model: j.model,
        status: j.status,
        recovery: this.jobRecovery(j),
        error: j.error ?? null,
        outputChunks: j.seqCounter,
        tokensStreamed: null,
        createdAtMs: j.createdAtMs,
      })),
    };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(stats));
  }

  private shardStats(s: ShardRecord, now = Date.now()) {
    const cap = this.currentQuotaProfile.maxCalls || null;
    const duration = this.currentQuotaProfile.windowDurationMs;
    const timestamps = s.slidingWindowTimestamps.filter(t => t > now - duration);
    const readyAt = this.shardReadyAt(s, now);
    const limits = (s.providerLimits ?? []).filter(l => !l.resetAtMs || l.resetAtMs > now);
    return {
      id: s.id, accountId: s.accountId, source: s.source,
      expiresAtMs: s.expiresAtMs ?? null,
      availabilityReason: s.expiresAtMs !== undefined && s.expiresAtMs <= now ? 'credential_expired'
        : s.status === 'disabled' ? 'credential_rejected'
        : this.config.registryEnabled && (this.registryError || now - this.registryRefreshedAtMs > 5000) ? 'registry_unavailable'
        : readyAt > now ? 'cooldown' : s.probeInFlight ? 'probing'
        : s.inFlight >= this.config.shardConcurrency ? 'at_capacity' : 'ready',
      eligible: Number.isFinite(readyAt) && readyAt <= now && !s.probeInFlight && s.inFlight < this.config.shardConcurrency
        && !(this.config.registryEnabled && (this.registryError || now - this.registryRefreshedAtMs > 5000)),
      status: !Number.isFinite(readyAt) ? 'disabled' : readyAt > now ? 'cooldown' : s.probeInFlight ? 'probing' : 'active',
      inFlight: s.inFlight, maxConcurrency: this.config.shardConcurrency,
      consecutiveFailures: s.consecutiveFailures, quotaFailures: s.quotaFailures ?? 0,
      slidingWindowUsage: timestamps.length, slidingWindowCap: cap,
      slidingWindowTimestamps: timestamps.slice(-100), historyTruncated: timestamps.length > 100,
      windowDurationMs: duration, lastUsedAtMs: s.lastUsedAtMs,
      cooldownUntilMs: Number.isFinite(readyAt) ? readyAt : null,
      retryAfterSec: Number.isFinite(readyAt) ? Math.max(0, Math.ceil((readyAt - now) / 1000)) : null,
      providerLimits: limits,
      quotaKnown: limits.length > 0,
      headroom: cap === null ? null : Math.max(0, cap - timestamps.length),
    };
  }

  private async handleSetQuotaProfile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const data = await readJsonBody(req, Math.min(this.config.maxPayloadBytes, 16384), this.config.httpBodyTimeoutMs);
      const requestedMode = data.mode as QuotaMode;

      if (requestedMode && !Object.hasOwn(QUOTA_PRESETS, requestedMode)) throw new Error('Unknown quota mode');
      const next = { ...(requestedMode ? QUOTA_PRESETS[requestedMode] : this.currentQuotaProfile) };
      if (data.customCap !== undefined) {
        if (!Number.isSafeInteger(data.customCap) || data.customCap < 0) throw new Error('customCap must be a nonnegative integer; 0 removes the local cap');
        next.maxCalls = data.customCap;
      }
      if (data.customWindowMin !== undefined) {
        if (!Number.isFinite(data.customWindowMin) || data.customWindowMin <= 0 || data.customWindowMin > 10080) throw new Error('customWindowMin must be between 0 and 10080');
        next.windowDurationMs = data.customWindowMin * 60_000;
      }
      next.dripRefillSec = 0;
      next.elasticBurstAllowance = 0;
      this.currentQuotaProfile = next;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        profile: this.currentQuotaProfile,
        effectiveCap: this.currentQuotaProfile.maxCalls || null,
        message: `Quota profile updated to ${this.currentQuotaProfile.mode.toUpperCase()}`,
      }));
    } catch (err: any) {
      res.writeHead(err instanceof RequestError ? err.status : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: err instanceof RequestError ? err.code : 'invalid_quota_profile', message: err.message } }));
    }
  }

  private async handleResetQuota(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const data = await readJsonBody(req, Math.min(this.config.maxPayloadBytes, 16384), this.config.httpBodyTimeoutMs);
      const shardId = data.shardId;

      const allShards = this.shardsTable.getAll();
      let resetCount = 0;

      for (const shard of allShards) {
        if (!shardId || shard.id === shardId) {
          this.shardsTable.put(shard.id, {
            ...shard,
            slidingWindowTimestamps: [],
            // Only clear local history; provider cooldowns and disabled credentials remain.
          });
          resetCount++;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        resetCount,
        message: `Cleared local history for ${resetCount} shard(s); provider cooldowns remain`,
      }));
    } catch (err: any) {
      res.writeHead(err instanceof RequestError ? err.status : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: err instanceof RequestError ? err.code : 'invalid_quota_reset', message: err.message } }));
    }
  }

  private handleQuotaStatus(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ profile: this.currentQuotaProfile,
      effectiveCap: this.currentQuotaProfile.maxCalls || null,
      shards: this.shardsTable.getAll().map(s => this.shardStats(s)),
    }));
  }

  private async handleSyncShards(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (this.config.registryEnabled) await this.refreshShardRegistry(true);
      else this.loadShardFleet();
      const allShards = this.shardsTable.getAll();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        enrolledCount: allShards.length,
        shards: allShards.map((s) => ({ id: s.id, accountId: s.accountId, status: s.status })),
        message: `Successfully synchronized ${allShards.length} shards in the fleet pool.`,
      }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Failed to sync shards: ${err.message}` } }));
    }
  }

  private async handleEnrollShard(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'registry_enrollment_required',
      message: 'Enroll credentials with npm run shards:import, then sync the relay fleet.',
    } }));
  }

  private handleListShards(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', totalCount: this.shardsTable.count(),
      registry: { source: this.config.registryEnabled ? 'PostgreSQL registry' : 'local credentials', error: this.registryError, ...this.registryCounts },
      shards: this.shardsTable.getAll().map(s => this.shardStats(s)),
    }));
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE CONTROLS (START & GRACEFUL DRAIN)
  // --------------------------------------------------------------------------

  public async start(): Promise<void> {
    this.eventLoopDelay.enable();
    await this.refreshShardRegistry(true);
    return new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        this.eventLoopDelay.disable();
        if (this.snapshotIntervalTimer) clearInterval(this.snapshotIntervalTimer);
        reject(error);
      };
      this.server.once('error', onError);
      this.server.listen(this.config.port, this.config.host, () => {
        this.server.off('error', onError);
        console.log(`[BroccoliDB Relay] Listening on http://${this.config.host}:${this.config.port}`);
        console.log(`[BroccoliDB Relay] Shards enrolled: ${this.shardsTable.count()} | Target WS: ${this.config.wsEndpoint}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    this.stopping ??= this.drainAndStop();
    return this.stopping;
  }

  private async drainAndStop(): Promise<void> {
    this.isDraining = true;
    this.eventLoopDelay.disable();
    if (this.snapshotIntervalTimer) clearInterval(this.snapshotIntervalTimer);
    console.log('[BroccoliDB Relay] Entering graceful drain mode...');
    const forceClose = () => {
      for (const controller of this.imageControllers) controller.abort(new Error('server_draining'));
      for (const [jobId, session] of this.sessions) {
        const shardId = session.currentShardId;
        session.currentShardId = undefined;
        if (this.jobQueue.markFailed(jobId, 'relay_drain_timeout')) this.metrics.totalJobsFailed++;
        session.abortController.abort(new Error('Relay drain timeout'));
        this.safeCloseSocket(session.upstreamWs);
        if (shardId) this.releaseShard(shardId);
      }
      for (const socket of this.sockets) socket.destroy();
    };
    const deadline = setTimeout(forceClose, this.config.drainTimeoutMs);
    try {
      const drained = await this.waitForQueueDrain(this.config.drainTimeoutMs);
      if (!drained) forceClose();
      await this.jobBus.whenIdle();
      this.saveStateSnapshot();
      await new Promise<void>(resolve => {
        this.server.close(() => resolve());
        this.server.closeIdleConnections();
      });
    } finally {
      clearTimeout(deadline);
      console.log('[BroccoliDB Relay] HTTP listener closed cleanly.');
    }
  }

  private waitForQueueDrain(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (drained: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(check);
        this.jobBus.removeListener('relay:drained', onDrained);
        resolve(drained);
      };
      const empty = () => this.jobQueue.activeCount() === 0 && this.imageControllers.size === 0 && this.admittedRequests === 0;
      const onDrained = () => { if (empty()) finish(true); };
      this.jobBus.once('relay:drained', onDrained);
      const timer = setTimeout(() => finish(false), timeoutMs);
      const check = setInterval(onDrained, 10);

      // Subscribe before checking to avoid losing the final transition between
      // an empty-state check and listener installation.
      if (empty()) finish(true);
    });
  }
}

// ----------------------------------------------------------------------------
// ENTRYPOINT EXECUTION
// ----------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  // Global Crash Fence: prevent unhandled exceptions or rejections from terminating the process
  process.on('uncaughtException', (err: Error) => {
    console.error('[BroccoliDB Relay Sentry] Prevented crash on uncaught exception:', err.message);
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('[BroccoliDB Relay Sentry] Prevented crash on unhandled rejection:', reason);
  });

  const relay = new GalxaiRelayServer();

  const shutdown = async (signal: string) => {
    console.log(`\n[BroccoliDB Relay] Received ${signal}`);
    await relay.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  relay.start().catch((err) => {
    console.error('[BroccoliDB Relay] Fatal startup error:', err);
    process.exit(1);
  });
}
