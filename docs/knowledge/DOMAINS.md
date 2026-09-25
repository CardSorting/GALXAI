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
- [Stars](../../docs/reference/stars.md)
- [Knowledge commands and metadata](../../docs/reference/knowledge-commands.md)
- [Explanations](../../docs/explanations/README.md)
- [Write and maintain an architecture decision](../../docs/maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md)
- [CI and documentation automation](../../docs/maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md)
- [Subsystem responsibility and reviewers](../../docs/maintainers/SUBSYSTEM_MAINTAINER_MATRIX.md)
- [Maintainer learning path](../../docs/maintainers/DAY_1_TO_30_ONBOARDING_ROADMAP.md)
- [Assess maintainer readiness](../../docs/maintainers/MAINTAINER_ONBOARDING_ASSESSMENT.md)
- [ADR template](../../docs/knowledge/templates/adr.md)
- [Runbook template](../../docs/knowledge/templates/runbook.md)
- [Architecture decision records](../../docs/adr/README.md)
- [ADR 0145: Maintain knowledge with source changes](../../docs/adr/0145-maintained-knowledge-and-decision-lifecycle.md)
- [Operate the weekly knowledge audit](../../docs/runbooks/weekly-knowledge-audit.md)
- [MAINTAINERS](../../MAINTAINERS.md)
- [HANDOVER](../../HANDOVER.md)
- [context](../../context.md)
- [Developer and contributor guide](../../docs/DEVELOPER_GUIDE.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run docs:audit`, `npm run test:docs`.

## Images, history and Favorites

Owner role: **Product/API maintainer**. Domain: `images`.

- [Application queues and relay execution](../../docs/QUEUE_SPECIFICATION.md)
- [Image public boundary verification](../../docs/maintainers/image-public-boundary.md)
- [Image generation and library recovery](../../post-mortem/runbooks/image-generation.md)
- [Large image libraries](../../docs/maintainers/image-library-scale.md)
- [Stars](../../docs/reference/stars.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)
- [Legacy free generation and current image allowance](../../docs/maintainers/FREE_GENERATION_QUOTA.md)
- [Private image allowance and accounting lifecycle](../../docs/maintainers/private-image-accounting.md)
- [Private image release and privacy audit](../../docs/runbooks/private-image-release-audit.md)
- [ADR 0163: Star candidate selection before exhibition](../../docs/adr/0163-star-candidate-selection-before-exhibition.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:image:security`, `npm run test:image:db`, `npm run test:image:scale`, `npm run test:image:library-db`, `npm run test:relay:image`, `npm run test:free-quota`, `npm run test:free-quota:db`, `npm run test:image:remix`, `npm run test:community:profile`, `npm run test:collections:privacy`, `npm run test:broc:selection`.

## Identity and private developer preview

Owner role: **Security/access maintainer**. Domain: `access`.

- [Private developer access](../../docs/operations/developer-preview.md)
- [Private access administration](../../docs/operations/preview-admin.md)
- [Private preview activation — 2026-09-12](../../docs/operations/preview-activation.md)
- [Developer preview reads and hybrid sync](../../docs/operations/preview-hybrid-sync.md)
- [Workspace authentication and recovery](../../docs/operations/workspace-auth.md)
- [Authentication and credential registration boundaries](../../docs/STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md)
- [Authentication security posture and threat model](../../docs/SECURITY_POSTURE_AND_THREAT_MODEL.md)
- [ADR 0147: Verified account and session authority](../../docs/adr/0147-verified-account-and-session-authority.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)
- [Legacy free generation and current image allowance](../../docs/maintainers/FREE_GENERATION_QUOTA.md)
- [OAuth and token lifecycle boundaries](../../docs/OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md)
- [Provider credentials and application identity](../../docs/PROVIDER_AS_AUTH_SPECIFICATION.md)
- [Security boundaries](../../docs/SECURITY.md)
- [Relay security reference](../../docs/relay-security.md)
- [Security and key rotation](../../docs/playbooks/05-security-key-rotation-and-compliance.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:preview-admin`, `npm run test:image:security`, `npm run test:auth:sessions`, `npm run test:free-quota`, `npm run test:free-quota:db`.

## Sites workspace and publication

Owner role: **Sites maintainer**. Domain: `sites`.

- [Sites generation and delivery operations (Retired)](../../docs/maintainers/SITES_OPERATIONS.md)
- [Sites paid access and fair usage (Retired)](../../docs/maintainers/SITES_FAIR_USAGE.md)
- [Sites workspace operations (Retired)](../../docs/maintainers/SITES_WORKSPACE.md)
- [Sites address operations (Retired)](../../docs/maintainers/SITES_DOMAINS.md)
- [ADR 0148: Explicit complimentary Pro access](../../docs/adr/0148-complimentary-pro-access.md)
- [Legacy free generation and current image allowance](../../docs/maintainers/FREE_GENERATION_QUOTA.md)
- [ADR 0149: One-time free generation allowance](../../docs/adr/0149-one-time-free-generation.md)
- [Create and manage Sites (Retired)](../../docs/SITES_WORKSPACE.md)
- [Site content generation (Retired)](../../docs/SITES_CONTENT.md)
- [ADR 0150: Bounded free admission and paid capacity protection](../../docs/adr/0150-free-generation-admission-gate.md)
- [Accessing GALX](../../docs/API_BASE_URL.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:sites:fair`, `npm run test:sites:workspace`, `npm run test:sites:conversation`, `npm run test:sites:fair:db`, `npm run test:sites:workspace:db`, `npm run test:sites:plans:db`, `npm run test:free-quota`, `npm run test:free-quota:db`.

## Relay lifecycle and operations

Owner role: **Relay operator**. Domain: `relay`.

- [GALX architecture](../../docs/ARCHITECTURE.md)
- [Relay execution and account authority contract](../../docs/FEDERATION_STRATEGY.md)
- [Relay operations and implementation entry point](../../docs/RELAY_VNEXT_RUNBOOK.md)
- [Relay health and operational visibility](../../docs/TELEMETRY_AND_OBSERVABILITY.md)
- [Telemetry sources and interpretation](../../docs/maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md)
- [Relay request and account telemetry](../../docs/maintainers/RELAY_TELEMETRY.md)
- [Relay hardening checks](../../docs/maintainers/RELAY_HARDENING.md)
- [Controller ownership and stale-lock recovery](../../post-mortem/runbooks/controller-lock.md)
- [Relay account registration and manual sign-in recovery](../../docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md)
- [Pool sign-in desktops and account repair](../../docs/maintainers/RELAY_DESKTOPS.md)
- [Maintainer runbook: shard authority and key rotation](../../docs/maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md)
- [Maintainer CLI reference](../../docs/maintainers/MAINTAINER_CLI_CHEATSHEET.md)
- [Isolated relay and account management API](../../docs/RELAY_API_REFERENCE.md)
- [Migration to central accounts and isolated relays](../../docs/MIGRATION_GUIDE.md)
- [System topology and maintainer onboarding](../../docs/SYSTEM_TOPOLOGY_AND_MAINTENANCE_ONBOARDING.md)
- [Isolated account capacity and quota](../../docs/maintainers/RELAY_QUOTA_AND_FLEET.md)
- [Provisioning and preflight](../../docs/playbooks/01-provisioning-and-preflight.md)
- [Traffic and pool-specific capacity](../../docs/playbooks/03-live-traffic-and-fleet-scaling.md)
- [Inference verification](../../docs/INFERENCE_PIPELINE_VERIFICATION.md)
- [Relay deployment and transport recovery](../../docs/VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [Resilience and recovery](../../docs/RESILIENCE_AND_DISASTER_RECOVERY.md)
- [Troubleshooting](../../docs/TROUBLESHOOTING.md)
- [Maintainer guides](../../docs/maintainers/README.md)
- [ADR 0152: Manual desktop-only shard authority](../../docs/adr/0152-manual-desktop-only-shard-authority.md)
- [Build and inspect the Premium relay images](../../docs/runbooks/relay-pool-images.md)
- [Operate the local Premium relay and monitor](../../docs/runbooks/relay-pool-services.md)
- [ADR 0162: Local durable ingress queue for the Premium relay](../../docs/adr/0162-local-durable-relay-ingress-queue.md)
- [README](../../BroccoliDB/README.md)
- [README](../../BroccoliDB/docs/README.md)
- [API](../../BroccoliDB/docs/API.md)
- [ARCHITECTURE](../../BroccoliDB/docs/ARCHITECTURE.md)
- [OPERATIONS](../../BroccoliDB/docs/OPERATIONS.md)
- [CONTRIBUTING](../../BroccoliDB/docs/CONTRIBUTING.md)
- [README](../../BroccoliDB/docs/adr/README.md)
- [ADR-006-wal-compaction-without-history](../../BroccoliDB/docs/adr/ADR-006-wal-compaction-without-history.md)
- [API](../../BROCCOLIQUEUE/docs/API.md)
- [operations](../../BROCCOLIQUEUE/docs/operations.md)
- [Central account management and isolated relay contract](../../docs/reference/relay-account-management.md)
- [Legacy federation API](../../docs/reference/legacy-federation-api.md)
- [Legacy federation operations](../../docs/maintainers/legacy-federation-operations.md)
- [Legacy desktop enrollment](../../docs/maintainers/legacy-desktop-enrollment.md)
- [Legacy desktop operations](../../docs/maintainers/legacy-desktop-operations.md)
- [Relay selection and admission](../../docs/ROUTING_ALGORITHMS.md)
- [Application queues and relay execution](../../docs/QUEUE_SPECIFICATION.md)
- [Rate limits, concurrency and quota](../../docs/RATE_LIMITS_AND_QUOTAS.md)
- [Model catalog and observed availability](../../docs/MODEL_CATALOG.md)
- [Security boundaries](../../docs/SECURITY.md)
- [Relay security reference](../../docs/relay-security.md)
- [Account health and management UX](../../docs/maintainers/RELAY_TELEMETRY_UX.md)
- [Subsystem ownership and dependencies](../../docs/maintainers/SUBSYSTEM_INTERNALS_AND_DEPENDENCY_GRAPH.md)
- [Maintainer glossary](../../docs/maintainers/MAINTAINER_GLOSSARY_AND_LEXICON.md)
- [Frequently asked questions](../../docs/FAQS.md)
- [ADR 0153: Central account authority with isolated relay execution](../../docs/adr/0153-central-account-authority-isolated-relays.md)
- [ADR 0159: Local Mac relay operation with bounded availability](../../docs/adr/0159-local-mac-relay-operation.md)
- [Parent and subagent execution guide](../../docs/maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md)
- [Maintainer debugging and diagnostics](../../docs/maintainers/DEBUGGING_AND_DIAGNOSTIC_RUNBOOKS.md)
- [Upstream outage response](../../docs/maintainers/UPSTREAM_PROVIDER_OUTAGE_AND_DEGRADATION.md)
- [Operational playbooks](../../docs/playbooks/README.md)
- [Developer ergonomics and execution authority](../../docs/playbooks/07-zero-hesitation-developer-ergonomics-and-api-governance.md)
- [Developer and operator observation protocol](../../docs/playbooks/08-unframed-developer-observation-protocol.md)
- [Automatic agent tools and turns](../../docs/reference/automatic-agent-tools.md)
- [ADR 0154: Stable relay connections and irreversible legacy credential retirement](../../docs/adr/0154-relay-connection-lifecycle-and-legacy-retirement.md)
- [Shared quota and bounded continuation](../../docs/reference/shared-quota-recovery.md)
- [ADR 0155: Shared quota containment and bounded agent continuation](../../docs/adr/0155-shared-quota-containment-and-bounded-continuation.md)
- [ADR 0156: Verified automatic relay activation](../../docs/adr/0156-verified-automatic-relay-activation.md)
- [ADR 0157: Compatible relay requests and honest output budgets](../../docs/adr/0157-compatible-relay-output-budgets.md)
- [Relay admission lifecycle](../../docs/runbooks/relay-admission-lifecycle.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:relay:capabilities`, `npm run test:relay:desktop-login`, `npm run test:relay:pool-images`, `npm run verify:relay:pool-images`, `npm run test:relay:services`, `npm run verify:relay:service-images`, `npm run test:agent:tools`, `npm run test:relay:activation-db`.

## Database authority and migrations

Owner role: **Database operator**. Domain: `database`.

- [Supabase authority and operational boundaries](../../docs/SUPABASE_PARANOID_ARCHITECTURE_SPEC.md)
- [PostgreSQL migration and recovery operations](../../docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md)
- [Legacy free generation and current image allowance](../../docs/maintainers/FREE_GENERATION_QUOTA.md)
- [Maintainer runbook: shard authority and key rotation](../../docs/maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md)
- [Migration to central accounts and isolated relays](../../docs/MIGRATION_GUIDE.md)
- [Central account management and isolated relay contract](../../docs/reference/relay-account-management.md)
- [Canonical account profile and actor model](../../docs/maintainers/ACCOUNT_PROFILE_SCHEMA.md)
- [ADR 0158: Canonical account profiles with explicit actor provenance](../../docs/adr/0158-canonical-account-profiles-and-actor-provenance.md)
- [ADR 0161: BROC persistent practice for existing Stars](../../docs/adr/0161-broc-persistent-star-practice.md)
- [Private image allowance and accounting lifecycle](../../docs/maintainers/private-image-accounting.md)
- [Private image release and privacy audit](../../docs/runbooks/private-image-release-audit.md)
- [ADR 0163: Star candidate selection before exhibition](../../docs/adr/0163-star-candidate-selection-before-exhibition.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run db:verify`, `npm run db:test`, `npm run test:broc`, `npm run test:broc:db`, `npm run test:relay:manual-db`, `npm run test:relay:authorization-db`, `npm run test:relay:activation-db`, `npm run test:broc:selection`, `npm run test:image:db`.

## Release and deployment boundaries

Owner role: **Release operator**. Domain: `delivery`.

- [Deployment boundaries](../../docs/DEPLOYMENT.md)
- [Application deployment and configuration](../../docs/VERCEL_DEPLOYMENT.md)
- [Prepare and verify a release](../../docs/runbooks/release-readiness.md)
- [Deployment storage containment](../../post-mortem/runbooks/deployment-storage.md)
- [Relay deployment and transport recovery](../../docs/VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [Cloudflare implementation and deployment boundaries](../../docs/CLOUDFLARE_STRATEGY.md)
- [Cloudflare maintainer runbook](../../docs/maintainers/CLOUDFLARE_EDGE_MESH_MAINTAINER_RUNBOOK.md)
- [Deployment and release](../../docs/playbooks/02-deployment-and-release.md)
- [Recover Stripe webhook delivery](../../docs/runbooks/stripe-webhook-delivery.md)
- [Private image release and privacy audit](../../docs/runbooks/private-image-release-audit.md)

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
- [Public navigation, pricing, and knowledge base](../../docs/maintainers/PUBLIC_DISCOVERY.md)
- [Readable product URLs](../../docs/maintainers/readable-urls.md)
- [GALX product surface strategy](../../docs/PRODUCT_SURFACE_STRATEGY.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:egress:transport`, `npm run test:image:security`, `npm run build`.

## Billing, subscriptions and payment recovery

Owner role: **Billing maintainer**. Domain: `billing`.

- [Recover Stripe webhook delivery](../../docs/runbooks/stripe-webhook-delivery.md)
- [Sites paid access and fair usage (Retired)](../../docs/maintainers/SITES_FAIR_USAGE.md)
- [DESIGN](../../src/components/billing/DESIGN.md)
- [Billing pages and payment paths](../../docs/reference/billing-pages.md)
- [Billing boundary and account continuity](../../docs/WALLET_AND_BILLING_STRATEGY.md)
- [DESIGN](../../src/components/home/DESIGN.md)
- [DESIGN](../../src/components/public-content/DESIGN.md)
- [Private image allowance and accounting lifecycle](../../docs/maintainers/private-image-accounting.md)

Relevant checks (select for the change; impact discovery never executes these): `npm run test:billing:lifecycle`, `npm run test:sites:plans:db`, `npm run build`.
