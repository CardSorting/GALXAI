# ADR 0055: Ambient Declarative AI Substrate, Zero-Route Direct Actions & Runtime Auto-Patcher

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Partially Superseded by ADR 0119** (2026-09-04)

The SDK, Server Actions, middleware, and auto-patcher remain accepted. The first-party `<GalxChat>` browser widget and hosted image studio were retired so GALXAI stays focused on inference infrastructure rather than application-layer creation UI. `<GalxImage />` remains an optional SDK primitive for downstream products, not a GALXAI-hosted studio.

## Context & Problem Statement
Integrating AI generation into modern web and backend applications has historically required extensive glue code:
1. Setting up backend proxy route handlers (`/api/generate`, `/api/chat`, `/api/models`) to protect server credentials.
2. Managing multi-variable client state (`isGenerating`, `error`, `progress`, `imageUrl`, `aspectRatio` calculation, abort signals).
3. Explicitly translating between proprietary model parameters and OpenAI-compatible structures.
4. Manually updating and refactoring legacy codebases that were hardcoded to direct OpenAI or Anthropic endpoints.

Developers needed an ambient connection substrate where AI capabilities feel like native React/Next.js primitives, zero-route RPCs, or transparent global runtime patches with **zero boilerplate**.

## Decision & Architecture

We implement a **6-Tier Zero-Cognition Connection Architecture** in the GALXAI Developer SDK:

```
Tier 1: Declarative JSX Components    -> <GalxImage prompt="..." aspectRatio="16:9" interactive />
Tier 2: Direct React 19 Server Actions -> generateImageAction() with zero API routes
Tier 3: Zero-File Edge Middleware     -> galxaiMiddleware() in middleware.ts
Tier 4: Zero-Migration Auto-Patcher   -> import 'galxai/patch' (in-flight fetch rewrite)
Tier 5: Natural Language Intent Engine -> executeIntent("wide cinematic photo of...")
Tier 6: Universal Polymorphic Client  -> galxai.image(), galxai.chat()
```

### 1. Declarative React UI Primitives (`galxai/ui`)
- **`<GalxImage>`**: Self-hydrating, responsive image component with aspect ratio preservation, automatic route discovery, progressive glowing blur placeholder, and interactive hover remixing.

### 2. Zero-Route Next.js Server Actions (`galxai/actions`)
- Uses React 19 `'use server'` RPC semantics.
- Direct invocation (`generateImageAction`, `chatAction`, `listModelsAction`) from client components with zero route handlers required in `src/app/api/`.

### 3. Zero-File Edge Middleware Interceptor (`galxai/middleware`)
- Global Edge interceptor that mounts on Next.js root `middleware.ts`.
- Automatically captures `/api/galxai/*`, `/api/generate`, `/api/chat`, `/api/models` and dispatches to the gateway without creating any physical files inside `src/app/api/`.

### 4. Zero-Migration Runtime Auto-Patcher (`galxai/patch`)
- Monkey-patches `globalThis.fetch` on import to detect traffic targeted at `api.openai.com`, `api.anthropic.com`, or `api.replicate.com`.
- Automatically injects `GALXAI_API_KEY`, rewrites endpoints to the GALXAI Wholesale Gateway, and applies wholesale volume discounts without modifying existing business logic.

### 5. Natural Language Intent Ingestion (`galxai/intent`)
- Ingestion parser that extracts aspect ratios (`16:9`, `9:16`, `1:1`, `4:3`, `21:9`), model tiers (`openai-gpt-image-2`, `gpt-5.6-sol`, `gpt-5.6-luna`), and task categories directly from natural phrasing.

### 6. Reactive Persistent State Signals (`galxai/state`)
- `createAISignal()` and `useAISignal()` for persistent, observable AI state backed by `localStorage`.

## Consequences & Benefits
- **Zero API Key Leakage**: Frontend code never stores or sees administrative API keys; keys live exclusively in server environment variables (`GALXAI_API_KEY`).
- **Instant Prototyping**: Local UI iteration functions without errors even before live API keys are supplied by generating deterministic preview mockups.
- **Backwards Compatibility**: Existing OpenAI SDK code can be migrated with a single `import 'galxai/patch'` import.
- **Complete Framework Support**: Ready-to-use adapters for Next.js 14/15, React 19, Express, Fastify, and standard Node.js HTTP.
