# GALX maintainer knowledge base

<!-- docs-scope: current-guide -->
<!-- GALX_PRIVATE_KNOWLEDGE_CONTENT -->

Find the next action, its owner and the evidence needed to finish it. This repository knowledge base is private. Images and Sites are public products; developer APIs require individual preview approval. Customer-facing documentation lives in the application and follows the public information boundary.

## Start with your task

| I need to… | Start here | Done when… |
| --- | --- | --- |
| Investigate a production failure | [Triage](../post-mortem/runbooks/triage.md) → [known failures](../post-mortem/failure-modes/README.md) | Recovery has dated acceptance evidence; remaining prevention work has an owner |
| Fix generation, image history or Favorites | [Image recovery](../post-mortem/runbooks/image-generation.md) | The original operation, owned asset and persisted state are verified |
| Register or renew a provider account | [Manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) → [monitor operations](maintainers/RELAY_DESKTOPS.md) | Central registration or explicit new sign-in save is committed; runtime application and provider capability are verified separately |
| Find issues, rename or remove an account | [Account management](reference/relay-account-management.md) → [monitor UX](maintainers/RELAY_TELEMETRY_UX.md) | The own-pool action is confirmed, conflicts reconciled and any desktop cleanup checked |
| Open a local Premium or Standard monitor | [Local monitor access](runbooks/relay-pool-services.md#local-docker-operation-on-the-owners-mac) | The selected monitor opens with its own authorized session |
| Make my first change | [First safe change](tutorials/first-change.md) | A reviewable local diff has appropriate checks and updated guidance |
| Change a feature or contract | [Maintain knowledge with a change](how-to/change-with-documentation.md) | Source, guides, decisions and evidence agree |
| Make an architectural decision | [ADR lifecycle](maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md) | A bounded decision names alternatives, consequences and confirmation |
| Reduce runtime quota use | [Request efficiency](maintainers/VERCEL_QUOTA_EFFICIENCY.md) | Request budgets pass and hosted savings are measured separately |
| Deploy or roll back | [Release runbook](runbooks/release-readiness.md) | The intended component/revision has separate deployment and acceptance evidence |
| Clear stale guidance | [Knowledge maintenance](runbooks/knowledge-maintenance.md) | Contradictory instructions are reconciled and review status is explicit |
| Find responsibility | [Domain map](knowledge/DOMAINS.md) | The owning source and canonical guide are identified |
| Check what is actually live | [Current operating state](../post-mortem/CURRENT_STATE.md) | The dated target and limits match the question being asked |

## Browse by need

| Learn | Do | Look up | Understand |
| --- | --- | --- | --- |
| [Tutorials](tutorials/README.md) | [How-to guides](how-to/README.md), [runbooks](runbooks/README.md) | [Reference](reference/README.md), [complete catalog](CATALOG.md) | [Explanations](explanations/README.md), [ADRs](adr/README.md) |

Search locally with `npm run docs:find -- "image"` or `npm run docs:find -- "favorites"`. Default results favor active guides; `--history` includes older references, proposals and dated evidence. Search is offline and makes no model or database request. Read a result's scope before acting on it.

[Knowledge operations](knowledge/README.md) explains ownership, review queues and automation. [Documentation policy](DOCUMENTATION_POLICY.md) defines authority. Navigation is generated; semantic review remains explicit.

## Product and operations entry points

- **Billing:** [pages and payment paths](reference/billing-pages.md), [Stripe webhook recovery](runbooks/stripe-webhook-delivery.md).
- **Sites:** [workspace](maintainers/SITES_WORKSPACE.md), [paid access and fair usage](maintainers/SITES_FAIR_USAGE.md), [addresses](maintainers/SITES_DOMAINS.md). Earlier tariffs apply only to historical operations.
- **Images and identity:** [image boundary](maintainers/image-public-boundary.md), [durable image decision](adr/0144-durable-images-and-incident-documentation.md), [incident runbook](../post-mortem/runbooks/image-generation.md).
- **Private developer preview:** [access policy](operations/developer-preview.md), [admin approvals](operations/preview-admin.md), [activation](operations/preview-activation.md), [hybrid synchronization](operations/preview-hybrid-sync.md).
- **Relay:** [central account contract](reference/relay-account-management.md), [local installation and activation](runbooks/relay-pool-services.md), [manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [architecture](ARCHITECTURE.md), [telemetry](TELEMETRY_AND_OBSERVABILITY.md). The existing controller and original jobs use separately scoped [legacy operations](maintainers/legacy-federation-operations.md).
- **Follow-up work:** [rolling incident log](../post-mortem/ROLLING_LOG.md), [open prevention items](../post-mortem/OPEN_ITEMS.md).

Existing file paths and ADR numbers remain stable. The catalog includes historical material for traceability; inclusion does not certify that it describes current behavior.
