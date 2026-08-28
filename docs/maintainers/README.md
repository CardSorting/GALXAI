# 🛡️ GALXAI Maintainers Knowledge Base & Internal Engineering Manual

> **Authoritative Specification & Internal Knowledge Base for Repository Maintainers**  
> **Target Audience**: Core System Architects, Subsystem Maintainers, SRE On-Call Engineers, and Autonomous AI Database Operators.

---

## 📑 Maintainer Documentation Directory

This directory contains the deep internal architectural blueprints, onboarding roadmaps, dependency DAGs, and on-call operational runbooks for maintaining the GALXAI platform:

| Guide | Document Link | Description & Operational Scope |
| :--- | :--- | :--- |
| **Maintainer Onboarding Roadmap** | [DAY_1_TO_30_ONBOARDING_ROADMAP.md](DAY_1_TO_30_ONBOARDING_ROADMAP.md) | Comprehensive 30-day milestone roadmap for incoming engineers (Day 1 green build $\to$ Day 7 first PR $\to$ Day 14 on-call $\to$ Day 30 autonomous architecture). |
| **Subsystem Internals & Dependency DAG** | [SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md](SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md) | Full architectural component map, internal dataflow DAG, memory allocation limits, and concurrency models across Serverless and Edge mesh runtimes. |
| **Debugging & Diagnostic Runbooks** | [DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md](DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md) | Step-by-step diagnostic decision trees, log analysis recipes, cryptographic decryption troubleshooting, and database connection pool triage. |
| **ADR Authoring & Lifecycle Guide** | [ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) | MADR specification, the 5-stage ADR lifecycle, mandatory triggers, standard templates, and Core Architect review checklists. |
| **Flaky Tests & CI Triage Matrix** | [FLAKY_TESTS_AND_CI_TRIAGE.md](FLAKY_TESTS_AND_CI_TRIAGE.md) | Root causes of test flakiness (port collisions, P-AHT micro-jitter, V8 JIT warmup, time drift) and deterministic triage playbooks. |
| **AI Agent Governance & Pair Programming** | [AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) | Protocols for human architects and autonomous AI coding agents (Antigravity/Claude/Cursor), mechanical containment gates, and safety rules. |
| **Master Maintainers Manual** | [../../MAINTAINERS.md](../../MAINTAINERS.md) | High-level maintainer governance, CODEOWNERS mapping, the 5-Gate PR checklist, and the 10 Invariant Commandments. |
| **Operational SRE Playbooks** | [../playbooks/README.md](../playbooks/README.md) | 8-stage operational runbooks covering provisioning, deployment, live traffic scaling, incident triage, key rotation, DR, DX, and unframed developer observation. |


---

## ⚡ Quick Verification Commands for Maintainers

```bash
# 1. Interactive Maintainer Workstation Onboarding Check
npm run onboard

# 2. BroccoliDB Empirical Boundary Benchmark (OpenAI Models)
npm run bench:inference-boundary

# 3. BroccoliDB 19-Mode API Route Suite
npm run test:broccolidb:api

# 4. BroccoliDB Fail-Closed Hardening Regressions
npm run test:broccolidb:hardening

# 5. Master 180-Domain Compactor Cluster Suite
npm run bench:180-domains

# 6. Universal Router & Ingestion Suite (218 Tests)
npm run test:router

# 7. Cloudflare Edge Mesh 46-Point Test Suite
npm run worker:test

# 8. Strict TypeScript Typecheck
npx tsc --noEmit
```

---

*For contributing guidelines, see [CONTRIBUTING.md](../../CONTRIBUTING.md). For security policies, see [SECURITY.md](../../SECURITY.md).* 🥦🛡️🚀
