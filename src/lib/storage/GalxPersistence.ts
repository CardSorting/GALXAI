import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GalxShardAccount, DeveloperGatewayKey, GalxTaskQueueConfig, GalxTask } from '../../core/contracts/GalxContracts';

export interface GalxPersistedState {
  shards: GalxShardAccount[];
  gatewayKeys: DeveloperGatewayKey[];
  queues: GalxTaskQueueConfig[];
  tasks: GalxTask[];
  auditLogs: Array<{
    id: string;
    shardId?: string;
    userId?: string;
    action: string;
    metadata: any;
    timestampMs: number;
  }>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STATE_FILE = path.join(DATA_DIR, 'galx_state.json');

/**
 * Resilient JSON-backed local persistence engine for GALXAI.
 */
export class GalxPersistence {
  private static instance: GalxPersistence;
  private state: GalxPersistedState = {
    shards: [],
    gatewayKeys: [],
    queues: [],
    tasks: [],
    auditLogs: []
  };
  private isLoaded = false;

  private constructor() {
    this.load();
  }

  static getInstance(): GalxPersistence {
    if (!GalxPersistence.instance) {
      GalxPersistence.instance = new GalxPersistence();
    }
    return GalxPersistence.instance;
  }

  private load(): void {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          shards: parsed.shards || [],
          gatewayKeys: parsed.gatewayKeys || [],
          queues: parsed.queues || [],
          tasks: parsed.tasks || [],
          auditLogs: parsed.auditLogs || []
        };
      } else {
        this.save();
      }
      this.isLoaded = true;
    } catch {
      // In-memory fallback
      this.isLoaded = true;
    }
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in restricted environments
    }
  }

  public getShards(): GalxShardAccount[] {
    return this.state.shards;
  }

  public saveShard(shard: GalxShardAccount): void {
    const idx = this.state.shards.findIndex(s => s.id === shard.id);
    if (idx >= 0) {
      this.state.shards[idx] = shard;
    } else {
      this.state.shards.push(shard);
    }
    this.save();
  }

  public deleteShard(shardId: string): void {
    this.state.shards = this.state.shards.filter(s => s.id !== shardId);
    this.save();
  }

  public getGatewayKeys(): DeveloperGatewayKey[] {
    return this.state.gatewayKeys;
  }

  public saveGatewayKey(key: DeveloperGatewayKey): void {
    const idx = this.state.gatewayKeys.findIndex(k => k.id === key.id);
    if (idx >= 0) {
      this.state.gatewayKeys[idx] = key;
    } else {
      this.state.gatewayKeys.push(key);
    }
    this.save();
  }

  public getAuditLogs(): GalxPersistedState['auditLogs'] {
    return this.state.auditLogs;
  }

  public logAudit(action: string, metadata: any, shardId?: string, userId?: string): void {
    const logItem = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      shardId,
      userId,
      action,
      metadata,
      timestampMs: Date.now()
    };
    this.state.auditLogs.unshift(logItem);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public getQueues(): GalxTaskQueueConfig[] {
    return this.state.queues;
  }

  public saveQueue(queue: GalxTaskQueueConfig): void {
    const idx = this.state.queues.findIndex(q => q.id === queue.id);
    if (idx >= 0) {
      this.state.queues[idx] = queue;
    } else {
      this.state.queues.push(queue);
    }
    this.save();
  }

  public deleteQueue(queueId: string): void {
    this.state.queues = this.state.queues.filter(q => q.id !== queueId);
    this.state.tasks = this.state.tasks.filter(t => t.queueId !== queueId);
    this.save();
  }

  public getTasks(): GalxTask[] {
    return this.state.tasks;
  }

  public saveTask(task: GalxTask): void {
    const idx = this.state.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      this.state.tasks[idx] = task;
    } else {
      this.state.tasks.push(task);
    }
    if (this.state.tasks.length > 5000) {
      // Retain most recent 5000 tasks
      this.state.tasks = this.state.tasks.slice(-5000);
    }
    this.save();
  }

  public deleteTask(taskId: string): void {
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
    this.save();
  }

  public purgeQueueTasks(queueId: string, statusFilter?: string): number {
    const prevCount = this.state.tasks.length;
    if (statusFilter) {
      this.state.tasks = this.state.tasks.filter(t => !(t.queueId === queueId && t.status === statusFilter));
    } else {
      this.state.tasks = this.state.tasks.filter(t => t.queueId !== queueId);
    }
    const purged = prevCount - this.state.tasks.length;
    this.save();
    return purged;
  }
}

