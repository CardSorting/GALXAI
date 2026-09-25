# Application deployment and configuration

<!-- docs-scope: current-guide -->

Private application release guide. The application, gateway, central authority, isolated runtimes/monitors, retained controller and databases are separate components. [Current state](../post-mortem/CURRENT_STATE.md) contains the latest dated observations; a prior release record is not proof of the current target.

## Configuration preflight

Use [package.json](../package.json), [.env.example](../.env.example) and the existing deployment project for runtime/build settings. Inspect the target environment's required configuration names, presence and credential types without printing values. Local configuration does not prove production configuration. Sensitive values omitted by an API response are not automatically missing.

Account Auth verification needs its configured Auth URL, public credential and the applied active-session lookup migration; administrator clients still require privileged credentials and fail closed otherwise. Image persistence needs the configured database and private image migrations, plus `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ASSETS_BUCKET_NAME` for legacy/public assets, and `R2_PRIVATE_IMAGES_BUCKET_NAME` for non-publishable human artifacts on the server. The Vercel application writes private images using its server-side R2 credentials; a `PRIVATE_IMAGE_BUCKET` Cloudflare Worker binding is not a runtime dependency. Provision the dedicated private bucket before configuring the application for paid creation. The private bucket must be distinct from the legacy/public asset bucket and have no public origin/custom domain. Required values remain encrypted/server-only; no public key is elevated into administration. A configured application bucket does not by itself establish that historical objects or any custom-domain origin are private; verify and protect those separately before release.

The isolated transport is opt-in through server-only `GALX_ISOLATED_RELAYS_ENABLED=1`, `GALX_PREMIUM_RELAY_URL` and `GALX_PREMIUM_RELAY_KEY`. Premium handles text, Sites and images with no legacy dispatch fallback. Premium's capability key configures the separate Sites preflight. Follow [service operation](runbooks/relay-pool-services.md#6-preserve-the-application-boundary) for the current local boundary and separate ingress acceptance. Runtime central account leases replace application account selection/decryption and duplicate account leases, while product usage policy remains separate.

Alternatively, images can be connected independently with server-only `GALX_PREMIUM_IMAGES_ENABLED=1` plus `GALX_PREMIUM_RELAY_URL` and `GALX_PREMIUM_RELAY_KEY`. This routes image availability and generation to Premium while keeping text and Sites on their existing configuration, and bypasses legacy account selection. Missing or invalid Premium settings fail closed without fallback to legacy.

The installed pool endpoints are Mac loopback services. They are not reachable from a hosted application without a separately reviewed private transport/deployment. Local installation is not evidence of public application cutover. Keep original receipt origins/readers for already accepted operations; changing the configured dispatch origin cannot move old jobs.

The retained deployment uses `VM_RELAY_URL` and its own inference credential. Keep inference and administration keys separate; do not substitute localhost or an expired development tunnel. Its eligible unassigned accounts use [legacy enrollment](maintainers/legacy-desktop-enrollment.md). New pools use [manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md). Application environment values, account login and retired provider routes cannot enroll or renew provider accounts. Never restore `GALX_SHARD_*` token inputs or rotate vault/signing roots to make a build pass.

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
