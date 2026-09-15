import type { GalxShardAccount, ProviderType } from '../contracts/GalxContracts';
import { GalxPersistence } from '../../lib/storage/GalxPersistence';
import { BroccoliDbTable } from '../broccolidb/broccolidb-table';
import { BroccoliNaturalQueryParser } from '../broccolidb/broccolidb-natural-query';
import type { DbAggregateQuery, DbAggregateResult } from '../broccolidb/broccolidb.contracts';

/**
 * PostgreSQL-authoritative credential registry with a BroccoliDB read projection.
 * The in-memory table accelerates routing but never substitutes for a confirmed
 * control-plane mutation.
 */
export class GalxCredentialSubstrate {
  public readonly accountTable: BroccoliDbTable<GalxShardAccount>;
  private readonly persistence: GalxPersistence;
  private readonly retractListeners: Array<(shardId: string) => void> = [];
  private initializationPromise: Promise<void> | null = null;
  private initializationRetryAtMs = 0;
  private lastAuthorityRefreshAtMs = 0;
  private authorityRefreshPromise: Promise<number> | null = null;

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

  }

  /**
   * Starts initialization for legacy callers. Use `await ready()` at every
   * production entrypoint that can route or mutate shard state.
   */
  public initialize(): void {
    // Explicit legacy warm-up only. Routing entrypoints still await ready().
    void this.ready().catch(() => {});
  }

  private async initializeFromAuthority(): Promise<void> {
    const authorityConfigured = this.persistence.isShardAuthorityConfigured();
    const persistedShards = authorityConfigured
      ? await this.persistence.getShardsAsync(undefined, { requireRemote: true })
      : this.persistence.getShards();

    this.accountTable.clear();
    for (const shard of persistedShards) {
      if (shard.managedDesktopId && shard.desktopEnrolledAt && !shard.permissionRetracted && shard.status !== 'revoked') {
        this.accountTable.put(shard.id, shard);
      }
    }
    this.lastAuthorityRefreshAtMs = Date.now();
  }

  public async ready(): Promise<void> {
    if (!this.initializationPromise) {
      if (Date.now() < this.initializationRetryAtMs) {
        throw new Error('Shard authority initialization is temporarily unavailable');
      }
      this.initializationPromise = this.initializeFromAuthority().catch((error: unknown) => {
        this.initializationPromise = null;
        this.initializationRetryAtMs = Date.now() + 5000;
        throw error;
      });
    }
    await this.initializationPromise;
  }

  private resolveMutationOptions(
    options: { requireRemote?: boolean; createOnly?: boolean }
  ): { requireRemote?: boolean; createOnly?: boolean } {
    const explicitTestProjection =
      process.env.NODE_ENV === 'test' &&
      process.env.GALX_ALLOW_EPHEMERAL_SHARDS_FOR_TESTS === 'true';
    return explicitTestProjection ? { ...options, requireRemote: false } : options;
  }

  public async refreshFromAuthority(): Promise<number> {
    await this.ready();
    if (this.authorityRefreshPromise) return this.authorityRefreshPromise;

    this.authorityRefreshPromise = (async () => {
      const shards = await this.persistence.getShardsAsync(undefined, { requireRemote: true });
      this.accountTable.clear();
      for (const shard of shards) {
        if (shard.managedDesktopId && shard.desktopEnrolledAt && !shard.permissionRetracted && shard.status !== 'revoked') {
          this.accountTable.put(shard.id, shard);
        }
      }
      this.lastAuthorityRefreshAtMs = Date.now();
      return this.accountTable.count();
    })();

    try {
      return await this.authorityRefreshPromise;
    } finally {
      this.authorityRefreshPromise = null;
    }
  }

  /**
   * Refreshes the process-local routing projection at a bounded staleness
   * interval. Concurrent requests share one database LIST operation.
   */
  public async ensureFreshFromAuthority(maxStalenessMs?: number): Promise<void> {
    await this.ready();
    if (!this.persistence.isShardAuthorityConfigured()) return;

    const configuredMaxStaleness = Number.parseInt(
      process.env.GALX_SHARD_PROJECTION_MAX_STALENESS_MS || '5000',
      10
    );
    const boundedMaxStaleness = Math.min(
      60_000,
      Math.max(250, (maxStalenessMs ?? configuredMaxStaleness) || 5000)
    );
    if (Date.now() - this.lastAuthorityRefreshAtMs < boundedMaxStaleness) return;
    await this.refreshFromAuthority();
  }

  /** @deprecated Ambient credential imports are disabled; enroll an explicit account. */
  public async seedMultiAccountFleet(): Promise<number> {
    throw new Error('Automatic credential discovery is retired. Use explicit validated enrollment, then the linked desktop to refresh sign-in.');
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

  /**
   * Commits registration to PostgreSQL before publishing it to the routing cache.
   * Production enrollment paths must use this method.
   */
  public async addAccountAsync(
    account: GalxShardAccount,
    options: { requireRemote?: boolean; createOnly?: boolean } = { requireRemote: true }
  ): Promise<void> {
    await this.ready();
    const normalized: GalxShardAccount = {
      ...account,
      permissionRetracted: account.permissionRetracted ?? false
    };
    const authorityOptions = this.resolveMutationOptions(options);
    const durableAccount = await this.persistence.saveShardAsync(normalized, authorityOptions);
    this.accountTable.put(durableAccount.id, durableAccount);
    this.persistence.logAudit('SHARD_REGISTERED', {
      accountLabel: normalized.accountLabel,
      provider: normalized.provider,
      shardMode: normalized.shardMode,
      authority: authorityOptions.requireRemote === false ? 'ephemeral-test' : 'postgresql'
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

  public async updateAccountAsync(
    account: GalxShardAccount,
    options: { requireRemote?: boolean } = { requireRemote: true }
  ): Promise<void> {
    await this.ready();
    const normalized: GalxShardAccount = {
      ...account,
      permissionRetracted: account.permissionRetracted ?? false
    };
    const durableAccount = await this.persistence.saveShardAsync(
      normalized,
      this.resolveMutationOptions(options)
    );
    this.accountTable.put(durableAccount.id, durableAccount);
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

  public async retractAccountAsync(accountId: string, userId: string): Promise<boolean> {
    await this.ready();
    const existing = this.accountTable.get(accountId);
    if (!existing) return false;
    const revokedShard: GalxShardAccount = {
      ...existing,
      status: 'revoked',
      permissionRetracted: true,
      updatedAtMs: Date.now()
    };
    const authorityOptions = this.resolveMutationOptions({ requireRemote: true });
    await this.persistence.saveShardAsync(revokedShard, authorityOptions);
    this.accountTable.delete(accountId);
    for (const listener of this.retractListeners) {
      try {
        listener(accountId);
      } catch {}
    }
    this.persistence.logAudit('PERMISSION_RETRACTED', {
      timestamp: Date.now(),
      authority: authorityOptions.requireRemote === false ? 'ephemeral-test' : 'postgresql'
    }, accountId, userId);
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

  public async deleteAccountAsync(accountId: string): Promise<boolean> {
    await this.ready();
    const existed = Boolean(this.accountTable.get(accountId));
    await this.persistence.deleteShardAsync(
      accountId,
      this.resolveMutationOptions({ requireRemote: true })
    );
    this.accountTable.delete(accountId);
    for (const listener of this.retractListeners) {
      try {
        listener(accountId);
      } catch {}
    }
    return existed;
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
