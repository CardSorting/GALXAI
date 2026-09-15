/** Local TLS terminator. One fixed upstream; no retries or arbitrary proxy targets. */
import https from 'node:https';
import http from 'node:http';
import { readFileSync } from 'node:fs';
const server = https.createServer({
  key: readFileSync('/run/secrets/tls-key'),
  cert: readFileSync('/run/secrets/tls-cert'),
  minVersion: 'TLSv1.2',
}, (req, res) => {
  if (req.method !== 'POST' || !/^\/(runtime|operator|registrar)\/[a-z_-]+$/.test(req.url ?? '')) {
    res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end(); return;
  }
  const upstream = http.request({ hostname: 'authority', port: 3000, path: req.url, method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
  }, response => {
    res.writeHead(response.statusCode ?? 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.pipe(res);
    response.on('error', () => res.destroy());
  });
  upstream.setTimeout(15000, () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(503, { 'Cache-Control': 'no-store' }); res.end(); });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.listen(8443, '0.0.0.0');
process.once('SIGTERM', () => server.close());
