# Maintainer guides

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Use the [federation contract](../FEDERATION_STRATEGY.md) and [vNext runbook](../RELAY_VNEXT_RUNBOOK.md) for current relay operations. Identify the component and its authority before applying a subsystem procedure. Older domain references are not fleet-wide guarantees.

Start with [parent/subagent execution](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md), [hardening checks](RELAY_HARDENING.md), and [ADR lifecycle](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md). Keep evidence dated, I/O bounded, and shared mutations serialized.

## Guide catalog

- [ADR authoring and lifecycle](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md)
- [Parent and subagent execution guide](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md)
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
- [Federation hardening checks](RELAY_HARDENING.md)
- [Federation fleet and quota](RELAY_QUOTA_AND_FLEET.md)
- [Federation request telemetry](RELAY_TELEMETRY.md)
- [Capability and recovery UX](RELAY_TELEMETRY_UX.md)
- [🚀 Maintainer Guide: Release Engineering, Versioning & Canary Rollout](RELEASE_ENGINEERING_AND_VERSIONING.md)
- [🚨 Maintainer Playbook: Security Incidents, Key Compromise & CVE Governance](SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md)
- [🏛️ Subsystem Internals & Dependency DAG](SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md)
- [🏛️ Subsystem Ownership & Maintainer Matrix](SUBSYSTEM_MAINTAINER_MATRIX.md)
- [📈 Maintainer Guide: Telemetry, Observability & Prometheus Metrics](TELEMETRY_AND_METRICS_OBSERVABILITY.md)
- [Upstream outage response](UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md)
