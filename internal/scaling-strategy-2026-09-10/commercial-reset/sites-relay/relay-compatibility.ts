/** Private compatibility experiment: production relay classes, synthetic upstream.
 * No production credentials, live inference, Sites creation or deployment.
 * Run with --codex to include a real installed CLI and its read-only Sites auth check.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import { GalxaiRelayServer } from '../../../../src/relay/relay-server';
import { RelayFederationLifecycle } from '../../../../src/relay/federation-lifecycle';
import { RelayFederationServer } from '../../../../src/relay/federation-server';
import { executeRelayChat } from '../../../../src/core/router/adapters/RelayChatTransport';

async function main() {
  const output = path.dirname(fileURLToPath(import.meta.url));
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'galx-sites-relay-fixture-'));
  const upstream = http.createServer();
  const ws = new WebSocketServer({ server: upstream });
  const frames: any[] = [];
  ws.on('connection', socket => socket.on('message', raw => {
    const frame = JSON.parse(raw.toString());
    if (frame.type !== 'response.create') return;
    frames.push(frame);
    if (JSON.stringify(frame.input).includes('function-emission')) {
      socket.send(JSON.stringify({ type: 'response.output_item.done', item: {
        type: 'function_call', id: 'fc_fixture', call_id: 'call_fixture', name: 'sites_inventory_probe', arguments: '{}' } }));
    } else {
      socket.send(JSON.stringify({ type: 'response.output_text.delta', delta: 'fixture-ok' }));
    }
    socket.send(JSON.stringify({ type: 'response.completed', response: {
      usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 } } }));
  }));
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const relay = new GalxaiRelayServer({ port: 0, host: '127.0.0.1',
    assignedShard: { id: 'sites-fixture', accountId: 'fixture', accessToken: 'oauth-fixture-no-live-access' },
    assignedShardId: 'sites-fixture', relayId: 'sites-fixture-relay', generation: 'fixture-one',
    apiKeys: ['sites-fixture-client', 'sites-fixture-other'], adminApiKeys: ['sites-fixture-admin'],
    registryEnabled: false, discoverHostCredentials: false, codexImageToolAlias: false,
    capabilityDiscovery: async () => ['relay-sites-probe'],
    wsEndpoint: `ws://127.0.0.1:${(upstream.address() as any).port}`,
    stateSnapshotPath: path.join(temporary, 'state.json'), shardsJsonPath: path.join(temporary, 'absent'),
    drainTimeoutMs: 25, maxUpstreamRetries: 0 });
  // The empty federation is sufficient to check unsupported routes before admission.
  const lifecycle = new RelayFederationLifecycle(async () => [], {
    list: async () => [], start: async () => { throw new Error('No live worker allowed'); },
    inspect: async () => ({}), remove: async () => {} });
  const federation = new RelayFederationServer(lifecycle, { port: 0, host: '127.0.0.1',
    apiKeys: ['sites-fixture-client'], adminKeys: ['sites-fixture-admin'],
    secret: 'sites-fixture-signing-secret-longer-than-32', drainTimeoutMs: 25 });
  const observations: Record<string, any> = { checked_at: new Date().toISOString(),
    scope: 'Local production relay classes with synthetic upstream; not a live inference or hosted Sites test', checks: [] };
  const check = (name: string, observed: unknown) => observations.checks.push({ name, observed });
  try {
    await relay.start(); await federation.start();
    const base = `http://127.0.0.1:${(relay as any).server.address().port}`;
    const federationBase = `http://127.0.0.1:${(federation.server.address() as any).port}`;
    const receivedRequests: any[] = [];
    (relay as any).server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.once('finish', () => receivedRequests.push({ path: req.url, method: req.method, status: res.statusCode,
        uses_fixture_key: req.headers.authorization === 'Bearer sites-fixture-client' }));
    });
    const headers = { Authorization: 'Bearer sites-fixture-client', 'Content-Type': 'application/json' };
    const post = (origin: string, route: string, body: unknown, auth = headers) => fetch(origin + route,
      { method: 'POST', headers: auth, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    for (const [label, origin] of [['worker', base], ['federation', federationBase]]) {
      for (const route of ['/v1/responses', '/mcp']) {
        const response = await post(origin, route, { model: 'relay-sites-probe', input: 'fixture' });
        assert.equal(response.status, 404); await response.body?.cancel();
        check(`${label} ${route}`, { status: 404 });
      }
    }
    const unauthorized = await post(base, '/v1/chat/completions', { messages: [] }, { Authorization: '', 'Content-Type': 'application/json' });
    assert.equal(unauthorized.status, 401); await unauthorized.body?.cancel();
    const admin = await fetch(base + '/api/capabilities', { headers });
    assert.equal(admin.status, 403); await admin.body?.cancel();
    check('unauthorized inference / ordinary key admin access', { statuses: [401, 403] });
    const payload = (content: string) => ({ model: 'relay-sites-probe', stream: false, messages: [{ role: 'user', content }] });
    const complete = async (body: any) => {
      const { response } = await executeRelayChat({ url: base, key: 'sites-fixture-client', payload: body,
        ttftTimeoutMs: 5000, wallTimeoutMs: 10000 });
      return response.json();
    };
    const text = await complete(payload('text-completion'));
    assert.equal(text.choices[0].message.content, 'fixture-ok');
    check('existing text transport', { completed: true, synthetic_provider: true });
    const withTools = await complete({ ...payload('tool-definition'),
      tools: [{ type: 'function', function: { name: 'sites_inventory_probe', parameters: { type: 'object', properties: {} } } }],
      tool_choice: 'required' });
    assert.equal(withTools.choices[0].message.content, 'fixture-ok');
    assert.equal(frames.at(-1).tools, undefined);
    assert.equal(frames.at(-1).tool_choice, undefined);
    check('tool definitions and required choice', { accepted_but_not_forwarded: true });
    const countBefore = frames.length;
    const functionResult = await post(base, '/v1/chat/completions', { model: 'relay-sites-probe',
      messages: [{ role: 'tool', tool_call_id: 'call_fixture', content: '{}' }] });
    assert.equal(functionResult.status, 400); await functionResult.body?.cancel();
    assert.equal(frames.length, countBefore);
    check('tool-result continuation', { status: 400, upstream_started: false });
    const functionCall = await complete(payload('function-emission'));
    assert.equal(functionCall.choices[0].message.tool_calls, undefined);
    assert.equal(functionCall.choices[0].message.content, '');
    check('upstream function-call output', { lost_in_text_adapter: true, empty_completion: true });
    assert(!JSON.stringify(text).includes('oauth-fixture-no-live-access'));
    check('synthetic provider credential excluded from text result', true);
    if (process.argv.includes('--codex')) {
      const before = receivedRequests.length;
      const { stdout } = await promisify(execFile)('python3', [path.join(output, 'codex-provider-probe.py'), base],
        { timeout: 180000, maxBuffer: 256 * 1024 });
      observations.codex = JSON.parse(stdout);
      observations.codex.provider_http_requests = receivedRequests.slice(before);
      assert(!observations.codex.probe_error_type, 'Codex diagnostic failed before finishing');
      assert.equal(observations.codex.selected_provider, 'galx_sites_probe');
      assert.equal(observations.codex.turn_status, 'failed');
      assert.equal(observations.codex.turn_error_mentions_404, true);
      assert(observations.codex.provider_http_requests.some((r: any) => r.path === '/v1/responses' && r.status === 404 && r.uses_fixture_key));
    }
    observations.completed = true;
    fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
    console.log(JSON.stringify(observations, null, 2));
  } finally {
    await federation.stop(); await lifecycle.stop(); await relay.stop();
    for (const socket of ws.clients) socket.terminate();
    await new Promise<void>(resolve => ws.close(() => resolve()));
    await new Promise<void>(resolve => upstream.close(() => resolve()));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
