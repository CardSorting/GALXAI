import { CapabilityRegistry, type RelayCapabilityRecord } from './capability-registry.js';

export interface DesiredShard {
  id: string;
  provider: string;
  credentialRevision: string;
  accessToken: string;
  accountId: string;
  expiresAtMs?: number;
  cooldownUntilMs?: number;
}
export interface RelayHandle {
  running?: boolean;
  id: string;
  shardId: string;
  generation: string;
  credentialRevision: string;
  endpoint: string;
  inferenceKey: string;
  adminKey: string;
}
export interface RelayDriver {
  list(): Promise<RelayHandle[]>;
  start(shard: DesiredShard): Promise<RelayHandle>;
  remove(relay: RelayHandle): Promise<void>;
  inspect(relay: RelayHandle): Promise<{ record?: RelayCapabilityRecord; invalidCredential?: boolean }>;
}

/** Container decisions use shard identity, never model counts. One controller per Docker namespace. */
export class RelayFederationLifecycle {
  readonly capabilities: CapabilityRegistry;
  private readonly relays = new Map<string, RelayHandle>();
  private readonly invalid = new Map<string, string>();
  private readonly draining = new Map<string, Promise<void>>();
  private reconciliation?: Promise<void>;
  private registryReadAt = 0;
  private lastError?: string;
  private stopping = false;
  constructor(private readonly readShards: () => Promise<DesiredShard[]>, private readonly driver: RelayDriver,
    private readonly now: () => number = Date.now, private readonly registryTtlMs = 15000) {
    this.capabilities = new CapabilityRegistry(now);
  }
  reconcile(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    return this.reconciliation ??= this.runReconciliation().finally(() => { this.reconciliation = undefined; });
  }
  private async runReconciliation(): Promise<void> {
    let desired: DesiredShard[];
    let running: RelayHandle[];
    try {
      [desired, running] = await Promise.all([this.readShards(), this.driver.list()]);
      if (new Set(desired.map(s => s.id)).size !== desired.length) throw new Error('Duplicate shard ownership in registry');
      this.registryReadAt = this.now();
      this.lastError = undefined;
    } catch {
      this.lastError = 'shard_or_container_registry_unavailable';
      return; // Missing authority is not an authoritative deletion.
    }
    const desiredById = new Map(desired.filter(s => !s.expiresAtMs || s.expiresAtMs > this.now()).map(s => [s.id, s]));
    for (const [id, revision] of this.invalid) if (!desiredById.has(id) || desiredById.get(id)!.credentialRevision !== revision) this.invalid.delete(id);
    const retained = new Map<string, RelayHandle>();
    for (const handle of running) {
      const shard = desiredById.get(handle.shardId);
      if (handle.running === false || !shard || shard.credentialRevision !== handle.credentialRevision || retained.has(handle.shardId)
        || this.invalid.get(handle.shardId) === shard.credentialRevision) {
        this.capabilities.remove(handle.shardId, handle.generation);
        this.retire(handle);
      } else retained.set(handle.shardId, handle);
    }
    for (const [id, handle] of this.relays) if (!running.some(r => r.shardId === id && r.generation === handle.generation) && !this.draining.has(id)) {
      this.capabilities.remove(id, handle.generation);
      this.relays.delete(id);
    }
    const work = [...desiredById.values()];
    // Bound startup/discovery I/O; a slow relay cannot serialize the whole fleet.
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, work.length) }, async () => {
      while (cursor < work.length && !this.stopping) {
        const shard = work[cursor++];
        if (this.invalid.get(shard.id) === shard.credentialRevision || this.draining.has(shard.id)
          || (!retained.has(shard.id) && running.some(r => r.shardId === shard.id))) continue;
        try {
          const handle = retained.get(shard.id) ?? await this.driver.start(shard);
          const old = this.relays.get(shard.id);
          if (old && old.generation !== handle.generation) this.capabilities.remove(shard.id, old.generation);
          this.relays.set(shard.id, handle);
          this.capabilities.register(shard.id, handle.id, handle.generation, shard.provider);
          const state = await this.driver.inspect(handle);
          if (state.invalidCredential) {
            this.invalid.set(shard.id, shard.credentialRevision);
            this.capabilities.remove(shard.id);
            this.retire(handle);
          } else if (state.record) {
            this.capabilities.receive(state.record); // Ignore stale snapshots; the existing heartbeat expires independently.
            if ((shard.cooldownUntilMs ?? 0) > this.now()) this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          } else this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          // CAPABILITY_EMPTY and failed inventory discovery do not remove a relay.
        } catch {
          this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          this.lastError = 'relay_reconciliation_incomplete';
        }
      }
    }));
  }
  private retire(handle: RelayHandle): void {
    // Keep existing job affinity; draining never blocks unrelated shard reconciliation.
    this.relays.set(handle.shardId, handle);
    if (this.draining.has(handle.shardId) || this.draining.size >= 3) return;
    const draining = this.driver.remove(handle).then(() => {
      if (this.relays.get(handle.shardId)?.generation === handle.generation) this.relays.delete(handle.shardId);
    }).catch(() => { this.lastError = 'relay_drain_failed'; }).finally(() => { this.draining.delete(handle.shardId); });
    this.draining.set(handle.shardId, draining);
  }
  routable(): boolean { return !this.stopping && this.registryReadAt > 0 && this.now() - this.registryReadAt < this.registryTtlMs; }
  handle(shardId: string): RelayHandle | undefined { return this.relays.get(shardId); }
  snapshot() { const snapshot = this.capabilities.snapshot();
    if (!this.routable()) snapshot.models = snapshot.models.map(m => ({ ...m, eligibleShardCount: 0, state: 'UNAVAILABLE', redundancy: 'NONE', shardIds: [], activeStreams: 0, capacity: 0 }));
    return { ...snapshot, registryFresh: this.routable(), lastError: this.lastError,
    invalidShards: [...this.invalid.keys()], registryReadAtMs: this.registryReadAt }; }
  private shutdown?: Promise<void>;
  stop(): Promise<void> {
    if (this.shutdown) return this.shutdown;
    this.stopping = true;
    this.shutdown = (async () => {
      await this.reconciliation;
      await Promise.all(this.draining.values());
      const remaining = [...this.relays.entries()]; let cursor = 0;
      const failures: unknown[] = [];
      for (const [id] of remaining) this.capabilities.remove(id);
      await Promise.all(Array.from({ length: Math.min(3, remaining.length) }, async () => {
        while (cursor < remaining.length) {
          const [id, relay] = remaining[cursor++];
          try { await this.driver.remove(relay); this.relays.delete(id); } catch (error) { failures.push(error); }
        }
      }));
      if (failures.length) throw new Error(`Failed to drain ${failures.length} owned relays`);
    })();
    return this.shutdown;
  }
}
