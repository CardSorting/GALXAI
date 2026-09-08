# 10. Enterprise 30-Day Zero-Risk Pilot Agreement & Commercial Terms

<!-- docs-scope: commercial-draft -->
> **Reading scope:** Commercial or product planning material. Claims, prices, forecasts, and examples require separate dated validation; they are not deployment guarantees, certifications, or SLAs. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

---

### Executive Overview
This document outlines the standard commercial terms, SLA guarantees, and Net Spend Interception billing model for the **GALXAI 30-Day Enterprise Reverse-Audit Pilot Program**.

---

## 1. Pilot Program Objectives & Deliverables

During the 30-day pilot, GALXAI operates as the enterprise's transparent AI Consumption & Spend Governance Layer without requiring backend refactoring or code migrations.

### Core Pilot Deliverables:
1. **Day 1: Traffic Reverse-Audit**: Immediate forensic attribution mapping gross OpenAI spend by repository, microservice, feature, and team ID.
2. **Day 7: Waste Remediation Benchmark**: Quantitative report detailing dollar savings unlocked from:
   - **Intelligent Tier Cascading** (routing simple classification/extraction from `gpt-5.6-sol` to `gpt-5.6-terra`/`luna`).
   - **Dynamic Prefix Restructuring** (restoring 75% prompt caching on volatile system headers).
   - **CI/CD & Staging Hard Caps** (preventing test runner overburn).
   - **Subagent Recursion Circuit Breakers** (clamping infinite tool error loops).
3. **Day 14: Quality Equivalence Attestation**: Statistical evaluation proof showing quality variance $\Delta \ge -0.005$ with $N \ge 500$ sample shadow runs.
4. **Day 30: Executive Board Report & Consolidated Invoicing**: Executive summary proving net budget recovery and formal transition to enterprise contract.

---

## 2. Commercial Model: Net Spend Interception

GALXAI replaces the direct retail OpenAI bill with a lower, consolidated wholesale invoice:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NET SPEND INTERCEPTION INVOICE MODEL                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Current Direct Retail OpenAI Invoice:       $100,000 / month             │
│ 2. GalX Net Consolidated Invoice:             $ 62,000 / month             │
│    • Underlying Wholesale Compute:            $ 48,000 / month             │
│    • GalX Platform & Governance Share:        $ 14,000 / month             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Enterprise Direct Net Budget Reduction:    -$ 38,000 / month (-38.0%)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Why Procurement Signs**:
> The enterprise pays $38,000 **less** in gross cash outflow from month one. No new vendor budget line item is required because GALXAI acts as the primary compute clearinghouse.

---

## 3. Data Privacy & Zero-Data-Retention (ZDR) Guarantees

* **Zero Plaintext Storage**: GALXAI does not store, log, or persist customer prompt or completion payloads to disk.
* **Direct Shard Routing**: Inference traffic routes directly to dedicated OpenAI enterprise shards with zero-training guarantees.
* **SOC 2 Type II & HIPAA Aligned**: Ephemeral session key encryption (AES-256-GCM) with instant memory zeroization upon stream completion.

---

## 4. Integration: 60-Second DNS / Gateway Shift

To activate the pilot, the enterprise updates a single environment variable:
```bash
# Point any OpenAI-compatible client, LangChain, or Vercel AI SDK to GalX:
OPENAI_BASE_URL="https://gateway.galx.ai/v1"
```

---

## 5. Exit Criteria & Success Thresholds

The pilot is deemed successful and converts to an annual enterprise subscription when:
1. **Net Savings Delivered**: GalX demonstrates $\ge 25\%$ verified reduction in monthly gross inference spend.
2. **Zero Quality Degradation**: Critical path eval suites maintain $\ge 99.0\%$ baseline equivalence.
3. **Zero Latency Penalty**: Edge routing overhead averages $\le 15\text{ms}$ on Anycast edge PoPs.
