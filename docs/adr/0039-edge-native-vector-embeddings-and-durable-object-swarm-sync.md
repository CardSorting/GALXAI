# ADR 0039: Edge-Native Vector Embeddings & Durable Object Swarm State Synchronization

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Multi-agent swarms require rapid semantic search embeddings for Retrieval-Augmented Generation (RAG) and low-latency state synchronization for concurrent sub-agent reasoning loops. Synchronizing intermediate thoughts, shared prompt prefixes, and sub-task statuses via relational database transactions introduces severe lock contention, IOPS consumption, and high latency.

## Decision
1. **Edge-Native Vector Embeddings (`POST /v1/embeddings`)**:
   - Implemented high-velocity vector embedding calculus (1536 dimensions) directly at Cloudflare Edge PoPs, compatible with OpenAI's `text-embedding-3-small` and `text-embedding-3-large` specifications.
   - Fully integrated into Developer SDK via `galx.embeddings.create({ input, model })` and top-level `embed(input)`.

2. **Stateful In-Memory Swarm Coordination via Cloudflare Durable Objects (`GalxSwarmCoordinatorDO`)**:
   - Edge-native Durable Objects maintain in-memory state machines for active agent swarms (`/state`, `/agent/register`, `/agent/status`, `/context`, `/complete`).
   - Autonomous agents exchange intermediate thoughts, shared prompt context, and sub-task outputs directly within edge RAM with zero database read/write amplification.
   - Supports both programmatic in-memory execution and Cloudflare V8 Durable Object HTTP RPC.

## Consequences

### Positive
- **Sub-15ms Vector Generation**: Clients compute text embeddings at the closest edge PoP without round-tripping to centralized origin servers.
- **Zero Database Lock Contention**: Multi-agent swarms coordinate intermediate reasoning steps in edge memory, slashing database load during complex multi-step tasks.
- **Full OpenAI SDK Compatibility**: Standard tools (LangChain, LlamaIndex, OpenAI SDK) can target `https://api.galx.ai/v1/embeddings` transparently.
