/** Static-only reference origin. It holds no account credentials and proxies no inference. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
const configuration = { issuer: process.env.GALX_CONNECT_ORIGIN || 'https://galx.ai', resource: process.env.GALX_NOVA_RESOURCE || 'https://nova.galx.ai', clientId: 'reference-browser' };
const output = await build({ entryPoints: [new URL('./client.ts', import.meta.url).pathname], bundle: true, format: 'esm', write: false, define: { CONNECT_CONFIGURATION: JSON.stringify(configuration) } });
const html = await readFile(new URL('./index.html', import.meta.url));
createServer((req, res) => {
  if (req.method !== 'GET' || !['/', '/callback', '/client.js'].includes(new URL(req.url || '/', 'http://127.0.0.1:4400').pathname)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': req.url === '/client.js' ? 'text/javascript' : 'text/html', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end(req.url === '/client.js' ? output.outputFiles[0].contents : html);
}).listen(4400, '127.0.0.1', () => console.log('Reference client: http://127.0.0.1:4400'));
