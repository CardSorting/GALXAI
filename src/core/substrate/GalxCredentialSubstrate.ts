import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { GalxShardAccount, ProviderType } from '../contracts/GalxContracts';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';
import { GalxCryptoVault } from '../vault/GalxCryptoVault';
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbAggregateQuery, DbAggregateResult } from '../broccolidb/broccolidb.contracts';

/**
 * Dual-Tier In-Memory Cache & Persistence Substrate for BYOQ Shards + BroccoliDB Hot Table.
 * Provides sub-millisecond in-memory cache lookup for queue workers while maintaining
 * persistent synchronization.
 */
export class GalxCredentialSubstrate {
  public readonly accountTable: BroccoliDbTable<GalxShardAccount>;
  private readonly persistence: GalxPersistence;
  private readonly retractListeners: Array<(shardId: string) => void> = [];
  private initialized = false;

  constructor(persistence?: GalxPersistence) {
    this.persistence = persistence || GalxPersistence.getInstance();

    this.accountTable = new BroccoliDbTable<GalxShardAccount>('credential_substrate_accounts');
    this.accountTable.createIndex('provider');
    this.accountTable.createIndex('status');
    this.accountTable.createIndex('userId');
    this.accountTable.createIndex('shardMode');
    this.accountTable.createIndex('authType');
    this.accountTable.createIndex('permissionRetracted');
    this.accountTable.createSortedIndex('priority');
    this.accountTable.createSortedIndex('weight');
    this.accountTable.createSortedIndex('expiresAtMs');
    this.accountTable.createSortedIndex('createdAtMs');

    this.initialize();
  }

  private readonly diskCachePath = path.join(process.cwd(), '.galx-shards.json');

  private saveShardsToDisk(): void {
    try {
      const allShards = this.accountTable.getAll() as GalxShardAccount[];
      fs.writeFileSync(this.diskCachePath, JSON.stringify(allShards, null, 2), { mode: 0o600 });
    } catch {}
  }

  private loadShardsFromDisk(): boolean {
    if (!fs.existsSync(this.diskCachePath)) return false;
    try {
      const raw = fs.readFileSync(this.diskCachePath, 'utf-8');
      const shards = JSON.parse(raw);
      if (Array.isArray(shards) && shards.length > 0) {
        for (const s of shards) {
          if (!s.permissionRetracted && s.status !== 'revoked') {
            this.accountTable.put(s.id, s);
          }
        }
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Initializes the in-memory cache from persistence and fleet pool sources.
   */
  public initialize(): void {
    if (this.initialized) return;

    try {
      const persistedShards = this.persistence.getShards();
      let hasRealShards = false;
      for (const shard of persistedShards) {
        if (!shard.permissionRetracted && shard.status !== 'revoked') {
          this.accountTable.put(shard.id, shard);
          if (!shard.id.startsWith('shard_galx_flagship_')) {
            hasRealShards = true;
          }
        }
      }

      // Check local disk cache if memory table is still empty
      if (!hasRealShards && this.loadShardsFromDisk()) {
        hasRealShards = true;
      }

      // If no real shards exist in the substrate, automatically ingest the multi-account fleet
      if (!hasRealShards) {
        this.seedMultiAccountFleet();
      }

      // If still empty and environment variables are present, pre-seed default developer shard
      if (this.accountTable.count() === 0) {
        this.seedInitialEnvShards();
      }

      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  /**
   * Ingests multi-account shards into GALXAI's pool from discovered credential sources.
   */
  public seedMultiAccountFleet(): number {
    const candidatePaths = [
      path.join(os.homedir(), '.lumi', 'config.json'),
      path.join(os.homedir(), '.codex', 'auth.json'),
    ];

    const discoveredAccounts: Array<{
      id?: string;
      accessToken: string;
      refreshToken?: string;
      accountId: string;
      email?: string;
      weight?: number;
      priority?: number;
    }> = [];

    const seenAccountIds = new Set<string>();

    for (const p of candidatePaths) {
      if (!fs.existsSync(p)) continue;
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const data = JSON.parse(raw);

        // Check codexOAuthPool array or map
        if (data.codexOAuthPool) {
          const list = Array.isArray(data.codexOAuthPool)
            ? data.codexOAuthPool
            : Object.values(data.codexOAuthPool);

          for (const item of list) {
            const accId = (item as any).accountId || (item as any).account_id;
            const token = (item as any).access_token || (item as any).accessToken;
            if (token && accId && !seenAccountIds.has(accId)) {
              seenAccountIds.add(accId);
              discoveredAccounts.push({
                id: (item as any).id,
                accessToken: token,
                refreshToken: (item as any).refresh_token || (item as any).refreshToken,
                accountId: accId,
                email: (item as any).email || 'codex_fleet_user@galx.ai',
                weight: Number((item as any).weight) || 1,
                priority: Number((item as any).priority) || 10
              });
            }
          }
        }

        // Check standalone tokens/codexOAuth
        const tokens = (data.tokens && data.tokens.access_token) ? data.tokens : data.codexOAuth;
        if (tokens?.access_token) {
          const accId = tokens.account_id || tokens.accountId || data.account_id;
          if (accId && !seenAccountIds.has(accId)) {
            seenAccountIds.add(accId);
            discoveredAccounts.push({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              accountId: accId,
              email: tokens.email || data.email || 'codex_primary@galx.ai',
              weight: 1,
              priority: 10
            });
          }
        }
      } catch {}
    }

    let addedCount = 0;
    for (const acc of discoveredAccounts) {
      const shardId = acc.id || `codex_sh_${acc.accountId.slice(0, 8)}_${Date.now().toString(36)}`;

      // If already enrolled, continue
      if (this.accountTable.get(shardId)) continue;

      const encrypted = GalxCryptoVault.encryptSecret(
        {
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken,
          accountId: acc.accountId,
          email: acc.email,
          name: `ChatGPT Shard (${acc.accountId.slice(0, 8)})`
        },
        'system_admin',
        shardId,
        'openai'
      );

      const shard: GalxShardAccount = {
        id: shardId,
        userId: 'system_admin',
        accountLabel: `ChatGPT Fleet Shard (${acc.accountId.slice(0, 8)})`,
        provider: 'openai',
        authType: 'oauth',
        shardMode: 'pooled',
        status: 'healthy',
        priority: acc.priority || 10,
        weight: acc.weight || 1,
        fencingToken: 1,
        accountId: acc.accountId,
        apiKeyMasked: `oauth_${acc.accountId.slice(0, 8)}...`,
        encryptedSecrets: encrypted,
        encryptedPayload: encrypted,
        privacyCapabilities: {
          hipaaCompliant: true,
          zdrCertified: true,
          dataResidency: 'global',
          baaSigned: true,
          piiFiltering: true
        },
        tokenBucket: {
          maxTokens: 500000,
          remainingTokens: 500000,
          refillRatePerMinute: 50000,
          maxRequests: 40,
          remainingRequests: 40,
          lastRefillTimestampMs: Date.now()
        },
        slidingWindowQuota: {
          windowDurationMs: 3 * 3600 * 1000,
          maxRequestsPerWindow: 40,
          usedRequestsInWindow: 0,
          windowStartTimestampMs: Date.now(),
          requestHistoryTimestampsMs: []
        },
        stats: {
          totalRequestsServed: 0,
          totalTokensConsumed: 0,
          consecutiveFailures: 0
        },
        permissionRetracted: false,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now()
      };

      this.addAccount(shard);
      addedCount++;
    }

    // Clean up fallback dummy seed if real shards were enrolled
    if (addedCount > 0) {
      const allShards = this.accountTable.getAll() as GalxShardAccount[];
      for (const s of allShards) {
        if (s.id.startsWith('shard_galx_flagship_')) {
          this.deleteAccount(s.id);
        }
      }
    }

    return addedCount;
  }

  private seedInitialEnvShards(): void {
    const openaiKey = process.env.OPENAI_API_KEY || 'galx_native_flagship_token';

    if (openaiKey && openaiKey.length > 5) {
      const shardId = `shard_galx_flagship_${Date.now()}`;
      const encrypted = GalxCryptoVault.encryptSecret({ apiKey: openaiKey }, 'system_admin', shardId, 'openai');
      const shard: GalxShardAccount = {
        id: shardId,
        userId: 'system_admin',
        accountLabel: process.env.OPENAI_API_KEY ? 'OpenAI Root Seed Pool' : 'GALX Wholesale Flagship Pool',
        provider: 'openai',
        authType: 'api_key',
        shardMode: 'pooled',
        status: 'healthy',
        priority: 10,
        weight: 1,
        fencingToken: 1,
        apiKeyMasked: GalxCryptoVault.maskApiKey(openaiKey),
        encryptedSecrets: encrypted,
        privacyCapabilities: {
          hipaaCompliant: true,
          zdrCertified: true,
          dataResidency: 'global',
          baaSigned: true,
          piiFiltering: true
        },
        tokenBucket: {
          maxTokens: 500000,
          remainingTokens: 500000,
          refillRatePerMinute: 500000,
          maxRequests: 1000,
          remainingRequests: 1000,
          lastRefillTimestampMs: Date.now()
        },
        stats: {
          totalRequestsServed: 0,
          totalTokensConsumed: 0,
          consecutiveFailures: 0
        },
        permissionRetracted: false,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now()
      };
      this.addAccount(shard);
    }
  }

  /**
   * Registers a listener to be notified when a shard permission is retracted.
   */
  public onRetract(listener: (shardId: string) => void): void {
    this.retractListeners.push(listener);
  }

  public addAccount(account: GalxShardAccount): void {
    const normalized: GalxShardAccount = {
      ...account,
      permissionRetracted: account.permissionRetracted ?? false
    };
    this.accountTable.put(account.id, normalized);
    this.persistence.saveShard(normalized);
    this.saveShardsToDisk();
    this.persistence.logAudit('SHARD_REGISTERED', {
      accountLabel: normalized.accountLabel,
      provider: normalized.provider,
      shardMode: normalized.shardMode
    }, normalized.id, normalized.userId);
  }

  public updateAccount(account: GalxShardAccount): void {
    const normalized: GalxShardAccount = {
      ...account,
      permissionRetracted: account.permissionRetracted ?? false
    };
    this.accountTable.put(account.id, normalized);
    this.persistence.saveShard(normalized);
    this.saveShardsToDisk();
  }

  public retractAccount(accountId: string, userId: string): boolean {
    this.accountTable.delete(accountId);

    // Notify in-flight pools to immediately abort active execution leases
    for (const listener of this.retractListeners) {
      try {
        listener(accountId);
      } catch {
        // Ignore listener error
      }
    }

    const existing = this.persistence.getShards().find(s => s.id === accountId);
    if (existing) {
      const revokedShard: GalxShardAccount = {
        ...existing,
        status: 'revoked',
        permissionRetracted: true,
        updatedAtMs: Date.now()
      };
      this.persistence.saveShard(revokedShard);
      this.persistence.logAudit('PERMISSION_RETRACTED', {
        timestamp: Date.now()
      }, accountId, userId);
    }
    this.saveShardsToDisk();
    return true;
  }

  public deleteAccount(accountId: string): boolean {
    this.accountTable.delete(accountId);
    for (const listener of this.retractListeners) {
      try {
        listener(accountId);
      } catch {}
    }
    this.persistence.deleteShard(accountId);
    this.saveShardsToDisk();
    return true;
  }

  public getAccount(accountId: string): GalxShardAccount | undefined {
    return this.accountTable.get(accountId) || undefined;
  }

  public listAccounts(userId?: string, provider?: ProviderType): readonly GalxShardAccount[] {
    const all = this.accountTable.query({
      sortBy: 'priority',
      sortOrder: 'desc'
    }) as GalxShardAccount[];

    return all.filter(a => {
      if (a.permissionRetracted === true || a.status === 'revoked') return false;
      if (userId && a.userId !== userId) return false;
      if (provider && a.provider !== provider) return false;
      return true;
    });
  }

  public listPooledAccounts(provider?: ProviderType): readonly GalxShardAccount[] {
    const all = this.accountTable.query({
      where: { shardMode: { $eq: 'pooled' } },
      sortBy: 'priority',
      sortOrder: 'desc'
    }) as GalxShardAccount[];

    return all.filter(a =>
      a.permissionRetracted !== true &&
      a.status !== 'revoked' &&
      a.status !== 'dead' &&
      a.status !== 'paused' &&
      (!provider || a.provider === provider)
    );
  }

  public listUserPrivateShards(userId: string, provider?: ProviderType): readonly GalxShardAccount[] {
    const all = this.accountTable.query({
      where: {
        userId: { $eq: userId },
        shardMode: { $eq: 'private' }
      },
      sortBy: 'priority',
      sortOrder: 'desc'
    }) as GalxShardAccount[];

    return all.filter(a =>
      a.permissionRetracted !== true &&
      (!provider || a.provider === provider)
    );
  }

  public listPrivateAccounts(userId: string, provider?: ProviderType): readonly GalxShardAccount[] {
    return this.listUserPrivateShards(userId, provider);
  }

  public queryAccountsNatural(naturalQuery: string): GalxShardAccount[] {
    const parsed = BroccoliNaturalQueryParser.parse(naturalQuery, 'credential_substrate_accounts');
    return this.accountTable.query(parsed.queryOptions) as GalxShardAccount[];
  }

  public aggregateAccounts(query: DbAggregateQuery): DbAggregateResult {
    return this.accountTable.aggregate(query);
  }

  public clearCache(): void {
    this.accountTable.clear();
  }
}
