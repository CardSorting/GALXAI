# 📋 Engineering & Strategy Handover Document
### GALXAI: AI Consumption, Velocity & Autonomous Spend Governance

> **Purpose of this Document**: This document provides incoming engineers, staff architects, and technical advisors with the complete strategic context, architectural primitives, commercial hypotheses, and open design trade-offs behind GALXAI. Read this to evaluate whether you agree with the current strategy, or to propose alternative architectural approaches.

> **Review status (2026-08-27)**: The hypotheses below have now been tested against the implementation and current provider documentation. The resulting decision, trust gaps, and staged build plan are in [Governance Control Plane Review](docs/GOVERNANCE_CONTROL_PLANE_REVIEW.md). Treat claims about autonomous remediation, fixed savings percentages, and automatic prompt restructuring below as hypotheses—not production capabilities—until their evidence and enforcement paths are complete.

---

## 1. Executive Context & The Pivot

### The Starting Point (The Commodity Trap)
GALXAI was originally conceptualized around an inference optimization engine (token aggregation, wholesale discount float, upstream shard failover). The early pitch was essentially: *"We sell OpenAI tokens for 25%–40% cheaper."*

### The Realization
During customer and investor discovery, a fundamental commercial realization emerged:
1. **"Cheaper tokens" is a commodity race-to-the-bottom**: It attracts price-sensitive hobbyists and invites direct margin compression from foundation labs.
2. **The actual enterprise burning pain is not token price—it is unmanaged operational waste**: Enterprise leadership does not know *why* their OpenAI bills are $50k–$200k/month or *how to make it stop*.
3. **The developer burning pain is "Infrastructure Tuition"**: Engineering teams spend 3–6 weeks wiring backend route proxies, handling client API key security, debugging 429 rate-limit storms, and building streaming state machines before making their first dollar of AI revenue.

### The Current Dual-Pillar Positioning
GALXAI is positioned as the **AI Consumption & Spend Governance Layer**:
* **Pillar 1 (For Developers & Founders)**: **Accelerated Time-to-First-Dollar** (Drop-in React primitives `<GalxChat />`, `<GalxImage />`, and 1-line auto-patch `import 'galxai/patch'`).
* **Pillar 2 (For Engineering Leadership & CFOs)**: **Autonomous Spend Governance & Forensic Control** (Reverse-auditing live traffic to detect frontier model misallocation, cache collisions, and runaway agent loops at `/audit`).

---

## 2. Core Problem Statement

The enterprise buyer's question:
> **“Why is our AI bill so high, and how do we make it stop?”**

Across production workloads, **40% to 70% of gross AI spend is pure operational leakage**:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           THE 5 CORE SPEND LEAKAGE DRIVERS                        │
├───────────────────────────────────────────────────────────────────────────────────┤
│ 1. Frontier Misallocation  │ Running simple formatting/routing on SOTA reasoning  │
│ 2. Cache-Busting Prompts   │ Moving timestamps/UUIDs breaking prompt prefix hash  │
│ 3. Runaway Agent Loops     │ Autonomous subagents stuck in retry loops or bloat   │
│ 4. Uncapped CI/CD Staging  │ GitHub Actions test suites hitting production models │
│ 5. Duplicate Inference     │ Multiple services asking identical semantic queries  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Current Architecture & Technical Primitives

```
                                  INCOMING TRAFFIC
                  ┌──────────────────────────────────────────────┐
                  │ 1. Declarative UI (<GalxChat />, <GalxImage>) │
                  │ 2. 1-Line Gateway (OPENAI_BASE_URL)          │
                  │ 3. SDK Patch (import 'galxai/patch')         │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │       GALXAI EDGE CONTROL PLANE GATEWAY        │
                 ├────────────────────────────────────────────────┤
                 │ • Query Entropy & Intent Analyzer              │
                 │ • Dynamic Prefix Restructuring (75% Caching)   │
                 │ • Intelligent Tier Cascader (Sol->Terra->Luna) │
                 │ • Autonomous Circuit Breaker (Agent Clamping)  │
                 │ • Departmental Attribution & Chargeback Logger │
                 └──────────────────────┬─────────────────────────┘
                                         │
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │          UPSTREAM UPSTREAM INFERENCE           │
                 │      (Direct Wholesale OpenAI Shards)          │
                 │   • gpt-5.6-sol  • gpt-5.6-terra • gpt-5.6-luna│
                 │   • openai-gpt-image-2 / 1.5 / 1               │
                 └────────────────────────────────────────────────┘
```

### Key Technical Artifacts Built in Workspace:
1. **`/calculator`** ([src/components/calculator/CalculatorClient.tsx](file:///Users/bozoegg/Desktop/GALXAI/src/components/calculator/CalculatorClient.tsx)):
   * Interactive TCO simulator modeling wholesale rates, 75% prompt caching pass-through, avoided developer tuition (~15 hrs/mo/dev), and 1-click archetype presets.
2. **`/audit`** ([src/components/audit/AuditClient.tsx](file:///Users/bozoegg/Desktop/GALXAI/src/components/audit/AuditClient.tsx)):
   * Interactive Spend Forensic Control Tower with dynamic scale slider ($5k to $5M/mo), before/after code diff inspectors, departmental chargeback table, and live payload entropy analyzer.
3. **Quality Equivalence & Tier Cascading Eval Harness** ([src/core/evals/TierCascadingEvalHarness.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/evals/TierCascadingEvalHarness.ts)):
   * Statistical benchmark harness (`scripts/run-tier-cascading-evals.ts`) measuring 95% Wilson confidence intervals ($\Delta \ge -0.005$) to prove zero quality degradation when cascading from Sol to Luna/Terra.
4. **Declarative UI Component Suite** ([src/sdk/ui/](file:///Users/bozoegg/Desktop/GALXAI/src/sdk/ui/)):
   * `<GalxChat />`, `<GalxImage />`, and `<GalxReasoningStream />` React primitives with zero-proxy server-side security.
5. **Model Catalog & Router** ([src/core/router/ModelCatalog.ts](file:///Users/bozoegg/Desktop/GALXAI/src/core/router/ModelCatalog.ts)):
   * Strictly configured for OpenAI flagship suite (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, and GPT-Image suites).
6. **Investor Diligence Room** ([docs/investors/](file:///Users/bozoegg/Desktop/GALXAI/docs/investors/)):
   * 10 comprehensive diligence memos including [08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md](file:///Users/bozoegg/Desktop/GALXAI/docs/investors/08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md), [09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md](file:///Users/bozoegg/Desktop/GALXAI/docs/investors/09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md), and [10_ENTERPRISE_PILOT_PROPOSAL_AND_AGREEMENT.md](file:///Users/bozoegg/Desktop/GALXAI/docs/investors/10_ENTERPRISE_PILOT_PROPOSAL_AND_AGREEMENT.md).

---

## 4. Key Questions & Trade-offs for the Reviewing Engineer

We want your candid assessment on the following critical strategic and engineering questions:

### ❓ Question 1: The Gateway vs SDK Abstraction Dilemma
* **Current Strategy**: We support both (1-line gateway URL proxy + drop-in React components).
* **The Debate**: Should GalX double down primarily on the **Network Proxy / Gateway Layer** (competing with Cloudflare AI Gateway, Portkey, Helicone) OR should we focus heavily on the **Application / React Component Layer** (`<GalxChat />`, `<GalxImage />`) where developers get instant UI zero-proxy velocity?
* *What is the stronger moat?*

### ❓ Question 2: Autonomous Model Cascading vs Quality Paranoia
* **Current Strategy**: GalX can automatically route low-entropy tasks from `gpt-5.6-sol` to `gpt-5.6-luna` to save 80% on token output.
* **The Challenge**: Enterprise engineering leads are often terrified of silent output quality degradation.
* *How should we prove equivalence? Should we offer shadow-mode output comparison, deterministic prompt regression scoring, or require explicit opt-in per route?*

### ❓ Question 3: Commercial Invoicing Psychology (Net Spend vs SaaS)
* **The Discovery Insight**: If an enterprise saves $900k and gets a new vendor invoice for $100k, procurement may still balk at adding a new line-item vendor.
* **Current Strategy**: **Net Spend Interception** (GalX acts as the compute clearinghouse—replacing their direct $1M OpenAI bill with a lower $550k consolidated bill, so no new budget line item is created).
* *Is this spend interception model easier or harder to sell than a traditional $20k/yr B2B SaaS platform fee?*

### ❓ Question 4: Product Surface Focus — Observability vs Automated Remediation
* **The Landscape**: Tools like Langfuse, Arize, and Helicone focus heavily on *Observability & Tracing* (showing graphs of what happened).
* **GalX Thesis**: Observability alone doesn't fix the bill. The high-value product is **Automated Remediation** (automatically restructuring prefixes, clamping agent loops, and downgrading test keys).
* *Do you agree that automated remediation is the winning wedge, or is deep observability table-stakes first?*

---

## 5. Quickstart for Exploring the Codebase

```bash
# 1. Run local dev server
npm run dev

# 2. Key live routes to inspect:
# - http://localhost:3000/calculator (TCO & Velocity Simulator)
# - http://localhost:3000/audit      (Spend Forensic & Governance Control Tower)
# - http://localhost:3000/models     (OpenAI Model Arena)
# - http://localhost:3000/playground (API Testing Shell)

# 3. Verify TypeScript build
npx tsc --noEmit
```

---

## 6. Feedback & Ideas Form

If you are reviewing this document, please evaluate:
1. **Agree / Disagree with the "Time-to-First-Dollar + Spend Governance" thesis?**
2. **What technical edge cases or failure modes in automated prompt prefix restructuring should we watch out for?**
3. **What is the single most compelling feature an enterprise VP of Engineering would pay for on Day 1?**
