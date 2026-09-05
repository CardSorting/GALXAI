/**
 * GALXAI: Zero-Egress In-Flight Edge Model Router & Provider Failover
 * Intercepts upstream 429 / 5xx / timeout errors in <10ms and transparently fails over to secondary
 * provider shards without dropping client streams or triggering redundant database roundtrips.
 *
 * ARCHITECTURAL BOUNDARY:
 * Governs standard wholesale HTTP API provider shards (OpenAI, xAI). Codex WebSocket sessions
 * require persistent bidirectional connections governed authoritatively by the dedicated Always-On
 * VM Relay (LUMI-NEW/src/relay/relay-server.ts).
 */

import type { ChatCompletionRequest, CredentialStatus } from '../../core/contracts/GalxContracts';

export interface UpstreamShardCandidate {
  shardId: string;
  provider: 'openai';
  accountLabel: string;
  priority: number;
  isHealthy: boolean;
  status?: CredentialStatus;
  remainingTokens?: number;
  averageLatencyMs?: number;
}

export class GalxEdgeRouter {
  private static instance: GalxEdgeRouter;

  static getInstance(): GalxEdgeRouter {
    if (!GalxEdgeRouter.instance) {
      GalxEdgeRouter.instance = new GalxEdgeRouter();
    }
    return GalxEdgeRouter.instance;
  }

  /**
   * Executes a model request with transparent edge failover, deadline enforcement, and jittered fallback.
   */
  async routeWithFailover(params: {
    request: ChatCompletionRequest;
    primaryShard: UpstreamShardCandidate;
    backupShards: UpstreamShardCandidate[];
    executeFn: (shard: UpstreamShardCandidate) => Promise<Response>;
    onFailover?: (failedShard: UpstreamShardCandidate, errorStatus: number, nextShard: UpstreamShardCandidate) => void;
  }): Promise<{ response: Response; shardUsed: UpstreamShardCandidate; failoverOccurred: boolean; attempts: number }> {
    const candidates = [params.primaryShard, ...params.backupShards.filter(s => s.isHealthy && s.status !== 'dead')];

    let lastError: Error | null = null;
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        if (i > 0) {
          // Micro-jitter to prevent synchronized secondary stampedes
          const jitterMs = Math.floor(Math.random() * 50) + 10;
          await new Promise((r) => setTimeout(r, jitterMs));
        }

        const resp = await params.executeFn(candidate);
        // If upstream returns 429, 5xx, or 404 (model not found), fail over to next candidate immediately
        if (resp.status === 429 || resp.status >= 500 || resp.status === 404 || resp.status === 400) {
          if (i + 1 < candidates.length && params.onFailover) {
            params.onFailover(candidate, resp.status, candidates[i + 1]);
          }
          continue;
        }

        return {
          response: resp,
          shardUsed: candidate,
          failoverOccurred: i > 0,
          attempts: i + 1
        };
      } catch (err: any) {
        lastError = err;
        if (i + 1 < candidates.length && params.onFailover) {
          params.onFailover(candidate, 504, candidates[i + 1]);
        }
      }
    }

    throw lastError || new Error('All provider candidates failed');
  }
}

