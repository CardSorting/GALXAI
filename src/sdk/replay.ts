/**
 * GALXAI Developer SDK: Deterministic Offline Record & Replay Harness
 * Powered by BroccoliDB L1 Reactive Tables for sub-millisecond offline test replay.
 * Allows developers to record live AI agent runs into session fixtures and replay them
 * in CI/CD without network latency, API keys, or burning tokens.
 * Pattern inspired by VCR.py, Polka, and Playwright network fixture recording.
 */

import { createHash } from 'node:crypto';
import { BroccoliDbTable } from '../core/broccolidb/broccolidb-table';
import type { GalxPlugin, MiddlewareRequestContext, MiddlewareResponseContext } from './middleware';

export interface ReplayRecord {
  id: string; // `${sessionName}_${requestHash}`
  sessionName: string;
  requestHash: string;
  path: string;
  method: string;
  requestBody: any;
  response: any;
  recordedAt: number;
}

export class ReplayHarness {
  private readonly table: BroccoliDbTable<ReplayRecord>;
  private mode: 'idle' | 'recording' | 'replaying' = 'idle';
  private activeSession = '';

  constructor() {
    this.table = new BroccoliDbTable<ReplayRecord>('sdk_replay_fixtures');
    this.table.createIndex('sessionName');
    this.table.createIndex('requestHash');
  }

  public getMode(): 'idle' | 'recording' | 'replaying' {
    return this.mode;
  }

  public getActiveSession(): string {
    return this.activeSession;
  }

  /**
   * Starts recording all outbound network requests and model completions into a named session.
   */
  public startRecording(sessionName: string): void {
    this.mode = 'recording';
    this.activeSession = sessionName;
  }

  /**
   * Stops recording.
   */
  public stopRecording(): void {
    this.mode = 'idle';
    this.activeSession = '';
  }

  /**
   * Starts replaying recorded responses for a named session in $<0.01ms$ offline mode.
   */
  public startReplay(sessionName: string): void {
    this.mode = 'replaying';
    this.activeSession = sessionName;
  }

  /**
   * Stops replaying.
   */
  public stopReplay(): void {
    this.mode = 'idle';
    this.activeSession = '';
  }

  /**
   * Computes deterministic fingerprint for an HTTP request.
   */
  public computeRequestHash(path: string, method: string, body: any): string {
    const canonical = { path, method, body };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  /**
   * Records a request/response pair into the active session.
   */
  public record(sessionName: string, path: string, method: string, requestBody: any, response: any): void {
    const requestHash = this.computeRequestHash(path, method, requestBody);
    const id = `${sessionName}_${requestHash}`;

    this.table.put(id, {
      id,
      sessionName,
      requestHash,
      path,
      method,
      requestBody,
      response,
      recordedAt: Date.now()
    });
  }

  /**
   * Retrieves a recorded response from the active session.
   */
  public lookup(sessionName: string, path: string, method: string, requestBody: any): any | null {
    const requestHash = this.computeRequestHash(path, method, requestBody);
    const id = `${sessionName}_${requestHash}`;
    const entry = this.table.get(id);
    return entry ? entry.response : null;
  }

  /**
   * Returns all recorded fixtures for a session.
   */
  public getSessionFixtures(sessionName: string): ReplayRecord[] {
    return this.table.query({ where: { sessionName } }) as ReplayRecord[];
  }

  /**
   * Clears all recorded fixtures.
   */
  public clear(sessionName?: string): void {
    if (sessionName) {
      const fixtures = this.getSessionFixtures(sessionName);
      for (const f of fixtures) {
        this.table.delete(f.id);
      }
    } else {
      this.table.clear();
    }
  }

  /**
   * Converts the replay harness into a middleware plugin for the client pipeline.
   */
  public toPlugin(): GalxPlugin {
    const self = this;
    return {
      name: 'ReplayHarnessPlugin',

      onRequest: (ctx: MiddlewareRequestContext) => {
        if (self.mode === 'replaying' && self.activeSession) {
          const matched = self.lookup(self.activeSession, ctx.path, ctx.method, ctx.body);
          if (matched) {
            return { shortCircuitResponse: matched };
          }
        }
      },

      onResponse: (ctx: MiddlewareResponseContext) => {
        if (self.mode === 'recording' && self.activeSession && ctx.data) {
          self.record(self.activeSession, ctx.path, ctx.method, ctx.requestBody, ctx.data);
        }
      }
    };
  }
}
