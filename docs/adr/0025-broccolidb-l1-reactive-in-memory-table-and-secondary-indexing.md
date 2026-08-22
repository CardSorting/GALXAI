# ADR 0025: BroccoliDB L1 Reactive In-Memory Table & Multi-Dimensional Secondary Indexing

## 📌 Status
**Accepted** (2026-08-22)

---

## 🎯 Context & Problem Statement
In high-throughput AI gateway routing and agentic swarm workflows, linear scans (`Array.filter()`, `Array.find()`) across in-memory state (such as hundreds of model specs, thousands of active tenant leases, task queues, edge cache entries, and health probes) introduce $O(N)$ CPU contention, unpredictable latency spikes, and severe garbage collection pressure under heavy concurrency.

Furthermore, traditional key-value caches lack secondary querying, range filtering, and multi-attribute matching, forcing application code to manually iterate and filter collections in memory.

---

## 💡 Decision: BroccoliDB L1 Reactive In-Memory Tables
We introduce **BroccoliDB**, a zero-dependency, ultra-low-overhead reactive in-memory database engine designed specifically for microsecond AI routing decisions:

1. **Typed Table Schema (`BroccoliDbTable<T>`)**:
   - Primary key hash map with $O(1)$ lookups, insertions, and deletions.
   - Real-time reactive change subscriptions via `subscribe(listener)`.

2. **Secondary Equality & Sorted Indices**:
   - `createIndex(field)`: Inverted secondary indices mapping exact values to record ID sets for instant $O(1)$ candidate retrieval.
   - `createSortedIndex(field)`: Ordered secondary indices enabling high-speed range queries ($O(\log N)$ search) with sort optimization.

3. **Rich Filter Operator DSL**:
   - Supports Mongo/SQL-grade filter operators without dynamic `eval()`:
     - `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$between: [min, max]`, `$regex: RegExp`.

4. **Single-Pass Statistical Aggregation Engine**:
   - `table.aggregate(query)` computes multi-group statistical rollups (`$sum`, `$avg`, `$min`, `$max`, `$count`) in a single contiguous iteration over candidate matching records.

```typescript
// Example: Instant Model Filtering via BroccoliDB DSL
const budgetVisionModels = modelTable.query({
  where: {
    supportsVision: { $eq: true },
    inputPricePer1M: { $between: [0.05, 1.50] },
    category: { $in: ['general_llm', 'reasoning'] }
  },
  sortBy: 'inputPricePer1M',
  sortOrder: 'asc'
});
```

---

## 🚀 Consequences & Impact

### Positive
- **Sub-Microsecond Latency**: Read and query operations complete in $< 0.005\text{ms}$ ($< 5\mu\text{s}$).
- **Zero GC Churn**: Index structures reuse fixed sets and arrays, drastically reducing runtime memory allocations.
- **Cross-Layer Unification**: Applied uniformly across `ModelCatalog`, `GalxPersistence`, `SessionRepository`, `ApiKeyRepository`, `ShardRepository`, `AuditRepository`, `TelemetryRepository`, `ShardHealthRepository`, `IdempotencyRepository`, `DistributedLockRepository`, `WalletRepository`, `EmbeddingsRepository`, `ProjectRepository`, `QueueRepository`, `TaskRepository`, `GalxEdgeCache`, `GalxR2AssetAdapter`, and `GalxCredentialPool`.

### Trade-Offs
- Increased memory footprint per table due to secondary index pointers (acceptable given sub-100MB overall serverless footprint).
