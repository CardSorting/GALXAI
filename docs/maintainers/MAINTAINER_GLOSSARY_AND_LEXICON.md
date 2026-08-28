# 📖 Maintainer Glossary & Architectural Lexicon

> **Target Audience**: New Maintainers, Subsystem Engineers, and Systems Reviewers.  
> **Purpose**: Definitive definitions of all proprietary terms, mathematical algorithms, security primitives, and mental models in GALXAI.

---

## 🥦 1. Representation & Compaction Lexicon

### **BroccoliDB**
The core pre-inference representation transformation substrate of GALXAI. Rather than compressing prompts destructively, BroccoliDB transforms raw data payloads (ASTs, court transcripts, eBPF logs, time series) into dense, task-relevant representations that preserve semantic invariants while eliminating redundant boilerplate.

### **Representation Redundancy vs Task-Relevant Invariant**
- **Representation Redundancy**: Structural repetition, formatting syntax, verbose boilerplate, and static preamble noise inherent to human-readable or serialization formats (e.g. repeated XML tags, baseline equilibrium logs, repeated objection preambles).
- **Task-Relevant Invariant**: The irreducible operational facts required for accurate inference (e.g. security vulnerability signatures, exact financial figures, anomaly timestamps, BIC codes).

### **Fail-Closed Factual Grounding (`BroccoliCompactionSafety`)**
The non-negotiable provenance firewall in `src/core/broccolidb/BroccoliCompactionSafety.ts`. Compaction output is parsed for high-risk entities (currencies, numbers, dates, identifiers, percentages). If any extracted entity cannot be grounded in the source text, the system fails closed: abandoning compaction and returning unmodified raw text with `fidelityStatus: 'fallback'`.

### **Megaincident Stream Cascader (`BroccoliMegaIncidentStreamCascader`)**
A multi-stage streaming pipeline that ingests multi-thousand-page incident logs, partitions them into micro-digests, scores anomaly signals at $T_0$, and cascades them into a compact budget representation ($<8192$ tokens).

### **Mega-Document Pyramid (`BroccoliMegaDocumentPyramidCompactor`)**
A hierarchical summarizer that extracts structural section digests from multi-hundred-page corporate or legal filings (e.g. 10-Ks, MSAs) into a layered query-aware executive summary.

---

## 🔒 2. Security & Cryptographic Lexicon

### **Envelope Encryption with AES-256-GCM**
The cryptographic standard used in `src/core/vault/GalxCryptoVault.ts`. Every secret is encrypted with a unique 96-bit random IV and 128-bit authentication tag.

### **Authenticated Associated Data (AAD)**
Cryptographic data bound to the AES-256-GCM ciphertext that is authenticated but not encrypted. In GALXAI, AAD is explicitly formatted as `${tenantUid}:${shardId}:${provider}` to mathematically prevent cross-tenant shard transplantation.

### **ZeroizeBuffer Memory Scrubbing**
A deterministic 2-pass RAM scrubbing technique (`0xAA` $\to$ `0x00`) executed in `finally` blocks for all decrypted API credentials to prevent secret retention in V8 heap memory.

---

## ⚙️ 3. Routing & Hydraulic Capacity Lexicon

### **Predictive Adaptive Headroom Tracking (P-AHT)**
The dynamic mathematical algorithm in `src/core/pool/GalxCredentialPool.ts` that calculates the real-time hydraulic capacity of each upstream shard based on token velocity, soft reservations, and Tier-5 provider ceilings:
$$H_i(t) = \max\left(0, \frac{\text{TPM}_{\max, i} - R_i(t)}{\text{TPM}_{\max, i}}\right)$$

### **Smooth Weighted Round-Robin (SWRR)**
Nginx-inspired deterministic load balancing with zero floating-point accumulation drift used to distribute load across healthy peer shards.

### **4-State Circuit Breaker (`GalxCircuitBreaker`)**
The resilience finite state machine with states: `CLOSED` (healthy), `DEGRADED` (shedding load), `OPEN` (cooldown quarantine), and `HALF-OPEN` (canary recovery probe).

### **Zero-Hesitation Aliasing**
The SDK paradigm where developers write intuitive aliases (`gpt-5`, `gpt-4o`, `grok-3`) and GALXAI automatically routes, provisions, compacts, and streams the response without runtime configuration friction.

---

## 📊 4. Benchmarking & Empirical Lexicon

### **Inference Boundary**
The physical network perimeter between GALXAI and the upstream foundation model provider (e.g. OpenAI). All token accounting, billed dollars, and latencies are measured exactly at this boundary.

### **Randomized Branch-Blinded A/B Evaluation**
The empirical evaluation protocol in `BroccoliInferenceBoundaryBenchmarker.ts` where Branch Alpha and Branch Beta identities are randomly decoupled from the task evaluator and revealed only post-hoc to eliminate confirmation bias.

---

*Preserve terminological precision across all specifications.* 🥦📖🛡️
