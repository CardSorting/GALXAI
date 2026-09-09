import { CapabilityRegistry, type RelayCapabilityRecord } from './capability-registry.js';
import type { InvalidCredentialStore } from './invalid-credential-store.js';
import { MonitorActivity } from './monitor-activity.js';
import type { ShardMaintenanceStore } from './shard-maintenance-store.js';
import { RequestError } from './request-policy.js';

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
  readonly activity: MonitorActivity;
  private readonly relays = new Map<string, RelayHandle>();
  private readonly invalid: Map<string, string>;
  private readonly draining = new Map<string, Promise<void>>();
  private reconciliation?: Promise<void>;
  private authorityRead?: Promise<void>;
  private desired = new Map<string, DesiredShard>();
  private readonly retry = new Map<string, { revision: string; attempts: number; at: number }>();
  private registryReadAt = 0;
  private inventoryReadAt = 0;
  private readonly maintenance: Map<string, number>;
  private lastError?: string;
  private stopping = false;
  constructor(private readonly readShards: () => Promise<DesiredShard[]>, private readonly driver: RelayDriver,
    private readonly now: () => number = Date.now, private readonly registryTtlMs = 15000,
    private readonly invalidStore?: InvalidCredentialStore, private readonly maintenanceStore?: ShardMaintenanceStore) {
    this.capabilities = new CapabilityRegistry(now);
    this.activity = new MonitorActivity(now);
    this.invalid = invalidStore?.load() ?? new Map();
    this.maintenance = maintenanceStore?.load() ?? new Map();
    for (const id of this.maintenance.keys()) this.capabilities.setAdmissionPaused(id, true);
    this.activity.record({ category: 'fleet', level: 'info', code: 'controller_started' });
    if (this.invalid.size) this.activity.record({ category: 'fleet', level: 'info', code: 'rejections_restored', count: this.invalid.size });
  }
  async reconcile(): Promise<void> {
    if (this.stopping) return Promise.resolve();
    // Refresh authority even while slow worker I/O is still in flight. This
    // control lane is single-flight and revokes eligibility immediately.
    try { await (this.authorityRead ??= this.refreshAuthority().finally(() => { this.authorityRead = undefined; })); }
    catch { this.error('shard_registry_unavailable'); return; }
    if (this.stopping) return;
    return this.reconciliation ??= this.runReconciliation().finally(() => { this.reconciliation = undefined; });
  }
  private async refreshAuthority(): Promise<void> {
    const rows = await this.readShards();
    if (new Set(rows.map(s => s.id)).size !== rows.length) throw new Error('Duplicate shard ownership in registry');
    this.desired = new Map(rows.filter(s => !s.expiresAtMs || s.expiresAtMs > this.now()).map(s => [s.id, s]));
    this.registryReadAt = this.now();
    const removedHolds = [...this.maintenance.keys()].filter(id => !this.desired.has(id));
    if (removedHolds.length) {
      const next = new Map(this.maintenance); for (const id of removedHolds) next.delete(id);
      this.maintenanceStore?.save(next);
      for (const id of removedHolds) { this.maintenance.delete(id); this.capabilities.setAdmissionPaused(id, false); }
    }
    for (const [id, handle] of this.relays) {
      if (!this.current(id, handle.credentialRevision)) this.capabilities.remove(id, handle.generation);
      else if ((this.desired.get(id)?.cooldownUntilMs ?? 0) > this.now()) {
        this.capabilities.heartbeat(id, { health: 'unavailable' }, 0, false);
      }
    }
    for (const [id, backoff] of this.retry) if (!this.current(id, backoff.revision)) this.retry.delete(id);
  }
  private current(id: string, revision: string): boolean {
    const shard = this.desired.get(id);
    return !this.stopping && this.routable() && shard?.credentialRevision === revision
      && (!shard.expiresAtMs || shard.expiresAtMs > this.now());
  }
  private async runReconciliation(): Promise<void> {
    let desired: DesiredShard[];
    let running: RelayHandle[];
    try {
      running = await this.driver.list();
      this.inventoryReadAt = this.now();
      desired = [...this.desired.values()];
      if (['shard_registry_unavailable', 'shard_or_container_registry_unavailable'].includes(this.lastError ?? '')) {
        this.activity.record({ category: 'fleet', level: 'info', code: 'registry_recovered' }); this.lastError = undefined;
      }
    } catch {
      this.error('shard_or_container_registry_unavailable');
      return; // Missing authority is not an authoritative deletion.
    }
    const desiredById = new Map(desired.filter(s => !s.expiresAtMs || s.expiresAtMs > this.now()).map(s => [s.id, s]));
    const cleared = [...this.invalid].filter(([id, revision]) => !desiredById.has(id) || desiredById.get(id)!.credentialRevision !== revision);
    if (cleared.length) {
      const next = new Map(this.invalid);
      for (const [id] of cleared) next.delete(id);
      try { this.invalidStore?.save(next); if (this.lastError === 'credential_rejection_journal_unavailable') this.lastError = undefined; }
      catch { this.error('credential_rejection_journal_unavailable'); return; }
      for (const [id] of cleared) { this.invalid.delete(id); this.activity.record({ category: 'fleet', level: 'info', code: desiredById.has(id) ? 'credential_rotated' : 'shard_removed', shardId: id }); }
    }
    const retained = new Map<string, RelayHandle>();
    for (const handle of running) {
      const shard = desiredById.get(handle.shardId);
      if (handle.running === false || !shard || shard.credentialRevision !== handle.credentialRevision || retained.has(handle.shardId)
        || (this.invalid.get(handle.shardId) === shard.credentialRevision && !this.maintenance.has(handle.shardId))) {
        this.capabilities.remove(handle.shardId, handle.generation);
        this.retire(handle, handle.running === false ? 'worker_stopped' : !shard ? 'shard_removed' : shard.credentialRevision !== handle.credentialRevision ? 'credential_rotated' : retained.has(handle.shardId) ? 'duplicate_worker' : 'credential_rejected');
      } else retained.set(handle.shardId, handle);
    }
    for (const [id, handle] of this.relays) if (!running.some(r => r.shardId === id && r.generation === handle.generation) && !this.draining.has(id)) {
      this.capabilities.remove(id, handle.generation);
      this.relays.delete(id);
      this.activity.record({ category: 'fleet', level: 'warning', code: 'worker_disappeared', shardId: id, generation: handle.generation });
    }
    // Existing workers get the fast lane before potentially slow cold starts.
    const work = [...desiredById.values()].sort((a, b) => Number(retained.has(b.id)) - Number(retained.has(a.id)));
    // Bound startup/discovery I/O; a slow relay cannot serialize the whole fleet.
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, work.length) }, async () => {
      while (cursor < work.length && !this.stopping) {
        const shard = work[cursor++];
        if (!this.current(shard.id, shard.credentialRevision) || (this.retry.get(shard.id)?.at ?? 0) > this.now()) continue;
        if ((this.invalid.get(shard.id) === shard.credentialRevision && !retained.has(shard.id)) || this.draining.has(shard.id)
          || (this.maintenance.has(shard.id) && !retained.has(shard.id))
          || (!retained.has(shard.id) && running.some(r => r.shardId === shard.id))) continue;
        try {
          if (!retained.has(shard.id)) this.activity.record({ category: 'fleet', level: 'info', code: 'worker_starting', shardId: shard.id });
          const handle = retained.get(shard.id) ?? await this.driver.start(shard);
          if (!this.current(shard.id, handle.credentialRevision)) {
            this.capabilities.remove(shard.id, handle.generation);
            this.retire(handle, 'ownership_changed');
            continue;
          }
          const old = this.relays.get(shard.id);
          if (!old || old.generation !== handle.generation) this.activity.record({ category: 'fleet', level: 'info', code: retained.has(shard.id) ? 'worker_adopted' : 'worker_started', shardId: shard.id, generation: handle.generation });
          if (old && old.generation !== handle.generation) this.capabilities.remove(shard.id, old.generation);
          this.relays.set(shard.id, handle);
          this.capabilities.register(shard.id, handle.id, handle.generation, shard.provider);
          const state = await this.driver.inspect(handle);
          if (!this.current(shard.id, handle.credentialRevision)) {
            this.capabilities.remove(shard.id, handle.generation);
            this.retire(handle, 'ownership_changed');
            continue;
          }
          if (this.retry.delete(shard.id)) this.activity.record({ category: 'fleet', level: 'info', code: 'worker_recovered', shardId: shard.id });
          if (state.invalidCredential) {
            this.capabilities.remove(shard.id);
            // Commit before destruction: a crash must not respawn the same rejected token.
            if (this.invalid.get(shard.id) !== shard.credentialRevision) {
              this.invalidStore?.save(new Map(this.invalid).set(shard.id, shard.credentialRevision));
              this.invalid.set(shard.id, shard.credentialRevision);
              this.activity.record({ category: 'fleet', level: 'warning', code: 'credential_rejected', shardId: shard.id });
            }
            if (!this.maintenance.has(shard.id)) this.retire(handle, 'credential_rejected');
          } else if (state.record && this.invalid.get(shard.id) !== shard.credentialRevision) {
            const before = this.capabilities.get(shard.id);
            const received = this.capabilities.receive(state.record); // Ignore stale snapshots; the existing heartbeat expires independently.
            if (received) {
              const available = state.record.models.filter(m => m.state === 'AVAILABLE').map(m => m.model).sort();
              const previous = before?.models.filter(m => m.state === 'AVAILABLE').map(m => m.model).sort() ?? [];
              if (JSON.stringify(available) !== JSON.stringify(previous)) this.activity.record({ category: 'fleet', level: available.length ? 'info' : 'warning', code: 'worker_models_changed', shardId: shard.id, count: available.length });
              if (before && before.health !== state.record.health) this.activity.record({ category: 'fleet', level: state.record.health === 'healthy' ? 'info' : 'warning', code: `worker_health_${state.record.health}`, shardId: shard.id });
            }
            if ((this.desired.get(shard.id)?.cooldownUntilMs ?? 0) > this.now()) this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          } else this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          // CAPABILITY_EMPTY and failed inventory discovery do not remove a relay.
        } catch {
          const attempts = (this.retry.get(shard.id)?.attempts ?? 0) + 1;
          this.retry.set(shard.id, { revision: shard.credentialRevision, attempts,
            at: this.now() + Math.min(30_000, 1000 * 2 ** Math.min(5, attempts)) });
          this.activity.record({ category: 'fleet', level: 'warning', code: 'worker_retry_scheduled', shardId: shard.id, count: attempts, retryAt: this.retry.get(shard.id)!.at });
          this.capabilities.heartbeat(shard.id, { health: 'unavailable' }, 0, false);
          this.lastError = 'relay_reconciliation_incomplete';
        }
      }
    }));
    if (!this.retry.size && this.lastError === 'relay_reconciliation_incomplete') this.lastError = undefined;
  }
  private retire(handle: RelayHandle, reason: string): void {
    // Keep existing job affinity; draining never blocks unrelated shard reconciliation.
    this.relays.set(handle.shardId, handle);
    if (this.draining.has(handle.shardId) || this.draining.size >= 3) return;
    this.activity.record({ category: 'fleet', level: 'info', code: `drain_${reason}`, shardId: handle.shardId, generation: handle.generation });
    const draining = this.driver.remove(handle).then(() => {
      if (this.relays.get(handle.shardId)?.generation === handle.generation) this.relays.delete(handle.shardId);
      this.activity.record({ category: 'fleet', level: 'info', code: 'worker_removed', shardId: handle.shardId, generation: handle.generation });
      if (this.lastError === 'relay_drain_failed') this.lastError = undefined;
    }).catch(() => { this.error('relay_drain_failed'); }).finally(() => { this.draining.delete(handle.shardId); });
    this.draining.set(handle.shardId, draining);
  }
  routable(): boolean { return !this.stopping && this.registryReadAt > 0 && this.now() - this.registryReadAt < this.registryTtlMs; }
  handle(shardId: string): RelayHandle | undefined { return this.relays.get(shardId); }
  setMaintenance(id: string, paused: boolean, expectedGeneration: unknown): void {
    if (!this.routable()) throw new RequestError(409, 'shard_status_stale', 'Shard ownership is stale. Refresh before changing traffic.');
    if (!this.desired.has(id)) throw new RequestError(404, 'shard_not_found', 'This shard is no longer registered.');
    if (this.draining.has(id)) throw new RequestError(409, 'shard_retiring', 'Worker cleanup already started. Wait for it to finish before changing traffic.');
    if (expectedGeneration !== (this.relays.get(id)?.generation ?? null)) throw new RequestError(409, 'shard_changed', 'The worker changed. Refresh and review its current state.');
    if (this.maintenance.has(id) === paused) return;
    if (paused && this.maintenance.size >= 2048) throw new RequestError(409, 'maintenance_limit', 'The maintenance journal is full. Resume an unused hold first.');
    const next = new Map(this.maintenance); if (paused) next.set(id, this.now()); else next.delete(id);
    try { this.maintenanceStore?.save(next); }
    catch { throw new RequestError(503, 'maintenance_journal_unavailable', 'The traffic change could not be saved. Check the controller journal and retry.'); }
    if (paused) this.maintenance.set(id, next.get(id)!); else this.maintenance.delete(id);
    this.capabilities.setAdmissionPaused(id, paused);
    this.activity.record({ category: 'fleet', level: 'info', code: paused ? 'manual_work_paused' : 'manual_work_resumed', shardId: id });
  }
  /** Explicit administrator DTO. Never serialize DesiredShard or RelayHandle. */
  workspaceShards() {
    const now = this.now(), availability = this.snapshot(), inventoryFresh = this.inventoryReadAt > 0 && now - this.inventoryReadAt < this.registryTtlMs;
    const events = this.activity.snapshot().events;
    return [...this.desired.values()].map(s => {
      const h = this.relays.get(s.id), c = this.capabilities.get(s.id), paused = this.maintenance.has(s.id);
      const fresh = this.routable() && !!c && c.heartbeatExpiresAtMs > now;
      const rejected = this.invalid.get(s.id) === s.credentialRevision, cooldown = (s.cooldownUntilMs ?? 0) > now;
      const eligible = availability.models.filter(m => m.shardIds.includes(s.id));
      const health = !this.routable() ? 'stale' : rejected ? 'rejected' : cooldown ? 'cooldown' : !h ? 'offline' : !fresh ? 'stale' : c.health;
      return { id: s.id, name: s.id, relayId: h?.id ?? null, generation: h?.generation ?? null,
        workerState: !inventoryFresh ? 'unknown' : this.draining.has(s.id) ? 'retiring' : h ? h.running === false ? 'stopped' : 'running' : 'missing',
        registryFresh: this.routable(), health, healthObservedAt: c?.heartbeatObservedAtMs ?? null,
        paused, pausedAt: this.maintenance.get(s.id) ?? null, canManage: this.routable() && !this.draining.has(s.id),
        activeStreams: fresh ? c.activeStreams : null, queueDepth: fresh ? c.queueDepth : null, capacity: fresh ? c.capacity : null,
        eligibleModels: eligible.length, uncoveredModels: eligible.filter(m => m.eligibleShardCount === 1).length,
        retryAt: this.retry.get(s.id)?.at ?? null, cooldownUntil: cooldown ? s.cooldownUntilMs! : null,
        events: events.filter(e => e.shardId === s.id && e.category === 'fleet').slice(0, 5).map(e => ({ id: e.id, at: e.at, code: e.code })) };
    });
  }
  /** Trusted collector only. Never serialize these credential-bearing handles. */
  monitorHandles(): RelayHandle[] { return [...this.relays.values()].filter(h => h.running !== false && !this.draining.has(h.shardId)); }
  monitorState() { return { desiredCount: this.desired.size, runningCount: [...this.relays.values()].filter(h => h.running !== false).length,
    maintenance: [...this.maintenance].map(([shardId, since]) => ({ shardId, since })),
    draining: [...this.draining.keys()], retries: [...this.retry].map(([shardId, r]) => ({ shardId, attempts: r.attempts, retryAt: r.at })),
    cooldowns: [...this.desired.values()].filter(s => (s.cooldownUntilMs ?? 0) > this.now()).map(s => ({ shardId: s.id, until: s.cooldownUntilMs! })) }; }
  private error(code: string) { if (this.lastError !== code) this.activity.record({ category: 'fleet', level: 'error', code }); this.lastError = code; }
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
      const remaining = [...this.relays.entries()].filter(([id]) => !this.maintenance.has(id)); let cursor = 0;
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
