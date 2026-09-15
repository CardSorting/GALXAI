# Developer and contributor guide

<!-- docs-scope: current-guide -->

Private implementation guide. Start with [contribution workflow](../CONTRIBUTING.md), [product scope](PRODUCT_SURFACE_STRATEGY.md), [current state](../post-mortem/CURRENT_STATE.md) and [documentation policy](DOCUMENTATION_POLICY.md).

## Find the owning code

| Area | Source | Maintained guidance |
| --- | --- | --- |
| Product routes and UI | `src/app`, `src/components` | [Product scope](PRODUCT_SURFACE_STRATEGY.md) |
| Public image HTTP contracts | `src/lib/security`, `src/app/v1/images` | [Image boundary](maintainers/image-public-boundary.md) |
| Durable image requests | `src/lib/images` | [Image recovery](../post-mortem/runbooks/image-generation.md) |
| Identity and repositories | `src/core/auth`, `src/lib/supabase`, `src/lib/db` | [Identity failure modes](../post-mortem/failure-modes/identity.md), [database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) |
| BroccoliDB optimizations | `src/core/broccolidb` | [Component reference](BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md) |
| Developer preview and staff | `src/lib/security/developer-access.ts`, `src/lib/admin`, `src/app/admin` | [Preview operations](operations/developer-preview.md), [admin](operations/preview-admin.md) |
| Central accounts and isolated runtimes/monitors | `src/relay/pool-*`, `scripts/relay-local.mjs` | [Account contract](reference/relay-account-management.md), [service runbook](runbooks/relay-pool-services.md) |
| Retained controller and workers | `src/relay`, `scripts/run-relay-federation.ts` | [Legacy operations](maintainers/legacy-federation-operations.md) |
| Incident evidence | `post-mortem` | [Rolling operations](../post-mortem/README.md) |

Use source and package scripts for exact interfaces. Example code in historical SDK/research documents is not proof that a route exists or is publicly accessible. Confirm ownership and API contract before implementing an integration.

## Boundaries when changing code

Verify identity on the server; never authorize a caller-supplied user ID or editable metadata. Developer approval and staff membership are separate, current checks. Images/Sites stay outside developer approval while preserving their account and ownership boundaries.

Public image responses default to re-encoded binary artifacts. Explicit JSON uses allowlisted fields and opaque owned download links. Never forward internal records, object metadata or upstream headers wholesale. Operational diagnostics are private administrator data.

For async images, persist the receipt before returning 202 and claim dispatch atomically. Store completed owned assets before marking success. Preserve the original operation across retries, and never redispatch an ambiguous generation automatically. Favorites must commit before successful acknowledgement. BroccoliDB improves batching and repeated reads without becoming durable state or authorization authority.

Provider adapters retain explicit capability selection, bounded I/O, cancellation and sanitized errors. A transport error is not permission for silent fallback or a second side effect. Use the owning component's regression suite and actual downstream contract.

The new relay strategy keeps account authority and the existing account lease ledger in the main project, with separate execution-only projects and local VMs/daemons for Premium and Standard. Runtime engines are in-process per account. Standard rejects Sites/images/tool requests before provider I/O; the isolated transport never falls back to the peer or legacy dispatch. Account lifecycle uses explicit manual registration, central revisions and immutable operation identity. The [full contract](reference/relay-account-management.md) defines removal retention, health freshness and renewal. Do not apply retained controller hold/background-sync semantics to these services.

## Local verification and release

Use Node 22 and `npm ci`. Keep secrets in ignored local configuration. Inspect scripts: some contact providers, mutate environment settings or provision credentials. Documentation checking is offline; the database test runner provisions disposable fixtures and rejects production targets.

Run `npm run docs:check`, relevant authorization/adversarial tests, type/lint checks for the change and the production build. For image changes run `npm run test:image:security`; for durable images/Favorites also run `npm run test:image:db`. Database changes follow the migration runbook before remote application.

Record actual commands/results and test scope. Then deploy the required component(s), verify the actual affected user path and scan rendered/browser assets before making a live-public-boundary claim. Follow [release guidance](maintainers/RELEASE_ENGINEERING_AND_VERSIONING.md). Keep the incident register and complete guide bodies current.
