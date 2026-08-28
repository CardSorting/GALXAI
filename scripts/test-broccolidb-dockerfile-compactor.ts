import assert from 'node:assert/strict';
import { BroccoliDockerfileCompactor } from '../src/core/broccolidb/BroccoliDockerfileCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DOCKERFILE & CONTAINER COMPACTOR');
  console.log('======================================================================\n');

  BroccoliDockerfileCompactor.clear();

  // Full multi-stage Dockerfile with verbose apt-get scripts, comments, and intermediate build stages
  const rawDockerfile = `
# Multi-stage production build for Node.js Next.js service
# Maintainer: DevOps Team <devops@enterprise.com>

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache libc6-compat python3 make g++ && \
    npm ci --prefer-offline --no-audit

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
`.trim();

  console.log('[1/2] Compacting Dockerfile in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliDockerfileCompactor.compactDockerfile(rawDockerfile);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Base Images: ${res.baseImages.join(' -> ')}`);
  console.log(`      - Exposed Ports: ${res.exposedPorts.join(', ')}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Dockerfile Preview:\n"""\n${res.compactedDockerPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.baseImages.length, 3);
  assert.equal(res.exposedPorts[0], '3000');
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedDockerPrompt.includes('node:20-alpine (AS deps)'));
  assert.ok(res.compactedDockerPrompt.includes('node:20-alpine (AS runner)'));
  assert.ok(res.compactedDockerPrompt.includes('3000'));
  assert.ok(res.compactedDockerPrompt.includes('CMD ["node", "server.js"]'));
  assert.ok(!res.compactedDockerPrompt.includes('apk add --no-cache libc6-compat')); // OS build script pruned


  console.log('\n[✓] Dockerfile Multi-Stage Parsing & Package Script Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL DOCKERFILE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
