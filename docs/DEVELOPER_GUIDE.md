# 🛠️ GALXAI Developer & Contributing Guide

This guide covers the internal codebase structure, architectural layers, how to add new model adapters, and testing standards.

---

## 📁 Repository Structure

```text
GALXAI/
├── docs/                             # Comprehensive Architecture & API Documentation
│   ├── adr/                          # Architecture Decision Records (0001-0005)
│   ├── ARCHITECTURE.md               # System overview, lifecycle, and security model
│   ├── API_REFERENCE.md              # REST API endpoint specifications
│   ├── QUICKSTART.md                 # Python, Node.js, Cursor, Continue setup
│   ├── ROUTING_ALGORITHMS.md         # Mathematical derivations of P-AHT, SWRR, WLC
│   ├── SECURITY.md                   # Envelope cryptography and threat model
│   ├── DEVELOPER_GUIDE.md            # Contributing guide and adapter development
│   └── TROUBLESHOOTING.md            # Error classification and operational playbooks
├── scripts/
│   └── validate-galxai-router.ts     # 27-suite forensic verification test runner
├── src/
│   ├── app/                          # Next.js App Router (49 routes)
│   │   ├── api/                      # Gateway admin & pool management API routes
│   │   ├── v1/                       # OpenAI-compatible public API routes
│   │   │   ├── chat/completions/
│   │   │   ├── images/generations/
│   │   │   └── models/
│   │   ├── docs/                     # In-app interactive documentation pages
│   │   ├── keys/                     # Developer Gateway Key management
│   │   ├── models/                   # Model explorer and comparator
│   │   ├── playground/               # Interactive real-time test environment
│   │   ├── pricing/                  # Live pricing matrix & calculator
│   │   ├── telemetry/                # Live histogram latency feed
│   │   └── vault/                    # Credential deposit and simulator
│   ├── components/                   # React UI Components
│   ├── core/                         # Pure TypeScript Gateway Engine (zero React dependencies)
│   │   ├── circuit/                  # 4-State Circuit Breaker with Canary Warming
│   │   ├── contracts/                # Core TypeScript contracts and interfaces
│   │   ├── governor/                 # Continuous Token-Bucket Calculus Governor
│   │   ├── pool/                     # Adaptive Hydraulic Headroom (P-AHT) Pool Engine
│   │   ├── router/                   # Universal Model Router & Adapter Pipeline
│   │   │   └── adapters/             # Provider-specific execution adapters (OpenAI, Grok)
│   │   ├── substrate/                # In-memory shard cache & persistent storage bridge
│   │   ├── telemetry/                # Circular Ring Buffer Histogram Metrics Engine
│   │   ├── validator/                # Preflight key format & upstream validator
│   │   └── vault/                    # AES-256-GCM Envelope Encryption with AAD
│   └── lib/                          # Storage helpers and utility functions
└── README.md                         # Project overview and quickstart
```

---

## 🔌 Adding a New Provider Adapter

To add support for a new provider (e.g. Anthropic or Mistral):

1. **Define the Provider Contract**:
   Update `ProviderType` in `src/core/contracts/GalxContracts.ts`:
   ```typescript
   export type ProviderType = 'openai' | 'xai-grok' | 'anthropic';
   ```

2. **Implement Provider Adapter**:
   Create `src/core/router/adapters/AnthropicAdapter.ts`:
   ```typescript
   export class AnthropicAdapter {
     static async executeChatCompletion(
       req: ChatCompletionRequest,
       secret: DecryptedGalxSecret,
       modelSpec: ModelSpecItem
     ): Promise<{ response: Response; headers: Record<string, string> }> {
       // Upstream fetch logic and response header extraction
     }
   }
   ```

3. **Register Models in Model Catalog**:
   Add model definitions in `src/core/router/ModelCatalog.ts`:
   ```typescript
   {
     id: 'claude-3.7-sonnet',
     upstreamId: 'claude-3-7-sonnet-20250219',
     name: 'Claude 3.7 Sonnet',
     provider: 'anthropic',
     category: 'llm',
     contextWindowTokens: 200000,
     maxOutputTokens: 8192,
     inputPricePer1M: 2.25,
     outputPricePer1M: 11.25,
     supportsVision: true,
     supportsReasoning: true,
     supportsStreaming: true,
     description: 'Hybrid reasoning and standard generation model.'
   }
   ```

4. **Wire into Router Dispatcher**:
   Update `src/core/router/GalxModelRouter.ts` inside `routeChatCompletion`.

---

## 🧪 Testing & Verification Standards

GALXAI maintains a **31-suite forensic verification test suite** that exercises every layer of the core substrate without network mocks:

```bash
# Run all 31 automated tests
npm run test:router

# Run Next.js production build verification across all 49 routes
npm run build
```

When contributing code changes, ensure all test suites pass with 0 errors.
