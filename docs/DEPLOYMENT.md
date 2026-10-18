# Deployment boundaries

<!-- docs-scope: current-guide -->

Private release guide. [Current state](../post-mortem/CURRENT_STATE.md) owns the latest dated component evidence. [Service operation](runbooks/relay-pool-services.md) owns the local Premium install, recovery and acceptance procedure.

| Component | Deployment and acceptance boundary |
| --- | --- |
| Central service and HTTPS proxy | Main-project account authority, protocol and lifecycle journal; runs on the owner's Docker Desktop |
| Premium runtime and monitor | Dedicated Premium Colima VM on the same Mac; own Linux daemon, disk, service files, execution database and manual desktops; monitor stays loopback-only |
| Native monitor launchers | Fixed local destinations and scoped ticket access; no account or inference authority |
| GALX Media and Connect | Accepted full-web Next image on Docker Desktop; canonical `galx.ai` ingress, native account authority and preserved media/billing configuration |
| Nova | Accepted persistent Next image on Docker Desktop; exact controlled ingress at `nova.galx.ai`; no Vercel executor |
| Native PostgreSQL and Auth | Separate central and Premium clusters; pinned Auth/PostgREST and narrow account gateway; owner login services, not pre-login boot daemons |
| Gateway | Separate assets/service boundary; deployed private API has no database credential and remains unavailable; obsolete source binding and cron removed |
| Retained federation | Existing controller/worker deployment and original jobs; [legacy operations](maintainers/legacy-federation-operations.md) |

Source, built image, installed image, open execution and successful provider work are distinct states. The owner selected the local Mac operating path because hosted alternatives were unaffordable or did not work. On September 23, fresh local acceptance passed 26 checks; the [current state](../post-mortem/CURRENT_STATE.md) records the latest host and supervisor status. The [menu recovery audit](../post-mortem/releases/2026-09-23-local-relay-menu-ux-hardening.json) records private retry-status and login-item validation changes. Physical-host reboot, power, sign-out/login, sleep/wake and disruptive shared-daemon/network drills are **UNVERIFIED — DEFERRED BY OPERATOR** under [ACT-018](../post-mortem/register.json). Do not perform them or change global power settings; use [isolated service resilience checks](runbooks/mac-self-hosting.md#non-disruptive-resilience-acceptance). Normal-reboot startup is only a provisional operational assumption, not production-readiness evidence. Local service health does not establish provider workload qualification. Direct loopback URLs are not public application origins; any existing external ingress and its acceptance remain separate. The DigitalOcean candidate remains unprovisioned. See [the retained local acceptance record](../post-mortem/releases/2026-09-23-local-relay-supervisor-acceptance.json).

## Local pool release

The [Mac Nova runtime](runbooks/mac-self-hosting.md) uses the accepted clean immutable image, reloadable archive, private configuration and loopback-only service port. Its dedicated `plan-nova-native` profile rejects unrelated Media/billing/admin configuration and requires matching whole-image acceptance. The full-web profile holds its separately reviewed configuration. `node scripts/self-host.mjs --help` owns stage/status/stop/resume. The 480-second stop allowance preserves Nova's 300-second execution deadline and terminal persistence. The exact origin policy rejects unconfigured hosts/ports and ignores untrusted forwarded authority.

The [October 3 transition](../post-mortem/releases/2026-10-03-nova-mac-transition.json) moved only Nova. The later [native account cutover](runbooks/local-account-migration.md) moved central storage, Auth, Media/Connect and Nova's database transport. Account UUIDs, object storage and existing cryptographic authority are preserved. The Vercel www deployment remains a canonical redirect and retained configuration supports external seed recovery; it is not the current application executor. Its historical inference retirement protections remain. The original Supabase organization is Free, central is paused and Premium is deleted. Never resume the stale source as writer rollback. New commercial activation and host power/sleep recovery remain separate decisions.

Preserve the exact image manifest, VM/daemon identities, peer-denial rules, desktop homes and central/execution state. Do not copy main-project credentials into either runtime or use one pool's secrets in the other. A runtime hosts account engines inside its own container; it does not use the retained controller's one-worker-container-per-account deployment procedure.

Use `npm run relay:local -- status` to inspect power, supervisor, VM, relay and monitor state, then run `npm run relay:local -- verify` on the live accepted local install. Build/release only affected component images and update their reviewed pins through the service runbook. Opening the monitor or starting services does not open execution. `serve-local` changes control-plane state and requires fresh acceptance plus a separate deliberate authorization. Keep the public application origin and execution gate unchanged during routine recovery.

Changing public application routing requires a separately reviewed reachable ingress, its server-only key and end-to-end customer-path acceptance. Mac loopback addresses are not reachable from a hosted application. Preserve original-operation readers through any future cutover; there is no legacy dispatch fallback. Account leases remain central and are acquired by the runtime, while product usage policy remains independent.

Run the relevant [hardening checks](maintainers/RELAY_HARDENING.md), production build, raw public-response/authorization tests and rendered/browser-asset scans for changed runtime boundaries. Record scope and limitations, including actual provider and customer-path acceptance.

## Manual desktop authority release boundary

The base manual policy migration `20260914231914` precedes the central foundation, authorization, legacy-assignment guard and management migrations. All account authority stays in the native central database; execution-only migrations belong to their separate targets. Historical project identifiers remain protocol identifiers, not live Supabase destinations. Use [database rollout](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) rather than applying the main migration directory to an execution database.

Current registration is **Register account → manual sign-in → Review access → register paused** in the fixed pool monitor. Later renewal uses explicit **Update saved sign-in → Save new sign-in**. Rename/remove/restore are central, revision-aware operations. Removal retains files and history; a registered account cannot be restored. The [complete lifecycle contract](reference/relay-account-management.md) owns these behaviors.

The retained controller's **Enroll shard**, saved-file synchronization and maintenance holds apply only to unassigned legacy accounts. Its [legacy rollout](maintainers/legacy-desktop-enrollment.md) remains available for existing deployment recovery. Assigned accounts cannot return to legacy admission. Close gates before rollback; retain grants, leases and original execution evidence. A management rollback does not restore removed accounts, and the older manual-policy DOWN migration reopens retired credential privileges rather than providing an availability shortcut.

## Billing release boundary

Stripe billing has an account/mode boundary. Use [webhook recovery](runbooks/stripe-webhook-delivery.md) to verify the receiver, signing secret and event mode together. Test events require isolated storage; the API host is not a billing receiver. Provisioning validates an explicit HTTPS application origin before provider writes and refuses known production hosts for test delivery.

The canonical receiver now runs in the accepted native full-web profile with its existing Stripe configuration. Moving it does not open recurring checkout, submit a payment or establish a provider checkout/webhook/renewal cycle. Keep the live sales gate closed pending that separate release acceptance.

## Image and access release boundaries

The image request migration must be applied before the application relies on durable async receipts. Configure Auth, database, server-only storage and reachable generation dependencies in the target environment; local credentials and a Ready deployment do not verify those dependencies. New image-library writes preserve the canonical generation receipt ID in private metadata for recovery, but that correlation is not authorization or public response data. Follow [application configuration](VERCEL_DEPLOYMENT.md) and [image acceptance](../post-mortem/runbooks/image-generation.md).

The [bounded-library migration](maintainers/image-library-scale.md#validation-rollout-and-recovery) must precede the compact library client. Review index creation against target write load, keep the previous summary RPC compatible, and verify older-asset/thumbnail retrieval separately from new generation.

Preserve owner-scoped receipts and committed artifacts through rollback. The populated image table is intentionally protected from destructive rollback. Keep developer-preview checks enforced at both the application and gateway; a pre-gate successful release is not a safe rollback. Staff authority remains independent. Record recovery in [the incident system](../post-mortem/README.md).

Gateway component verification uses isolated transports and a dry-run bundle; its workflow also triggers on fixture and dependency changes. Verify the actual hosted test and bundle steps separately from the token-conditional deployment step. A skipped deployment is not a new gateway release.

Production and staging edge cleanup removed only their obsolete Supabase URL and minute cron. Production/staging scheduled handlers also return before constructing dispatch or billing services. Preserve all other bindings, including existing payment and storage bindings. Do not add a database credential or activate private API/payment processing as cleanup. `scripts/retire-legacy-edge-source.mjs` retains exact before/after receipts and refuses automatic replay after an uncertain submission. The separate Sites domain scheduler still calls the fixed canonical backend and is not this retired polling loop.

For storage pressure, use [bounded deployment cleanup](../post-mortem/runbooks/deployment-storage.md). Preserve aliases and a compatible rollback; verify storage-accounting totals separately from removed-deployment counts.

## Sites strategy rollout

New Sites sales and browser entry are retired. The [Sites runbook](maintainers/SITES_FAIR_USAGE.md#verification-and-rollout) describes retained admission/recovery contracts, not authorization to reopen a cohort. Native migration preserves existing policy, receipts, domain reservations and financial records. It does not apply the pending Orbit migration, create a Site or qualify new publication. Any future reactivation needs a separate product decision and bounded acceptance.

Earlier feature flags do not enable the replacement policy. Keep historical wallet reconciliation and current included recovery available during rollback. [Managed publication](maintainers/SITES_WORKSPACE.md) and native delivery retain their separate hosting and verification requirements.

## Billing return-path prerequisite

The [billing page contract](reference/billing-pages.md#verification-and-release) requires `20260916003207_billing_canonical_returns.sql` before deploying canonical Checkout returns. Verify the application database target and apply only reviewed pending migrations. The nullable private field preserves the original provider input for existing attempts; the original additive migration did not backfill or change grants. The follow-up `20260920064323_remove_public_developer_return_path.sql` is the reviewed exception for route retirement: it normalizes only legacy `/developers` return values to `/billing/plan` before tightening the private check. Deploy the canonical routes, middleware aliases and compatible readers together. Presentation rollback retains the column and both return contracts. The [September 16 migration acceptance](../post-mortem/releases/2026-09-16-billing-migration.json) records application of the original prerequisite; the route-retirement migration is separately verified in the current database inventory. Application source push and hosted signed-in/payment acceptance remain separate events.
