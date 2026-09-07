# Maintainer documentation

Start with [Architecture](../ARCHITECTURE.md), [product strategy](../PRODUCT_SURFACE_STRATEGY.md), and the [ADR catalog](../adr/README.md). Identify whether a change targets the application, platform pool, Worker, or standalone relay before applying a runbook.

For the current relay, use [setup and rollback](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md), [fleet and credentials](RELAY_QUOTA_AND_FLEET.md), [hardening checks](RELAY_HARDENING.md), and [telemetry](RELAY_TELEMETRY.md). Inference access does not grant administration; model output does not grant local execution authority. Provider quotas and health/readiness are different signals.

Commands and suite counts can change. Inspect `package.json` and the relevant script before running benchmarks, database checks, secret synchronization, or deployment operations. Record verification with its version, environment, and date. Historical measurements are not permanent SLOs.

## Complete guide catalog

- [🏛️ Architecture Decision Record (ADR) Maintainer Lifecycle & Authoring Guide](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md)
- [🤖 Maintainer Guide: AI Agent Pair Programming & Autonomous Governance](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md)
- [🤖 Maintainer Specification: CI Pipeline, Automation & Invariant Gates](CI_PIPELINE_AND_AUTOMATION_SPEC.md)
- [Cloudflare maintainer runbook](CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md)
- [🧪 Maintainer Guide: Compactor Fuzzing, Edge Cases & QA Matrix](COMPACTOR_FUZZING_AND_QA_MATRIX.md)
- [🗓️ Maintainer Day 1 to Day 30 Onboarding Roadmap](DAY_1_TO_30_ONBOARDING_ROADMAP.md)
- [🔧 Maintainer Debugging & Diagnostic Runbooks](DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md)
- [🛠️ Maintainer Guide: Flaky Tests, CI Traps & Deterministic Triage](FLAKY_TESTS_AND_CI_TRIAGE.md)
- [🪝 Maintainer Guide: Git Workflows, Hooks & Conventional Commits](GIT_WORKFLOWS_AND_HOOKS.md)
- [⚡ GALXAI Maintainer CLI Cheatsheet & Command Reference](MAINTAINER_CLI_CHEATSHEET.md)
- [📖 Maintainer Glossary & Architectural Lexicon](MAINTAINER_GLOSSARY_AND_LEXICON.md)
- [🎓 Maintainer Onboarding Knowledge Check & Self-Assessment](MAINTAINER_ONBOARDING_ASSESSMENT.md)
- [Maintainer Runbook: Shard Authority and Key Rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md)
- [📊 Maintainer Guide: Performance Benchmarking & Service Level Objectives (SLOs)](PERFORMANCE_BENCHMARKING_AND_SLOS.md)
- [🗄️ Maintainer Runbook: PostgreSQL Migrations & AOP-DB Protocol](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md)
- [Relay hardening checklist and evidence](RELAY_HARDENING.md)
- [Relay fleet and credential recovery](RELAY_QUOTA_AND_FLEET.md)
- [Relay request telemetry](RELAY_TELEMETRY.md)
- [Relay telemetry UX](RELAY_TELEMETRY_UX.md)
- [🚀 Maintainer Guide: Release Engineering, Versioning & Canary Rollout](RELEASE_ENGINEERING_AND_VERSIONING.md)
- [🚨 Maintainer Playbook: Security Incidents, Key Compromise & CVE Governance](SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md)
- [🏛️ Subsystem Internals & Dependency DAG](SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md)
- [🏛️ Subsystem Ownership & Maintainer Matrix](SUBSYSTEM_MAINTAINER_MATRIX.md)
- [📈 Maintainer Guide: Telemetry, Observability & Prometheus Metrics](TELEMETRY_AND_METRICS_OBSERVABILITY.md)
- [Upstream outage and credential recovery](UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md)
