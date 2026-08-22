# 🌌 GALXAI: High-Throughput Universal AI Gateway & Quota Cycling Substrate

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/CardSorting/GALXAI)
[![Forensic Tests](https://img.shields.io/badge/forensic%20tests-27%2F27%20passing-success.svg)](https://github.com/CardSorting/GALXAI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**GALXAI** is an enterprise-grade AI model routing gateway and quota cycling substrate. It unifies distributed API credentials into a pooled compute layer, delivering continuous token headroom, zero-overhead failover, and pricing discounts across flagship reasoning and visual synthesis models.

---

## ⚡ Key Architectural Capabilities

- **🌊 Adaptive Hydraulic Headroom Cycling (P-AHT)**: Continuously evaluates live token capacity, concurrency load ratios, circuit breaker canary multipliers, and EWMA latency to cycle requests smoothly across pooled upstream credentials.
- **🔄 Smooth Weighted Round-Robin (SWRR)**: Implements Envoy/Nginx-grade smooth interleaving with dynamic reliability weights to eliminate burst clumping.
- **🛡️ 2-Phase Atomic Token Reservation**: Soft-locks estimated quota upon lease acquisition and commits actual consumption upon request completion, eliminating concurrent over-allocation stampedes.
- **⚡ 4-State Resilient Circuit Breaker**: Distinguishes between permanent credential revocations (401/403 $\to$ instant death) and transient rate limits (429/503 $\to$ exponential backoff with decorrelated jitter and `Retry-After` header parsing).
- **🔒 AES-256-GCM Envelope Encryption with AAD Binding**: Keys and OAuth credentials are cryptographically bound to specific `tenantId` and `shardId` via Additional Authenticated Data (AAD), preventing cross-tenant ciphertext transplantation.
- **🧹 Heap Memory Scrubbing**: Plaintext secrets in RAM are immediately overwritten with zeros (`GalxCryptoVault.zeroizeBuffer`) upon request completion or error.
- **📊 Real-Time Histogram Metrics**: High-throughput circular ring buffer computes sliding-window $P_{50}, P_{90}, P_{99}$ latency, RPM, and TPM without database overhead.

---

## 🚀 Exclusive 12-Model Fleet

GALXAI routes traffic across 12 exclusive flagship LLM and Visual Synthesis engines:

### 🧠 Flagship Reasoning & LLM Engines
| Model ID | Provider | Context Window | Max Output | Input Price / 1M | Output Price / 1M | Discount |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-5.6-sol` | OpenAI | 372,000 | 32,768 | **$2.25** | **$9.00** | **25% OFF** |
| `gpt-5.6-terra` | OpenAI | 186,000 | 16,384 | **$1.15** | **$4.60** | **23% OFF** |
| `gpt-5.6-luna` | OpenAI | 93,000 | 8,192 | **$0.11** | **$0.45** | **27% OFF** |
| `x-ai/grok-4.5` | xAI Grok | 500,000 | 32,768 | **$2.15** | **$8.60** | **28% OFF** |

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

GALXAI exposes a 100% OpenAI-compatible `/v1` endpoint. Simply switch your `baseURL` and authenticate with your GALXAI gateway key.

### Python (OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",  # Or https://api.galx.ai/v1
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
  baseURL: 'http://localhost:3000/v1',
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
curl http://localhost:3000/v1/chat/completions \
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

# Run the 27-suite forensic verification test suite
npm run test:router

# Build the Next.js production bundle (all 49 routes pre-rendered)
npm run build

# Start local high-concurrency dev server
npm run dev
```

---

## 📚 Complete Technical Documentation

- 🏛️ **[System Architecture Specification](docs/ARCHITECTURE.md)**: Deep dive into the request lifecycle, Mermaid sequence flow, streaming safety, and security model.
- 🌊 **[Routing Algorithms & Calculus](docs/ROUTING_ALGORITHMS.md)**: Mathematical derivations of Adaptive Hydraulic Headroom (P-AHT), Smooth Weighted Round-Robin (SWRR), and Least-Utilized.
- 🧠 **[Next-Gen Reasoning Models Guide](docs/REASONING_MODELS_GUIDE.md)**: Developing with `gpt-5.6-sol`, `gpt-5.6-terra`, `x-ai/grok-4.5`, Chain of Thought (CoT), and token budgets.
- ⚡ **[Streaming & SSE Protocol](docs/STREAMING_AND_SSE_PROTOCOL.md)**: Server-Sent Events specification, pure JS stream parser, client disconnects, and zero-leak cancellations.
- 🔬 **[Performance Benchmarks & Stress Analysis](docs/BENCHMARKS.md)**: Concurrency scaling, RPS throughput, P99 latency, and burst resilience.
- 🧠 **[Model Catalog & Modality Specification](docs/MODEL_CATALOG.md)**: Complete profiles and pricing for all 12 reasoning and visual models.
- 💻 **[Multi-Ecosystem SDK Cheatsheet](docs/SDK_CHEATSHEET.md)**: Python, TypeScript, LangChain, LlamaIndex, Instructor, Rust, and Go.
- ⚙️ **[Structured Outputs & Tools Guide](docs/STRUCTURED_OUTPUTS_AND_TOOLS.md)**: Strict JSON Schema and parallel tool calling across reasoning models.
- ⏱️ **[Rate Limits, Concurrency & Quotas](docs/RATE_LIMITS_AND_QUOTAS.md)**: Gateway key tiers, continuous replenishment calculus, and fair-share concurrency limits.
- 🔄 **[Migration Guide](docs/MIGRATION_GUIDE.md)**: Moving from direct OpenAI, xAI, Azure, or OpenRouter with zero code changes.
- 🔒 **[Security & Cryptographic Threat Model](docs/SECURITY.md)**: AAD envelope encryption, memory zeroization, and zero-prompt logging.
- 📊 **[Telemetry, Metrics & Observability](docs/TELEMETRY_AND_OBSERVABILITY.md)**: Prometheus scraping, Datadog integration, and Grafana latency dashboards.
- 📖 **[API Reference](docs/API_REFERENCE.md)**: REST endpoints for chat completions, visual synthesis, model catalog, and pool telemetry.
- 🚀 **[Quickstart & IDE Setup](docs/QUICKSTART.md)**: Drop-in setup for Python, Node.js, LangChain, Cursor IDE, and Continue.
- 🐳 **[Production Deployment & Infrastructure Guide](docs/DEPLOYMENT.md)**: Docker, Docker Compose, Kubernetes manifests, and security checklist.
- 🛠️ **[Developer & Contributing Guide](docs/DEVELOPER_GUIDE.md)**: Architecture layers, adding model adapters, and testing standards.
- 🔧 **[Operational Playbook & Troubleshooting](docs/TROUBLESHOOTING.md)**: Error classifications, rate limit mitigations, and health monitoring.
- ❓ **[Frequently Asked Questions (FAQs)](docs/FAQS.md)**: Common technical, billing, architectural, and security questions.

---

## 📂 Architecture Decision Records (ADRs)

Detailed architectural justifications and technical specifications:
- [ADR 0001: Unified Pooled Quota Cycling Substrate](docs/adr/0001-unified-pooled-quota-cycling-substrate.md)
- [ADR 0002: 2-Phase Token Reservation & Continuous Calculus Rate Governance](docs/adr/0002-two-phase-token-reservation-and-rate-governance.md)
- [ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing](docs/adr/0003-aes-256-gcm-envelope-encryption-with-aad-binding.md)
- [ADR 0004: 4-State Circuit Breaker & Half-Open Canary Traffic Warming](docs/adr/0004-four-state-circuit-breaker-and-failover-topology.md)
- [ADR 0005: Zero-Allocation Circular Ring Buffer Histogram Telemetry & EWMA Latency](docs/adr/0005-circular-buffer-telemetry-and-ewma-latency-scoring.md)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
