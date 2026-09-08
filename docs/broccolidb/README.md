# 🥦 BroccoliDB Core Documentation & Research Suite

<!-- docs-scope: research-reference -->
> **Reading scope:** Research, evaluation, or planning reference within its stated domain. Results and proposed mechanisms do not establish current federation behavior or production performance. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Welcome to the backend engineering, theoretical foundations, and operational documentation suite for **BroccoliDB**, the deterministic representation-selection and context-compaction layer inside GALXAI.

---

## 📑 Core Documentation Index

| # | Document | Target Audience | Summary |
| :---: | :--- | :--- | :--- |
| **01** | **[The Philosophy of BroccoliDB](01_PHILOSOPHY_THE_AGGRESSIVE_VEGETABLE.md)** | All Engineers & Leaders | The representation layer, the compute-prepper fallout shelter fallacy, the botanical tree isomorphism, and the aggressively self-auditing vegetable. |
| **02** | **[Technical Whitepaper: Task-Conditioned Representation Selection](02_WHITEPAPER_REPRESENTATION_SELECTION.md)** | Architects & Researchers | Formal system model, operator algebra $\langle \mathcal{O}, \circ \rangle$, 180-domain compaction cluster, 7-tier institutional entropy gradient, and frontier model inference boundary results. |
| **03** | **[Stakeholder Brief & Maintainer Onboarding](03_STAKEHOLDER_AND_ONBOARDING_BRIEF.md)** | Stakeholders & Maintainers | The commercial pitch vs. diligence room dichotomy, 30-second elevator explanation, subsystem code walkthrough, the 3 golden operational invariants, and test runbooks. |
| **04** | **[Formal Mathematical Proof & Bounded Degradation Theorems](04_FORMAL_MATHEMATICAL_PROOF.md)** | Formal Methods & Diligence | Academically rigorous proofs: Lemma 1 (Risk Monotonicity), Theorem 1 (Identity Optimality), Theorem 2 (Bounded Action Degradation), Theorem 3 (Institutional Entropy Resistance), and Theorem 4 (Category-Theoretic Universal Property). |
| **05** | **[Formal TLA+ & State-Machine Specification](05_FORMAL_TLA_STATE_MACHINE_SPECIFICATION.md)** | Systems Engineers & Verification | Full TLA+ specification module, temporal logic invariants ($\Box \text{InvariantSafety}$), WAL cryptographic crash recovery protocol, and MVCC snapshot isolation. |
| **06** | **[Architectural Audit & Empirical Evaluation Report](06_ARCHITECTURAL_AUDIT_AND_EMPIRICAL_EVALUATION.md)** | Partner CTOs & Diligence Auditors | Exhaustive 420-file code inspection, ISO/IEC 25010 assessment, chaos fault injection matrix, and frontier LLM inference boundary metrics. |
| **07** | **[Lean 4 Formal Verification Blueprint](07_LEAN4_FORMAL_VERIFICATION_BLUEPRINT.md)** | Interactive Theorem Provers | Machine-checked inductive types, Galois connection soundness, identity bypass proofs, and tactic automation. |
| **08** | **[Compiler IR Lowering & Program Slicing Architecture](08_COMPILER_IR_LOWERING_AND_PROGRAM_SLICING.md)** | Compiler Engineers & Systems | LLVM SSA intermediate representations, dominator trees, Weiser's backward slicing, and invariant hoisting. |
| **09** | **[RFC-BROCCOLIDB-0001 Protocol Specification](09_RFC_BROCCOLIDB_0001_TASK_CONDITIONED_REPRESENTATION_SELECTION_PROTOCOL.md)** | Network & Protocol Engineers | Formal RFC 2119 / IETF-style protocol standard (TCRSP/1.0), wire formats, headers, state machines, and ZDR v10.0. |
| **10** | **[Frontier Post-Training Cognitive Labeling & 4-Stage Substrate](10_FRONTIER_POST_TRAINING_COGNITIVE_LABELING_SUBSTRATE.md)** | ML Engineers & Researchers | Zero-dependency 4-stage post-training pipeline (Collection, Cleaning, Schema, Provenance), 75+ multi-axis cognitive vectors (MLA, FP8, EAGLE-2, Medusa, DualPipe, DPO Debiasing), and autonomous R2 Merkle sync. |

---

## 🏛️ Associated Architecture Decision Records (ADRs)

BroccoliDB is governed by a series of formal Architecture Decision Records located in [`docs/adr/`](../adr/):

* **[ADR 0025: BroccoliDB L1 Reactive In-Memory Table & Secondary Indexing](../adr/0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md)**
* **[ADR 0026: BroccoliDB Natural Language Query AST Parser & WAL Persistence](../adr/0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md)**
* **[ADR 0043: BroccoliDB Hybrid Resilience Outbox & Disaster Recovery](../adr/0043-broccolidb-hybrid-resilience-outbox-disaster-recovery-and-sla-uptime.md)**
* **[ADR 0056: BroccoliDB 85-Buffer Deduplication & Streaming Pipeline](../adr/0056-broccolidb-85-buffer-deduplication-and-streaming-pipeline-substrate.md)**
* **[ADR 0058: BroccoliDB 180-Domain Industry Cluster Compactor Substrate](../adr/0058-broccolidb-180-domain-industry-cluster-compactor-substrate.md)**
* **[ADR 0064: BroccoliDB OpenAI Inference Boundary Measurement](../adr/0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md)**
* **[ADR 0066: Institutional Entropy Resistance & Epistemic Compression](../adr/0066-institutional-entropy-resistance-and-epistemic-compression.md)**
* **[ADR 0067: Adaptive Representation Selection & Density Bypass Substrate](../adr/0067-representation-selection-and-adaptive-density-bypass.md)**
* **[ADR 0073: Zero-Dependency Post-Training Cognitive Labeling & 4-Stage Substrate](../adr/0073-zero-dependency-post-training-cognitive-labeling-and-4-stage-substrate.md)**
* **[ADR 0074: DeepSeek-V3/R1 Multi-Head Latent Attention (MLA), KV Dequantization & DualPipe](../adr/0074-deepseek-v3-r1-mla-compression-latent-kv-dequantization-and-dualpipe.md)**
* **[ADR 0075: Speculative Verification Trees, EAGLE-2, Medusa & Head Entropy Pruning](../adr/0075-speculative-verification-trees-eagle2-medusa-and-head-entropy-pruning.md)**
* **[ADR 0076: Dynamic Sequence Packing Mask Slicing, Online DPO Length Debiasing & Gradient Shield](../adr/0076-dynamic-sequence-packing-mask-slicing-dpo-length-debiasing-and-gradient-shield.md)**
* **[ADR 0077: Autonomous Cloudflare R2 Sync & Cryptographic Merkle Manifest Catalog](../adr/0077-autonomous-cloudflare-r2-sync-and-cryptographic-merkle-manifest-catalog.md)**
* **[ADR 0078: GLM-5.3 Flash IndexShare Sparse Attention, Slime Asynchronous RL & Hybrid Thinking Modes](../adr/0078-glm-53-flash-indexshare-sparse-attention-and-slime-async-rl.md)**

---

## 🧪 Verification & Empirical Test Suites

Run the empirical benchmark and invariant suites directly from the repository root:

```bash
# 1. Adversarial Institutional Entropy Benchmark (7 Regimes & 7 Traps)
npm run bench:entropy

# 2. Frontier Model Inference Boundary Suite (Latency & Cost)
npm run bench:inference-boundary

# 3. BroccoliDB 19-Mode Compaction Facade REST API Suite
npm run test:broccolidb:api

# 4. Master 180-Domain Compactor Cluster Suite
node --import tsx scripts/test-broccolidb-150-domain-suite.ts

# 5. Production Hardening & Zero-Hallucination Regression Tests
npm run test:broccolidb:hardening
```

---

## 🥦 The Core Motto

> *"It decides what representation of the context should reach the model."*
