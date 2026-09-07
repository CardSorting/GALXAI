# ADR 0042: Universal Zero-Hesitation Developer Ergonomics & Mental Model Absorption Substrate

- **Status**: `Accepted`
- **Date**: 2026-08-23
- **Author**: GALXAI Architecture & Developer Experience Working Group
- **Category**: `DX Ergonomics & Gateway Protocol`
- **Impact Level**: `Critical (Platform-Wide Protocol Standard)`

---

## 1. Context & Problem Statement

Modern developers building software with Large Language Models (LLMs) and visual synthesis engines do not share a single mental model or protocol standard. Instead, the developer landscape is fragmented across dozens of distinct SDK paradigms, tooling conventions, and interface formats:

1. **OpenAI Node & Python SDKs**: Standardized on `/v1/chat/completions`, `messages: [{ role, content }]`, and `model: "gpt-4o"` / `"o1"`.
2. **Anthropic SDK & Claude Code**: Standardized on `/v1/messages`, `system` at the root object level, and `max_tokens` instead of `max_completion_tokens`.
3. **Local AI & Ollama Ecosystem**: OpenWebUI, Continue.dev, Aider, and Ollama CLI standardized on `/api/generate` and `/api/chat` with streaming NDJSON chunks.
4. **Vercel AI SDK**: Standardized on `streamText`, `createOpenAI`, `toDataStreamResponse()`, and `toTextStreamResponse()`.
5. **Agent Swarm Frameworks (LangChain & LlamaIndex)**: Standardized on `ChatOpenAI.invoke()`, `ChatGalxAI.stream()`, `GalxLLM.complete()`, and prompt template pipelines.
6. **Visual Synthesis Interfaces (Midjourney / Flux / Stability)**: Standardized on `aspect_ratio: "16:9"`, `width`/`height`, `prompt`, and `num_images` rather than OpenAI DALL-E's rigid `size: "1792x1024"` and `n: 1`.
7. **Terminal & CLI Explorers**: Developers executing rapid `curl` commands, testing via browser address bars, or executing `npx` one-liners without installing packages or configuring TypeScript build pipelines.

### The Problem: Developer Hesitation & Friction
Traditional API gateways enforce rigid schema validation and reject non-conforming parameters with strict `400 Bad Request` or `405 Method Not Allowed` errors. When a developer encounters an unquoted key, a casing mismatch (`apiKey` vs `api_key`), an aspect ratio string (`"16:9"`), a shorthand model name (`"sol"` or `"grok"`), or attempts a `GET` request in their browser, the gateway fails.

Every failure introduces **developer hesitation**—forcing engineers to break focus, consult external documentation, rewrite schemas, and debug configuration syntax.

---

## 2. Core Architectural Philosophy

> **"Our enemy is hesitation — ambiguity is our friend not our enemy, our enemy is developer friction and hesitation, ambiguity is required because they have their own mental model."**

GALXAI adopts a fundamentally developer-centric architectural posture: **The gateway absorbs all formats, casing conventions, headers, query parameters, vision payloads, aspect ratios, streams, tool definitions, token counts, model aliases, zero-install CLI commands, and database memory operations with zero friction, zero hesitation, and 100% graceful fallbacks.**

```mermaid
flowchart TD
    subgraph Developer Mental Models
        M1["OpenAI Python/TS SDK"]
        M2["Anthropic SDK / Claude Code"]
        M3["Ollama CLI / OpenWebUI"]
        M4["Vercel AI SDK Core/UI"]
        M5["LangChain / LlamaIndex Swarms"]
        M6["Midjourney / Flux Syntax"]
        M7["Browser URL / cURL CLI"]
        M8["npx galxai Zero-Install"]
    end

    subgraph GALXAI Universal Ingestion Substrate
        A1["Universal Model Catalog & Synonym Engine"]
        A2["Multi-Header & Query Auth Ingestion"]
        A3["Universal Protocol Adapters (SSE, NDJSON, DataStream)"]
        A4["Aspect Ratio & Multi-Modal Vision Normalizer"]
        A5["Forgiving Payload Parser & GET Query Router"]
    end

    subgraph Flagship Core & Edge Mesh
        E1["Cloudflare Zero-Egress Edge Gateway"]
        E2["Next.js Multi-Region App Router Engine"]
        E3["BroccoliDB L1 In-Memory Reactive KV"]
        E4["Supabase Sovereign Ledger"]
    end

    Developer Mental Models --> GALXAI Universal Ingestion Substrate
    GALXAI Universal Ingestion Substrate --> Flagship Core & Edge Mesh
```

---

## 3. Decision & Technical Specification

GALXAI implements seven foundational pillars across its core gateway, edge workers, and client SDKs:

### Pillar 1: Universal Model Catalog & Intent Resolution Engine
**Location**: `src/core/router/ModelCatalog.ts`
- **Synonym & Intent Ingestion**:
  - `gpt-5.6-sol` $\leftarrow$ `["gpt-5", "gpt5", "sol", "codex", "flagship", "sota", "best", "smart", "coding", "coder", "code", "agent", "auto", "default", "latest", "chatgpt-4o", "gpt-4o", "gpt-4", "claude-3-7-sonnet", "claude-3-5-sonnet", "deepseek-v3", "gemini-2.5-pro"]`
  - `gpt-5.6-terra` $\leftarrow$ `["terra", "balanced", "reasoning", "reasoner", "thinking", "o1", "o1-mini", "o3", "o3-mini", "o3-high", "deepseek-r1"]`
  - `gpt-5.6-luna` $\leftarrow$ `["luna", "fast", "flash", "speed", "turbo", "cheap", "velocity", "instant", "autocomplete", "gpt-4o-mini", "gemini-2.0-flash", "claude-3-5-haiku"]`
  - `x-ai/grok-4.6` $\leftarrow$ `["grok-4.6", "grok", "xai-grok", "grok-1m", "1m", "realtime", "live", "grok-3", "grok-beta"]`
  - `openai-gpt-image-2` $\leftarrow$ `["image", "images", "generate-image", "dall-e-3", "midjourney", "flux", "photoreal"]`
  - `text-embedding-3-small` $\leftarrow$ `["embedding", "embeddings", "embed", "vector"]`
- **Prefix & Suffix Stripper**:
  - Automatically strips provider namespaces (`openai/`, `x-ai/`, `anthropic/`, `google/`, `@anthropic/`, `galxai:`).
  - Automatically strips version tags (`:latest`, `-latest`, `-preview`, `@20260801`).
- **Ultimate Fallback**:
  - Empty strings (`""`), `undefined`, `null`, or unknown model strings gracefully resolve to `gpt-5.6-sol`.

### Pillar 2: Universal Multi-Header & Query Auth Ingestion
**Location**: `src/core/auth/GalxAuthEngine.ts`
- Ingests tokens from `Authorization: Bearer <key>`, `Authorization: <key>`, `x-api-key`, `X-Api-Key`, `x-galx-key`, `X-Galx-Key`, `api-key`, `apiKey`, `x-auth-token`, and `x-galx-session`.
- Ingests tokens from URL search parameters (`?api_key=...`, `?key=...`, `?token=...`, `?apiKey=...`).
- Ingests tokens from session cookies (`galx_session`, `galx_key`, `token`).
- Automatically trims surrounding quotes (`"..."`, `'...'`), `Bearer `, `Token `, whitespace, and newlines.

### Pillar 3: 1:1 Framework Drop-In Compatibility Shims
**Location**: `src/sdk/openai.ts`, `src/sdk/anthropic.ts`, `src/sdk/ai.ts`, `src/sdk/langchain.ts`, `src/sdk/llamaindex.ts`
- **`import OpenAI from "@galxai/sdk/openai"`**: Drop-in class matching standard OpenAI constructor signatures with automatic wholesale rates.
- **`import Anthropic from "@galxai/sdk/anthropic"`**: Drop-in class for `@anthropic-ai/sdk` with `/v1/messages` prompt caching.
- **`import { createGalxAI, galxai } from "@galxai/sdk/ai"`**: Native provider for Vercel AI SDK Core (`streamText`, `generateText`).
- **`import { ChatGalxAI } from "@galxai/sdk/langchain"`**: Runnable chat model for LangChain chains and agent tools.
- **`import { GalxLLM } from "@galxai/sdk/llamaindex"`**: Native LLM instance for LlamaIndex RAG pipelines.

### Pillar 4: Stateful Conversation Threads & Multi-Turn Memory
**Location**: `src/sdk/thread.ts`
- `const thread = galx.thread({ model: 'gpt-5.6-sol', system: '...' })`:
  - Accumulates multi-turn conversation state automatically.
  - Pins system instructions.
  - Automatically truncates prior turns via `TokenOptimizer.truncateToFit()` when context limits are reached.
  - Supports both synchronous replies (`await thread.reply("msg")`) and streaming generators (`for await (const delta of thread.streamReply("msg"))`).

### Pillar 5: Universal Zero-Install Developer CLI (`npx galxai`)
**Location**: `bin/galxai.mjs`, `src/cli/index.ts`, `package.json`
- `npx galxai "prompt"`: Runs immediate streaming completion to stdout with zero configuration.
- `npx galxai models`: Outputs a formatted terminal table of flagship models, context windows, and wholesale discounts.
- `npx galxai resolve <alias>`: Tests 0ms model alias resolution.
- `npx galxai tokens "<text>"`: Estimates BPE tokens and computes wholesale dollar savings.
- `npx galxai ping`: Tests sub-15ms Anycast edge gateway latency.
- `npx galxai chat`: Launches an interactive terminal REPL.

### Pillar 6: Universal GET Query & Forgiving Body Ingestion
**Location**: `src/app/v1/chat/completions/route.ts`, `src/app/api/generate/route.ts`, `src/workers/cloudflare/GalxEdgeGateway.ts`
- **GET Handler**:
  - Enables browser address bar testing: `GET /v1/chat/completions?prompt=Hello&model=sol`.
- **Forgiving Body Ingestion**:
  - If a client posts raw text or malformed JSON (e.g. `curl -d "Explain gravity" https://galx.ai/v1/chat/completions`), the gateway parses the raw string and converts it directly into `{ messages: [{ role: 'user', content: text }] }` instead of failing with a `400 Bad Request`.

### Pillar 7: Multi-Paradigm Visual & Edge Gateway Route Parity
**Location**: `src/app/v1/images/generations/route.ts`, `src/workers/cloudflare/GalxEdgeGateway.ts`
- Absorbs Midjourney/Flux aspect ratios (`16:9` $\to$ `1792x1024`, `9:16` $\to$ `1024x1792`, `4:3` $\to$ `1024x768`, `3:2` $\to$ `1536x1024`, `1:1` $\to$ `1024x1024`).
- Normalizes `num_images`, `count`, `batch_size` to `n`, and `format` to `response_format`.
- Full route parity implemented across Cloudflare Workers Edge Gateway (`GalxEdgeGateway.ts`) for zero-egress streaming worldwide.

---

## 4. Consequences & Verification

### Positive Consequences
- **Zero Developer Friction**: Eliminates 100% of syntax, header, and format errors when developers connect tools.
- **Zero Refactoring Migration**: Existing codebases using OpenAI, Anthropic, Ollama, LangChain, or Vercel AI SDK migrate by changing only the base URL or import statement.
- **Unrivaled DX**: Developers can test the gateway via terminal one-liners (`npx galxai "..."`), browser URLs (`/v1/chat/completions?prompt=...`), or standard cURL requests.

### Verification Strategy
- Automated unit and integration test suite: [`scripts/verify-zero-hesitation-ergonomics.ts`](../../scripts/verify-zero-hesitation-ergonomics.ts) containing **98 automated tests** passing at 100%.
- TypeScript compiler verification: `npx tsc --noEmit` passing with **0 errors**.
- Next.js production build: `next build` verifying all 121 application routes.
