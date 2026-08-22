# 🚀 GALXAI Production Deployment & Infrastructure Guide

This guide covers production containerization, environment configuration, Kubernetes manifests, and high-availability deployment patterns.

---

## 1. Environment Variables Configuration

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GALX_MASTER_SECRET_KEY` | **Yes** | — | 32+ character master cryptographic key for AES-256-GCM vault envelope derivation. |
| `NODE_ENV` | Optional | `production` | Node.js execution environment (`production` or `development`). |
| `PORT` | Optional | `3000` | HTTP port on which the gateway listens. |
| `OPENAI_API_KEY` | Optional | — | Initial fallback root seed credential for OpenAI pool shards. |
| `XAI_API_KEY` | Optional | — | Initial fallback root seed credential for xAI Grok pool shards. |

---

## 2. Docker Deployment

### Minimal Multi-Stage `Dockerfile`
A production `Dockerfile` is provided in the repository root:

```bash
# Build Docker image
docker build -t galxai:latest .

# Run container with persistent .data volume
docker run -d \
  -p 3000:3000 \
  -e GALX_MASTER_SECRET_KEY="your-secure-32-byte-master-key-here" \
  -v galx_data:/app/.data \
  --name galxai-gateway \
  galxai:latest
```

---

## 3. Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  galxai:
    build: .
    container_name: galxai-gateway
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GALX_MASTER_SECRET_KEY=${GALX_MASTER_SECRET_KEY}
    volumes:
      - galx_data:/app/.data

volumes:
  galx_data:
```

---

## 4. Kubernetes Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: galxai-gateway
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
            - name: GALX_MASTER_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: galxai-secrets
                  key: master-key
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2048Mi"
          readinessProbe:
            httpGet:
              path: /api/pool/stats
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/pool/stats
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: galxai-service
spec:
  type: LoadBalancer
  selector:
    app: galxai
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
```

---

## 5. Security & Hardening Checklist

- [x] **Master Key Entropy**: `GALX_MASTER_SECRET_KEY` generated using `openssl rand -hex 32`.
- [x] **Ephemeral RAM**: Zero plaintext secrets stored on disk; buffers cleared immediately via `zeroizeBuffer`.
- [x] **HTTPS/TLS**: Reverse proxy (Nginx, Cloudflare, Traefik, AWS ALB) terminates TLS 1.3 in front of container instances.
- [x] **Health Check Routing**: Ingress probes target `/api/pool/stats` with $< 5\text{ms}$ readiness latency.
