// Test-only fixed TCP entrances to an internal Docker network. The app,
// database and synthetic provider have no route to the public Internet.
// No destination supplied by a caller, HTTP transformation or request retry.
const net = require('node:net');
for (const [port, name] of [[5432, 'FIXTURE_DATABASE'], [7779, 'FIXTURE_PROVIDER'], [3000, 'FIXTURE_APPLICATION']]) {
  net.createServer(client => {
    const upstream = net.connect({ host: process.env[name], port });
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    client.pipe(upstream).pipe(client);
  }).listen(port, '0.0.0.0');
}
