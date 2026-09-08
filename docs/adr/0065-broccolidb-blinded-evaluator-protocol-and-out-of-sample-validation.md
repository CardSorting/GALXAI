# ADR 0065: BroccoliDB Randomized Branch-Blinded A/B Evaluation Protocol & Out-of-Sample Validation

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
Accepted

## Context
Following the implementation of the OpenAI Inference Boundary Measurement Harness ([ADR 0064](0064-broccolidb-openai-inference-boundary-measurement-and-task-suite.md)), we established an empirical baseline ($85.93\%$ aggregate input token reduction, $65.5\% - 69.9\%$ total billed dollar savings across reference workloads).

However, as highlighted in internal architectural review (`senior-architect-being-critical.md`), publishing a specific benchmark number introduces an **experimental contamination risk**:
1. **Target-Seeking Confirmation Bias**: Researchers and developers may consciously or unconsciously optimize future test harnesses to reproduce the published $85.93\%$ figure.
2. **Prior vs. Guarantee**: The aggregate number represents an empirical observation under controlled reference workloads, not a universal guarantee.
3. **Out-of-Sample Dispersion**: Real-world workloads exhibit significant dispersion across domains (e.g. $61.04\%$ on legal research vs. $94.69\%$ on eBPF telemetry).

To prevent contamination and guarantee epistemic integrity, the benchmarking apparatus supports **Randomized Branch-Blinded A/B Evaluation** and **Out-of-Sample Workload Ingestion**.

---

## Decision

### 1. The Randomized Branch-Blinded Evaluator Protocol (`evaluateBlindedWorkload`)
In branch-blinded mode:
1. **Randomized Branch Assignment**: The harness shuffles Baseline (uncompacted) and GALX (compacted) prompts into opaque channels: `Branch Alpha` ($\alpha$) and `Branch Beta` ($\beta$).
2. **Decoupled Inference Dispatch**: Both branches are sent to the provider inference boundary (`api.openai.com`) with identical model parameters and system prompts.
3. **Branch-Blinded Objective Evaluation**: The task evaluation engine grades both model responses independently against strict domain criteria (e.g. numeric integrity, regex patterns, MITRE techniques) without knowing which branch was compacted.
4. **Post-Hoc Unblinding**: After raw provider usage and quality scores are recorded, the harness unblinds the mapping and computes the empirical deltas.

```mermaid
flowchart TD
    Task[Novel Out-of-Sample Workload] --> Shuffler[Randomized Branch Shuffler: CSPRNG]
    
    Shuffler -->|Opaque Assignment| BranchA[Branch Alpha: Payload X]
    Shuffler -->|Opaque Assignment| BranchB[Branch Beta: Payload Y]
    
    BranchA --> Provider[OpenAI Provider Boundary: https://api.openai.com]
    BranchB --> Provider
    
    Provider --> Evaluator[Blinded Objective Quality Evaluator: Zero Target Prior]
    
    Evaluator --> Unblinder[Post-Hoc Cryptographic Unblinding Key]
    Unblinder --> EmpiricalReceipt[Empirical Receipt: Measured Delta ($ / %) & Quality Score]
```

### 2. Epistemic Classification of Benchmark Outcomes
Rather than forcing a binary pass/fail on a fixed percentage target, the blinded engine classifies outcomes into 5 empirical regimes:

| Observed Spend Delta | Empirical Regime | Scientific Interpretation |
| :--- | :--- | :--- |
| **$> 70\%$** | *High Redundancy Regime* | Workload contains substantial repetitive boilerplate, logs, or unindexed ASTs. |
| **$40\% - 70\%$** | *Moderate Redundancy Regime* | Standard enterprise document / contract / semi-structured dialogue. |
| **$10\% - 40\%$** | *Dense Information Regime* | Highly curated context; minimal syntactical waste. |
| **$0\% - 10\%$** | *Marginal Compression Regime* | Payload is near Shannon entropy limit; compaction yields minimal delta. |
| **$< 0\%$ (Negative)** | *Overhead Saturation Regime* | Compaction metadata or prefix tokens exceed saved bytes (diagnostic finding). |

### 3. Separation of Reference vs. Out-of-Sample Workloads
- **Reference Workload Suite (`OpenAiTaskSuite`)**: 4 curated, version-pinned test cases for reproducible regression testing in CI.
- **Out-of-Sample Evaluation (`evaluateOutOfSample`)**: Open schema allowing arbitrary JSON, log dumps, or multi-file ASTs to be injected via CLI or SDK without pre-calibrated expectations.

---

## Consequences

- **Positive**: Eliminates target-seeking bias; evaluators grade model output without knowing if context was compacted.
- **Positive**: Explicitly handles and documents sub-optimal or negative-savings workloads without treating them as test suite failures.
- **Positive**: Solidifies the philosophical transition from marketing claims to a resilient, falsifiable scientific apparatus.
