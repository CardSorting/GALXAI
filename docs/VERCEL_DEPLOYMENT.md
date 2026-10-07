# Application deployment and configuration

<!-- docs-scope: current-guide -->

Private application release guide. The application, gateway, central authority, isolated runtimes/monitors, retained controller and databases are separate components. [Current state](../post-mortem/CURRENT_STATE.md) contains the latest dated observations; a prior release record is not proof of the current target.

## Configuration preflight

Use [package.json](../package.json), [.env.example](../.env.example) and the existing deployment project for runtime/build settings. Inspect the target environment's required configuration names, presence and credential types without printing values. Local configuration does not prove production configuration. Sensitive values omitted by an API response are not automatically missing.

Resolve each intended hostname's actual alias assignment. Manual assignments can
point to a newer accepted deployment than the project's production-target
pointer. Record both; use the serving aliases and accepted artifact/source
manifest to identify the release being extended and the compatible rollback.

Account Auth verification needs its configured Auth URL, public credential and the applied active-session lookup migration; administrator clients still require privileged credentials and fail closed otherwise. Image persistence needs the configured database and private image migrations, plus `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ASSETS_BUCKET_NAME` for legacy/public assets, and `R2_PRIVATE_IMAGES_BUCKET_NAME` for non-publishable human artifacts on the server. The Vercel application writes private images using its server-side R2 credentials; a `PRIVATE_IMAGE_BUCKET` Cloudflare Worker binding is not a runtime dependency. Provision the dedicated private bucket before configuring the application for paid creation. The private bucket must be distinct from the legacy/public asset bucket and have no public origin/custom domain. Required values remain encrypted/server-only; no public key is elevated into administration. A configured application bucket does not by itself establish that historical objects or any custom-domain origin are private; verify and protect those separately before release.

The isolated transport is opt-in through server-only `GALX_ISOLATED_RELAYS_ENABLED=1`, `GALX_PREMIUM_RELAY_URL` and `GALX_PREMIUM_RELAY_KEY`. Premium handles text, Sites and images with no legacy dispatch fallback. Premium's capability key configures the separate Sites preflight. Follow [service operation](runbooks/relay-pool-services.md#6-preserve-the-application-boundary) for the current local boundary and separate ingress acceptance. Runtime central account leases replace application account selection/decryption and duplicate account leases, while product usage policy remains separate.

Alternatively, images can be connected independently with server-only `GALX_PREMIUM_IMAGES_ENABLED=1` plus `GALX_PREMIUM_RELAY_URL` and `GALX_PREMIUM_RELAY_KEY`. This routes image availability and generation to Premium while keeping text and Sites on their existing configuration, and bypasses legacy account selection. Missing or invalid Premium settings fail closed without fallback to legacy.

The installed pool endpoints remain Mac loopback services. `nova.galx.ai` now reaches the accepted persistent Next image through an exact host/path tunnel rule. Vercel serves GALX Media and the short Connect authorization endpoints; it is retired as a Nova executor. The [transition record](../post-mortem/releases/2026-10-03-nova-mac-transition.json) retains the actual routes, release identities, real-provider gate and observation window. Existing Media image/Sites transport and original-operation readers remain in place. Monitor and ownership-control paths are never public.

The retained deployment uses `VM_RELAY_URL` and its own inference credential. Keep inference and administration keys separate; do not substitute localhost or an expired development tunnel. Its eligible unassigned accounts use [legacy enrollment](maintainers/legacy-desktop-enrollment.md). New pools use [manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md). Application environment values, account login and retired provider routes cannot enroll or renew provider accounts. Never restore `GALX_SHARD_*` token inputs or rotate vault/signing roots to make a build pass.

The generic [Dockerfile](../Dockerfile) uses Node.js 22 for both build and runtime, consistent with the repository engine requirement and CI. Docker configuration review is separate from building and running that image; Vercel acceptance does not certify the Docker path.

## Build and deploy

Run the documentation guard, relevant security/authorization tests and production build. For image persistence changes also run the isolated image database suite. Inspect scripts before using environment sync or deployment commands: they perform remote mutations.

Git pushes retain source and run repository checks; they do not replace a serving release. [vercel.json](../vercel.json) disables automatic Git deployments because the full repository also contains the Mac-only Nova runtime. Use the [canonical clean hosted package](#canonical-clean-hosted-package) for an explicitly authorized Media/Connect deployment. Preserve the accepted Mac image and the currently serving web artifact when committing work that is already deployed. This follows Vercel's [Git deployment control](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled); the application retirement guard and project-wide firewall remain independent protections. Do not re-enable an unrestricted `next build` hook as a shortcut around artifact acceptance.

The account-session lookup migration must precede application use; see [workspace authentication](operations/workspace-auth.md#active-session-rollout-and-recovery). Review pending migrations with the [database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) and apply only the intended set before code requires them. Confirm target environment and preserve a compatible rollback release. Deploy the application and record its immutable ID, source identity and dirty-tree status. Configuration changes must be present in the resulting deployment. The [manual desktop authority cutover](DEPLOYMENT.md#manual-desktop-authority-release-boundary) likewise requires its registry migration before compatible controller/application code; an application deployment alone cannot confirm retained legacy accounts.

`after` work remains bounded by route execution; it is not unlimited background processing. Image acceptance must already be durable. Use [image recovery](../post-mortem/runbooks/image-generation.md) to validate a representative request from the deployed frontend.

## Nova request-lifetime prerequisite

Nova runs on the owner's hardened Mac, not in a Vercel invocation. The accepted image registers terminal work with Next `after()` before admission/dispatch and preserves the 300-second execution deadline. Its 480-second container stop grace permits active drain and bounded terminal persistence. An abrupt host/process loss can still leave retained uncertainty; never replay it. The current web source rejects inference on Vercel before authorization or dispatch, and no Nova function is included in the Media/Connect artifact.

The [initial hosted counterexample](../post-mortem/releases/2026-10-03-hosted-target-enablement.json) and [later adaptation](../post-mortem/releases/2026-10-03-hosted-adaptation.json) remain historical evidence. Hobby's 300-second ceiling cannot provide Nova's cleanup margin. Streaming, buffering and background work do not extend that ceiling. No plan upgrade occurred. [ADR 0167](adr/0167-nova-mac-runtime-placement.md) records the owner's final placement decision; there is one active Nova authority.

## Media, Connect and Mac Nova placement

`galx.ai` retains the existing Media source and shared account authentication. Connect is enabled there with issuer `https://galx.ai`, resource `https://nova.galx.ai`, S256 PKCE and the reviewed first-party browser/native registry. Explicit entitlement and current application grants remain mandatory at the Mac resource. The transition used one existing account with a two-hour entitlement; both acceptance connections were revoked. No Media subscription, browser session or hidden URL provides Nova access. This is a controlled technical deployment, not public enrollment or commercial activation.

Use [Mac operation](runbooks/mac-self-hosting.md) for the immutable image, private Nova-only configuration and operator lifecycle. Use [hosting transition and retirement](runbooks/nova-hosting-transition.md) for ingress, drain, observation, rollback and retirement verification. The complete Next binary is reused on the Mac, but ingress exposes only Nova submission and resource discovery. Media, shared sign-in and callbacks stay on Vercel. No custom server or second identity database is introduced.

The tunnel selects the exact canonical Nova Host. Forwarded metadata cannot grant authority; the private listener rejects unexpected hosts and ports. The service port remains Mac loopback-only. The SDK requests SSE once and assembles complete answers locally with bounded content/frame/wire memory and terminal validation. Nova emits bounded quiet-stream comments. Raw long buffered JSON can still exceed the edge idle limit; it is not the supported long-answer transport.

## Vercel inference retirement

The final Media/Connect package omits `/v1/inference` and Nova resource discovery. Shared middleware and route authorization wrappers deny the retired text/completion/run/embedding entry points and the old compute queue surface, including status reads that could start dispatch. They return an empty private/no-store 410 before even internal operator authorization. The project-wide firewall independently denies these paths across retained older deployments. There is no redirect, proxy or replay fallback to a Vercel executor. The Nova project-domain binding and alias are removed so later Media deployments cannot reclaim that hostname.

Keep existing Media image/Sites keys, Auth, database, vault/audit, object storage, billing and Connect configuration. Inventory found no Nova-exclusive provider credential or scheduled Vercel job to remove; shared relay capabilities remain required by Media. Provider account credentials remain behind the existing server-side execution boundary. Retained old deployment metadata supports Media recovery; it does not authorize reopening obsolete inference paths. Preserve the firewall during any web rollback.

## Canonical clean hosted package

Use an explicit source snapshot and a new output path. The [packaging command](../scripts/package-hosted-candidate.mjs) copies only repository source, public assets, the tracked `BROC` modules and named build configuration. It installs application dependencies with `npm ci` from the reviewed application lock and build tooling from [its separate pinned lock](../deploy/hosted/package-lock.json). Linux x86-64 Node 22.23.2/glibc is pinned by image digest. No ambient dependencies, existing output, private guides, sibling directories or real server credentials enter the builder.

Prepare a private JSON input with `projectId`, `orgId` and an allowlisted `publicEnvironment` object. Obtain those public values from the intended target and record their digest. Do not include provider, database, deployment, vault or account tokens. The command rejects unapproved variable names. For the Media/Connect release, preserve the observed serving Media revision and overlay only the reviewed Connect/authentication and retirement files. The preparation command records the base revision and every overlay hash and refuses a base that already contains Nova execution. Run from the repository root:

```sh
node scripts/prepare-connect-web.mjs <observed-serving-40-character-revision> <new-source-worktree>
DOCKER_CONTEXT=desktop-linux node scripts/package-hosted-candidate.mjs <new-output-path> <public-build-inputs.json> <new-source-worktree>
```

The optional third argument selects the isolated source; omission packages the current repository snapshot and is appropriate only when that complete snapshot is the intended candidate. The October 3 transition preserved revision `38a3cc48f32f5f404592109c8cae3ddac5fa6f61` for Media. Do not replace unrelated Media code merely to retire Nova. Build tooling stays pinned by this repository's declared lock.

For a later scoped Media feature, start from the complete source snapshot that
matches the currently accepted artifact. Verify every existing source hash
against that artifact's provenance before applying the feature's reviewed
patch and new public files. Preserve previously accepted Connect, authentication,
retirement and Media behavior rather than copying the broader development tree.
Record the base snapshot revision, feature commit, overlay hashes and resulting
source manifest. The exhibition programme uses this boundary: new programme
routes/components/catalog/font and the exact navigation, public-reading,
published-work lookup and sitemap delta. Relay operation and generation plans
are committed separately from the hosted source selection; deploying the
programme does not replay a residency or replace an accepted runtime.

Run the required runtime dependency audit (`npm audit --omit=dev
--audit-level=high`) on the reviewed application lock. A dependency correction is
an explicit source-overlay change with its own hashes and regression evidence.
Keep build-only tools classified as development dependencies and verify that
they are absent from traced runtime payloads; classification does not repair or
clear an advisory in those tools. The builder installs development dependencies
from the lock for compilation. Retain remaining build-tool advisories and their
trusted-source boundary separately from runtime audit results. Do not claim a
clean full dependency audit based on an `--omit=dev` result.

The existing vault/audit modules validate keys at import time during page collection. As in the established CI build, this isolated build uses fresh throwaway values with no database or provider authority. It does not rotate or consume production keys. The resulting package is scanned for those exact canaries and must contain neither. Real runtime secret references are configured separately by the deployment environment.

The retained artifact is `<new-output-path>/hosted-candidate.tgz`, with source provenance, an artifact manifest and archive digest alongside it. Local Vercel builds normally map function dependencies back into the build workspace. [Retention](../scripts/retain-hosted-output.mjs) copies the exact mapped bytes into the output package and rewrites only packaging references; application bytes and runtime paths stay unchanged. It excludes Next build diagnostics under `static/_next/__private` before manifesting or archiving public output, retaining only their paths and hashes as private packaging evidence. Build traces are never browser assets. No cache, source workspace or globally installed CLI is required to use the retained payload. Packaging is not deployment.

Verify that the web artifact has no Nova inference/resource-discovery function, no unsupported function duration, no private source/configuration, and no embedded real credentials or build canaries. Check all mapped payloads and public assets. Run retirement, Connect and account-boundary tests plus the production build before `vercel deploy --prebuilt --prod`. Retain the exact source/manifest/archive hashes and resulting deployment ID. A clean package is not live acceptance: inspect rendered pages, public assets, shared authentication, issuer discovery and denial of obsolete inference after deployment.

## Storage pressure and rollback

Follow [storage containment](../post-mortem/runbooks/deployment-storage.md) before deleting anything. Preserve current aliases and a compatible recovery release. Deployment-count reduction and displayed historical storage-accounting recovery require separate evidence.

Rollback must keep developer approval enforced at both application and gateway, preserve accepted-operation readers and retain populated receipts/signing state. A pre-gate “green” release is not safe by default. Application rollback does not roll back controller/worker state or undo migrations. Preserve the closed external enrollment handlers and desktop-only database writer policy; software that depends on the retired upsert or provider callback flow is not a compatible recovery release.

## Acceptance

Verify identity, owner boundaries, affected creation/retrieval/download behavior and persistence after reload. Scan public responses, rendered pages and associated browser assets for the changed boundary. Record untested paid settlement, Sites publication and load scenarios explicitly. Ready status and a 200 homepage are availability signals, not complete functional acceptance.

Verify cache policy through the public hostname, including protected URLs with `.js`, `.css` and image extensions. Cloudflare Browser Cache TTL is set to respect origin headers (`0`); a fixed minimum can rewrite private responses as browser-cacheable even when the application sends no-store. Keep versioned public assets immutable. Run `node scripts/verify-workspace-cache-http.mjs https://galx.ai`; check canonical redirects separately for aliases. A private response advertised as public caching fails acceptance regardless of an otherwise correct auth redirect. Follow [workspace cache recovery](operations/workspace-auth.md#deployed-cache-boundary), and retain before/after settings and raw aggregate checks without credentials.
