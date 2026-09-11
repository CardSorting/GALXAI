/** Operator-only live qualification. Exactly one inference through an isolated
 * relay worker, using an existing managed relay assignment. No wallet writes,
 * service restart, provider fallback or credential persistence. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GalxaiRelayServer } from '../src/relay/relay-server';
import { executeRelayChat, readRelayReceipt } from '../src/core/router/adapters/RelayChatTransport';

if (process.argv[2] !== '--live-one-request' || process.argv.length > 4 ||
    (process.argv[3] !== undefined && process.argv[3] !== '--forward-output-ceiling')) throw new Error('Explicit live qualification flag required');
const output = console.log.bind(console);
console.log = console.warn = console.error = () => {}; // Do not print provider diagnostics.
const report: Record<string, unknown> = { checkedAt: new Date().toISOString(), productionChanged: false, walletWrites: false, modelRequests: 0 };
const forwardOutputTokenLimit = process.argv[3] === '--forward-output-ceiling';
report.outputCeilingForwarded = forwardOutputTokenLimit;
const directory = mkdtempSync(join(tmpdir(), 'galx-sites-metering-'));
let relay: GalxaiRelayServer | undefined;
try {
  const names = execFileSync('docker', ['ps', '--filter', 'label=io.galx.federation=production', '--format', '{{.Names}}'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  let assigned: any;
  for (const name of names) {
    const container = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8', maxBuffer: 1024 * 1024 }))[0];
    const env = Object.fromEntries(container.Config.Env.map((v: string) => [v.slice(0, v.indexOf('=')), v.slice(v.indexOf('=') + 1)]));
    const port = container.NetworkSettings.Ports['3001/tcp']?.[0];
    if (port?.HostIp !== '127.0.0.1') continue;
    const response = await fetch(`http://127.0.0.1:${port.HostPort}/api/capabilities`, {
      headers: { Authorization: 'Bearer ' + env.RELAY_ADMIN_API_KEYS }, signal: AbortSignal.timeout(5000), redirect: 'error' });
    if (!response.ok) continue;
    const body = await response.json();
    if (body.shards?.some((s: any) => s.health === 'healthy' && s.models?.some((m: any) => m.model === 'gpt-5.6-luna' && m.state === 'AVAILABLE' && m.expiresAtMs > Date.now()))) {
      assigned = JSON.parse(env.RELAY_ASSIGNED_SHARD); break;
    }
  }
  if (!assigned) throw new Error('No qualified assignment');
  const key = randomUUID();
  const config = { port: 0, host: '127.0.0.1', assignedShard: assigned,
    assignedShardId: assigned.id, relayId: 'sites-qualification', generation: randomUUID(), apiKeys: [key], adminApiKeys: [randomUUID()],
    registryEnabled: false, discoverHostCredentials: false, codexImageToolAlias: false,
    maxUpstreamRetries: 0, shardConcurrency: 1, jobMaxWallTimeMs: 30000,
    forwardOutputTokenLimit,
    onUpstreamDiagnostic: (value: import('../src/relay/upstream-diagnostic').UpstreamDiagnostic) => { report.upstreamDiagnostic = value; },
    stateSnapshotPath: join(directory, 'snapshot.json'), shardsJsonPath: join(directory, 'absent'), drainTimeoutMs: 1000 };
  relay = new GalxaiRelayServer(config);
  await relay.start();
  const options = { url: `http://127.0.0.1:${(relay as any).server.address().port}`, key,
    payload: { model: 'gpt-5.6-luna', messages: [{ role: 'user', content: 'Reply with exactly OK.' }],
      reasoning_effort: 'none', stream: false, durable_receipt: true, max_tokens: 64 }, ttftTimeoutMs: 20000, wallTimeoutMs: 30000 };
  report.modelRequests = 1;
  const result = await (await executeRelayChat(options)).response.json();
  report.completed = true; report.usage = result.usage ?? null; report.outputMatches = result.choices?.[0]?.message?.content?.trim() === 'OK';
  const replay = await (await executeRelayChat({ ...options, resumeJobId: result.id })).response.json();
  report.replayMatches = JSON.stringify(replay.usage) === JSON.stringify(result.usage);
  report.usageWithinRequestedCeiling = !!result.usage && result.usage.completion_tokens <= 64;
  report.ceilingEnforcementProven = false; // A short output cannot prove a hard ceiling.
  const receipt = await readRelayReceipt({ ...options, jobId: result.id, signal: AbortSignal.timeout(5000) });
  report.receiptMatches = receipt.output === result.choices?.[0]?.message?.content && JSON.stringify(receipt.usage) === JSON.stringify(result.usage);
  await relay.stop(); relay = new GalxaiRelayServer({ ...config, generation: randomUUID() }); await relay.start();
  const recovered = await readRelayReceipt({ ...options, url: `http://127.0.0.1:${(relay as any).server.address().port}`,
    jobId: result.id, signal: AbortSignal.timeout(5000) });
  report.receiptSurvivedRestart = JSON.stringify(recovered) === JSON.stringify(receipt);
} catch (error) {
  report.completed = false;
  report.failure = error && typeof error === 'object' && 'reason' in error && /^[a-z0-9_]+$/.test(String(error.reason)) ? error.reason : 'qualification_unavailable';
  report.jobErrors = ((relay as any)?.jobsTable.getAll() ?? []).map((j: any) =>
    typeof j.error === 'string' && /^[a-zA-Z0-9_.:-]{1,200}$/.test(j.error) ? j.error : 'unclassified');
} finally {
  await relay?.stop(); rmSync(directory, { recursive: true, force: true });
  const evidence = 'internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live-metering-verification.json';
  const prior = existsSync(evidence) ? JSON.parse(readFileSync(evidence, 'utf8')) : null;
  writeFileSync(evidence, JSON.stringify({ runs: [...(prior?.runs ?? (prior ? [prior] : [])), report] }, null, 2)+'\n');
  output(JSON.stringify(report));
}
