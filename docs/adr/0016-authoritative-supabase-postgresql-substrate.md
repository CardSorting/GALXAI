# ADR 0016: Authoritative Supabase PostgreSQL Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Decentralized edge compute workers require a single, strictly consistent, ACID-compliant authoritative storage substrate to manage tenant identities, API key hashes, cryptographic hardware-grade shard secrets, double-entry wallet ledgers, FIFO queue partitions, and pgvector embeddings.

## Decision
1. **Supabase PostgreSQL as Single Source of Truth**:
   - Persist all authoritative domain entities in Supabase PostgreSQL:
     - `galx_workspaces` & `galx_projects` & `galx_environments`
     - `galx_developer_keys` & `galx_api_key_scopes` (SHA-256 hashed lookups)
     - `galx_shard_accounts` (AES-256-GCM encrypted provider credentials)
     - `galx_wallets` & `galx_wallet_transactions` (Sub-cent $\$0.000001$ micro-metered ledger)
     - `galx_task_queues`, `galx_tasks`, and `galx_task_attempts` (CloudTasks FSM with monotonic fencing)
     - `galx_embeddings_store` (pgvector 1536 cosine similarity + tsvector full-text search)
     - `galx_idempotency_keys` & `galx_distributed_locks`
2. **Row Level Security (RLS)**:
   - Strict tenant isolation enforced at the PostgreSQL engine level.

## Consequences
### Positive
- **Guaranteed Consistency**: Double-entry ledger math and task leases are atomic and ACID-safe.
- **Hardware-Grade Cryptography**: All shard API keys are stored encrypted with AES-256-GCM and Authenticated Associated Data (AAD).
- **HNSW Vector Retrieval**: Native `pgvector` indexing enables semantic cache lookups and RAG without separate vector database infrastructure.
