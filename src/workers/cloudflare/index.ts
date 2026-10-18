/**
 * GALXAI: Cloudflare Worker Main Entrypoint
 * Handles HTTP requests via GalxEdgeGateway and scheduled background tasks via GalxEdgeQueueWorker.
 */

import { GalxEdgeGateway, type CloudflareEnv } from './GalxEdgeGateway';
import { GalxEdgeQueueWorker } from './GalxEdgeQueueWorker';
import { GalxMessageBillingWorker } from './GalxMessageBillingWorker';
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
    // Production has no assigned database credential. Do not activate legacy
    // polling or billing while the application authority lives elsewhere.
    // Retain the isolated fixtures and records without issuing background I/O.
    if (env.ENVIRONMENT !== 'test' && env.ENVIRONMENT !== 'development') return;
    const worker = new GalxEdgeQueueWorker(env);
    const messageBilling = new GalxMessageBillingWorker(env);
    ctx.waitUntil(Promise.all([
      worker.processBatch('default', 25),
      messageBilling.processBatch(25),
    ]).then(() => undefined));
  }
};
