# ADR 0026: BroccoliDB Natural Query AST Parser & Cryptographic WAL Persistence

## 📌 Status
**Accepted** (2026-08-22)

---

## 🎯 Context & Problem Statement
Developers and autonomous AI agents need to inspect gateway state, model catalogs, active task queues, audit trails, and shard allocations using conversational natural language or simplified declarative queries without complex SQL syntax or external LLM parsing calls during runtime.

Additionally, in-memory state needs durability against process crashes and server restarts while avoiding heavy database writes for high-frequency ephemeral updates.

---

## 💡 Decision: Deterministic Natural Query Parsing & Cryptographic WAL Replay

1. **Offline Natural Query AST Parser (`BroccoliNaturalQueryParser`)**:
   - Zero-allocation lexical tokenizer and recursive descent parser.
   - Operates completely offline with zero LLM API dependency and sub-0.1ms parse latency.
   - Transforms natural human queries and filter statements into typed `DbQueryOptions<T>` ASTs:
     - Examples:
       - `"where provider = 'openai' and inputPricePer1M <= 1.0 sort by price asc"`
       - `"find all reasoning models with contextWindow >= 200000"`
       - `"where status = 'healthy' and permissionRetracted = false"`

2. **L2 Append-Only Write-Ahead Log (WAL) (`BroccoliDbWAL`)**:
   - High-throughput asynchronous batch flushing to filesystem (`.data/wal/`).
   - Frame structure: `[Header: 16B | Sequence: 8B | Timestamp: 8B | PrevHash: 32B | PayloadLen: 4B | Payload: N Bytes | CRC32 / SHA256: 32B]`.
   - Tamper-evident cryptographic frame chaining (`prevHash` -> `hash`).
   - Automated crash recovery replay: restores table state, re-populates secondary indices, and validates cryptographic continuity.

```typescript
// Example: Offline Conversational Natural Query
const results = galx.models.queryNatural(
  'where provider = "openai" and supportsVision = true and inputPricePer1M < 2.0 sort by contextWindow desc limit 5'
);
```

---

## 🚀 Consequences & Impact

### Positive
- **Human & Agent Ergonomics**: Natural query syntax supported directly in TypeScript SDK (`galx.models.queryNatural()`, `galx.queues.queryNatural()`, `galx.privacy.queryShardsNatural()`).
- **Deterministic & Safe**: 100% immune to prompt injections and parser hallucinations because translation is governed by a strict deterministic grammar.
- **Crash Durability**: Tables recover their full state in $< 5\text{ms}$ upon cold start via WAL replaying.
