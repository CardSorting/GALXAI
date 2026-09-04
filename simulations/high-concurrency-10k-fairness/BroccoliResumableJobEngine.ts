/**
 * @file BroccoliResumableJobEngine.ts
 * @description Asynchronous HTTP 202 Job Engine with BroccoliDB Resumable Streaming.
 * Mirrors OpenAI Runs & Midjourney Job Queues:
 * - Asynchronous job state machine: queued -> running -> streaming -> completed / aborted.
 * - In-memory reactive BroadcastChannels for zero-DB pubsub fanout.
 * - Last-Event-ID token replay across network disconnects.
 * - Atomic Idempotent Stream Attachment: duplicate requests attach to the running stream.
 */

import { BroccoliHybridTaskStore } from './BroccoliHybridTaskStore';
import { CalibratedEtaEngine } from './CalibratedEtaEngine';
import { ClientRequest, JobTokenRecord } from './types';

export interface ActiveJobStream {
  jobId: string;
  request: ClientRequest;
  status: 'queued' | 'running' | 'completed' | 'aborted';
  subscribers: Array<(chunk: JobTokenRecord) => void>;
  seqCount: number;
}

export class BroccoliResumableJobEngine {
  private hybridStore: BroccoliHybridTaskStore;
  private etaEngine: CalibratedEtaEngine;
  private activeStreams = new Map<string, ActiveJobStream>();
  private promptHashToJobId = new Map<string, string>();

  private attachedDuplicates = 0;
  private totalReconnections = 0;
  private totalTokensServedFromBuffer = 0;
  private seqCounters = new Map<string, number>();

  constructor(hybridStore: BroccoliHybridTaskStore, etaEngine: CalibratedEtaEngine) {
    this.hybridStore = hybridStore;
    this.etaEngine = etaEngine;
  }

  /**
   * Register a new job or attach to an existing in-flight job if idempotent duplicate.
   */
  public registerOrAttachJob(
    req: ClientRequest,
    queuePosition: number
  ): {
    jobId: string;
    isAttachedDuplicate: boolean;
    httpStatusCode: 200 | 202;
    headers: Record<string, string>;
  } {
    // 1. Check if identical prompt or idempotencyKey is already running
    const existingJobId = this.promptHashToJobId.get(req.promptHash);
    if (existingJobId) {
      const existing = this.activeStreams.get(existingJobId);
      if (existing && (existing.status === 'queued' || existing.status === 'running')) {
        this.attachedDuplicates++;
        return {
          jobId: existingJobId,
          isAttachedDuplicate: true,
          httpStatusCode: 202,
          headers: {
            'Location': `/v1/jobs/${existingJobId}/stream`,
            'X-Attached-Stream': 'true',
            ...this.etaEngine.formatHeaders(queuePosition)
          }
        };
      }
    }

    // 2. Register fresh job
    const jobId = req.id;
    this.promptHashToJobId.set(req.promptHash, jobId);

    this.activeStreams.set(jobId, {
      jobId,
      request: req,
      status: 'queued',
      subscribers: [],
      seqCount: 0
    });

    this.hybridStore.recordEnqueue(req);

    const headers = {
      'Location': `/v1/jobs/${jobId}/stream`,
      ...this.etaEngine.formatHeaders(queuePosition)
    };

    return {
      jobId,
      isAttachedDuplicate: false,
      httpStatusCode: 202,
      headers
    };
  }

  /**
   * Subscribe a client socket to an active job stream.
   * If `fromSeqIndex` is provided (e.g. from Last-Event-ID header), replay missed chunks first.
   */
  public subscribeToJobStream(
    jobId: string,
    fromSeqIndex: number,
    onChunk: (chunk: JobTokenRecord) => void
  ): { unsubscribe: () => void; replayedCount: number } {
    const stream = this.activeStreams.get(jobId);

    // 1. Replay missed chunks from BroccoliDB table
    let replayedCount = 0;
    if (fromSeqIndex > 0) {
      const missedChunks = this.hybridStore.getStreamChunksFrom(jobId, fromSeqIndex);
      for (const chunk of missedChunks) {
        onChunk(chunk);
        replayedCount++;
        this.totalTokensServedFromBuffer++;
      }
      if (replayedCount > 0) {
        this.totalReconnections++;
      }
    }

    if (!stream || stream.status === 'completed' || stream.status === 'aborted') {
      return { unsubscribe: () => {}, replayedCount };
    }

    stream.subscribers.push(onChunk);

    return {
      unsubscribe: () => {
        const idx = stream.subscribers.indexOf(onChunk);
        if (idx !== -1) stream.subscribers.splice(idx, 1);
      },
      replayedCount
    };
  }

  /**
   * Publish a generated chunk to all active subscribers and buffer it into BroccoliDB.
   */
  public emitStreamChunk(jobId: string, chunkText: string, isFinal = false): void {
    const stream = this.activeStreams.get(jobId);
    const nextSeq = (this.seqCounters.get(jobId) || 0) + 1;
    this.seqCounters.set(jobId, nextSeq);
    const seq = stream ? (++stream.seqCount) : nextSeq;

    // Buffer to durable BroccoliDB Zenith table
    this.hybridStore.bufferStreamChunk(jobId, seq, chunkText, isFinal);

    if (stream) {
      stream.status = 'running';
      const record: JobTokenRecord = {
        id: `${jobId}_${seq}`,
        jobId,
        seqIndex: seq,
        chunkText,
        isFinal,
        createdAtMs: Date.now()
      };

      for (const subscriber of stream.subscribers) {
        try {
          subscriber(record);
        } catch {}
      }

      if (isFinal) {
        stream.status = 'completed';
        this.promptHashToJobId.delete(stream.request.promptHash);
      }
    }
  }

  public getStats() {
    return {
      activeStreams: this.activeStreams.size,
      attachedDuplicates: this.attachedDuplicates,
      totalReconnections: this.totalReconnections,
      totalTokensServedFromBuffer: this.totalTokensServedFromBuffer
    };
  }
}
