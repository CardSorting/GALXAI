/** Reference native host: external browser login, loopback callback, credentials only in this process. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { GalxConnection } from '../../src/sdk/connect';

const clientId = process.env.GALX_CONNECT_CLIENT_ID || 'reference-native';
const server = createServer();
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const port = (server.address() as { port: number }).port;
const connection = new GalxConnection({ clientId, issuer: process.env.GALX_CONNECT_ORIGIN, resource: process.env.GALX_NOVA_RESOURCE, redirectUri: `http://127.0.0.1:${port}/callback` });
try {
  const callback = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection expired. Start again.')), 600_000);
    server.on('request', (request, response) => {
      const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
      if (request.method !== 'GET' || url.pathname !== '/callback' || request.headers.host !== `127.0.0.1:${port}`) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).end('Return to your application to finish connecting.');
      clearTimeout(timer); resolve(url.href);
    });
  });
  const url = await connection.connect();
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
  const browser = spawn(command, [url!], { stdio: 'ignore' });
  browser.on('error', () => console.error('Open your system browser to authorize the application.'));
  await connection.connect(await callback);
  const response = await connection.invoke([{ role: 'user', content: process.argv[2] || 'Suggest one small creative project I can start today.' }]);
  const result = await response.json();
  console.log(response.ok ? result.choices?.[0]?.message?.content : result.error?.message || 'The request did not complete.');
  // This short-lived reference host withdraws its connection when finished.
  await connection.disconnect();
} catch { console.error('The task could not be confirmed. It was not automatically retried. Manage connections in your GALX account.'); process.exitCode = 1; }
finally { server.close(); }
