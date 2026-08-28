# 🗓️ Maintainer Day 1 to Day 30 Onboarding Roadmap

> **Target Audience**: New Core Maintainers, Subsystem Engineers, and Distributed Systems Architects.  
> **Goal**: Rapidly ramp from zero to confident, autonomous contributor and on-call maintainer within 30 days.

---

## 🎯 The 30-Day Milestone Overview

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE 30-DAY MAINTAINER MILESTONE RAMP                  │
├─────────────────┬─────────────────┬────────────────────┬────────────────────────┤
│ **Week 1**      │ **Week 2**      │ **Week 3**         │ **Week 4**             │
│ (Days 1–7)      │ (Days 8–14)     │ (Days 15–21)       │ (Days 22–30)           │
├─────────────────┼─────────────────┼────────────────────┼────────────────────────┤
│ • Zero-to-Hero  │ • First PR      │ • Shadow On-Call   │ • Primary On-Call      │
│ • Full Green    │ • Domain        │ • Triage Incoming  │ • Author 1 ADR         │
│ • Trace Request │   Compactor Add │   Issues/Bug Fixes │ • Autonomous Substrate │
│ • Local Sandbox │ • PR Gate Pass  │ • Run Sev-1 Drills │   Governance           │
└─────────────────┴─────────────────┴────────────────────┴────────────────────────┘
```

---

## 🗓️ Phase 1: Days 1–3 — Local Mastery & End-to-End Tracing

### Day 1: The First Green Build & Tooling Setup
1. **Bootstrap Environment**:
   ```bash
   git clone https://github.com/CardSorting/GALXAI.git
   cd GALXAI
   npm install
   cp .env.example .env.local
   ```
2. **Execute Maintainer Onboarding Diagnostic**:
   ```bash
   npm run onboard
   ```
3. **Verify All Core Suites**:
   - `npm run bench:entropy` (7-Tier Progressive Institutional Entropy Benchmark)
   - `npm run bench:inference-boundary` (Randomized Branch-Blinded A/B Benchmark)
   - `npm run test:broccolidb:api` (19 Compaction Modes & Facade REST API)
   - `npm run test:broccolidb:hardening` (Fail-Closed Factual Provenance Gate)
   - `npm run test:router` (218 Router, Vault & Auth Tests)
   - `npx tsc --noEmit` (Strict TypeScript Validation)
4. **Deliverable**: Post a screenshot of your clean `npm run onboard` scorecard to the maintainer channel.

---

### Day 2: The 7-Layer Request Tracing Walkthrough
Read through and trace a request across these files in order:
1. `src/app/v1/chat/completions/route.ts` (API Gateway & Header Parse)
2. `src/core/auth/GalxAuthEngine.ts` (Bearer Key Hash & JWE Decryption)
3. `src/core/broccolidb/BroccoliCompactionFacade.ts` (Polymorphic Compaction Dispatcher & Representation Selection)
4. `src/core/broccolidb/BroccoliCompactionSafety.ts` (Fail-Closed Factual Provenance Gate)
5. `src/core/pool/GalxCredentialPool.ts` (P-AHT Hydraulic Headroom Shard Selection)
6. `src/core/circuit/GalxCircuitBreaker.ts` (4-State Circuit Breaker)
7. `src/core/router/GalxModelRouter.ts` (Zero-Copy SSE Stream Engine)

**Exercise**: Add a log line inside `BroccoliCompactionFacade.compactDomain` and run `npx tsx scripts/dissect-payloads-and-causal-analysis.ts` to see your log in action.

---

### Day 3: Simulation & Fault-Injection Drills
1. **Test Fail-Closed Grounding**:
   Intentionally alter a number in a test fixture in `scripts/test-broccolidb-production-hardening.ts` and verify that `BroccoliCompactionSafety` fails closed to raw source text with 0 corruption.
2. **Test Cryptographic AAD Protection**:
   Attempt to decrypt a secret using a different `tenantUid` in `scripts/populate-vault-secrets.ts` and confirm `GalxVaultDecryptionError` is thrown unconditionally.

---

## 🗓️ Phase 2: Days 4–14 — First PR & Subsystem Specialization

### Week 1 Milestone: Add a New Domain Compactor
1. Scaffold a new compactor using the maintainer CLI:
   ```bash
   npm run scaffold:compactor -- --name=DicomImaging --cluster="Clinical Medicine"
   ```
2. Refine the compactor regex patterns in `src/core/broccolidb/BroccoliDicomImagingCompactor.ts`.
3. Wire into `BroccoliDomainSpendOptimizer.ts`.
4. Run verification suites: `npm run bench:180-domains && npm run test:broccolidb:api && npm run test:broccolidb:hardening`.
5. Submit your PR using the [PULL_REQUEST_TEMPLATE](../../.github/PULL_REQUEST_TEMPLATE.md).


---

## 🗓️ Phase 3: Days 15–21 — Shadow On-Call & SRE Playbooks

### Week 2–3 Milestone: Master Operational Playbooks
1. Read all 8 Operational Playbooks in [`docs/playbooks/`](../playbooks/README.md).
2. Execute the interactive playbook runner:
   ```bash
   npm run playbook
   ```
3. Shadow the primary on-call maintainer during incident reviews.
4. Triage incoming bug reports using `.github/ISSUE_TEMPLATE/bug_report.yml`.

---

## 🗓️ Phase 4: Days 22–30 — Autonomous Maintainership & Architecture Records

### Week 4 Milestone: Architectural Contribution & On-Call Readiness
1. Author an Architecture Decision Record (ADR 0066+) in `docs/adr/` proposing an architectural enhancement.
2. Take on primary on-call shift for 1 week.
3. Conduct an unframed developer observation session ([Stage 8 Playbook](../playbooks/08-unframed-developer-observation-protocol.md)) and record qualitative user signal.

---

*Congratulations! You are now a fully certified GALXAI Core Maintainer.* 🥦🛡️🚀
