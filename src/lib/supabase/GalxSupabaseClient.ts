/**
 * GALXAI: Fluent Supabase PostgreSQL & Cloudflare Edge SDK Facade
 * Unified developer client providing strongly-typed access to all backend domains.
 */

import { WorkspaceRepository } from './repositories/WorkspaceRepository';
import { ProjectRepository } from './repositories/ProjectRepository';
import { ApiKeyRepository } from './repositories/ApiKeyRepository';
import { ShardRepository } from './repositories/ShardRepository';
import { QueueRepository } from './repositories/QueueRepository';
import { TaskRepository } from './repositories/TaskRepository';
import { WalletRepository } from './repositories/WalletRepository';
import { TelemetryRepository } from './repositories/TelemetryRepository';
import { EmbeddingsRepository } from './repositories/EmbeddingsRepository';
import { DistributedLockRepository } from './repositories/DistributedLockRepository';
import { IdempotencyRepository } from './repositories/IdempotencyRepository';
import { AuditRepository } from './repositories/AuditRepository';
import { BudgetRepository } from './repositories/BudgetRepository';
import { ShardHealthRepository } from './repositories/ShardHealthRepository';
import { SessionRepository } from './repositories/SessionRepository';
import { GalxEdgeGateway } from '../../workers/cloudflare/GalxEdgeGateway';
import { GalxEdgeQueueWorker } from '../../workers/cloudflare/GalxEdgeQueueWorker';
import { GalxEdgeCache } from '../../workers/cloudflare/GalxEdgeCache';
import { GalxEdgeBatchBuffer } from '../../workers/cloudflare/GalxEdgeBatchBuffer';
import { GalxR2AssetAdapter } from '../../workers/cloudflare/GalxR2AssetAdapter';
import { GalxEdgeWire } from '../../workers/cloudflare/GalxEdgeWire';
import { GalxEdgeRouter } from '../../workers/cloudflare/GalxEdgeRouter';
import { GalxSwarmCoordinatorDO } from '../../workers/cloudflare/GalxSwarmCoordinatorDO';
import { GalxEdgeSpeculativeEngine } from '../../workers/cloudflare/GalxEdgeSpeculativeEngine';
import { GalxEdgeConnectionPool } from '../../workers/cloudflare/GalxEdgeConnectionPool';
import { GalxEdgeWebhookDispatcher } from '../../workers/cloudflare/GalxEdgeWebhookDispatcher';
import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from './client';
import { getSupabaseConfig } from './config';

export class GalxSupabaseClient {
  public readonly workspaces = WorkspaceRepository.getInstance();
  public readonly projects = ProjectRepository.getInstance();
  public readonly keys = ApiKeyRepository.getInstance();
  public readonly shards = ShardRepository.getInstance();
  public readonly queues = QueueRepository.getInstance();
  public readonly tasks = TaskRepository.getInstance();
  public readonly wallets = WalletRepository.getInstance();
  public readonly telemetry = TelemetryRepository.getInstance();
  public readonly embeddings = EmbeddingsRepository.getInstance();
  public readonly locks = DistributedLockRepository.getInstance();
  public readonly idempotency = IdempotencyRepository.getInstance();
  public readonly audit = AuditRepository.getInstance();
  public readonly budgets = BudgetRepository.getInstance();
  public readonly health = ShardHealthRepository.getInstance();
  public readonly sessions = SessionRepository.getInstance();


  // Edge Mesh Subsystems
  public readonly cache = GalxEdgeCache.getInstance();
  public readonly batch = GalxEdgeBatchBuffer.getInstance();
  public readonly assets = GalxR2AssetAdapter.getInstance();
  public readonly wire = GalxEdgeWire.getInstance();
  public readonly router = GalxEdgeRouter.getInstance();
  public readonly speculative = GalxEdgeSpeculativeEngine.getInstance();
  public readonly pools = GalxEdgeConnectionPool.getInstance();
  public readonly webhooks = GalxEdgeWebhookDispatcher.getInstance();

  /**
   * Initializes an in-memory or Cloudflare Durable Object swarm coordinator.
   */
  createSwarmCoordinator(swarmId: string, goal: string): GalxSwarmCoordinatorDO {
    return new GalxSwarmCoordinatorDO(swarmId, goal);
  }

  /**
   * Initializes a Cloudflare Zero-Egress Edge Gateway instance.
   */
  createEdgeGateway(customConfig?: { supabaseUrl?: string; supabaseKey?: string }): GalxEdgeGateway {
    const config = getSupabaseConfig();
    return new GalxEdgeGateway({
      SUPABASE_URL: customConfig?.supabaseUrl || config.supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: customConfig?.supabaseKey || config.supabaseServiceRoleKey
    });
  }

  /**
   * Initializes a Cloudflare Zero-Egress Edge Queue Worker fleet instance.
   */
  createEdgeQueueWorker(workerIdPrefix = 'cf_worker'): GalxEdgeQueueWorker {
    const config = getSupabaseConfig();
    return new GalxEdgeQueueWorker(
      {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey
      },
      workerIdPrefix
    );
  }

  /**
   * Direct access to underlying Supabase Admin client.
   */
  get admin() {
    return getSupabaseAdmin();
  }

  /**
   * Direct access to Supabase client with user token.
   */
  client(accessToken?: string) {
    return getSupabaseClient(accessToken);
  }

  get isConfigured(): boolean {
    return isSupabaseConfigured();
  }
}

/**
 * Singleton default instance of the fluent GalxSupabaseClient.
 */
export const galxDb = new GalxSupabaseClient();
