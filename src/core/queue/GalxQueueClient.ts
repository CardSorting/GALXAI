import * as crypto from 'node:crypto';
import type {
  CreateTaskOptions,
  GalxTask,
  ChatCompletionRequest,
  ImageGenerationRequest,
  TaskPipelineStep,
  CronScheduleConfig,
  BulkRedriveResponse,
  BulkCancelResponse
} from '../contracts/GalxContracts';
import { GalxTaskQueueEngine } from './GalxTaskQueueEngine';

export interface EnqueueChatOptions {
  queueId?: string;
  userId?: string;
  idempotencyKey?: string;
  groupId?: string; // FIFO partition key
  tag?: string;
  priority?: number;
  delayMs?: number;
  scheduleTimeMs?: number;
  model: string;
  messages: ChatCompletionRequest['messages'];
  temperature?: number;
  max_tokens?: number;
  webhookCompletionUrl?: string;
  webhookHmacSecret?: string;
  isPriorityUser?: boolean;
}

export interface EnqueueImageOptions {
  queueId?: string;
  userId?: string;
  idempotencyKey?: string;
  groupId?: string;
  tag?: string;
  priority?: number;
  delayMs?: number;
  scheduleTimeMs?: number;
  prompt: string;
  model?: string;
  size?: string;
  quality?: 'standard' | 'hd';
  webhookCompletionUrl?: string;
  webhookHmacSecret?: string;
}

export interface EnqueueWebhookOptions {
  queueId?: string;
  userId?: string;
  idempotencyKey?: string;
  groupId?: string;
  tag?: string;
  priority?: number;
  delayMs?: number;
  scheduleTimeMs?: number;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  hmacSecret?: string;
  timeoutMs?: number;
}

export interface CreatePipelineOptions {
  queueId?: string;
  userId?: string;
  idempotencyKey?: string;
  groupId?: string;
  tag?: string;
  priority?: number;
  delayMs?: number;
  scheduleTimeMs?: number;
  steps: TaskPipelineStep[];
}

export interface PollTaskOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (progress: GalxTask['progress']) => void;
}

/**
 * Developer Ergonomics Client SDK for GALXAI Asynchronous Task Queues.
 * Provides high-level type-safe primitives for AI agent swarms and background workers.
 */
export class GalxQueueClient {
  private readonly engine: GalxTaskQueueEngine;

  constructor(engine = GalxTaskQueueEngine.getInstance()) {
    this.engine = engine;
  }

  /**
   * Enqueues an asynchronous OpenAI/Grok chat completion workload.
   */
  public enqueueChat(options: EnqueueChatOptions): { task: GalxTask; deduplicated: boolean } {
    const chatPayload: ChatCompletionRequest = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens
    };

    return this.engine.createTask({
      queueId: options.queueId || 'llm-batch',
      userId: options.userId,
      idempotencyKey: options.idempotencyKey,
      groupId: options.groupId,
      tag: options.tag,
      priority: options.priority ?? 50,
      delayMs: options.delayMs,
      scheduleTimeMs: options.scheduleTimeMs,
      target: {
        type: 'INTERNAL_MODEL',
        taskKind: 'chat_completion',
        chatPayload,
        isPriorityUser: options.isPriorityUser,
        webhookCompletionUrl: options.webhookCompletionUrl,
        webhookHmacSecret: options.webhookHmacSecret
      }
    });
  }

  /**
   * Enqueues an asynchronous visual synthesis workload.
   */
  public enqueueImage(options: EnqueueImageOptions): { task: GalxTask; deduplicated: boolean } {
    const imagePayload: ImageGenerationRequest = {
      prompt: options.prompt,
      model: options.model || 'openai-gpt-image-2',
      size: options.size,
      quality: options.quality
    };

    return this.engine.createTask({
      queueId: options.queueId || 'image-gen',
      userId: options.userId,
      idempotencyKey: options.idempotencyKey,
      groupId: options.groupId,
      tag: options.tag,
      priority: options.priority ?? 50,
      delayMs: options.delayMs,
      scheduleTimeMs: options.scheduleTimeMs,
      target: {
        type: 'INTERNAL_MODEL',
        taskKind: 'image_generation',
        imagePayload,
        webhookCompletionUrl: options.webhookCompletionUrl,
        webhookHmacSecret: options.webhookHmacSecret
      }
    });
  }

  /**
   * Enqueues an HTTP push webhook task with HMAC-SHA256 signing to Cloud Run or serverless target.
   */
  public enqueueWebhook(options: EnqueueWebhookOptions): { task: GalxTask; deduplicated: boolean } {
    return this.engine.createTask({
      queueId: options.queueId || 'webhooks',
      userId: options.userId,
      idempotencyKey: options.idempotencyKey,
      groupId: options.groupId,
      tag: options.tag,
      priority: options.priority ?? 50,
      delayMs: options.delayMs,
      scheduleTimeMs: options.scheduleTimeMs,
      target: {
        type: 'HTTP_PUSH',
        url: options.url,
        method: options.method || 'POST',
        headers: options.headers,
        body: options.body,
        hmacSecret: options.hmacSecret,
        timeoutMs: options.timeoutMs
      }
    });
  }

  /**
   * Creates a multi-step sequential DAG pipeline where output feeds downstream steps.
   */
  public createPipeline(options: CreatePipelineOptions): { task: GalxTask; deduplicated: boolean } {
    const initialTarget = options.steps[0]?.target || {
      type: 'INTERNAL_MODEL',
      taskKind: 'chat_completion',
      chatPayload: { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Init' }] }
    };

    return this.engine.createTask({
      queueId: options.queueId || 'agent-swarms',
      userId: options.userId,
      idempotencyKey: options.idempotencyKey,
      groupId: options.groupId,
      tag: options.tag,
      priority: options.priority ?? 70,
      delayMs: options.delayMs,
      scheduleTimeMs: options.scheduleTimeMs,
      target: initialTarget,
      pipelineSteps: options.steps
    });
  }

  /**
   * Creates a recurring cron task.
   */
  public createCronSchedule(
    cronConfig: CronScheduleConfig,
    options: CreateTaskOptions
  ): { task: GalxTask; deduplicated: boolean } {
    return this.engine.createTask({
      ...options,
      cronConfig
    });
  }

  /**
   * Polls task until it reaches a terminal state ('COMPLETED', 'DEAD_LETTERED', 'CANCELLED').
   */
  public async pollUntilComplete(
    taskId: string,
    options: PollTaskOptions = {}
  ): Promise<GalxTask> {
    const intervalMs = options.intervalMs ?? 500;
    const timeoutMs = options.timeoutMs ?? 120000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const task = this.engine.getTask(taskId);
      if (!task) {
        throw new Error(`Task '${taskId}' not found.`);
      }

      if (options.onProgress && task.progress) {
        options.onProgress(task.progress);
      }

      if (['COMPLETED', 'DEAD_LETTERED', 'CANCELLED'].includes(task.status)) {
        return task;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Task '${taskId}' polling timed out after ${timeoutMs}ms.`);
  }

  /**
   * Creates a Fan-In DAG task that only unblocks when all parent tasks in dependsOn complete.
   */
  public createFanInTask(options: CreateTaskOptions & { dependsOn: string[] }): { task: GalxTask; deduplicated: boolean } {
    return this.engine.createTask(options);
  }

  /**
   * Subscribes to real-time events for a task via the EventBus.
   */
  public subscribeTaskEvents(taskId: string, onEvent: (event: import('../contracts/GalxContracts').GalxQueueEvent) => void): () => void {
    const { GalxQueueEventBus } = require('./GalxQueueEventBus');
    return GalxQueueEventBus.getInstance().subscribeTask(taskId, onEvent);
  }

  /**
   * Puts queue into DRAINING mode (finishes in-flight work while rejecting new non-priority tasks).
   */
  public drainQueue(queueId: string): boolean {
    return this.engine.drainQueue(queueId);
  }

  /**
   * Resumes a paused or draining queue back to RUNNING.
   */
  public resumeQueue(queueId: string): boolean {
    return this.engine.resumeQueue(queueId);
  }

  /**
   * Single-click bulk redrive for dead-lettered tasks in a queue.
   */
  public bulkRedrive(queueId: string, maxTasks = 100): BulkRedriveResponse {
    return this.engine.bulkRedrive(queueId, { maxTasks });
  }

  /**
   * Bulk cancels tasks matching filter criteria.
   */
  public bulkCancel(queueId: string, tag?: string, groupId?: string): BulkCancelResponse {
    return this.engine.bulkCancel(queueId, { tag, groupId });
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature against raw payload.
   */
  public static verifyWebhookSignature(
    signatureHeader: string | null,
    rawPayload: string,
    secret: string
  ): boolean {
    if (!signatureHeader) return false;
    const parts = Object.fromEntries(
      signatureHeader.split(',').map(kv => {
        const idx = kv.indexOf('=');
        return idx > 0 ? [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()] : [kv.trim(), ''];
      })
    );

    const timestamp = parts['t'];
    const receivedSig = parts['v1'];
    if (!timestamp || !receivedSig) return false;

    const signaturePayload = `${timestamp}.${rawPayload}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));
    } catch {
      return false;
    }
  }
}

