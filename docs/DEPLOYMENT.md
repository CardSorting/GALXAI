# 🚀 GALXAI Production Deployment & Infrastructure Guide

GALXAI employs an enterprise multi-tier deployment architecture designed for high availability, zero egress costs, and cryptographic isolation:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              Global Ingress (DNS)                              │
└───────────────────────┬────────────────────────────────┬───────────────────────┘
                        │                                │
                 (galx.ai / Web)                 (api.galx.ai / API)
                        │                                │
                        ▼                                ▼
       ┌─────────────────────────────────┐     ┌─────────────────────────────────┐
       │        Vercel Deployment        │     │    Cloudflare Workers Edge      │
       │   - Next.js 15 App Router       │     │   - Global Edge Mesh Gateway    │
       │   - Serverless APIs & OG Edge   │     │   - Zero-Egress Token Streaming │
       │   - Multi-Region (sfo1, iad1)   │     │   - R2 CDN (assets.galx.ai)     │
       └────────────────┬────────────────┘     └────────────────┬────────────────┘
                        │                                       │
                        └───────────────────┬───────────────────┘
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │           Supabase PostgreSQL           │
                       │   - Transaction Pooler (Port 6543)      │
                       │   - AES-256-GCM Credential Vault        │
                       │   - Task Queues & Merkle Ledgers        │
                       └─────────────────────────────────────────┘
```

---

## 1. Multi-Target Deployment Matrix

| Target | Components Deployed | Deployment Guide | Primary Commands |
| :--- | :--- | :--- | :--- |
| **Vercel** | Next.js 15 Web, Serverless APIs, OG Images | **[Vercel Guide](VERCEL_DEPLOYMENT.md)** | `npm run deploy:check`<br>`npx vercel --prod` |
| **Cloudflare** | Edge Gateway, Model Router, R2 CDN (`assets.galx.ai`) | **[Cloudflare Guide](CLOUDFLARE_STRATEGY.md)** | `npm run worker:deploy`<br>`npm run worker:test` |
| **Docker / K8s** | Self-Hosted Gateway Container, Standalone Node runner | *(Detailed below)* | `docker build -t galxai .`<br>`docker compose up -d` |

---

## 2. Environment Secrets Matrix

| Variable | Target | Required | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Vercel, Docker | **Yes** | Web platform canonical URL (`https://galx.ai`). |
| `NEXT_PUBLIC_SUPABASE_URL` | All | **Yes** | Supabase project HTTPS endpoint (`https://mazhcjisettrzbqhorvp.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | **Yes** | Client-safe anonymous publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, Workers | **Yes** | Privileged service key for serverless endpoints. *(Keep Secret)* |
| `DATABASE_URL` | Vercel, Docker | **Yes** | Transaction Pooler URI (`aws-0-us-east-1.pooler.supabase.com:6543`). |
| `GALX_VAULT_MASTER_SECRET` | All | **Yes** | 32-byte master cryptographic key for HKDF-SHA256 & AES-256-GCM. |
| `GALX_VAULT_ACTIVE_KEY_VERSION` | All | **Yes** | Active cryptographic key version (`v1`). |
| `NEXT_PUBLIC_GALX_EDGE_URL` | All | Optional | Cloudflare edge gateway URL (`https://api.galx.ai`). |
| `PUBLIC_ASSETS_URL` | All | Optional | Multimodal R2 CDN URL (`https://assets.galx.ai`). |

---

## 3. Vercel Pre-Deployment & Production Workflow

### Automated Verification & Deployment Workflow
```bash
# 1. Run the unified 8-Phase Pre-Flight Audit & Next.js 15 build gate
npm run deploy:check

# 2. Inspect / synchronize Vercel environment variables
npm run vercel:env:print   # Inspect masked variables
npm run vercel:env:sync    # Push variables to Vercel project

# 3. Deploy to Vercel (Preview or Production)
npm run vercel:deploy      # Deploy preview
npm run vercel:deploy:prod # Deploy production

# 4. Run automated 12-point live post-deployment smoke test suite
npm run vercel:smoke -- --url=https://galx.ai
```

See **[`docs/VERCEL_DEPLOYMENT.md`](VERCEL_DEPLOYMENT.md)** for full DNS, header, and multi-region details.

---

## 4. Cloudflare Edge Mesh Deployment

```bash
# 1. Run the 46-point edge verification test suite
npm run worker:test

# 2. Deploy to Cloudflare staging environment
npm run worker:deploy:staging

# 3. Deploy to Cloudflare production edge mesh
npm run worker:deploy
```

See **[`docs/CLOUDFLARE_STRATEGY.md`](CLOUDFLARE_STRATEGY.md)** for Custom Domain and R2 CDN bindings.

---

## 5. Docker & Containerized Self-Hosting

### Multi-Stage Production Build
```bash
# Build optimized Docker runner image
docker build -t galxai:latest .

# Run container with environment configuration
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_APP_URL="https://galx.ai" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://mazhcjisettrzbqhorvp.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..." \
  -e DATABASE_URL="postgres://..." \
  -e GALX_VAULT_MASTER_SECRET="your-32-byte-secret" \
  -v galx_data:/app/.data \
  --name galxai-gateway \
  galxai:latest
```

### Docker Compose
```yaml
version: '3.8'

services:
  galxai:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: galxai-gateway
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - GALX_VAULT_MASTER_SECRET=${GALX_VAULT_MASTER_SECRET}
      - GALX_VAULT_KEY=${GALX_VAULT_KEY}
      - GALX_VAULT_ACTIVE_KEY_VERSION=v1
    volumes:
      - galx_data:/app/.data

volumes:
  galx_data:
```

---

## 6. Kubernetes Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: galxai-gateway
  namespace: default
  labels:
    app: galxai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: galxai
  template:
    metadata:
      labels:
        app: galxai
    spec:
      containers:
        - name: gateway
          image: galxai:latest
          ports:
            - containerPort: 3000
          env:
            - name: GALX_VAULT_MASTER_SECRET
              valueFrom:
                secretKeyRef:
                  name: galxai-secrets
                  key: vault-master-secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: galxai-secrets
                  key: database-url
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2048Mi"
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
```
