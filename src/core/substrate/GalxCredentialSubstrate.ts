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

  /**
   * Initializes the in-memory cache from persistence and env fallbacks.
   */
  public initialize(): void {
    if (this.initialized) return;

    try {
      const persistedShards = this.persistence.getShards();
      for (const shard of persistedShards) {
        if (!shard.permissionRetracted && shard.status !== 'revoked') {
          this.accountTable.put(shard.id, shard);
        }
      }

      // If no shards exist and environment variables are present, automatically pre-seed default developer shards
      if (this.accountTable.count() === 0) {
        this.seedInitialEnvShards();
      }

      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  private seedInitialEnvShards(): void {
    const openaiKey = process.env.OPENAI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY;

    if (openaiKey && openaiKey.length > 10) {
      const shardId = `codex_root_${Date.now()}`;
      const encrypted = GalxCryptoVault.encryptSecret({ apiKey: openaiKey }, 'system_admin', shardId, 'openai');
      const shard: GalxShardAccount = {
        id: shardId,
        userId: 'system_admin',
        accountLabel: 'OpenAI Root Seed Pool',
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

    if (xaiKey && xaiKey.length > 10) {
      const shardId = `grok_root_${Date.now()}`;
      const encrypted = GalxCryptoVault.encryptSecret({ apiKey: xaiKey }, 'system_admin', shardId, 'xai-grok');
      const shard: GalxShardAccount = {
        id: shardId,
        userId: 'system_admin',
        accountLabel: 'xAI Grok Root Seed Pool',
        provider: 'xai-grok',
        authType: 'api_key',
        shardMode: 'pooled',
        status: 'healthy',
        priority: 10,
        weight: 1,
        fencingToken: 1,
        apiKeyMasked: GalxCryptoVault.maskApiKey(xaiKey),
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
