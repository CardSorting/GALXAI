# ADR 0048: Interactive Developer Studio Tools, Client-Side Simulators & Memory-Isolated Utilities

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (2026-08-23)

## Context
Developers evaluating AI gateways require immediate, zero-friction utilities to model financial ROI, test API key formats, build complex function calling schemas, and inspect token encodings. Static text and marketing pages fail to build active developer engagement. Key challenges included:
1. **API Key Security in Testers**: Sending third-party API keys to a remote backend for testing creates severe security risks and user hesitation.
2. **Schema Complexity in Tool Definitions**: Manually constructing OpenAI JSON Schema tool definitions is error-prone, leading to invalid schema runtime crashes.
3. **BPE Tokenization Invisibility**: Developers cannot easily inspect how prompt words are split into subword tokens across different tokenizer encodings (`cl100k_base` vs `o200k_base`).
4. **Pricing Opacity**: Calculating prompt caching discounts, output token multipliers, and vector embedding footprints across multiple providers requires complex multi-variable calculations.

---

## Decision

We implement a dedicated suite of 9 interactive, client-side developer studio tools in `src/components/tools/` and `src/app/tools/`:

```
+----------------------------------------------------------------------------------------------------+
|                                    GALXAI INTERACTIVE TOOLS SUITE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  1. FINANCIAL & TOKEN MODELING ENGINES                                                             |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|     | /calculator               |   | /tools/prompt-caching     |   | /tools/embeddings         |  |
|     | Multi-Model ROI Sliders   |   | Prefix Length & Savings   |   | RAM/NVMe Vector Estimator |  |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|                                                                                                    |
|  2. COMPRESSION & SCHEMA STUDIOS                                                                   |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|     | /tools/prompt-compressor  |   | /tools/json-schema        |   | /tools/function-calling   |  |
|     | Semicolon Compaction      |   | Visual Schema to Zod/Py   |   | Tool Definition & Loop    |  |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|                                                                                                    |
|  3. INSPECTION & VALIDATION SUITES                                                                 |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|     | /tools/api-key-checker    |   | /tools/token-counter      |   | /tools/model-cost         |  |
|     | 100% Client-Side Entropy  |   | BPE Subword Colorizer     |   | Side-by-Side Invoices     |  |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### 1. 100% Client-Side Memory Isolation (`/tools/api-key-checker`)
- Format regex validation (`galx_live_[a-zA-Z0-9]{32}` and `sk-[a-zA-Z0-9]{48}`).
- Shannon entropy score calculation (bits per byte) performed entirely in client JavaScript.
- Network transmission is 100% zero; key never leaves local browser memory.

### 2. Visual Function Calling & Tool Definition Studio (`/tools/function-calling-builder`)
- Visual UI for adding typed parameters (`string`, `number`, `boolean`, `array[string]`, `enum`).
- Live dual-generator output: OpenAI JSON tools array, Python typed function definition, and TypeScript agent loop.
- 1-click clipboard copy and dispatch runner.

### 3. Byte-Pair Encoding (BPE) Subword Inspector (`/tools/token-counter`)
- Heuristic subword slicing highlighting individual token boundaries in distinct pastel color badges.
- Dynamic comparison between `o200k_base` (GPT-5.6 / Grok) and `cl100k_base` (legacy).
- Real-time token count, character count, word count, and UTF-8 byte metrics.

### 4. Vector DB & Embeddings Storage Calculator (`/tools/embeddings-calculator`)
- Models total token consumption, RAM footprint in GB, and wholesale embedding savings ($0.020/1M vs direct $0.030/1M).
- Generates Python & TypeScript vector batching integration snippets.

### 5. Multi-Model Cost Comparator (`/tools/model-cost-comparator`)
- Sliders for monthly input tokens, output tokens, and cache hit percentage.
- Side-by-side calculation of GALXAI wholesale invoices vs direct retail provider rates.

---

## Consequences

### Positive
- **Instant Interactive Engagement**: Zero-latency interactive feedback for developers without needing an active account.
- **Conversion Pathways**: Every tool features 1-click active developer key provisioning (`/keys/new`) and code copy.
- **Rich Schema.org `WebApplication`**: Search engines recognize each tool as a functional web utility with rich snippets.

### Neutral
- Client components require initial React hydration (~4.5kB to 7.6kB per tool).
- Kept lightweight with pure CSS and zero heavy third-party plotting libraries.
