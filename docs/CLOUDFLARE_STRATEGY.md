# 🌐 GALXAI Cloudflare Architecture & Production Deployment Strategy

This authoritative document defines the complete Cloudflare edge strategy for **GALXAI**, orchestrating zero-egress AI model routing, streaming inference, database acceleration, multimodal media storage, distributed agent coordination, and enterprise perimeter security across Cloudflare's 300+ global Points of Presence (PoPs).

---

## 1. Executive Summary & Architectural Topology

GALXAI decouples compute, storage, and egress into a hybrid edge-substrate architecture:
1. **Edge Compute Tier (Cloudflare Workers & V8 Isolates)**: Terminates client TLS at the nearest edge PoP (<15ms latency), enforces rate limits via KV, routes model traffic to OpenAI/xAI provider shards, and streams SSE chunks directly to clients with **$0 egress fees** at `api.galx.ai`.
2. **Edge Acceleration Tier (Cloudflare Hyperdrive)**: Pre-warms and pools database connections to Supabase PostgreSQL, reducing connection handshake latency to $<1\text{ms}$.
3. **Multimodal Storage Tier (Cloudflare R2 + CDN)**: Stores generated images (FLUX, DALL-E) and audio binaries with **$0 egress bandwidth fees** on `assets.galx.ai`.
4. **Stateful Coordination Tier (Cloudflare Durable Objects)**: Coordinates multi-agent reasoning loops and in-memory swarm context sharing (`GalxSwarmCoordinatorDO`).
5. **Security & Perimeter Tier (Cloudflare WAF, Turnstile, DDoS)**: Blocks malicious scrapers, credential stuffing, and volumetric attacks before hitting compute.

```mermaid
flowchart TD
    subgraph Clients["Global Ingress Clients"]
        SDK["GALXAI SDK (TS / Python / Go)"]
        UI["Web Dashboard (galx.ai)"]
        Curl["OpenAI/Anthropic REST Clients"]
    end

    subgraph CF_Perimeter["Cloudflare Edge Network (300+ Global PoPs)"]
        WAF["WAF & DDoS Mitigation"]
        Turnstile["Turnstile Bot Protection"]
        DNS["Anycast DNS (api.galx.ai)"]
        
        subgraph Workers["Cloudflare Workers Engine (V8 Isolates)"]
            Gateway["GalxEdgeGateway (/v1/*)"]
            EdgeRouter["GalxEdgeRouter (In-Flight Failover)"]
            SpecEngine["GalxEdgeSpeculativeEngine (Draft Pipeling)"]
            BatchBuffer["GalxEdgeBatchBuffer (Micro-Batching)"]
            QueueWorker["GalxEdgeQueueWorker (Cron Worker Fleet)"]
            WebhookDispatcher["GalxEdgeWebhookDispatcher (HMAC)"]
        end

        subgraph EdgeStorage["Cloudflare Edge State & Storage"]
            KV["Cloudflare KV (Rate Limits & Model Catalog)"]
            DO["Durable Objects (GalxSwarmCoordinatorDO)"]
            Hyperdrive["Cloudflare Hyperdrive (DB Pool Accelerator)"]
            R2["Cloudflare R2 (Multimodal Storage: assets.galx.ai)"]
        end
    end

    subgraph Providers["Upstream AI Provider Shards"]
        OAI["OpenAI Shards (gpt-5.6-sol, gpt-5.6-terra)"]
        XAI["xAI Grok Shards (grok-4.6, grok-4.5)"]
    end

    subgraph Backend["Authoritative Storage Substrate"]
        Supa["Supabase PostgreSQL (BroccoliDB L1 / WAL)"]
    end

    %% Client Traffic Flow
    Clients --> DNS
    DNS --> WAF
    WAF --> Turnstile
    Turnstile --> Gateway

    %% Gateway Operations
    Gateway <--> KV
    Gateway <--> DO
    Gateway --> EdgeRouter
    EdgeRouter --> SpecEngine
    SpecEngine --> OAI
    SpecEngine --> XAI

    %% Zero-Egress Streaming directly back to Client
    OAI -. Direct SSE Stream .-> Gateway -. Zero-Egress Stream .-> Clients
    XAI -. Direct SSE Stream .-> Gateway -. Zero-Egress Stream .-> Clients

    %% Asset Storage
    Gateway --> R2
    R2 -. $0 Egress CDN .-> Clients

    %% Micro-Batching & DB Access via Hyperdrive
    Gateway --> BatchBuffer
    QueueWorker --> BatchBuffer
    BatchBuffer --> Hyperdrive
    Hyperdrive --> Supa
```

---

## 2. The 7 Strategic Pillars of Cloudflare for GALXAI

### Pillar 1: Zero-Egress Universal Gateway (`GalxEdgeGateway`)
- **Domain**: `api.galx.ai`
- **Mechanism**: Utilizes the native Web Streams API (`TransformStream`) in Cloudflare Workers to proxy upstream SSE chunks from OpenAI/xAI directly to clients without buffering full responses in RAM.
- **Economic Advantage**: Eliminates standard cloud egress fees ($0.09–$0.12/GB), allowing GALXAI to offer wholesale pricing with up to 36% discount margins sustainably.

### Pillar 2: Zero-Overhead Database Connectivity (Cloudflare Hyperdrive)
- **Problem Solved**: Serverless V8 isolates opening direct TCP connections to PostgreSQL can cause connection storms and add 80–150ms handshake overhead per request.
- **Solution**: Cloudflare Hyperdrive maintains a persistent, pre-authenticated connection pool to Supabase PostgreSQL at the edge PoP, cutting database roundtrip latency to $<15\text{ms}$.

### Pillar 3: Zero-Egress Multimodal Storage (Cloudflare R2 + CDN)
- **Domain**: `assets.galx.ai`
- **Mechanism**: Large visual generation outputs (`openai-gpt-image-2`, `openai-gpt-image-1.5`) and synthesized audio buffers are streamed straight to Cloudflare R2 via `GalxR2AssetAdapter`.
- **Database Optimization**: Supabase PostgreSQL only stores compact metadata URIs (e.g. `https://assets.galx.ai/generations/asset_123.webp`), keeping database size minimal.

### Pillar 4: Edge Caching & Distributed Rate Limiting (Cloudflare KV + Cache API)
- **Components**: `RATE_LIMIT_KV` & `EDGE_CACHE`
- **Capabilities**:
  - **Rate Limiting**: Sliding-window rate limit counters stored in KV with atomic TTL expiration.
  - **Stale-While-Revalidate Model Catalog**: Model metadata and pricing tiers (`/v1/models`) cached at all 300+ PoPs with background asynchronous revalidation.
  - **Fast Auth Verification**: Hash lookup for active API keys to bypass database hits on authorized requests.

### Pillar 5: Stateful Edge Swarm Coordination (Cloudflare Durable Objects)
- **Component**: `GalxSwarmCoordinatorDO`
- **Functionality**: Provides consistent, low-latency in-memory coordination for autonomous multi-agent swarms.
- **Advantage**: Agents exchange intermediate reasoning thoughts, shared prompt prefixes, and sub-task outputs in edge memory with zero database read/write amplification.

### Pillar 6: Autonomous Queue Worker Fleet (`GalxEdgeQueueWorker`)
- **Trigger**: Cloudflare Workers Cron Triggers (`* * * * *`)
- **Execution**: Edge workers pull batches of pending asynchronous tasks from Supabase via `FOR UPDATE SKIP LOCKED` stored procedures (`fn_lease_queue_tasks_batch_cf`), dispatch HTTP/webhook targets, and commit batch acknowledgments via `GalxEdgeBatchBuffer`.

### Pillar 7: Enterprise Perimeter Defense (WAF, Turnstile, DDoS)
- **Capabilities**:
  - **Cloudflare Managed WAF**: OWASP Top 10 mitigation, SQL injection, and XSS filtering.
  - **Cloudflare Turnstile**: Non-intrusive CAPTCHA alternative protecting user signups, wallet deposits, and interactive API key creation.
  - **Volumetric DDoS Mitigation**: Unmetered DDoS defense against L3/L4 and L7 floods.

---

## 3. Production Domain & DNS Mapping

| Hostname | Purpose | Target | Cloudflare Proxy (Orange Cloud) |
| :--- | :--- | :--- | :--- |
| `galx.ai` | Web UI & Documentation Dashboard | Vercel / Cloudflare Pages | **Proxied (ON)** |
| `api.galx.ai` | Edge API Gateway (`/v1/*`) | Cloudflare Worker (`galxai-edge-gateway`) | **Proxied (ON)** |
| `assets.galx.ai` | Multimodal Media CDN | Cloudflare R2 Bucket (`galxai-assets`) | **Proxied (ON)** |
| `db.galx.ai` | Database Routing (Optional CNAME) | Supabase Connection Pooler | **DNS Only (OFF)** |

---

## 4. Step-by-Step Setup & Provisioning Guide

### Step 1: Install Wrangler & Authenticate
```bash
# Verify Wrangler CLI is installed
npx wrangler --version

# Log in to your Cloudflare account
npx wrangler login
```

### Step 2: Create Cloudflare R2 Storage Bucket
```bash
# Create the asset storage bucket
npx wrangler r2 bucket create galxai-assets

# (Optional) Create staging asset bucket
npx wrangler r2 bucket create galxai-assets-staging
```
*In the Cloudflare Dashboard*: Go to **R2 > galxai-assets > Settings > Custom Domains** and connect `assets.galx.ai`.

### Step 3: Create Cloudflare KV Namespaces
```bash
# Rate limiting KV
npx wrangler kv:namespace create RATE_LIMIT_KV
npx wrangler kv:namespace create RATE_LIMIT_KV --preview

# Edge cache KV
npx wrangler kv:namespace create EDGE_CACHE_KV
npx wrangler kv:namespace create EDGE_CACHE_KV --preview
```
*Note the returned namespace IDs and paste them into `wrangler.toml`.*

### Step 4: Configure Cloudflare Hyperdrive to Supabase
```bash
# Create Hyperdrive connection to Supabase PostgreSQL pooler
npx wrangler hyperdrive create galxai-hyperdrive-pool \
  --connection-string="postgresql://postgres.[YOUR_PROJECT]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```
*Note the returned Hyperdrive ID and paste it into `wrangler.toml`.*

### Step 5: Configure Production Secrets
Inject sensitive credentials directly into Cloudflare's encrypted vault:
```bash
# Supabase credentials for Worker Edge execution
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# GALXAI Master Cryptographic Key (32+ chars)
npx wrangler secret put GALX_VAULT_MASTER_SECRET

# Fallback root API keys for provider shards
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put XAI_API_KEY
```

### Step 6: Deploy Edge Worker Fleet
```bash
# Deploy to production
npx wrangler deploy

# Or deploy to staging environment
npx wrangler deploy --env staging
```

---

## 5. Production `wrangler.toml` Specification

```toml
name = "galxai-edge-gateway"
main = "src/workers/cloudflare/index.ts"
compatibility_date = "2026-08-22"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
SUPABASE_URL = "https://your-project.supabase.co"
PUBLIC_ASSETS_URL = "https://assets.galx.ai"

# Hyperdrive Connection Accelerator to Supabase PostgreSQL (0 connection overhead)
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<YOUR_HYPERDRIVE_ID>"

# Cloudflare KV for edge rate limiting cache
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<YOUR_RATE_LIMIT_KV_ID>"

[[kv_namespaces]]
binding = "EDGE_CACHE"
id = "<YOUR_EDGE_CACHE_KV_ID>"

# Cloudflare R2 Bucket for multimodal image & audio storage
[[r2_buckets]]
binding = "ASSET_BUCKET"
bucket_name = "galxai-assets"

# Cloudflare Durable Objects for Agent Swarm Coordination
[durable_objects]
bindings = [
  { name = "SWARM_COORDINATOR", class_name = "GalxSwarmCoordinatorDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["GalxSwarmCoordinatorDO"]

# Automated Cron Triggers for background worker queue polling (every minute)
[triggers]
crons = ["* * * * *"]

# Staging Environment Overrides
[env.staging]
name = "galxai-edge-gateway-staging"
vars = { ENVIRONMENT = "staging", SUPABASE_URL = "https://your-staging-project.supabase.co" }
```

---

## 6. Security, WAF & Turnstile Configuration

### Cloudflare WAF Custom Rules (Security > WAF > Custom Rules)

1. **Rule 1: Rate Limiting on `/v1/chat/completions`**
   - **Criteria**: `(http.request.uri.path eq "/v1/chat/completions")`
   - **Action**: Rate Limit (e.g., 600 requests per minute per IP / API Key header)
   - **Response**: HTTP 429 JSON `{ "error": { "message": "Rate limit exceeded. Please upgrade or back off.", "code": "rate_limit_exceeded" } }`

2. **Rule 2: Restrict Sensitive Endpoints to Internal IP / Admin Token**
   - **Criteria**: `(http.request.uri.path contains "/api/compliance" or http.request.uri.path contains "/api/shards") and not (ip.src in { <OFFICE_IPS> })`
   - **Action**: Managed Challenge / Block

3. **Rule 3: Cloudflare Turnstile Verification on Auth Routes**
   - Place Turnstile widget on `/login`, `/register`, and `/wallet/deposit` to defeat automated credential-stuffing and payment fraud.

---

## 7. CI/CD GitHub Actions Workflow (`.github/workflows/deploy-cloudflare.yml`)

```yaml
name: Deploy Cloudflare Edge Mesh

on:
  push:
    branches:
      - main
    paths:
      - 'src/workers/cloudflare/**'
      - 'wrangler.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy Edge Gateway
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## 8. Verification & Operational Testing Matrix

| Component | Verification Command / URL | Expected Result |
| :--- | :--- | :--- |
| **Edge Gateway Health** | `curl -i https://api.galx.ai/health` | `HTTP 200 { status: 'healthy', edgePoP: '...' }` |
| **Model Catalog (Cached)** | `curl -i https://api.galx.ai/v1/models -H "Authorization: Bearer galx_test_..."` | `HTTP 200 { object: 'list', data: [...] }` |
| **Zero-Egress SSE Stream** | `curl -N -X POST https://api.galx.ai/v1/chat/completions -H "Authorization: Bearer galx_live_..." -H "Content-Type: application/json" -d '{"model":"gpt-5.6-sol","messages":[{"role":"user","content":"Ping"}],"stream":true}'` | Immediate chunked SSE streaming (`data: {...}`) with $<25\text{ms}$ TTFT |
| **Browser Direct GET Query** | `curl -i "https://api.galx.ai/v1/chat/completions?prompt=Ping&model=sol&api_key=galx_live_..."` | `HTTP 200` with JSON completion or SSE stream |
| **Ollama Native Protocol** | `curl -i -X POST https://api.galx.ai/api/generate -H "Authorization: Bearer galx_live_..." -d '{"model":"sol","prompt":"Ping"}'` | `HTTP 200` with streaming NDJSON chunks and `done: true` |
| **R2 Asset CDN** | `curl -i https://assets.galx.ai/generations/test.webp` | `HTTP 200` with `CF-Cache-Status: HIT` |
| **BroccoliDB Edge Compaction** | `curl -X POST https://api.galx.ai/api/audit/broccolidb/compact -H "Authorization: Bearer galx_live_..." -H "Content-Type: application/json" -d '{"mode":"log_stream","logs":["..."]}'` | `HTTP 200` with compacted text and token savings metadata |
| **Scheduled Worker Queue** | `npx wrangler tail` | Scheduled cron event executing `processBatch('default', 25)` without uncaught exceptions |


