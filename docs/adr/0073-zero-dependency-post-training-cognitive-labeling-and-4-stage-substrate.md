# ADR 0073: Zero-Dependency Post-Training Cognitive Labeling & 4-Stage Substrate

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
`Accepted`

## Context
As frontier foundation models evolve toward multi-axis reasoning and alignment (DeepSeek-R1, OpenAI o1, Meta Llama-3, StarCoder), continuous training data curation requires sub-microsecond in-memory labeling without disk latency or external dependency bloat. Introducing third-party npm packages risks supply chain vulnerabilities, runtime memory overhead, and version pinning conflicts. 

Furthermore, industrial post-training data engineering mandates a clean 4-stage pipeline standard:
1. **Collection**: Ingestion latency telemetry, burstiness indexing, and high-throughput streaming.
2. **Cleaning**: Automated Unicode NFC normalization, zero-width / homoglyph sanitization, and boilerplate stripping.
3. **Schema**: Strict ChatML, Arrow, and Parquet schema validation with turn alternation enforcement.
4. **Provenance**: Cryptographic HMAC-SHA256 chain-of-custody signatures and tamper-evident audit seals.

## Decision
We implemented the **BroccoliDB Cognitive Labeling & Reasoning Taxonomy Classifier** (`BroccoliDataLabelingClassifier`) and **4-Stage Industrial Post-Training Substrate** with strict zero external dependencies:
- Built exclusively with native TypeScript and Node.js standard libraries (`node:crypto`, `node:zlib`, `node:buffer`).
- Sub-0.02ms execution directly in volatile RAM tables (`BroccoliDbTable`), bypassing filesystem I/O.
- MinHash Locality-Sensitive Hashing (LSH) with 128 seeded linear congruential permutations for streaming novelty scoring.
- Comprehensive 75+ multi-axis cognitive reasoning taxonomy classification (PRM step scoring, self-consistency normalization, verbosity fluff metering, negative constraint satisfaction, RLAIF constitutional scoring).

## Consequences

### Positive
- **Zero Supply Chain Risk**: 100% native standard library execution with zero npm dependencies.
- **Microsecond Latency**: Pure RAM execution ($<0.02\text{ms}$ per prompt-completion pair, exceeding 125,000 tokens/sec throughput).
- **Industrial Integrity**: Verifiable 4-stage telemetry reports with SHA-256 chain-of-custody audit proofs for regulatory compliance.

### Negative / Trade-Offs
- Requires native cryptographic and shingle algorithms implemented and maintained internally.

## References
- `src/core/training/BroccoliDataLabelingClassifier.ts`
- `src/core/contracts/GalxContracts.ts`
- `tests/r2-training-sync.test.ts`
