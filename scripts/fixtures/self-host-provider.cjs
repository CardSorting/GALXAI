// Offline fixture only. Never included in the application image.
const http = require('node:http');
// The disposable database stays on the internal fixture network. Expose its
// authenticated PostgreSQL protocol on numeric loopback in the application's
// shared fixture namespace; production plaintext rules are not relaxed.
if (process.env.FIXTURE_DATABASE) {
  const net = require('node:net'), host = process.env.FIXTURE_DATABASE;
  if (!/^[a-z0-9][a-z0-9-]{1,120}$/.test(host)) throw Error('Invalid fixture database host');
  const bridge = net.createServer(client => {
    const upstream = net.connect(5432, host);
    client.on('error', () => upstream.destroy()); upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy()); upstream.on('close', () => client.destroy());
    client.pipe(upstream); upstream.pipe(client);
  });
  bridge.maxConnections = 20; bridge.listen(55432, '127.0.0.1');
}
const jobs = new Map();
let submissions = 0, attempts = 0, disconnects = 0, explicitFailures = 0;
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
const delta = finish => 'data: ' + JSON.stringify({ id: 'PRIVATE_JOB', model: 'PRIVATE_MODEL', choices: [{ delta: { content: 'Synthetic result.', reasoning_content: 'PRIVATE_REASONING' }, finish_reason: finish }] }) + '\n\n';
http.createServer(async (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.FIXTURE_KEY) return json(res, 401, {});
  if (req.url === '/_fixture/status') return json(res, 200, { submissions, attempts, disconnects, explicitFailures });
  if (req.url === '/health/live' || req.url === '/health') return json(res, 200, { ok: true });
  if (req.url === '/v1/models') return json(res, 200, { data: [{ id: 'galx-nova' }] });
  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks)), id = req.headers['idempotency-key'];
    submissions++;
    if (body.messages[0].content === 'reject') return json(res, 503, { error: { code: 'busy', execution_state: 'not_accepted', message: 'PRIVATE_REJECTION' } });
    if (!jobs.has(id)) { jobs.set(id, { mode: body.messages[0].content }); attempts++; }
    return json(res, 202, { id, streamUrl: '/v1/jobs/' + id + '/stream' });
  }
  const match = req.url.match(/^\/v1\/jobs\/([^/]+)\/stream$/);
  if (!match || !jobs.has(match[1])) return json(res, 404, {});
  const { mode } = jobs.get(match[1]);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Private-Upstream': 'PRIVATE_HEADER' });
  res.write(delta(null));
  // Upstream empty events satisfy its idle timer. Nova emits its own harmless
  // comment keepalives; these frames themselves never become public output.
  const keepalive = setInterval(() => res.write('data: {"choices":[]}\n\n'), 1000);
  const terminal = setTimeout(() => {
    if (mode === 'hold') return;
    if (mode === 'drop') return res.destroy();
    if (mode === 'fail') { explicitFailures++; return res.end('data: {"error":{"code":"request_failed","execution_state":"failed","message":"PRIVATE_FAILURE"}}\n\n'); }
    res.end(mode === 'unknown' ? '' : delta('stop') + 'data: [DONE]\n\n');
  }, mode === 'quiet-complete' ? 17000 : mode === 'slow-complete' ? 2000 : 100);
  res.on('close', () => { clearInterval(keepalive); clearTimeout(terminal); if (mode === 'hold') disconnects++; });
}).listen(7779, '0.0.0.0');
