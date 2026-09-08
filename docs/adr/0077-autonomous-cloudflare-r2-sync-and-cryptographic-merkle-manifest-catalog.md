# ADR 0077: Autonomous Cloudflare R2 Sync & Cryptographic Merkle Manifest Catalog

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
`Accepted`

## Context
High-velocity continuous learning engines must stream distilled training datasets (SFT dialogues, DPO pairs, KTO binary outcomes) into durable, globally distributed object storage without paying egress bandwidth taxes. Furthermore, training pipelines require tamper-evident verification that dataset shards have not suffered byte corruption or unauthorized alteration during storage and transit.

## Decision
We implemented the **GalxR2TrainingSyncEngine** (`src/core/storage/GalxR2TrainingSyncEngine.ts`):
- **Native Zero-Dependency SigV4 Engine**: Implements AWS Signature Version 4 natively using `node:crypto.createHmac` to authenticate directly with Cloudflare R2 without AWS SDK overhead.
- **Stratified Storage Architecture**: Partitions datasets by objective and curriculum tier (`datasets/sft/v1/curriculum=tier_4_expert_competition/shard_*.jsonl.gz`).
- **Cryptographic Merkle Tree Manifest**: Generates a 32-byte SHA-256 Merkle root across all active shard hashes, enabling instantaneous $O(\log N)$ inclusion proofs and audit verification.
- **Local In-Memory Simulation Fallback**: Gracefully operates in memory when R2 credentials are not configured, guaranteeing non-blocking resilience during testing and local development.

## Consequences

### Positive
- **$0 Egress Costs**: Leverages Cloudflare R2's zero-egress pricing model for distributed dataset distribution.
- **Cryptographic Provenance**: Merkle root guarantees dataset integrity and auditability.
- **Pure Native Implementation**: Eliminates bloated S3 client dependencies.

## References
- `src/core/storage/GalxR2TrainingSyncEngine.ts`
- `src/core/contracts/GalxContracts.ts`
- `tests/r2-training-sync.test.ts`
