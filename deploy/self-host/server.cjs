'use strict';
// Standard Next standalone startup using the retained build's own configuration.
// No custom HTTP server, inference adapter, retry layer or signal interception.
const fs = require('node:fs');
const path = require('node:path');
const { readConfig } = require('./runtime-config.cjs');

let phase = 'configuration';
async function main() {
  const config = readConfig('/run/secrets/galx-runtime.json');
  // Environment injected by Docker must not change lifecycle or module loading.
  for (const name of ['NODE_OPTIONS', 'NEXT_MANUAL_SIG_HANDLE', '__NEXT_PRIVATE_STANDALONE_CONFIG', 'GALX_REQUEST_ORIGIN_MODE', 'GALX_SELF_HOST_AUTHORITY']) {
    if (process.env[name]) throw Error('Unsupported process override.');
  }
  Object.assign(process.env, config, {
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    GALX_REQUEST_ORIGIN_MODE: 'mac-loopback-v1', GALX_SELF_HOST_AUTHORITY: '0.0.0.0:3000',
  });
  process.chdir(__dirname);
  phase = 'cache-initialization';
  for (const name of ['app', 'pages']) {
    const target = path.join(__dirname, '.next/server', name);
    if (fs.readdirSync(target).length) throw Error('Next runtime cache must start empty.');
    fs.cpSync(`/opt/galx-seed/${name}`, target, { recursive: true, dereference: false });
  }
  const nextConfig = require('./.next/required-server-files.json').config;
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
  phase = 'framework-startup';
  require('next');
  const { startServer } = require('next/dist/server/lib/start-server');
  // Standard Next startup; application origin policy understands this fixed
  // private listener without patching framework metadata or authorization.
  // The Compose policy restricts the published address to host loopback.
  await startServer({ dir: __dirname, isDev: false, config: nextConfig, hostname: '0.0.0.0', port: 3000, allowRetry: false });
}
main().catch(error => {
  // Startup diagnostics must never echo configuration values or raw exceptions.
  const code = ['ENOENT', 'EACCES', 'EROFS', 'ENOSPC', 'MODULE_NOT_FOUND'].includes(error?.code) ? error.code : 'invalid';
  console.error(`GALX startup failed (${phase}/${code}). Check the private self-hosting runbook.`);
  process.exitCode = 1;
});
