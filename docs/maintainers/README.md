# Maintainer guides

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

Use [central account management](../reference/relay-account-management.md), [local service installation](../runbooks/relay-pool-services.md) and the [relay runbook](../RELAY_VNEXT_RUNBOOK.md) for the implemented Premium/Standard strategy. Identify the component and its authority before applying a subsystem procedure. Older domain references are not fleet-wide guarantees.

Start with [parent/subagent execution](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md), [hardening checks](RELAY_HARDENING.md), and [ADR lifecycle](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md). Keep evidence dated, I/O bounded, and shared mutations serialized.

Public-facing guidance follows [ADR 0129](../adr/0129-public-image-artifacts-and-verified-identity.md) and the [image boundary guide](image-public-boundary.md). Repository operations must not be copied into site content. [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md) governs manual desktop-only enrollment and manual provider renewal; [enrollment](RELAY_CREDENTIAL_ENROLLMENT.md) and [desktops](RELAY_DESKTOPS.md) contain the complete current workflows, including the fixed native monitor apps, explicit sign-in updates, health filters and central rename/remove/restore. The retained controller has separate [legacy enrollment](legacy-desktop-enrollment.md), [desktop operations](legacy-desktop-operations.md) and [federation operations](legacy-federation-operations.md); assigned accounts are excluded from that path. [September 9 verification](RELAY_SESSION_VERIFICATION_20260909.md) is historical rollout evidence and does not authorize its former external enrollment path.

Start incidents in [post-mortem](../../post-mortem/README.md). Use its [current state](../../post-mortem/CURRENT_STATE.md), [rolling log](../../post-mortem/ROLLING_LOG.md) and [known failure modes](../../post-mortem/failure-modes/README.md). Historical component verification remains dated evidence.

Use [task navigation](../README.md), [domain responsibility](../knowledge/DOMAINS.md) and [runbook discovery](../runbooks/README.md) for a focused path. `npm run docs:impact` links changed source to the canonical guides below.

## Guide catalog

- [ADR authoring and lifecycle](ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md)
- [Parent and subagent execution guide](AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md)
- [CI and documentation automation](CI_PIPELINE_AND_AUTOMATION_SPEC.md)
- [Cloudflare maintainer runbook](CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md)
- [🧪 Maintainer Guide: Compactor Fuzzing, Edge Cases & QA Matrix](COMPACTOR_FUZZING_AND_QA_MATRIX.md)
- [Maintainer learning path](DAY_1_TO_30_ONBOARDING_ROADMAP.md)
- [🔧 Maintainer Debugging & Diagnostic Runbooks](DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md)
- [🛠️ Maintainer Guide: Flaky Tests, CI Traps & Deterministic Triage](FLAKY_TESTS_AND_CI_TRIAGE.md)
- [🪝 Maintainer Guide: Git Workflows, Hooks & Conventional Commits](GIT_WORKFLOWS_AND_HOOKS.md)
- [Maintainer CLI reference](MAINTAINER_CLI_CHEATSHEET.md)
- [Maintainer glossary](MAINTAINER_GLOSSARY_AND_LEXICON.md)
- [Assess maintainer readiness](MAINTAINER_ONBOARDING_ASSESSMENT.md)
- [Maintainer Runbook: Shard Authority and Key Rotation](MULTI_TENANT_SHARD_AND_KEY_ROTATION.md)
- [📊 Maintainer Guide: Performance Benchmarking & Service Level Objectives (SLOs)](PERFORMANCE_BENCHMARKING_AND_SLOS.md)
- [🗄️ Maintainer Runbook: PostgreSQL Migrations & AOP-DB Protocol](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md)
- [Central account and registration contract](../reference/relay-account-management.md)
- [Relay manual registration and renewal](RELAY_CREDENTIAL_ENROLLMENT.md)
- [Retained federation operations](legacy-federation-operations.md)
- [Retained desktop enrollment](legacy-desktop-enrollment.md)
- [Retained desktop operations](legacy-desktop-operations.md)
- [Relay desktops and manual repair](RELAY_DESKTOPS.md)
- [Relay session verification — September 9](RELAY_SESSION_VERIFICATION_20260909.md)
- [Relay hardening checks](RELAY_HARDENING.md)
- [Relay account capacity and quota](RELAY_QUOTA_AND_FLEET.md)
- [Relay request and account telemetry](RELAY_TELEMETRY.md)
- [Account management and recovery UX](RELAY_TELEMETRY_UX.md)
- [🚀 Maintainer Guide: Release Engineering, Versioning & Canary Rollout](RELEASE_ENGINEERING_AND_VERSIONING.md)
- [🚨 Maintainer Playbook: Security Incidents, Key Compromise & CVE Governance](SECURITY_INCIDENT_AND_CVE_PLAYBOOK.md)
- [Subsystem ownership and dependencies](SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md)
- [Subsystem responsibility and reviewers](SUBSYSTEM_MAINTAINER_MATRIX.md)
- [Telemetry sources and interpretation](TELEMETRY_AND_METRICS_OBSERVABILITY.md)
- [Upstream outage response](UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md)

- [Sites generation and delivery operations](SITES_OPERATIONS.md)
