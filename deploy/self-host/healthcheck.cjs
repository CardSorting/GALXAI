'use strict';
// Liveness only. No provider request, database probe or secret in output.
const http = require('node:http');
const request = http.get({ host: '127.0.0.1', port: 3000, path: '/api/health', headers: { Host: 'galx.ai', 'X-Forwarded-Proto': 'https' }, timeout: 3000 }, response => {
  let bytes = 0, body = '';
  response.on('data', chunk => { bytes += chunk.length; if (bytes > 4096) response.destroy(); else body += chunk; });
  response.on('end', () => {
    try { const result = JSON.parse(body); process.exitCode = response.statusCode === 200 && result.status === 'healthy' && Object.keys(result).every(k => ['status', 'timestamp'].includes(k)) ? 0 : 1; }
    catch { process.exitCode = 1; }
  });
  response.on('error', () => { process.exitCode = 1; });
});
request.on('timeout', () => request.destroy());
request.on('error', () => { process.exitCode = 1; });
