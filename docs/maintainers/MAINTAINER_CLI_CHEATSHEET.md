# ⚡ GALXAI Maintainer CLI Cheatsheet & Command Reference

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Quick-Reference Card for Day-to-Day Engineering & Maintenance**

---

## 🚀 1. Onboarding & Local Workstation Setup

```bash
npm run onboard               # Fast (<5s) 7-point environment & vault validation
npm run dev                   # Launch Next.js local development server on :3000
npm run predev                # Clean up orphaned processes on port :3000
```

---

## 🥦 2. BroccoliDB Compaction & Benchmarks

```bash
# 1. Empirical Inference Boundary Benchmark (OpenAI Models)
npm run bench:inference-boundary

# 2. Forensic Payload Dissection & Causal Analysis Tool
npm run dissect:payloads

# 3. BroccoliDB Compaction API Gateway Suite (19 modes, 7/7 suites)
npm run test:broccolidb:api

# 4. BroccoliDB Production Hardening & Fail-Closed Safety Regressions
npm run test:broccolidb:hardening

# 5. Master 180-Domain Compactor Cluster Suite (100% Verified)
npm run bench:180-domains
```

---

## 🛡️ 3. Core Engine, Routing & Context Hardening

```bash
# 1. Chat Normalization, Tool Turn-Pairs & Dynamic 1M Context Hardening Suite (21 Tests)
npx tsx scripts/test-chat-context-hardening.ts

# 2. Universal Model Router, Vault, Privacy & SOC2 Suite (218 Tests)
npm run test:router

# 3. Universal Developer Mental Model & SDK Parity Suite (98 Tests)
npx tsx scripts/verify-zero-hesitation-ergonomics.ts

# 4. Spend Governance Attribution & Control Plane Suite
npm run test:governance
```

---

## 🌐 4. Cloudflare Edge Mesh & SRE Playbooks

```bash
# 1. Cloudflare Workers Edge Mesh Verification (46 Edge Tests)
npm run worker:test

# 2. SDK -> Cloudflare Edge Live Smoke Test
npx tsx scripts/test-sdk-edge.ts

# 3. Interactive Operational Lifecycle Playbook Engine (Stages 1-8)
npm run playbook
npm run playbook -- --stage=preflight   # Stage 1: Pre-Flight & Vault Validation
npm run playbook -- --stage=deploy      # Stage 2: Deployment Readiness
npm run playbook -- --stage=traffic     # Stage 3: Live Traffic & Shard Health
npm run playbook -- --stage=triage      # Stage 4: Incident Triage & Error Scan
npm run playbook -- --stage=compliance  # Stage 5: Security & Audit Verification
npm run playbook -- --stage=dr          # Stage 6: Disaster Recovery Probe
```

---

## 🗄️ 5. Supabase PostgreSQL & AOP-DB Protocol

```bash
# 1. Paranoid PostgreSQL Schema & RLS Auditor
npm run db:verify

# 2. Database Integration Test Suite
npm run db:test

# 3. Apply Idempotent SQL Migrations
npm run db:push

# 4. Rollback Last Applied Migration (.down.sql)
npm run db:rollback
```

---

## 🚢 6. Release & Production Verification

```bash
# 1. Full Pre-Deployment Pipeline (Audit + Lint + SSG Build)
npm run deploy:check

# 2. 8-Phase Enterprise Vercel Pre-Flight Readiness Engine
npm run vercel:verify

# 3. 12-Point Post-Deployment Live Smoke Probes
npm run vercel:smoke -- --url=https://galx.ai

# 4. Strict TypeScript Typecheck
npx tsc --noEmit
```

---

*Keep this cheatsheet bookmarked during development.* 🥦⚡
