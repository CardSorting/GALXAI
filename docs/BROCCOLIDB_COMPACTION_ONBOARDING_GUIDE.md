# 🥦 BroccoliDB Compaction Engine: Engineer Onboarding & Architecture Guide

> **Target Audience**: Any engineer reading, maintaining, or adding features to BroccoliDB compaction.  
> **Prerequisites**: Basic TypeScript and an understanding that LLMs charge per input token.

---

## 1. The 30-Second Elevator Pitch

**What does this do?**  
It slashes enterprise LLM token costs by **70% to 98%** by stripping boilerplate, repeated log retry storms, and document noise from inputs *before* they get sent to models like GPT-5.6 Sol or Claude 3.7 Sonnet.

**How do I use it in code?**  
You only ever import and call **one class**: `BroccoliCompactionFacade`.

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

// Safe domain compaction with automatic fail-closed provenance checking
const result = BroccoliCompactionFacade.compactDomain(rawText, 'SWIFT_MT103');

console.log(result.compactedPrompt);     // Compacted text (or original text if verification fell back)
console.log(result.tokensSaved);         // Tokens saved
console.log(result.fidelityStatus);      // 'verified' | 'fallback'
```

---

## 2. Why Did We Build This? (The Real-World Context)

Enterprise customers send GALXAI huge payloads:
- A 2,000-page Kubernetes crash dump has 500,000 tokens of `Connection refused (retry 4821/50000)` repeating the same error.
- A 300-page credit agreement has 75,000 tokens of standard boilerplate headers (`Confidential - Subject to NDA...`) on every page.
- A SWIFT MT103 wire transfer or HL7 medical lab has repetitive structural wrappers around a few critical facts.

If we send raw payloads directly to frontier LLMs:
1. It costs **$5.00 to $20.00+ per request**.
2. It hits context window limits.
3. It induces the "Lost-in-the-Middle" phenomenon where models miss the actual root-cause error buried on page 1,200.

BroccoliDB compacts these payloads down to dense, structured digests in **sub-10 milliseconds**.

---

## 3. What Was the "Ouroboros" Issue & What Did We Change?

### The Initial Mistake (The "Cat and Mouse" Trap)
In the first iteration, engineers wrote **180 individual compactor classes** (e.g. `BroccoliInterrogatoryCompactor`, `BroccoliPathologyCompactor`, `BroccoliSwiftMt103Compactor`) and **85 dedup buffers**, and dumped all 350+ of them into `src/core/broccolidb/index.ts`.

This caused two critical problems:
1. **The Provenance Gate Bypass**: If an engineer imported `BroccoliInterrogatoryCompactor` directly from `index.ts`, it did **not** run the safety check. If the compactor's regex parsed an address incorrectly, it could alter numbers or dates with zero protection.
2. **Barrel Export Bloat**: Exporting 350+ files in `index.ts` created scope confusion, circular import traps, and a terrible developer experience.

### The Solution (The Safe Facade Architecture)
We established a strict architectural rule:
1. **Shielded Generated Compactors**: We removed all 180 generated compactors from `index.ts`. They are now private internal implementation details.
2. **Single Public Entry Point (`BroccoliCompactionFacade`)**: All production callers use `BroccoliCompactionFacade`, which guarantees that every compaction passes through `BroccoliCompactionSafety`.
3. **Fail-Closed Safety Gate**: If compacted output contains *any* number, currency, date, percentage, or BIC that wasn't in the original text, the engine automatically **discards the compaction** and safely returns the unmodified source text (`fidelityStatus: 'fallback'`).
4. **Production REST API**: Exposed at `/api/audit/broccolidb/compact` with authentication, size limits (10MB max), and CORS support.

---

## 4. The 5-Layer Mental Model

Here is how data flows through the system:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 1: External Callers & REST Ingress                                │
│  - POST /api/audit/broccolidb/compact (Auth: Bearer / API Key)          │
│  - Guard: 10MB payload size limit, RFC 7807 error formatting            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 2: Safe Public Facade (BroccoliCompactionFacade)                 │
│  - Single public entry point for domain, batch, incident & doc modes    │
│  - Guard: 2MB text bounds, 10k frame limits, 1k-128k token budgets       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 3: Master Optimizers & Pipelines                                 │
│  - BroccoliDomainSpendOptimizer (180 domain classifiers)                │
│  - BroccoliHighVelocityPipeline (Aho-Corasick + L1 LRU memoization)     │
│  - BroccoliMegaIncidentStreamCascader (T0 anomaly isolation)            │
│  - BroccoliMegaDocumentPyramidCompactor (3-tier pyramid AST)            │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│  Layer 4: Provenance Gatekeeper      │  │  Layer 5: Internal Compactors │
│  (BroccoliCompactionSafety)          │  │  & Dedup Buffers              │
│  - Verifies numbers, dates, BICs, %  │  │  - 180 Domain Compactors      │
│  - FAILS CLOSED if ungrounded        │  │  - 85 Algorithmic Buffers     │
│  - Returns verified or fallback      │  │  (Never exported publicly)    │
└──────────────────────────────────────┘  └───────────────────────────────┘
```

---

## 5. Engineer's Runbook: How to Do Common Tasks

### Task 1: Compact Domain-Specific Text
Used for financial, healthcare, legal, or infrastructure documents where you know (or want to auto-detect) the format.

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const result = BroccoliCompactionFacade.compactDomain(sourceText, 'Interrogatory');

if (result.fidelityStatus === 'verified') {
  console.log(`Successfully compacted! Saved ${result.tokensSaved} tokens.`);
} else {
  console.log(`Fell back to raw text for safety. Unsupported facts:`, result.unsupportedFacts);
}
```

### Task 2: High-Velocity Batch Stream Ingestion
Used when ingesting high-throughput event frames (e.g. 50,000 log lines/sec).

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const batchResult = BroccoliCompactionFacade.compactBatch([
  { text: 'SWIFT MT103 payload...', domain: 'SWIFT_MT103' },
  { text: 'HL7 observation...', domain: 'HL7_Observation' },
]);

console.log(`Processed ${batchResult.totalProcessed} items in ${batchResult.averageLatencyMicros}µs`);
```

### Task 3: Compact a 2,000-Page Incident Log Storm
Used when digesting massive server logs, crash reports, or incident telemetry.

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const incidentResult = BroccoliCompactionFacade.compactIncident({
  rawStreamText: hugeLogString,
  targetTokenBudget: 4096,
  incidentTitle: 'Postgres Failover Incident',
});

console.log(incidentResult.compactedIncidentPrompt); // Root cause elevated to top, repetitive bursts collapsed
```

### Task 4: Compact a Multi-Hundred Page Document
Used for contracts, SEC filings, leases, and technical manuals.

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

const docResult = BroccoliCompactionFacade.compactDocument({
  rawText: masterAgreementString,
  title: 'Master Service Agreement',
  focusQuery: 'indemnification liability', // optional focus topic
});

console.log(docResult.compactedPyramidPrompt);
```

### Task 5: Call via HTTP REST API
From external services, Python, Go, or cURL:

```bash
curl -X POST https://galx.ai/api/audit/broccolidb/compact \
  -H "Authorization: Bearer $GALXAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "domain",
    "text": "PROPOUNDING PARTY: Plaintiff...\nRESPONDING PARTY: Defendant...",
    "domainHint": "Interrogatory"
  }'
```

### Task 6: Adding Support for a New Industry Domain
1. Create your compactor file in `src/core/broccolidb/Broccoli<NewDomain>Compactor.ts`.
2. Wire it into `src/core/broccolidb/BroccoliDomainSpendOptimizer.ts` inside the `switch (domain)` statement and `detectDomain` keyword list.
3. **DO NOT** add `export * from "./Broccoli<NewDomain>Compactor"` to `src/core/broccolidb/index.ts`.
4. Add a test case to `scripts/test-broccolidb-150-domain-suite.ts` and verify it passes `BroccoliCompactionSafety`.

---

## 6. Understanding "Verified" vs "Fallback"

When running tests or inspecting compaction results, you will see output like:

```
[VERIFIED] Domain 1/180: Interrogatory -> Saved: 504 tokens (75.0%)
[SAFE FALLBACK] Domain 124/180: WindTurbineSCADA -> Unsupported: 3.8 bar
```

### Why is Fallback a Feature, Not a Bug?
In enterprise AI, **a hallucinated number is a catastrophic failure**. If an AI compacts an SEC filing and turns `$15,000,000` into `$1,500,000`, the downstream model makes a fatal business error.

When `BroccoliCompactionSafety` sees that the compactor produced a number, date, percentage, or currency figure that did **not** exist in the raw source input, it immediately triggers a **Safe Fallback**:
- `compactedPrompt` is replaced with the unmodified `rawText`.
- `tokensSaved` is set to `0`.
- `fidelityStatus` is set to `'fallback'`.
- The system logs the unsupported facts in `unsupportedFacts`.

The 180-domain suite intentionally reports **104 verified compactions and 76 safe fallbacks**. This demonstrates that the safety gate works properly on ambiguous or partial inputs.

---

## 7. Rules of the Road (What NEVER to Do)

1. ❌ **NEVER import an individual compactor class directly in API routes or components.**  
   *Bad*: `import { BroccoliInterrogatoryCompactor } from '@/core/broccolidb/BroccoliInterrogatoryCompactor';`  
   *Good*: `import { BroccoliCompactionFacade } from '@/core/broccolidb';`
2. ❌ **NEVER re-export generated compactor files from `src/core/broccolidb/index.ts`.**  
   Keep `index.ts` clean; only export the safe facade, master engines, contracts, and building block buffers.
3. ❌ **NEVER disable or bypass `BroccoliCompactionSafety`.**  
   If a compactor is triggering fallbacks on valid data, improve the compactor's extraction logic to ground the facts—do not turn off the safety gate.
4. ❌ **NEVER remove size bounds on input strings.**  
   Unbounded string slicing on multi-gigabyte files will exhaust the V8 heap. Always honor `MAX_TEXT_LENGTH` (2,000,000 chars) and `MAX_PAYLOAD_BYTES` (10MB).

---

## 8. Verification & Test Suite Commands

When you modify compaction code, run these commands to verify:

```bash
# 1. Test the Compaction Facade & HTTP API route (7 test suites)
npm run test:broccolidb:api

# 2. Test Production Hardening & Provenance Regressions
npm run test:broccolidb:hardening

# 3. Test the Master 180-Domain Compactor Cluster
node --import tsx scripts/test-broccolidb-150-domain-suite.ts

# 4. Run TypeScript Compiler (Must have 0 errors)
npx tsc --noEmit
```

---

## 9. Relevant Files Summary

| File | Purpose |
| :--- | :--- |
| [src/core/broccolidb/BroccoliCompactionFacade.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliCompactionFacade.ts) | **The Public Door**: Unified, safe, size-bounded entry point. |
| [src/core/broccolidb/BroccoliCompactionSafety.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliCompactionSafety.ts) | **The Guard**: Fail-closed factual provenance verification. |
| [src/core/broccolidb/BroccoliDomainSpendOptimizer.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliDomainSpendOptimizer.ts) | **The Dispatcher**: 180-domain classifier and compactor dispatcher. |
| [src/core/broccolidb/BroccoliHighVelocityPipeline.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliHighVelocityPipeline.ts) | **The Turbo**: Aho-Corasick keyword routing & L1 LRU memoizer. |
| [src/core/broccolidb/BroccoliMegaIncidentStreamCascader.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliMegaIncidentStreamCascader.ts) | **The Incident Slicer**: 2,000+ page log storm reducer. |
| [src/core/broccolidb/BroccoliMegaDocumentPyramidCompactor.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/broccolidb/BroccoliMegaDocumentPyramidCompactor.ts) | **The Document Pyramid**: 300+ page contract summarizer. |
| [src/app/api/audit/broccolidb/compact/route.ts](file:///Users/bozoegg/Desktop/GALXAI/src/app/api/audit/broccolidb/compact/route.ts) | **The API Route**: Authenticated REST endpoint. |
| [docs/adr/0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md](file:///Users/bozoegg/Desktop/GALXAI/docs/adr/0059-broccolidb-safe-compaction-facade-barrel-hardening-and-api-gateway.md) | **The Architecture Decision Record**. |
