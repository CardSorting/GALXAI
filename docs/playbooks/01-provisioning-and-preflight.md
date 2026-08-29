# 🛠️ Playbook 01: Infrastructure Provisioning & Pre-Flight Verification

> **Stage 1**: Initial Environment Setup, Key Derivation, Substrate Resource Provisioning & Pre-Flight Integrity Audits.

---

## 🎯 Objective & Prerequisites
This playbook ensures that all local workstations, staging environments, and production CI/CD runners possess a deterministic runtime environment, valid cryptographic enclave keys, verified database pooler connectivity, and pass all 8 pre-flight verification gates before any code is built or deployed.

### Required Access & Roles:
- **Node.js**: `v20.18.0` LTS (strictly pinned via `.nvmrc` and `.node-version`).
- **Supabase Project Access**: Endpoint `https://mazhcjisettrzbqhorvp.supabase.co`.
- **Cloudflare Account Access**: Account ID and API Token with Workers, KV, and R2 permissions.
- **Vercel Project Access**: Project linked to production domain `galx.ai`.

---

## 📋 Step-by-Step Provisioning Procedure

### Step 1: Node.js Runtime Pinning & Clean Dependency Installation
```bash
# Verify Node.js version matches 20.18.0 LTS
node -v # Must output v20.18.x

# If using nvm or fnm
nvm use || fnm use

# Clean installation of dependencies
npm ci || npm install
```

---

### Step 2: Environment Variable Configuration & Type-Safe Baseline
Create or inspect `.env.local`:

```env
# Web Application Ingress
NEXT_PUBLIC_APP_URL=https://galx.ai

# Supabase Authoritative Substrate
NEXT_PUBLIC_SUPABASE_URL=https://mazhcjisettrzbqhorvp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9eyEPgM-hF00Va7TLE90yA_LV4iGcoE
DATABASE_URL=postgresql://postgres.mazhcjisettrzbqhorvp:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Cryptographic Vault Enclave
GALX_VAULT_MASTER_SECRET=galx_vault_846e122c8d17e4a0462230eed6783df6843f0703321a714a
GALX_VAULT_KEY=galx_vault_846e122c8d17e4a0462230eed6783df6843f0703321a714a
GALX_VAULT_ACTIVE_KEY_VERSION=v1

# High-Throughput Edge Gateway & Multimodal CDN
NEXT_PUBLIC_GALX_EDGE_URL=https://api.galx.ai
PUBLIC_ASSETS_URL=https://assets.galx.ai
```

---

### Step 3: Cryptographic Vault Enclave Key Derivation & Self-Test
Run the automated vault initialization script to verify HKDF-SHA256 derivation and AES-256-GCM hardware cipher encryption/decryption roundtrips:

```bash
# Test existing key or generate missing master secrets
npm run vault:populate

# (Optional) Generate a completely fresh 256-bit cryptographic key
npm run vault:populate -- --fresh
```

Expected Verification Output:
```text
✓ HKDF-SHA256 derived 32-byte key generated.
✓ AES-256-GCM round-trip encryption & decryption verified.
✓ AAD tuple validation confirmed.
```

---

### Step 4: Cloudflare Resource Provisioning (KV, R2, Workers)
Run the automated Cloudflare bootstrapper to provision required KV namespaces and R2 storage buckets:

```bash
# Bootstrap Cloudflare Workers, RATE_LIMIT_KV, CACHE_KV, and R2 assets bucket
npm run worker:bootstrap
```

---

### Step 5: Execute the 8-Phase Pre-Flight Audit Engine
Before committing code or triggering deployment, execute the 8-phase pre-flight audit engine:

```bash
# Run the 8-phase audit engine directly
npm run vercel:verify

# Or execute full typecheck, audit, and production build gate
npm run deploy:check
```

### Pre-Flight Verification Gate Criteria:
- [x] **Phase 1: Vercel Configuration**: `vercel.json` framework set to `nextjs`, multi-region routing (`sfo1`, `iad1`), clean URLs, and 15-minute health crons.
- [x] **Phase 2: Bundle Footprint Isolation**: `.vercelignore` strictly excludes non-production directories.
- [x] **Phase 3: Cryptographic Vault Enclave**: AES-256-GCM cipher roundtrip verified.
- [x] **Phase 4: Supabase Connectivity**: Live HTTPS ping reachable and `DATABASE_URL` connects via transaction pooler port `6543`.
- [x] **Phase 5: Next.js 15 Route Architecture**: App Router and OpenAPI V1 endpoints valid.
- [x] **Phase 6: Static Assets & SEO**: Dynamic `robots.ts` and `sitemap.ts` present.
- [x] **Phase 7: Next.js Configuration**: Package import optimization (`optimizePackageImports`) and HSTS enabled.
- [x] **Phase 8: Production Build Verification**: Zero TypeScript errors and clean chunk manifests.

### Step 6: Database Integrity & Chat Context Hardening Audits
Validate Supabase PostgreSQL migrations and context governor boundaries:

```bash
# 1. Audit all 53 PostgreSQL migrations and .down.sql rollback pairings
npm run db:verify

# 2. Run the 92-test live zero-egress database integration suite
npm run db:test

# 3. Verify chat request normalization and tool turn-pair boundaries
npx tsx scripts/test-chat-context-hardening.ts
```

---

## 🛑 Rollback & Recovery
If pre-flight fails:
1. Review the specific failed phase in the CLI output.
2. Check network firewall rules for Supabase HTTPS port 443.
3. Re-run `npm run vault:populate` if cipher tests fail.
4. Run `npm run db:verify` to pinpoint schema or RLS policy violations.
