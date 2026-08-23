/**
 * GALXAI: Cloudflare Worker Main Entrypoint
 * Handles HTTP requests via GalxEdgeGateway and scheduled background tasks via GalxEdgeQueueWorker.
 */

import { GalxEdgeGateway, type CloudflareEnv } from './GalxEdgeGateway';
import { GalxEdgeQueueWorker } from './GalxEdgeQueueWorker';
import { GalxSwarmCoordinatorDO } from './GalxSwarmCoordinatorDO';

export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface CloudflareScheduledEvent {
  cron: string;
  scheduledTime: number;
  type: string;
}

export { GalxEdgeGateway, GalxEdgeQueueWorker, GalxSwarmCoordinatorDO };

export default {
  /**
   * HTTP Request Ingress Handler (Edge Gateway & SSE Proxy)
   */
  async fetch(request: Request, env: CloudflareEnv, ctx: CloudflareExecutionContext): Promise<Response> {
    const gateway = new GalxEdgeGateway(env);
    return gateway.handleRequest(request);
  },

  /**
   * Cron Schedule Handler (Zero-Egress Background Queue Dispatcher)
   */
  async scheduled(event: CloudflareScheduledEvent, env: CloudflareEnv, ctx: CloudflareExecutionContext): Promise<void> {
    const worker = new GalxEdgeQueueWorker(env);
    ctx.waitUntil(worker.processBatch('default', 25));
  }
};
