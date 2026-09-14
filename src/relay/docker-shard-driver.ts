import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readRelayJson } from './federation-http-policy.js';
import type { DesiredShard, RelayDriver, RelayHandle } from './federation-lifecycle.js';
import { discoverOpenAIModels } from './capability-discovery.js';
import { runDockerCommand, DockerCommandError } from './docker-command.js';
import { DockerMutationError, DockerMutationJournal } from './docker-mutation-journal.js';

export interface DockerShardDriverOptions {
  namespace: string;
  image: string;
  secret: string;
  /** Required in the supervised deployment; omitted only by disposable fixtures. */
  mutationJournalPath?: string;
  onDiagnostic?: (event: { code: string; stage: string; shardId?: string }) => void;
  codexImageToolAlias?: boolean;
  sitesOutputLimitForwarding?: boolean;
  /** Explicit test upstream overrides; never supplied by an API request. */
  wsEndpoint?: string;
  inventoryUrl?: string;
  /** Host-side test endpoint when Docker reaches the fixture through a different hostname. */
  preflightInventoryUrl?: string;
}
export class DockerShardDriver implements RelayDriver {
  private readonly label = 'io.galx.federation';
  private readonly mutations: DockerMutationJournal;
  constructor(private readonly options: DockerShardDriverOptions) {
    if (!/^[a-z0-9-]{1,32}$/.test(options.namespace) || !options.image || options.secret.length < 32) throw new Error('Invalid federation driver configuration');
    try { this.mutations = new DockerMutationJournal(options.mutationJournalPath); }
    catch (error) {
      this.options.onDiagnostic?.({ code: error instanceof DockerMutationError ? error.code : 'docker_journal_unavailable', stage: 'docker_journal' });
      throw error;
    }
  }
  private async docker(args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
    try { return await runDockerCommand(args, { timeoutMs: ['ps', 'inspect'].includes(args[0]) ? 5000 : 60000, env }); }
    catch (error) {
      this.options.onDiagnostic?.({ code: error instanceof DockerCommandError ? error.code : 'docker_command_failed', stage: `docker_${args[0]}` });
      throw error;
    }
  }
  private keys(id: string, generation: string) {
    const key = (role: string) => createHmac('sha256', this.options.secret).update(`${id}:${generation}:${role}`).digest('hex');
    return { inferenceKey: key('inference'), adminKey: key('admin') };
  }
  private name(shardId: string) { return `galx-shard-${createHash('sha256').update(shardId).digest('hex').slice(0, 20)}`; }
  private readonly inspectFormat = '{{json .Name}}\t{{json .Config.Labels}}\t{{json .NetworkSettings.Ports}}\t{{.State.Running}}\t{{.HostConfig.RestartPolicy.Name}}\t{{.State.StartedAt}}\t{{.Id}}';
  private parseContainer(output: string): RelayHandle {
    // Only non-secret fields; Config.Env never leaves Docker.
    const [rawName, rawLabels, rawPorts, running, restartPolicy, startedAt, containerId] = output.split('\t');
    if (!/^[a-f0-9]{64}$/.test(containerId)) throw new Error('Invalid immutable container identity');
    if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(restartPolicy)) throw new Error('Invalid Docker restart policy');
    const id = String(JSON.parse(rawName)).replace(/^\//, '');
    const labels = JSON.parse(rawLabels);
    if (labels[this.label] !== this.options.namespace) throw new Error('Refusing foreign container ownership');
    const bindings = JSON.parse(rawPorts)?.['3001/tcp'];
    const port = Number(bindings?.[0]?.HostPort);
    if (running === 'true' && (bindings?.[0]?.HostIp !== '127.0.0.1' || !port)) throw new Error('Managed relay is not bound safely');
    const shardId = labels['io.galx.shard'];
    const containerGeneration = labels['io.galx.generation'];
    const generation = `${containerGeneration}@${startedAt}`;
    if (id !== this.name(shardId)) throw new Error('Managed relay name does not match shard ownership');
    return { id, shardId, containerId, restartPolicy, generation, credentialRevision: labels['io.galx.credential-revision'],
      running: running === 'true', endpoint: `http://127.0.0.1:${port || 1}`, ...this.keys(id, containerGeneration) };
  }
  private async inspectContainer(id: string): Promise<RelayHandle> {
    return this.parseContainer(await this.docker(['inspect', id, '--format', this.inspectFormat]));
  }
  async list(): Promise<RelayHandle[]> {
    const names = (await this.docker(['ps', '-a', '--filter', `label=${this.label}=${this.options.namespace}`, '--format', '{{.Names}}'])).split('\n').filter(Boolean);
    const result: RelayHandle[] = [];
    for (let offset = 0; offset < names.length; offset += 64) {
      const output = await this.docker(['inspect', '--format', this.inspectFormat, ...names.slice(offset, offset + 64)]);
      result.push(...output.split('\n').filter(Boolean).map(line => this.parseContainer(line)));
    }
    for (const entry of this.mutations.pending()) {
      const found = result.find(handle => entry.action === 'run' ? handle.id === entry.target : handle.containerId === entry.target);
      const resolved = entry.action === 'run' ? found?.generation.split('@')[0] === entry.generation
        : entry.action === 'stop' ? !found || found.running === false
          : entry.action === 'rm' ? !found
            : !found || (found.containerId === entry.target && found.generation === entry.generation && found.restartPolicy === 'no');
      if (resolved) this.mutations.complete(entry);
      else this.options.onDiagnostic?.({ code: 'docker_mutation_uncertain', stage: `docker_${entry.action}`, shardId: entry.shardId });
    }
    const reconciled: RelayHandle[] = [];
    for (const handle of result) {
      if (handle.restartPolicy === 'no') { reconciled.push(handle); continue; }
      // Existing containers may have been created by the legacy Docker
      // restart policy. Convert them before admitting them to this controller;
      // otherwise Docker and lifecycle reconciliation would both restart one
      // resource. The immutable ID and generation fence make this migration
      // safe across name reuse and delayed daemon responses.
      const target = handle.containerId;
      if (!target) throw new DockerMutationError('docker_mutation_uncertain');
      const mutation = this.mutations.begin({ shardId: handle.shardId, action: 'policy', target, generation: handle.generation });
      await this.docker(['update', '--restart', 'no', target]);
      const updated = await this.inspectContainer(target);
      if (updated.containerId !== target || updated.generation !== handle.generation || updated.restartPolicy !== 'no') {
        throw new DockerMutationError('docker_mutation_uncertain');
      }
      this.mutations.complete(mutation);
      reconciled.push(updated);
    }
    return reconciled;
  }
  async start(shard: DesiredShard): Promise<RelayHandle> {
    this.mutations.assertClear(shard.id);
    // Validate cold candidates before allocating a container. Existing workers
    // continue independently while failed candidates back off or await sign-in.
    await discoverOpenAIModels(shard, AbortSignal.timeout(10000), fetch, this.options.preflightInventoryUrl ?? this.options.inventoryUrl);
    const id = this.name(shard.id);
    const generation = randomUUID();
    const keys = this.keys(id, generation);
    const env = { ...process.env,
      RELAY_SHARD_ID: shard.id, RELAY_ID: id, RELAY_GENERATION: generation,
      RELAY_ASSIGNED_SHARD: JSON.stringify({ id: shard.id, accountId: shard.accountId, accessToken: shard.accessToken, expiresAtMs: shard.expiresAtMs, cooldownUntilMs: shard.cooldownUntilMs, status: (shard.cooldownUntilMs ?? 0) > Date.now() ? 'cooldown' : 'active' }),
      RELAY_CODEX_IMAGE_TOOL_ALIAS: this.options.codexImageToolAlias ? 'true' : 'false',
      RELAY_SITES_OUTPUT_LIMIT_FORWARDING: this.options.sitesOutputLimitForwarding ? 'true' : 'false',
      RELAY_API_KEYS: keys.inferenceKey, RELAY_ADMIN_API_KEYS: keys.adminKey,
      ...(this.options.wsEndpoint ? { CODEX_WS_ENDPOINT: this.options.wsEndpoint } : {}),
      ...(this.options.inventoryUrl ? { RELAY_CAPABILITY_INVENTORY_URL: this.options.inventoryUrl } : {}) };
    const args = ['run', '-d', '--name', id, '--label', `${this.label}=${this.options.namespace}`,
      '--label', `io.galx.shard=${shard.id}`, '--label', `io.galx.generation=${generation}`,
      '--label', `io.galx.credential-revision=${shard.credentialRevision}`,
      // The federation lifecycle is the single restart authority for workers.
      // Docker must not race it by restarting a stopped container in place.
      '--restart', 'no',
      '--init', '--user', '1000:1000', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--pids-limit', '128', '--memory', '512m', '--cpus', '1', '--publish', '127.0.0.1::3001',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m,uid=1000,gid=1000',
      '--mount', `type=volume,source=${id}-state,target=/app/.broccolidb`];
    // Values travel through the subprocess environment, not command-line arguments.
    for (const name of ['RELAY_SHARD_ID', 'RELAY_ID', 'RELAY_GENERATION', 'RELAY_ASSIGNED_SHARD', 'RELAY_CODEX_IMAGE_TOOL_ALIAS', 'RELAY_SITES_OUTPUT_LIMIT_FORWARDING', 'RELAY_API_KEYS', 'RELAY_ADMIN_API_KEYS',
      ...(this.options.wsEndpoint ? ['CODEX_WS_ENDPOINT'] : []), ...(this.options.inventoryUrl ? ['RELAY_CAPABILITY_INVENTORY_URL'] : [])]) args.push('-e', name);
    args.push(this.options.image);
    const mutation = this.mutations.begin({ shardId: shard.id, action: 'run', target: id, generation });
    await this.docker(args, env);
    const result = await this.inspectContainer(id);
    if (result.generation.split('@')[0] !== generation) throw new Error('Docker creation identity changed');
    this.mutations.complete(mutation);
    return result;
  }
  async remove(relay: RelayHandle): Promise<void> {
    this.mutations.assertClear(relay.shardId);
    const current = await this.inspectContainer(relay.containerId ?? relay.id);
    if (current.generation !== relay.generation) throw new Error('Refusing stale relay removal');
    const target = current.containerId!;
    if (!/^[a-f0-9]{64}$/.test(target)) throw new Error('Invalid immutable container identity');
    const stopping = this.mutations.begin({ shardId: relay.shardId, action: 'stop', target, generation: current.generation });
    await this.docker(['stop', '--time', '40', target]);
    this.mutations.complete(stopping);
    const stopped = await this.inspectContainer(target);
    if (stopped.running !== false || stopped.generation !== current.generation) throw new Error('Worker changed while draining');
    const removing = this.mutations.begin({ shardId: relay.shardId, action: 'rm', target, generation: current.generation });
    await this.docker(['rm', target]); // Dedicated checkpoint volume is retained.
    this.mutations.complete(removing);
  }
  async inspect(relay: RelayHandle) {
    if (this.mutations.has(relay.shardId)) return {}; // Never admit into a resource with an unresolved daemon mutation.
    const response = await fetch(`${relay.endpoint}/api/capabilities`, { headers: { Authorization: `Bearer ${relay.adminKey}` },
      redirect: 'error', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return {};
    const body = await readRelayJson(response, 2 * 1024 * 1024);
    if (!Array.isArray(body.shards) || body.shards.length !== 1) return {};
    const record = body.shards[0];
    if (record.shardId !== relay.shardId || record.relayId !== relay.id || record.generation !== relay.generation.split('@')[0]) return {};
    let invalidCredential = body.error === 'invalid_credential';
    // Older workers restore a rejected credential without restoring discovery's
    // error. Read their authenticated status before treating them as recoverable.
    if (!invalidCredential && !body.error && record.health === 'unavailable'
      && record.lastCapabilityRefreshMs === 0 && Array.isArray(record.models) && record.models.length === 0) {
      const status = await fetch(`${relay.endpoint}/api/shards`, { headers: { Authorization: `Bearer ${relay.adminKey}` },
        redirect: 'error', signal: AbortSignal.timeout(3000) });
      if (status.ok) {
        const fleet = await readRelayJson(status, 2 * 1024 * 1024);
        invalidCredential = Array.isArray(fleet.shards) && fleet.shards.length === 1
          && fleet.shards[0].id === relay.shardId && fleet.shards[0].status === 'disabled'
          && fleet.shards[0].availabilityReason === 'credential_rejected';
      } else await status.body?.cancel();
    }
    // Docker's process start identity fences snapshots across in-place container restarts.
    if ((await this.inspectContainer(relay.containerId ?? relay.id)).generation !== relay.generation) return {};
    return { record: { ...record, generation: relay.generation }, invalidCredential };
  }
}
