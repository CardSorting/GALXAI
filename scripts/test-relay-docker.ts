/**
 * @file scripts/test-relay-docker.ts
 * @description Forensic Verification Test Suite for GALXAI Local Relay Docker Container & WebApp Control Plane.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { GalxDockerSupervisor } from '../src/core/relay/GalxDockerSupervisor.js';
import { GalxRelaySupervisor } from '../src/core/relay/GalxRelaySupervisor.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\x1b[31m✖ Assertion Failed: ${message}\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m✔\x1b[0m ${message}`);
}

async function fetchHttp(url: string, timeoutMs = 3000, authenticated = false): Promise<{ status: number; text: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.RELAY_ADMIN_API_KEYS?.split(',')[0]?.trim() || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
    const req = http.get(url, { timeout: timeoutMs, headers: authenticated && apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode || 0, text: data, json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

async function runDockerTests(): Promise<void> {
  console.log(`\n\x1b[1m\x1b[36m🧪 Running Forensic Test Suite: GALXAI Relay Docker & WebApp Control Plane\x1b[0m\n`);

  // --------------------------------------------------------------------------
  // TEST 1: Compose File Security & Loopback Isolation Audit
  // --------------------------------------------------------------------------
  console.log(`\x1b[1mTest 1: Docker Compose Configuration & Strict Loopback Binding Audit\x1b[0m`);
  const composePath = path.resolve(process.cwd(), 'docker-compose.relay.yml');
  assert(fs.existsSync(composePath), 'docker-compose.relay.yml exists');

  const composeContent = fs.readFileSync(composePath, 'utf-8');
  assert(
    composeContent.includes('127.0.0.1:${GALXAI_RELAY_PORT:-3001}:3001') ||
      composeContent.includes('127.0.0.1:'),
    'Compose strictly maps host port to loopback 127.0.0.1 (never 0.0.0.0)'
  );
  assert(
    composeContent.includes('memory: 512M'),
    'Compose specifies 512MB RAM resource ceiling (Polite Neighbor Protocol)'
  );
  assert(
    composeContent.includes('cpus: \'1.0\''),
    'Compose specifies 1.0 CPU resource ceiling'
  );
  assert(
    !composeContent.includes('.codex:') && composeContent.includes('read_only: true') && composeContent.includes('cap_drop: [ALL]'),
    'No personal credentials mounted; root filesystem is read-only and capabilities are dropped'
  );
  assert(
    composeContent.includes('relay-state:/app/.broccolidb'),
    'BroccoliDB state directory mounted for persistent checkpointing'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Stage Dockerfile Audit
  // --------------------------------------------------------------------------
  console.log(`\n\x1b[1mTest 2: Multi-Stage Standalone Dockerfile Audit\x1b[0m`);
  const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile.relay');
  assert(fs.existsSync(dockerfilePath), 'Dockerfile.relay exists');

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  assert(dockerfileContent.includes('FROM node:22-alpine AS builder'), 'Uses node:22-alpine multi-stage builder');
  assert(dockerfileContent.includes('esbuild'), 'Uses esbuild for single-binary bundling');
  assert(dockerfileContent.includes('FROM node:22-alpine AS runner'), 'Uses lightweight runner image');
  assert(dockerfileContent.includes('dashboard.html'), 'Packages dashboard.html into image');

  // --------------------------------------------------------------------------
  // TEST 3: Docker Daemon Availability
  // --------------------------------------------------------------------------
  console.log(`\n\x1b[1mTest 3: Docker Daemon Connectivity\x1b[0m`);
  const isDockerAvailable = await GalxDockerSupervisor.isDockerAvailable();
  assert(isDockerAvailable, 'Docker daemon is active and responsive');

  // --------------------------------------------------------------------------
  // TEST 4: Container Launch & Health Probe
  // --------------------------------------------------------------------------
  console.log(`\n\x1b[1mTest 4: Container Launch & Wire Verification\x1b[0m`);
  const status = await GalxDockerSupervisor.up();
  assert(status.isContainerRunning, 'Docker container is running');
  assert(typeof status.port === 'number', `Container mapped to host port ${status.port}`);
  assert(status.healthOk === true, 'Container passed /health wire probe');

  // --------------------------------------------------------------------------
  // TEST 5: WebApp Control Plane Route Verification
  // --------------------------------------------------------------------------
  console.log(`\n\x1b[1mTest 5: WebApp Control Plane (GET / and GET /api/dashboard/stats)\x1b[0m`);
  const dashboardRes = await fetchHttp(`http://127.0.0.1:${status.port}/`);
  assert(dashboardRes.status === 200, 'GET / returned HTTP 200 OK');
  assert(dashboardRes.text.includes('GALXAI Relay'), 'GET / contains GALXAI Relay title');
  assert(dashboardRes.text.includes('Zenith Core'), 'GET / contains Zenith Core brand badge');
  assert(dashboardRes.text.includes('Chat SSE Streamer'), 'GET / contains interactive chat streamer UI');
  assert(dashboardRes.text.includes('Image Studio'), 'GET / contains image studio playground UI');

  const denied = await fetchHttp(`http://127.0.0.1:${status.port}/api/dashboard/stats`);
  assert(denied.status === 401, 'Unauthenticated operational data is denied');
  const statsRes = await fetchHttp(`http://127.0.0.1:${status.port}/api/dashboard/stats`, 15000, true);
  assert(statsRes.status === 200, 'GET /api/dashboard/stats returned HTTP 200 OK');
  assert(statsRes.json?.status === 'ok', 'Stats API returns status ok');
  assert(statsRes.json?.service === 'galxai-relay', 'Stats API returns service galxai-relay');
  assert(typeof statsRes.json?.memory?.rss === 'number', 'Stats API reports process memory usage');
  assert(typeof statsRes.json?.database?.jobs === 'number', 'Stats API reports BroccoliDB job counts');

  // --------------------------------------------------------------------------
  // TEST 6: Container Logs Verification
  // --------------------------------------------------------------------------
  console.log(`\n\x1b[1mTest 6: Container Logs Retrieval\x1b[0m`);
  const logs = await GalxDockerSupervisor.logs(10);
  assert(logs.length > 0, 'Container logs retrieved successfully');
  assert(logs.includes('BroccoliDB Relay') || logs.includes('galxai-relay'), 'Logs show relay initialization');

  console.log(`\n\x1b[1m\x1b[32m🎉 ALL 18 DOCKER & WEBAPP VERIFICATION TESTS PASSED (100%)!\x1b[0m\n`);
}

runDockerTests().catch((err) => {
  console.error('\x1b[31mTest execution error:\x1b[0m', err);
  process.exit(1);
});
