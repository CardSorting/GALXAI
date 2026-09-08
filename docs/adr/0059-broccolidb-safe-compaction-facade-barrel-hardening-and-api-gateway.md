# ADR 0059: BroccoliDB Safe Compaction Facade, Barrel Hardening, and Production API Gateway

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
Following the implementation of the 85-Buffer Deduplication Engine, Mega-Incident Stream Cascader, Mega-Document Pyramid Compactor, and 180-Domain Compactor Cluster (ADRs 0056, 0057, and 0058), two architectural risks were identified:

1. **Provenance Gate Bypass via Public Barrel Exports**:
   Direct generated compactor methods (e.g. `BroccoliInterrogatoryCompactor`, `BroccoliPathologyCompactor`) were exported from the main package barrel (`src/core/broccolidb/index.ts`). External callers importing directly from this barrel could invoke compactor methods directly, bypassing the `BroccoliCompactionSafety` provenance verification gate and risking unsupported numerical/date/identifier outputs on adversarial inputs.
2. **Namespace Bloat & Scope Recursion**:
   Exporting 150+ individual domain compactor classes from a single barrel created unbounded surface area, potential cyclic dependency traps, and ambiguous mental models for developers.
3. **Missing Production Request-Path Ingress**:
   The compaction engines operated in core substrate libraries but lacked an authenticated, size-bounded HTTP REST API route with complete error handling, CORS headers, and audit telemetry.

## Decision

We instituted the following architectural hardening measures:

### 1. Shielded Public Boundary (`BroccoliCompactionFacade`)
We created `BroccoliCompactionFacade` as the sole supported public boundary for all compaction workflows:
- **`compactDomain(text, domainHint)`**: Dispatches through `BroccoliDomainSpendOptimizer` with guaranteed `BroccoliCompactionSafety.verify` provenance verification. Fails closed to raw text whenever ungrounded facts are detected.
- **`compactBatch(items, options)`**: Dispatches through `BroccoliHighVelocityPipeline` with single-pass Aho-Corasick domain routing, L1 LRU memoization, and input string verification.
- **`compactIncident(input)`**: Dispatches through `BroccoliMegaIncidentStreamCascader` for $T_0$ anomaly isolation within bounded token budgets (1,024 to 128,000 tokens).
- **`compactDocument(input)`**: Dispatches through `BroccoliMegaDocumentPyramidCompactor` for 3-tier extractive pyramid summarization.
- **`compact(request)`**: Polymorphic dispatcher handling typed JSON payloads across all 4 modes.

### 2. Strict Input Bounding
`BroccoliCompactionFacade` enforces defensive memory bounds before parsing or slicing:
- Maximum text length: 2,000,000 characters (~2MB string / ~500k tokens).
- Maximum batch frames: 10,000 frames.
- Incident token budget range: [1,024, 128,000] tokens.

### 3. Removal of Generated Compactors from Barrel Exports
We removed all 150+ individual generated compactor classes from `src/core/broccolidb/index.ts`. Direct compactor imports are preserved exclusively within `BroccoliDomainSpendOptimizer.ts` for internal dispatch. The barrel re-exports only:
- Core database contracts, L1 Table, L2 WAL, L3 CAS, Mutex, and Natural Query Parser.
- AI Spend Governance & FinOps Substrate engines.
- `BroccoliCompactionFacade` and hardened master engines (`BroccoliDomainSpendOptimizer`, `BroccoliHighVelocityPipeline`, `BroccoliMegaIncidentStreamCascader`, `BroccoliMegaDocumentPyramidCompactor`, `BroccoliCompactionSafety`).
- The 85 algorithmic deduplication and streaming buffer primitives.

### 4. Authenticated, Size-Bounded REST API Gateway
We implemented production routes at `/api/audit/broccolidb/compact` and `/api/broccolidb/compact`:
- **Authentication**: Validates incoming Bearer tokens, `x-api-key`, and `x-galx-key` via `GalxAuthEngine.resolveAuthIdentity(req)`.
- **Size Guard**: Rejects payloads exceeding 10MB (`HTTP 413 Payload Too Large`).
- **Standardized Error Handling**: Returns RFC 7807 problem details for bad requests (`HTTP 400`), unauthorized callers (`HTTP 401`), and oversized payloads (`HTTP 413`).
- **Service Introspection**: `GET` returns operational status, supported modes, size limits, and live metrics.

---

## Consequences

- **Positive**: Complete elimination of provenance bypass risks; 100% of domain compactions pass through `BroccoliCompactionSafety`.
- **Positive**: Clean, maintainable module exports without barrel bloat or circular dependency traps.
- **Positive**: Production-ready HTTP API gateway fully wired to GALXAI authentication, telemetry, and size controls.
- **Positive**: Full test coverage via `scripts/test-broccolidb-compaction-api-route.ts` and `scripts/test-broccolidb-production-hardening.ts`.
- **Negative**: Callers attempting to import individual compactor classes directly from `@/core/broccolidb` must migrate to `BroccoliCompactionFacade` or `BroccoliDomainSpendOptimizer`.
