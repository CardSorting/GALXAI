# Knowledge domains

<!-- docs-scope: current-guide -->

Generated from [registry.json](registry.json). Roles identify responsibility; they do not grant repository or production access. Run `npm run docs:status` for current review state.

## Documentation and decisions

Owner role: **Documentation maintainer**. Domain: `knowledge`.

- [GALX maintainer knowledge base](../../docs/README.md)
- [Knowledge maintenance instructions](../../docs/AGENTS.md)
- [Documentation authority and maintenance](../../docs/DOCUMENTATION_POLICY.md)
- [Knowledge operations](../../docs/knowledge/README.md)
- [Knowledge system audit and design rationale](../../docs/knowledge/DESIGN_RATIONALE.md)
- [Tutorials](../../docs/tutorials/README.md)
- [Make your first safe change](../../docs/tutorials/first-change.md)
- [How-to guides](../../docs/how-to/README.md)
- [Maintain knowledge with a change](../../docs/how-to/change-with-documentation.md)
- [Runbook catalog](../../docs/runbooks/README.md)
- [Reconcile stale knowledge](../../docs/runbooks/knowledge-maintenance.md)
- [Prepare and verify a release](../../docs/runbooks/release-readiness.md)
- [Reference](../../docs/reference/README.md)
- [Knowledge commands and metadata](../../docs/reference/knowledge-commands.md)
- [Explanations](../../docs/explanations/README.md)
- [Write and maintain an architecture decision](../../docs/maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md)
- [CI and documentation automation](../../docs/maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md)
- [Subsystem responsibility and reviewers](../../docs/maintainers/SUBSYSTEM_MAINTAINER_MATRIX.md)
- [Maintainer learning path](../../docs/maintainers/DAY_1_TO_30_ONBOARDING_ROADMAP.md)
- [Assess maintainer readiness](../../docs/maintainers/MAINTAINER_ONBOARDING_ASSESSMENT.md)
- [ADR template](../../docs/knowledge/templates/adr.md)
- [Runbook template](../../docs/knowledge/templates/runbook.md)
- [ADR 0145: Maintain knowledge with source changes](../../docs/adr/0145-maintained-knowledge-and-decision-lifecycle.md)
- [Operate the weekly knowledge audit](../../docs/runbooks/weekly-knowledge-audit.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run docs:audit`, `npm run test:docs`.

## Images, history and Favorites

Owner role: **Product/API maintainer**. Domain: `images`.

- [Application queues and relay jobs](../../docs/QUEUE_SPECIFICATION.md)
- [Image public boundary verification](../../docs/maintainers/image-public-boundary.md)
- [Image generation and library recovery](../../post-mortem/runbooks/image-generation.md)
- [Large image libraries](../../docs/maintainers/image-library-scale.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:image:security`, `npm run test:image:db`, `npm run test:image:scale`, `npm run test:image:library-db`, `npm run test:relay:image`.

## Identity and private developer preview

Owner role: **Security/access maintainer**. Domain: `access`.

- [Developer private preview](../../docs/operations/developer-preview.md)
- [Private preview administration](../../docs/operations/preview-admin.md)
- [Private preview activation — 2026-09-12](../../docs/operations/preview-activation.md)
- [Developer preview reads and hybrid sync](../../docs/operations/preview-hybrid-sync.md)
- [Workspace authentication and recovery](../../docs/operations/workspace-auth.md)
- [Authentication and credential ingestion boundaries](../../docs/STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md)
- [Authentication security posture and threat model](../../docs/SECURITY_POSTURE_AND_THREAT_MODEL.md)
- [ADR 0147: Verified account and session authority](../../docs/adr/0147-verified-account-and-session-authority.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:preview-admin`, `npm run test:image:security`, `npm run test:auth:sessions`.

## Sites workspace and publication

Owner role: **Sites maintainer**. Domain: `sites`.

- [Sites generation and delivery operations](../../docs/maintainers/SITES_OPERATIONS.md)
- [Sites paid access and fair usage](../../docs/maintainers/SITES_FAIR_USAGE.md)
- [Sites workspace operations](../../docs/maintainers/SITES_WORKSPACE.md)
- [Sites address operations](../../docs/maintainers/SITES_DOMAINS.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:sites:fair`, `npm run test:sites:workspace`, `npm run test:sites:conversation`, `npm run test:sites:fair:db`, `npm run test:sites:workspace:db`.

## Relay lifecycle and operations

Owner role: **Relay operator**. Domain: `relay`.

- [GALX architecture](../../docs/ARCHITECTURE.md)
- [Federation contract](../../docs/FEDERATION_STRATEGY.md)
- [Capability-aware relay vNext](../../docs/RELAY_VNEXT_RUNBOOK.md)
- [Telemetry and observability](../../docs/TELEMETRY_AND_OBSERVABILITY.md)
- [Telemetry sources and interpretation](../../docs/maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md)
- [Federation request telemetry](../../docs/maintainers/RELAY_TELEMETRY.md)
- [Federation hardening checks](../../docs/maintainers/RELAY_HARDENING.md)
- [Controller ownership and stale-lock recovery](../../post-mortem/runbooks/controller-lock.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:relay:capabilities`, `npm run test:relay:desktop-login`.

## Database authority and migrations

Owner role: **Database operator**. Domain: `database`.

- [Supabase authority and operational boundaries](../../docs/SUPABASE_PARANOID_ARCHITECTURE_SPEC.md)
- [PostgreSQL migration and recovery operations](../../docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run db:verify`, `npm run db:test`.

## Release and deployment boundaries

Owner role: **Release operator**. Domain: `delivery`.

- [Deployment boundaries](../../docs/DEPLOYMENT.md)
- [Application deployment and configuration](../../docs/VERCEL_DEPLOYMENT.md)
- [Prepare and verify a release](../../docs/runbooks/release-readiness.md)
- [Deployment storage containment](../../post-mortem/runbooks/deployment-storage.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run docs:check`, `npm run build`, `npm run docs:check:build`.

## BroccoliDB and bounded synchronization

Owner role: **BroccoliDB maintainer**. Domain: `broccolidb`.

- [Developer preview reads and hybrid sync](../../docs/operations/preview-hybrid-sync.md)
- [BroccoliDB compaction and synchronization checks](../../docs/maintainers/COMPACTOR_FUZZING_AND_QA_MATRIX.md)
- [Large image libraries](../../docs/maintainers/image-library-scale.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:broccolidb:api`, `npm run test:broccolidb:hardening`, `npm run test:egress:transport`.

## Client request efficiency and navigation

Owner role: **Product/performance maintainer**. Domain: `client-efficiency`.

- [Vercel quota efficiency](../../docs/maintainers/VERCEL_QUOTA_EFFICIENCY.md)
- [Navigation and request intent](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md)
- [Public navigation, pricing and knowledge base](../../docs/maintainers/PUBLIC_DISCOVERY.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:egress:transport`, `npm run test:image:security`, `npm run build`.
