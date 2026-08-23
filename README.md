# 🌌 GALXAI: High-Throughput Universal AI Gateway & Quota Cycling Substrate

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/CardSorting/GALXAI)
[![Forensic Tests](https://img.shields.io/badge/forensic%20tests-177%2F177%20passing-success.svg)](https://github.com/CardSorting/GALXAI)
[![Cloudflare Edge Tests](https://img.shields.io/badge/edge%20tests-46%2F46%20passing-success.svg)](https://github.com/CardSorting/GALXAI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**GALXAI** is an enterprise-grade AI model routing gateway and quota cycling substrate. It unifies distributed API credentials into a pooled compute layer, delivering continuous token headroom, zero-overhead failover, and pricing discounts across flagship reasoning and visual synthesis models.

---

## ⚡ Key Architectural Capabilities

- **🌐 Zero-Egress Cloudflare Edge Mesh (`api.galx.ai`)**: Terminates client TLS across 300+ global edge PoPs (<15ms latency), streams SSE token chunks directly to client sockets, and stores visual assets on Cloudflare R2 (`assets.galx.ai`) with **$0 egress fees**.
- **🌊 Predictive Adaptive Hydraulic Headroom Cycling (P-AHT)**: Evaluates post-allocation token capacity, power-law concurrency saturation, dynamic reliability weights, and predictive drain avoidance (`MDA-Floor`) to level allocations across pooled credentials.
- **🌐 Tenant-Affinity Shard Dispersion (TASD)**: Fans multi-request tenant bursts evenly across distinct shards, preventing hot-spotting on single high-capacity accounts.
- **🔄 Smooth Weighted Round-Robin (SWRR)**: Implements Envoy/Nginx-grade smooth interleaving with dynamic reliability weights to eliminate burst clumping.
- **🛡️ 2-Phase Atomic Token Reservation & Scavenger Recovery**: Soft-locks estimated quota upon lease acquisition and commits actual consumption upon request completion. Expired leases automatically recover orphaned soft reservations.
- **⚡ 4-State Resilient Circuit Breaker**: Distinguishes between permanent credential revocations (401/403 $\to$ instant death) and transient rate limits (429/503 $\to$ exponential backoff with decorrelated jitter and `Retry-After` header parsing).
- **🔒 AES-256-GCM Envelope Encryption with AAD Binding**: Keys and OAuth credentials are cryptographically bound to specific `tenantId` and `shardId` via Additional Authenticated Data (AAD), preventing cross-tenant ciphertext transplantation.
- **🧹 Heap Memory Scrubbing & ZDR v10.0**: Plaintext secrets in RAM are immediately overwritten with 2-pass zeroization (`0xAA` -> `0x00`) upon request completion or error.
- **📊 Real-Time Histogram Metrics**: High-throughput circular ring buffer computes sliding-window $P_{50}, P_{90}, P_{99}$ latency, RPM, and TPM without database overhead.

---

## 🚀 Exclusive 12-Model Fleet

GALXAI routes traffic across 12 exclusive flagship LLM and Visual Synthesis engines:

### 🧠 Flagship Reasoning & LLM Engines
| Model ID | Provider | Context Window | Max Output | Input Price / 1M | Output Price / 1M | Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-5.6-sol` | OpenAI | 900,000 | 32,768 | **$2.25** | **$9.00** | **25% OFF** |
| `gpt-5.6-terra` | OpenAI | 900,000 | 16,384 | **$1.15** | **$4.60** | **23% OFF** |
| `gpt-5.6-luna` | OpenAI | 900,000 | 8,192 | **$0.11** | **$0.45** | **27% OFF** |
| `x-ai/grok-4.6` | xAI Grok | 1,000,000 | 128,000 | **$2.10** | **$8.40** | **30% OFF** |
| `x-ai/grok-4.5` | xAI Grok | 500,000 | 32,768 | **$1.80** | **$7.20** | **28% OFF** |

### 🎨 Visual Synthesis Engines
| Model ID | Provider | Resolution | List Price / Img | GALXAI Price / Img | Discount |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `openai-gpt-image-2` | OpenAI | $1024 \times 1024$ | $0.080 | **$0.060** | **25% OFF** |
| `openai-gpt-image-1.5` | OpenAI | $1024 \times 1024$ | $0.060 | **$0.045** | **25% OFF** |
| `openai-gpt-image-1` | OpenAI | $1024 \times 1024$ | $0.040 | **$0.030** | **25% OFF** |
| `openai-gpt4o-image` | OpenAI | $1024 \times 1024$ | $0.050 | **$0.038** | **24% OFF** |
| `openai-dalle-3` | OpenAI | $1024 \times 1024$ | $0.040 | **$0.032** | **20% OFF** |
| `openai-dalle-2` | OpenAI | $512 \times 512$ | $0.020 | **$0.016** | **20% OFF** |
| `xai-grok-image` | xAI Grok | $1024 \times 1024$ | $0.050 | **$0.037** | **26% OFF** |
| `xai-grok-2-image` | xAI Grok | $1024 \times 1024$ | $0.040 | **$0.030** | **25% OFF** |

---

## 💻 Quickstart Integration

GALXAI exposes a 100% OpenAI-compatible `/v1` endpoint. Simply switch your `baseURL` to `https://api.galx.ai/v1` and authenticate with your GALXAI gateway key.

### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key_here"
)

# Stream flagship reasoning completion
stream = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are an elite reasoning assistant."},
        {"role": "user", "content": "Analyze the algorithmic complexity of smooth weighted round-robin scheduling."}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### TypeScript / Node.js
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY || 'galx_live_your_gateway_key_here',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'x-ai/grok-4.5',
    messages: [{ role: 'user', content: 'Design a high-concurrency token bucket rate governor.' }],
  });

  console.log(completion.choices[0].message.content);
}

main();
```

### cURL
```bash
curl https://api.galx.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer galx_live_your_key_here" \
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Explain hydraulic quota cycling."}]
  }'
```

---

## 🛠️ Developer Verification & Build Commands

```bash
# Install dependencies
npm install

# Run the 50-suite forensic verification test runner (177 tests)
npm run test:router

# Run the 46-point Cloudflare Edge verification test runner
npm run worker:test

# Run live SDK-to-Edge smoke tests
npx tsx scripts/test-sdk-edge.ts

# Build the Next.js production bundle
npm run build

# Start local high-concurrency dev server
npm run dev
```

---

## 📚 Complete Technical Documentation

- 🏛️ **[System Architecture Specification](docs/ARCHITECTURE.md)**: Deep dive into the request lifecycle, Mermaid sequence flow, streaming safety, and security model.
- 🌐 **[Cloudflare Strategy & Edge Substrate](docs/CLOUDFLARE_STRATEGY.md)**: Edge compute mesh, R2 CDN, and custom domain routing.
- ⚡ **[Universal Developer SDK Specification](docs/SDK_SPECIFICATION.md)**: Complete guide to `@galxai/sdk`, agents, builders, and vector embeddings.
- 🌊 **[Routing Algorithms & Calculus](docs/ROUTING_ALGORITHMS.md)**: Mathematical derivations of Adaptive Hydraulic Headroom (P-AHT), Smooth Weighted Round-Robin (SWRR), and Least-Utilized.
- 🧠 **[Next-Gen Reasoning Models Guide](docs/REASONING_MODELS_GUIDE.md)**: Developing with `gpt-5.6-sol`, `gpt-5.6-terra`, `x-ai/grok-4.5`, Chain of Thought (CoT), and token budgets.
- ⚡ **[Streaming & SSE Protocol](docs/STREAMING_AND_SSE_PROTOCOL.md)**: Server-Sent Events specification, pure JS stream parser, client disconnects, and zero-leak cancellations.
- 🔬 **[Performance Benchmarks & Stress Analysis](docs/BENCHMARKS.md)**: Concurrency scaling, RPS throughput, P99 latency, and burst resilience.
- 🧠 **[Model Catalog & Modality Specification](docs/MODEL_CATALOG.md)**: Complete profiles and pricing for all 12 reasoning and visual models.
- 💻 **[Multi-Ecosystem SDK Cheatsheet](docs/SDK_CHEATSHEET.md)**: Python, TypeScript, LangChain, LlamaIndex, Instructor, Rust, and Go.
- ⚙️ **[Structured Outputs & Tools Guide](docs/STRUCTURED_OUTPUTS_AND_TOOLS.md)**: Strict JSON Schema and parallel tool calling across reasoning models.
- ⏱️ **[Rate Limits, Concurrency & Quotas](docs/RATE_LIMITS_AND_QUOTAS.md)**: Gateway key tiers, continuous replenishment calculus, and fair-share concurrency limits.
- 🔄 **[Migration Guide](docs/MIGRATION_GUIDE.md)**: Moving from direct OpenAI, xAI, Azure, or OpenRouter with zero code changes.
- 💰 **[Pricing & Multi-Tiered Discount Strategy](docs/PRICING_AND_DISCOUNT_STRATEGY.md)**: 25%–40% base arbitrage discounts, 75% prompt caching pass-through, and zero markups.
- 🚀 **[Go-To-Market (GTM) & Growth Strategy](docs/GTM_STRATEGY.md)**: ICP personas, distribution channels, unit economics, viral loops, and 2026 execution roadmap.
- 💳 **[Compute Wallet & Micro-Billing Architecture](docs/WALLET_AND_BILLING_STRATEGY.md)**: Prepaid bonus packs, auto-reload protection, token micro-metering, and per-key budgets.
- 🔒 **[Security & Cryptographic Threat Model](docs/SECURITY.md)**: AAD envelope encryption, memory zeroization, and zero-prompt logging.
- 📊 **[Telemetry, Metrics & Observability](docs/TELEMETRY_AND_OBSERVABILITY.md)**: Prometheus scraping, Datadog integration, and Grafana latency dashboards.
- 📖 **[API Reference](docs/API_REFERENCE.md)**: REST endpoints for chat completions, vector embeddings, visual synthesis, model catalog, and pool telemetry.
- 🚀 **[Quickstart & IDE Setup](docs/QUICKSTART.md)**: Drop-in setup for Python, Node.js, LangChain, Cursor IDE, and Continue.
- 🐳 **[Production Deployment & Infrastructure Guide](docs/DEPLOYMENT.md)**: Docker, Docker Compose, Kubernetes manifests, and Cloudflare Worker runbooks.
- 🛠️ **[Developer & Contributing Guide](docs/DEVELOPER_GUIDE.md)**: Architecture layers, adding model adapters, and testing standards.
- 🔧 **[Operational Playbook & Troubleshooting](docs/TROUBLESHOOTING.md)**: Error classifications, rate limit mitigations, and health monitoring.
- ❓ **[Frequently Asked Questions (FAQs)](docs/FAQS.md)**: Common technical, billing, architectural, and security questions.

---

## 📂 Architecture Decision Records (ADRs)

Detailed architectural justifications and technical specifications (see [ADR Master Index](docs/adr/README.md)):
- [ADR 0001: Unified Pooled Quota Cycling Substrate](docs/adr/0001-unified-pooled-quota-cycling-substrate.md)
- [ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance](docs/adr/0002-two-phase-token-reservation-and-rate-governance.md)
- [ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing](docs/adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md)
- [ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming](docs/adr/0004-four-state-circuit-breaker-and-failover-topology.md)
- [ADR 0005: Zero-Allocation Circular Ring Buffer Histogram Telemetry & EWMA Latency](docs/adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md)
- [ADR 0006: Intelligent Multi-Tiered Discount & Prompt-Caching Strategy](docs/adr/0006-intelligent-multi-tiered-discount-strategy.md)
- [ADR 0007: Proof-of-Deposit Security Gate & 50% Match Paywall Architecture](docs/adr/0007-proof-of-deposit-and-50pct-match-paywall-gate.md)
- [ADR 0008: Tenant-Affinity Shard Dispersion (TASD) & Post-Allocation Headroom Leveling](docs/adr/0008-tenant-affinity-shard-dispersion-and-post-allocation-leveling.md)
- [ADR 0009: 4-Phase Half-Open Canary Traffic Warming & Background Scavenger](docs/adr/0009-half-open-canary-traffic-warming-and-lease-scavenger.md)
- [ADR 0036: Universal Developer Authentication Gating & Zero-Abuse Workspace Perimeter](docs/adr/0036-universal-developer-authentication-gating-and-zero-abuse-workspace-perimeter.md)
- [ADR 0037: Zero-Egress Cloudflare Edge Gateway, R2 CDN & Custom Domain Substrate](docs/adr/0037-zero-egress-cloudflare-edge-gateway-and-r2-cdn-substrate.md)
- [ADR 0038: Distributed Edge KV Rate Governance & Stale-While-Revalidate Model Catalog Caching](docs/adr/0038-distributed-edge-kv-rate-governance-and-swr-catalog-caching.md)
- [ADR 0039: Edge-Native Vector Embeddings & Durable Object Swarm State Synchronization](docs/adr/0039-edge-native-vector-embeddings-and-durable-object-swarm-sync.md)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
