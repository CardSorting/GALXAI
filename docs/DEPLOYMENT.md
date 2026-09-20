# Deployment boundaries

<!-- docs-scope: current-guide -->

Private release guide. [Current state](../post-mortem/CURRENT_STATE.md) owns the latest dated component evidence. [Service installation](runbooks/relay-pool-services.md) owns the complete local procedure and the separate optional external-host procedure.

| Component | Deployment and acceptance boundary |
| --- | --- |
| Central service and HTTPS proxy | Main-project account authority, protocol and lifecycle journal; reviewed image and private state on Docker Desktop |
| Premium runtime and monitor | Premium Colima VM, own daemon/disk/secrets, execution database and manual desktops |
| Standard runtime and monitor | Standard Colima VM, own daemon/disk/secrets, execution database and manual desktops |
| Native monitor launchers | Fixed local destinations and scoped ticket access; no account or inference authority |
| Application/gateway | Separate server/assets release, customer authorization and sanitized responses |
| Retained federation | Existing controller/worker deployment and original jobs; [legacy operations](maintainers/legacy-federation-operations.md) |

Source, built image, installed image, open execution and successful provider work are distinct states. The local pool services and account-management release are installed. Latest acceptance records registration open, execution closed and zero registered accounts. Manual paid/free sign-ins, capability qualification and public application cutover remain pending. Missing external SSH targets are not blockers for the chosen local installation.

## Local pool release

Preserve the exact image manifest, VM/daemon identities, peer-denial rules, desktop homes and central/execution state. Do not copy main-project credentials into either runtime or use one pool's secrets in the other. A runtime hosts account engines inside its own container; it does not use the retained controller's one-worker-container-per-account deployment procedure.

Use `npm run relay:local -- status` and `npm run relay:local -- verify` for installed acceptance. Build/release only affected component images and update their reviewed pins through the service runbook. Opening a monitor or starting a VM cannot open execution. The explicit `serve-local` gate requires both registrations and reruns local acceptance. Enable intended accounts individually, wait for matching applied revisions and qualify the provider operations. Standard must reject Sites/images/tool requests before provider I/O.

The public application cutover requires its separately configured isolated transport, reachable private endpoints and distinct inference keys. Mac loopback addresses are not reachable from a hosted application. Preserve original-operation readers through cutover; there is no peer or legacy dispatch fallback. Account leases remain central and are acquired by the runtime, while product usage policy remains independent.

Run the relevant [hardening checks](maintainers/RELAY_HARDENING.md), production build, raw public-response/authorization tests and rendered/browser-asset scans for changed runtime boundaries. Record scope and limitations, including actual provider and customer-path acceptance.

## Manual desktop authority release boundary

The base manual policy migration `20260914231914` precedes the central foundation, authorization, legacy-assignment guard and management migrations. All account authority stays in the main project; execution-only migrations belong to their two separate targets. Use [database rollout](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) rather than applying the main migration directory to an execution project.

Current registration is **Register account → manual sign-in → Review access → register paused** in the fixed pool monitor. Later renewal uses explicit **Update saved sign-in → Save new sign-in**. Rename/remove/restore are central, revision-aware operations. Removal retains files and history; a registered account cannot be restored. The [complete lifecycle contract](reference/relay-account-management.md) owns these behaviors.

The retained controller's **Enroll shard**, saved-file synchronization and maintenance holds apply only to unassigned legacy accounts. Its [legacy rollout](maintainers/legacy-desktop-enrollment.md) remains available for existing deployment recovery. Assigned accounts cannot return to legacy admission. Close gates before rollback; retain grants, leases and original execution evidence. A management rollback does not restore removed accounts, and the older manual-policy DOWN migration reopens retired credential privileges rather than providing an availability shortcut.

## Billing release boundary

Stripe billing has an account/mode boundary. Use [webhook recovery](runbooks/stripe-webhook-delivery.md) to verify the receiver, signing secret and event mode together. Test events require isolated storage; the API host is not a billing receiver. Provisioning validates an explicit HTTPS application origin before provider writes and refuses known production hosts for test delivery.

## Image and access release boundaries

The image request migration must be applied before the application relies on durable async receipts. Configure Auth, database, server-only storage and reachable generation dependencies in the target environment; local credentials and a Ready deployment do not verify those dependencies. New image-library writes preserve the canonical generation receipt ID in private metadata for recovery, but that correlation is not authorization or public response data. Follow [application configuration](VERCEL_DEPLOYMENT.md) and [image acceptance](../post-mortem/runbooks/image-generation.md).

The [bounded-library migration](maintainers/image-library-scale.md#validation-rollout-and-recovery) must precede the compact library client. Review index creation against target write load, keep the previous summary RPC compatible, and verify older-asset/thumbnail retrieval separately from new generation.

Preserve owner-scoped receipts and committed artifacts through rollback. The populated image table is intentionally protected from destructive rollback. Keep developer-preview checks enforced at both the application and gateway; a pre-gate successful release is not a safe rollback. Staff authority remains independent. Record recovery in [the incident system](../post-mortem/README.md).

Gateway component verification uses isolated transports and a dry-run bundle; its workflow also triggers on fixture and dependency changes. Verify the actual hosted test and bundle steps separately from the token-conditional deployment step. A skipped deployment is not a new gateway release.

For storage pressure, use [bounded deployment cleanup](../post-mortem/runbooks/deployment-storage.md). Preserve aliases and a compatible rollback; verify storage-accounting totals separately from removed-deployment counts.

## Sites strategy rollout

The paid Sites policy in ADR 0140 is a separate cutover from earlier fixed/metered deployments. Follow [Sites rollout](maintainers/SITES_FAIR_USAGE.md#verification-and-rollout): apply the additive private migration, deploy the included generation path with admission disabled, verify current paid-plan mapping and operator-approved limits, then qualify a controlled rollout. Preserve receipt volumes, signing authority and original-operation readers.

Earlier feature flags do not enable the replacement policy. Keep historical wallet reconciliation and current included recovery available during rollback. [Managed publication](maintainers/SITES_WORKSPACE.md) and native delivery retain their separate hosting and verification requirements.

## Billing return-path prerequisite

The [billing page contract](reference/billing-pages.md#verification-and-release) requires `20260916003207_billing_canonical_returns.sql` before deploying canonical Checkout returns. Verify the application database target and apply only reviewed pending migrations. The nullable private field preserves the original provider input for existing attempts; the original additive migration did not backfill or change grants. The follow-up `20260920064323_remove_public_developer_return_path.sql` is the reviewed exception for route retirement: it normalizes only legacy `/developers` return values to `/billing/plan` before tightening the private check. Deploy the canonical routes, middleware aliases and compatible readers together. Presentation rollback retains the column and both return contracts. The [September 16 migration acceptance](../post-mortem/releases/2026-09-16-billing-migration.json) records application of the original prerequisite; the route-retirement migration is separately verified in the current database inventory. Application source push and hosted signed-in/payment acceptance remain separate events.
