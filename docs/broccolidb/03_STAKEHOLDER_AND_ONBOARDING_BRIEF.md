# 🥦 BroccoliDB Stakeholder Brief & Maintainer Onboarding

<!-- docs-scope: research-reference -->
> **Reading scope:** Research, evaluation, or planning reference within its stated domain. Results and proposed mechanisms do not establish current federation behavior or production performance. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

## The Commercial Reality, The Research Receipts, and The Zero-BS Field Guide

**Audience**: Internal Stakeholders, Engineering Leads, Product Partners, Diligence Auditors, and New Maintainers  
**Location in Repository**: `docs/broccolidb/`  
**Classification**: Backend Architecture & Operational Governance  

---

## 1. Executive Summary: What BroccoliDB Actually Is

To understand BroccoliDB, you must first understand what it **is not**:

* ❌ **It is NOT "Vegetable AGI"**: It does not think, reason, or have emergent consciousness.
* ❌ **It is NOT a simple text compressor**: It does not blindly run gzip or byte-pair token reduction.
* ❌ **It is NOT a vector database**: It is not doing cosine similarity search over chunked embeddings.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WHAT BROCCOLIDB IS:                             │
├────────────────────────────────────────────────────────────────────────┤
│  BroccoliDB is a deterministic representation and decision layer       │
│  that sits between raw software environments and AI inference models. │
│                                                                        │
│  It evaluates incoming context C and decides:                          │
│    1. Is C already dense and minimal? ──► Do nothing: ID(C) Bypass.    │
│    2. Is C bloated with legacy noise? ──► Select optimal transform T. │
│    3. Are invariants preserved?       ──► Guarantee 100% Action Safety.│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Pitch Deck vs. The Diligence Room

A critical operational discipline at GALXAI is maintaining a strict barrier between **The Commercial Pitch** and **The Technical Diligence Room**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     THE COMMERCIAL PITCH (Slide 4)                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Problem: AI agents receive bloated, contradictory context.           │
│            This causes slow execution, high API bills, and code bugs.  │
│                                  ↓                                     │
│   Solution: GALXAI dynamically selects the task-relevant context.      │
│             Sometimes transforms it, sometimes does nothing.           │
│                                  ↓                                     │
│   Outcome:  • 40%–92% reduction in token usage and API cost.           │
│             • 85% drop in Time-to-First-Token (TTFT < 15ms).           │
│             • 100% action safety on legacy enterprise codebases.       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 🚫 What NEVER Goes On The Pitch Deck:
1. ❌ *"Our Proprietary Epistemic Representation Algebra 🧬"*
2. ❌ *"Institutional Entropy Resistance Engine™"*
3. ❌ *"BroccoliDB is the first step toward AGI."*
4. ❌ *"We invented new mathematics with vegetables."*

### 🏛️ Where The Theory Belongs (The Diligence Room):
The mathematics, formal proofs, and 180 domain AST specifications belong in the **Diligence Room** (`docs/broccolidb/` and `docs/investors/07_TECHNICAL_DILIGENCE_AND_PATENTS.md`). 

When a Partner CTO or Chief Architect asks: *"How do you achieve 92% token reduction without dropping critical constraints?"*, you hand them the Whitepaper (`docs/broccolidb/02_WHITEPAPER_REPRESENTATION_SELECTION.md`) and the Formal Proof (`docs/broccolidb/04_FORMAL_MATHEMATICAL_PROOF.md`), run `npm run bench:entropy`, and let the receipts speak.

---

## 3. The 30-Second Explanation

If an engineer, executive, or customer asks you in an elevator:  
**"What is BroccoliDB actually doing?"**

Your exact script is:

> **"It decides what representation of the context should reach the model."**

If they ask for more detail:
> *"When context is clean, it does nothing so it never adds latency. When context is bloated with 10 years of Jira tickets and stale ADRs, it strips the noise, hoists the active security and code invariants to the top, and hands the model exactly what it needs to execute safely."*

Then stop talking.

---

## 4. Architecture & Subsystem Tour for Backend Maintainers

BroccoliDB lives primarily in `src/core/broccolidb/`. Here is how the subsystem is wired:

```
src/core/broccolidb/
├── BroccoliCompactionFacade.ts        # Master 19-mode entry point & router
├── BroccoliCompactionSafety.ts        # Fail-closed invariant verifier
├── BroccoliArchitectureInvariantCompactor.ts # Invariant hoister (ADRs/RFCs)
├── BroccoliHighVelocityPipeline.ts    # High-throughput streaming buffer
├── broccolidb-table.ts                # In-memory reactive MVCC table
├── broccolidb-wal.ts                  # Write-ahead log with CRC32 frames
├── broccolidb-mvcc-engine.ts          # Multi-version concurrency controller
└── [180 Industry Compactors]          # e.g., FIX, SWIFT, HL7, K8s, Git, etc.
```

### The Request Lifecycle:

```
Incoming Prompt Payload C
           │
           ▼
[ BroccoliCompactionFacade.compact(C, mode, options) ]
           │
           ├── 1. Check Payload Size:
           │      If |C| < 200 tokens and no noise markers → Return ID(C)
           │
           ├── 2. Match Domain / Mode:
           │      Dispatch to specialized AST compactor (e.g. SWIFT, K8s, ADR)
           │
           ├── 3. Execute AST Pruning & Invariant Hoisting:
           │      Discard historical boilerplate, elevate active constraints
           │
           ├── 4. Pass to Safety Gate (BroccoliCompactionSafety):
           │      Verify Φ(C') ⊇ Φ(C)
           │      If invariant check passes → Return C'
           │      If invariant check FAILS  → Return ID(C) (Fail-Closed)
           │
           ▼
Compacted Context C' dispatched to Inference Wire
```

---

## 5. The Three Golden Operational Invariants

As a maintainer of BroccoliDB, you must never violate these three rules:

### Invariant 1: First, Do No Harm (Identity Bypass)
Never apply a lossy transformation to context that is already compact and dense. If context length is under threshold or density is high, the system MUST return $\text{ID}(C)$.

### Invariant 2: Invariant Survival Over Token Count
Never compromise an invariant to win a token compression contest. Dropping a `zeroizeBuffer()` call or an `RS256` key directive to achieve a 95% reduction instead of 90% is a fatal architectural failure.

### Invariant 3: Fail-Closed Default
If any compactor throws an unhandled exception, produces malformed AST output, or fails the invariant subsumption check, the pipeline MUST immediately fallback to $\text{ID}(C)$ (raw input). The system must never crash or emit corrupted payloads.

---

## 6. How to Run the Verification Receipts

Before opening a pull request or approving an architectural change, execute the automated verification suites:

```bash
# 1. Run the 7-Tier Institutional Entropy & Adversarial Traps Benchmark
npm run bench:entropy

# 2. Run the 19-Mode Compaction Facade & HTTP REST API Gateway Suite
npm run test:broccolidb:api

# 3. Run the Production Hardening & Zero-Hallucination Regression Suite
npm run test:broccolidb:hardening

# 4. Run the Master 180-Domain Compactor Cluster Suite
node --import tsx scripts/test-broccolidb-150-domain-suite.ts

# 5. Run the Invariant & WAL Replay Verification Suite
npx tsx scripts/test-broccolidb-backend-invariants.ts
```

### Expected Output for Benchmark Invariant:
```text
======================================================================================
  Level | Raw Tokens | Compacted | Reduction | Raw Safety | GALX Safety | Invariant Status
  --------------------------------------------------------------------------------------
    L1  |         94 |        94 |      0.0% |       100% |        100% | ACTION_SAFE
    L7  |       1402 |       111 |     92.1% |        20% |        100% | ACTION_SAFE
======================================================================================
Confirmed: 0 Committees Harmed (Institutional Entropy Resistance: MEASURED)
```

---

## 7. Common Anti-Patterns & Troubleshooting

| Anti-Pattern | Why It Breaks | Correct Pattern |
| :--- | :--- | :--- |
| **Using Regex on Code Invariants** | Misses multi-line syntax, comments, or renamed variables. | Use AST-aware parsers or symbolic delimiters. |
| **Compressing Sub-200 Token Inputs** | Causes negative compression (structural overhead). | Route through `Adaptive Density Gate` ($\text{ID}(C)$). |
| **Treating Warnings as Output** | Pollutes downstream model input with compaction metadata. | Keep compactor diagnostic logs out of the prompt wire. |
| **Trusting Document Timestamps Alone** | Stale documents may have newer git commit timestamps. | Use semantic deprecation markers (`SUPERSEDED by ADR X`). |

---

## 8. Summary Checklist for New Maintainers

- [ ] Read `01_PHILOSOPHY_THE_AGGRESSIVE_VEGETABLE.md` to understand why we treat representation as a decision layer.
- [ ] Review `02_WHITEPAPER_REPRESENTATION_SELECTION.md` for mathematical and architectural formalisms.
- [ ] Review `04_FORMAL_MATHEMATICAL_PROOF.md` for the formal bounded degradation theorems.
- [ ] Run all test suites locally (`npm run bench:entropy`).
- [ ] Remember: When pitching, answer *"What changes if I use this?"*—keep the grand theory for the diligence room! 🥦
