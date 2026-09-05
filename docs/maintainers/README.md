# 🛡️ GALXAI Maintainers Knowledge Base & Internal Engineering Manual

> **Authoritative Specification & Internal Knowledge Base for Repository Maintainers**  
> **Target Audience**: Core System Architects, Subsystem Maintainers, SRE On-Call Engineers, and Autonomous AI Database Operators.

---

## 📑 Maintainer Documentation Directory

This directory contains the deep internal architectural blueprints, onboarding roadmaps, dependency DAGs, and on-call operational runbooks for maintaining the GALXAI platform:

| Guide | Document Link | Description & Operational Scope |
| :--- | :--- | :--- |
| **Maintainer Onboarding Roadmap** | [DAY_1_TO_30_ONBOARDING_ROADMAP.md](DAY_1_TO_30_ONBOARDING_ROADMAP.md) | Comprehensive 30-day milestone roadmap for incoming engineers (Day 1 green build $\to$ Day 7 first PR $\to$ Day 14 on-call $\to$ Day 30 autonomous architecture). |
| **Maintainer Glossary & Lexicon** | [MAINTAINER_GLOSSARY_AND_LEXICON.md](MAINTAINER_GLOSSARY_AND_LEXICON.md) | Authoritative glossary defining BroccoliDB, P-AHT, SWRR, AAD, and factual grounding invariants. |
| **Maintainer Onboarding Assessment** | [MAINTAINER_ONBOARDING_ASSESSMENT.md](MAINTAINER_ONBOARDING_ASSESSMENT.md) | 10-question self-assessment test covering physical representation thesis, AAD ciphers, and fail-closed safety. |
| **Maintainer CLI Cheatsheet** | [MAINTAINER_CLI_CHEATSHEET.md](MAINTAINER_CLI_CHEATSHEET.md) | Quick-reference card of all maintainer CLI commands, testing flags, and operational scripts. |
| **Subsystem Ownership Matrix** | [SUBSYSTEM_MAINTAINER_MATRIX.md](SUBSYSTEM_MAINTAINER_MATRIX.md) | Declarative directory ownership, primary/secondary reviewers, test suites, and ADR mappings. |
| **Subsystem Internals & Dependency DAG** | [SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md](SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md) | Full architectural component map, internal dataflow DAG, memory allocation limits, and concurrency models across Serverless and Edge mesh runtimes. |
| **Product Surface Strategy** | [../PRODUCT_SURFACE_STRATEGY.md](../PRODUCT_SURFACE_STRATEGY.md) | Hosted-product boundary, model-first activation journey, diagnostic sandbox limits, copy rules, roadmap test, and success measures. |
| **CI Pipeline & Automation Spec** | [CI_PIPELINE_AND_AUTOMATION_SPEC.md](CI_PIPELINE_AND_AUTOMATION_SPEC.md) | 5-stage automated CI gate topologies, PR exit criteria, and GitHub Actions workflows. |
| **Performance Benchmarking & SLOs** | [PERFORMANCE_BENCHMARKING_AND_SLOS.md](PERFORMANCE_BENCHMARKING_AND_SLOS.md) | Latency budgets ($P_{95} \le 1.5\text{ms}$), compression targets ($\ge 60\%$), memory bounds, and continuous performance regression testing. |
| **Release Engineering & Versioning** | [RELEASE_ENGINEERING_AND_VERSIONING.md](RELEASE_ENGINEERING_AND_VERSIONING.md) | SemVer 2.0.0 rules, canary release branch topology, automated pre-release verification, and instant rollback procedures. |
| **Multi-Tenant Shards & Key Rotation** | [MULTI_TENANT_SHARD_AND_KEY_ROTATION.md](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) | Shard fleet headroom, zero-downtime 3-phase master vault key rotation (`v1` $\to$ `v2`), and credential re-encryption. |
| **Telemetry & Observability** | [TELEMETRY_AND_METRICS_OBSERVABILITY.md](TELEMETRY_AND_METRICS_OBSERVABILITY.md) | Prometheus `/metrics` gauges/counters, structured JSON logs, and high-priority Grafana alert rules. |
| **Git Workflows & Conventional Hooks** | [GIT_WORKFLOWS_AND_HOOKS.md](GIT_WORKFLOWS_AND_HOOKS.md) | Conventional Commits 1.0.0, automated pre-commit typecheck hooks (`npm run hooks:install`), and branch guidelines. |
| **Security Incidents & CVE Playbook** | [SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md](SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md) | Sev-1/Sev-2 incident response SLAs, emergency key compromise re-encryption drill, and private CVE advisories. |
| **Upstream Provider Outage Response** | [UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md](UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md) | Outage failover mechanics, circuit breaker shard shedding, cross-model aliasing, and recovery probes. |
| **Compactor Fuzzing & QA Matrix** | [COMPACTOR_FUZZING_AND_QA_MATRIX.md](COMPACTOR_FUZZING_AND_QA_MATRIX.md) | 5 fuzzing vectors (ReDoS, Unicode, deep nesting, entity tampering, truncated streams) and automated QA recipes. |
| **Debugging & Diagnostic Runbooks** | [DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md](DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md) | Step-by-step diagnostic decision trees, log analysis recipes, cryptographic decryption troubleshooting, and database connection pool triage. |
| **PostgreSQL & AOP-DB Runbook** | [POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) | 3-Phase Expand/Contract schema protocol, zero-lock concurrent DDL rules, and default-deny RLS policy templates. |
| **Cloudflare Edge Mesh Runbook** | [CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md](CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md) | 300+ PoP edge topology, RATE_LIMIT_KV sliding-window pacing, SWR cache purging, and canary deployment runbooks. |
| **ADR Authoring & Lifecycle Guide** | [ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) | MADR specification, the 5-stage ADR lifecycle, mandatory triggers, standard templates, and Core Architect review checklists. |
| **Flaky Tests & CI Triage Matrix** | [FLAKY_TESTS_AND_CI_TRIAGE.md](FLAKY_TESTS_AND_CI_TRIAGE.md) | Root causes of test flakiness (port collisions, P-AHT micro-jitter, V8 JIT warmup, time drift) and deterministic triage playbooks. |
| **AI Agent Governance & Pair Programming** | [AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) | Protocols for human architects and autonomous AI coding agents (Antigravity/Claude/Cursor), mechanical containment gates, and safety rules. |
| **Master Maintainers Manual** | [../../MAINTAINERS.md](../../MAINTAINERS.md) | High-level maintainer governance, product-surface discipline, CODEOWNERS mapping, the 5-Gate PR checklist, and the 10 Invariant Commandments. |
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

# 6. Chat Context Hardening & Tool Invariant Test Suite
npx tsx scripts/test-chat-context-hardening.ts

# 7. Paranoid Supabase PostgreSQL 53-Migration Linter
npm run db:verify

# 8. Live Supabase 92-Test Zero-Egress Database Integration Suite
npm run db:test

# 9. Universal Router & Ingestion Suite (218 Tests)
npm run test:router

# 10. Cloudflare Edge Mesh 46-Point Test Suite
npm run worker:test

# 11. Real End-to-End Inference Pipeline (100% Wire Execution & Sample Project Generation)
npm run test:inference

# 12. Strict TypeScript Typecheck
npx tsc --noEmit
```

---

*For contributing guidelines, see [CONTRIBUTING.md](../../CONTRIBUTING.md). For security policies, see [SECURITY.md](../../SECURITY.md).* 🥦🛡️🚀
