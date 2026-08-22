import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GalxShardAccount, DeveloperGatewayKey } from '../../core/contracts/GalxContracts';

export interface GalxPersistedState {
  shards: GalxShardAccount[];
  gatewayKeys: DeveloperGatewayKey[];
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
}
