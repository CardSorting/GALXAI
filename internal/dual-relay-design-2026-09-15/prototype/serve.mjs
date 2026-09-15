// Private loopback test harness, NOT production authentication or process isolation.
// One authority owns all accounts; console gateways retain no account database.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initialAuthority, transition, publicState, operationResult, DemoError } from './model.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" };
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
const send = (res, status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
async function body(req) {
  let value = ''; for await (const chunk of req) { value += chunk; if (Buffer.byteLength(value) > 8192) throw new DemoError(413, 'Demo action too large.'); }
  try { return JSON.parse(value); } catch { throw new DemoError(400, 'Invalid demo action.'); }
}
function server(handler) {
  const instance = http.createServer(async (req, res) => {
    try {
      const origin = `http://127.0.0.1:${instance.address().port}`;
      if (req.headers.host !== new URL(origin).host || req.headers.origin && req.headers.origin !== origin) throw new DemoError(403, 'Open this prototype on its own loopback address.');
      await handler(req, res, new URL(req.url, origin).pathname, origin);
    } catch (error) { send(res, error instanceof DemoError ? error.status : 503, { error: error instanceof DemoError ? error.message : 'Central account management is unavailable. Saved progress is retained.' }); }
  });
  instance.headersTimeout = 10000; instance.requestTimeout = 10000; return instance;
}
function persist(filename, value) {
  const temporary = filename + '.tmp', directory = path.dirname(filename);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const fd = fs.openSync(temporary, 'w', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, filename);
  const dir = fs.openSync(directory, 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
export function createAuthority({ filename, tokens, empty = false }) {
  let state = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : initialAuthority(empty), available = true;
  if (state.schema !== 2) throw Error('Unsupported demo state schema. Use a new demo state directory.');
  if (!fs.existsSync(filename)) persist(filename, state);
  return server(async (req, res, pathname) => {
    const profile = Object.keys(tokens).find(key => req.headers.authorization === `Bearer ${tokens[key]}`);
    if (!profile) throw new DemoError(403, 'A scoped demo console connection is required.');
    // Fault injection is harness-only, not a product API or role/availability bypass in production.
    if (pathname === '/demo/availability' && req.method === 'POST') {
      const command = await body(req);
      if (Object.keys(command).length !== 1 || typeof command.available !== 'boolean') throw new DemoError(400, 'Choose a demo availability state.');
      available = command.available; return send(res, 200, { available });
    }
    if (!available) throw new DemoError(503, 'Central account management is unavailable. Saved progress is retained.');
    if (pathname === '/api/state' && req.method === 'GET') return send(res, 200, publicState(state.pools[profile]));
    if (/^\/api\/operations\/[a-zA-Z0-9-]{1,80}$/.test(pathname) && req.method === 'GET') return send(res, 200, { operation: operationResult(state, profile, pathname.split('/').at(-1)), state: publicState(state.pools[profile]) });
    if (pathname !== '/api/action' || req.method !== 'POST') throw new DemoError(404, 'Prototype route not found.');
    const command = await body(req), next = transition(state, profile, command);
    persist(filename, next); state = next;
    return send(res, 200, { ...publicState(state.pools[profile]), operation: operationResult(state, profile, command.operationId) });
  });
}
export function createConsole({ authorityUrl, token }) {
  return server(async (req, res, pathname, origin) => {
    if (req.method === 'GET' && Object.hasOwn(files, pathname)) {
      const [file, type] = files[pathname]; res.writeHead(200, { ...headers, 'Content-Type': `${type}; charset=utf-8` }); res.end(fs.readFileSync(path.join(root, file))); return;
    }
    const read = req.method === 'GET' && (pathname === '/api/state' || /^\/api\/operations\/[a-zA-Z0-9-]{1,80}$/.test(pathname));
    const write = req.method === 'POST' && ['/api/action', '/demo/availability'].includes(pathname);
    if (!read && !write) throw new DemoError(404, 'Prototype route not found.');
    if (write && req.headers.origin !== origin) throw new DemoError(403, 'Use this console for prototype actions.');
    const command = write ? await body(req) : undefined;
    const upstream = await fetch(authorityUrl + pathname, { method: req.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(write ? { body: JSON.stringify(command) } : {}), signal: AbortSignal.timeout(4000) });
    const data = await upstream.json();
    if (upstream.ok && req.headers['x-demo-lost-reply'] === '1' && command?.action === 'register') return send(res, 502, { error: 'The registration response was interrupted. Check the saved result.', uncertain: true });
    send(res, upstream.status, data);
  });
}
export async function listen(instance, port = 0) {
  await new Promise((resolve, reject) => { instance.once('error', reject); instance.listen(port, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${instance.address().port}`;
}
export async function close(instance) { instance.closeAllConnections(); await new Promise(resolve => instance.close(resolve)); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw Error('Start both consoles and the central fixture with: node internal/dual-relay-design-2026-09-15/prototype/serve.mjs');
  const tokens = { premium: randomBytes(32).toString('hex'), standard: randomBytes(32).toString('hex') };
  const authority = createAuthority({ filename: path.resolve('.relay/dual-relay-interaction-prototype/central-v2.json'), tokens });
  const instances = [authority];
  try {
    const authorityUrl = await listen(authority, 4380);
    for (const profile of ['premium', 'standard']) {
      const consoleServer = createConsole({ authorityUrl, token: tokens[profile] }); instances.push(consoleServer);
      console.log(JSON.stringify({ prototype: true, relay: profile, url: await listen(consoleServer, profile === 'premium' ? 4381 : 4382) }));
    }
  } catch (error) { await Promise.allSettled(instances.map(close)); throw error; }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await Promise.allSettled(instances.map(close)); });
}
