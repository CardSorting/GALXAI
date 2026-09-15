# Application deployment and configuration

<!-- docs-scope: current-guide -->

Private application release guide. The application, gateway, controller, workers and database are separate components. [Current state](../post-mortem/CURRENT_STATE.md) contains the latest dated observations; a prior release record is not proof of the current target.

## Configuration preflight

Use [package.json](../package.json), [.env.example](../.env.example) and the existing deployment project for runtime/build settings. Inspect the target environment's required configuration names, presence and credential types without printing values. Local configuration does not prove production configuration. Sensitive values omitted by an API response are not automatically missing.

Account Auth verification needs its configured Auth URL, public credential and the applied active-session lookup migration; administrator clients still require privileged credentials and fail closed otherwise. Image persistence needs the configured database and the private image migration, plus `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_ASSETS_BUCKET_NAME` on the server. Required values remain encrypted/server-only; no public key is elevated into administration.

`VM_RELAY_URL` must be reachable from the deployment with an inference credential accepted by that service. Keep application inference and controller administration keys separate. Do not copy localhost or an expired development tunnel into production. Never rotate vault/signing roots just to make a build pass. Provider credentials are entered only through manually created Relay Desktops and explicit enrollment; application environment values, account sign-in and the retired provider HTTP routes cannot enroll or renew them. Do not restore the removed `GALX_SHARD_*` credential inputs from older examples.

The generic [Dockerfile](../Dockerfile) uses Node.js 22 for both build and runtime, consistent with the repository engine requirement and CI. Docker configuration review is separate from building and running that image; Vercel acceptance does not certify the Docker path.

## Build and deploy

Run the documentation guard, relevant security/authorization tests and production build. For image persistence changes also run the isolated image database suite. Inspect scripts before using environment sync or deployment commands: they perform remote mutations.

The account-session lookup migration must precede application use; see [workspace authentication](operations/workspace-auth.md#active-session-rollout-and-recovery). Review pending migrations with the [database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) and apply only the intended set before code requires them. Confirm target environment and preserve a compatible rollback release. Deploy the application and record its immutable ID, source identity and dirty-tree status. Configuration changes must be present in the resulting deployment. The [manual desktop authority cutover](DEPLOYMENT.md#manual-desktop-authority-release-boundary) likewise requires its registry migration before compatible controller/application code; an application deployment alone cannot confirm retained legacy accounts.

`after` work remains bounded by route execution; it is not unlimited background processing. Image acceptance must already be durable. Use [image recovery](../post-mortem/runbooks/image-generation.md) to validate a representative request from the deployed frontend.

## Storage pressure and rollback

Follow [storage containment](../post-mortem/runbooks/deployment-storage.md) before deleting anything. Preserve current aliases and a compatible recovery release. Deployment-count reduction and displayed historical storage-accounting recovery require separate evidence.

Rollback must keep developer approval enforced at both application and gateway, preserve accepted-operation readers and retain populated receipts/signing state. A pre-gate “green” release is not safe by default. Application rollback does not roll back controller/worker state or undo migrations. Preserve the closed external enrollment handlers and desktop-only database writer policy; software that depends on the retired upsert or provider callback flow is not a compatible recovery release.

## Acceptance

Verify identity, owner boundaries, affected creation/retrieval/download behavior and persistence after reload. Scan public responses, rendered pages and associated browser assets for the changed boundary. Record untested paid settlement, Sites publication and load scenarios explicitly. Ready status and a 200 homepage are availability signals, not complete functional acceptance.

Verify cache policy through the public hostname, including protected URLs with `.js`, `.css` and image extensions. Cloudflare Browser Cache TTL is set to respect origin headers (`0`); a fixed minimum can rewrite private responses as browser-cacheable even when the application sends no-store. Keep versioned public assets immutable. Run `node scripts/verify-workspace-cache-http.mjs https://galx.ai`; check canonical redirects separately for aliases. A private response advertised as public caching fails acceptance regardless of an otherwise correct auth redirect. Follow [workspace cache recovery](operations/workspace-auth.md#deployed-cache-boundary), and retain before/after settings and raw aggregate checks without credentials.
