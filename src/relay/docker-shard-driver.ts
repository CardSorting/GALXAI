import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readRelayJson } from './federation-http-policy.js';
import type { DesiredShard, RelayDriver, RelayHandle } from './federation-lifecycle.js';

const execute = promisify(execFile);
export interface DockerShardDriverOptions {
  namespace: string;
  image: string;
  secret: string;
  codexImageToolAlias?: boolean;
  /** Explicit test upstream overrides; never supplied by an API request. */
  wsEndpoint?: string;
  inventoryUrl?: string;
}
export class DockerShardDriver implements RelayDriver {
  private readonly label = 'io.galx.federation';
  constructor(private readonly options: DockerShardDriverOptions) {
    if (!/^[a-z0-9-]{1,32}$/.test(options.namespace) || !options.image || options.secret.length < 32) throw new Error('Invalid federation driver configuration');
  }
  private async docker(args: string[], env?: NodeJS.ProcessEnv): Promise<string> {
    try { return (await execute('docker', args, { timeout: ['ps', 'inspect'].includes(args[0]) ? 5000 : 60000, maxBuffer: 4 * 1024 * 1024, env: env ?? process.env })).stdout.trim(); }
    catch { throw new Error(`Docker ${args[0]} failed`); } // Never include credential-bearing environment or raw inspect output.
  }
  private keys(id: string, generation: string) {
    const key = (role: string) => createHmac('sha256', this.options.secret).update(`${id}:${generation}:${role}`).digest('hex');
    return { inferenceKey: key('inference'), adminKey: key('admin') };
  }
  private name(shardId: string) { return `galx-shard-${createHash('sha256').update(shardId).digest('hex').slice(0, 20)}`; }
  private readonly inspectFormat = '{{json .Name}}\t{{json .Config.Labels}}\t{{json .NetworkSettings.Ports}}\t{{.State.Running}}\t{{.State.StartedAt}}';
  private parseContainer(output: string): RelayHandle {
    // Only non-secret fields; Config.Env never leaves Docker.
    const [rawName, rawLabels, rawPorts, running, startedAt] = output.split('\t');
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
    return { id, shardId, generation, credentialRevision: labels['io.galx.credential-revision'],
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
    return result;
  }
  async start(shard: DesiredShard): Promise<RelayHandle> {
    const id = this.name(shard.id);
    const generation = randomUUID();
    const keys = this.keys(id, generation);
    const env = { ...process.env,
      RELAY_SHARD_ID: shard.id, RELAY_ID: id, RELAY_GENERATION: generation,
      RELAY_ASSIGNED_SHARD: JSON.stringify({ id: shard.id, accountId: shard.accountId, accessToken: shard.accessToken, expiresAtMs: shard.expiresAtMs, cooldownUntilMs: shard.cooldownUntilMs, status: (shard.cooldownUntilMs ?? 0) > Date.now() ? 'cooldown' : 'active' }),
      RELAY_CODEX_IMAGE_TOOL_ALIAS: this.options.codexImageToolAlias ? 'true' : 'false',
      RELAY_API_KEYS: keys.inferenceKey, RELAY_ADMIN_API_KEYS: keys.adminKey,
      ...(this.options.wsEndpoint ? { CODEX_WS_ENDPOINT: this.options.wsEndpoint } : {}),
      ...(this.options.inventoryUrl ? { RELAY_CAPABILITY_INVENTORY_URL: this.options.inventoryUrl } : {}) };
    const args = ['run', '-d', '--name', id, '--label', `${this.label}=${this.options.namespace}`,
      '--label', `io.galx.shard=${shard.id}`, '--label', `io.galx.generation=${generation}`,
      '--label', `io.galx.credential-revision=${shard.credentialRevision}`, '--restart', 'unless-stopped',
      '--init', '--user', '1000:1000', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--pids-limit', '128', '--memory', '512m', '--cpus', '1', '--publish', '127.0.0.1::3001',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m,uid=1000,gid=1000',
      '--mount', `type=volume,source=${id}-state,target=/app/.broccolidb`];
    // Values travel through the subprocess environment, not command-line arguments.
    for (const name of ['RELAY_SHARD_ID', 'RELAY_ID', 'RELAY_GENERATION', 'RELAY_ASSIGNED_SHARD', 'RELAY_CODEX_IMAGE_TOOL_ALIAS', 'RELAY_API_KEYS', 'RELAY_ADMIN_API_KEYS',
      ...(this.options.wsEndpoint ? ['CODEX_WS_ENDPOINT'] : []), ...(this.options.inventoryUrl ? ['RELAY_CAPABILITY_INVENTORY_URL'] : [])]) args.push('-e', name);
    args.push(this.options.image);
    await this.docker(args, env);
    return this.inspectContainer(id);
  }
  async remove(relay: RelayHandle): Promise<void> {
    const current = await this.inspectContainer(relay.id);
    if (current.generation !== relay.generation) throw new Error('Refusing stale relay removal');
    await this.docker(['stop', '--time', '40', relay.id]);
    await this.docker(['rm', relay.id]); // Dedicated checkpoint volume is retained.
  }
  async inspect(relay: RelayHandle) {
    const response = await fetch(`${relay.endpoint}/api/capabilities`, { headers: { Authorization: `Bearer ${relay.adminKey}` },
      redirect: 'error', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return {};
    const body = await readRelayJson(response, 2 * 1024 * 1024);
    if (!Array.isArray(body.shards) || body.shards.length !== 1) return {};
    const record = body.shards[0];
    if (record.shardId !== relay.shardId || record.relayId !== relay.id || record.generation !== relay.generation.split('@')[0]) return {};
    // Docker's process start identity fences snapshots across in-place container restarts.
    if ((await this.inspectContainer(relay.id)).generation !== relay.generation) return {};
    return { record: { ...record, generation: relay.generation }, invalidCredential: body.error === 'invalid_credential' };
  }
}
