# Deployment boundaries

<!-- docs-scope: current-guide -->
> Private release guide. Use [current state](../post-mortem/CURRENT_STATE.md) for latest recorded component evidence and [the runbook](RELAY_VNEXT_RUNBOOK.md) for controller operations. Earlier matrices remain dated history.

| Component | Deployment action |
| --- | --- |
| Application | Build/deploy its server and public assets; verify customer authorization and response boundary |
| Controller | Reload supervised source with private registry/signing/journal state preserved |
| Worker | Build candidate image, then deliberately replace through owned lifecycle when required |
| Desktop | Build guest image and deliberately update the selected environment without losing needed home data |
| Ingress | Verify its intended authenticated server-to-server origin independently |

Source on disk, a built image and a running image are different states. Record all relevant revisions. Do not claim an application deploy from a controller reload or a worker upgrade from an image build.

Preserve rollback configuration, private state and accepted-operation evidence. Hold a shard before reload if preserving its existing worker is required; graceful stop removes unheld workers. A hold blocks replacements, so plan explicit resume/replacement for upgrades. Verify new generation and capabilities before declaring ready.

The shared-to-federation cutover occurred September 7. For any remaining legacy host, drain and stop shared ownership before federation assignment; `docker-compose.relay.yml` is not a federation launcher. Multi-host ownership needs a shared lease beyond the current single-host implementation.

Run `npm run docs:check`, appropriate [hardening checks](maintainers/RELAY_HARDENING.md), production build, public-response tests and rendered/browser-asset scans. Separate canary cleanup from production workspaces. Validate actual downstream behavior for changed transport; paid entry and entitlement remain separate acceptance.

## Image and access release boundaries

The image request migration must be applied before the application relies on durable async receipts. Configure Auth, database, server-only storage and reachable generation dependencies in the target environment; local credentials and a Ready deployment do not verify those dependencies. Follow [application configuration](VERCEL_DEPLOYMENT.md) and [image acceptance](../post-mortem/runbooks/image-generation.md).

The [bounded-library migration](maintainers/image-library-scale.md#validation-rollout-and-recovery) must precede the compact library client. Review index creation against target write load, keep the previous summary RPC compatible, and verify older-asset/thumbnail retrieval separately from new generation.

Preserve owner-scoped receipts and committed artifacts through rollback. The populated image table is intentionally protected from destructive rollback. Keep developer-preview checks enforced at both the application and gateway; a pre-gate successful release is not a safe rollback. Staff authority remains independent. Record recovery in [the incident system](../post-mortem/README.md).

For storage pressure, use [bounded deployment cleanup](../post-mortem/runbooks/deployment-storage.md). Preserve aliases and a compatible rollback; verify storage-accounting totals separately from removed-deployment counts.

## Sites strategy rollout

The paid Sites policy in ADR 0140 is a separate cutover from earlier fixed/metered deployments. Follow [Sites rollout](maintainers/SITES_FAIR_USAGE.md#verification-and-rollout): apply the additive private migration, deploy the included generation path with admission disabled, verify current paid-plan mapping and operator-approved limits, then qualify a controlled rollout. Preserve receipt volumes, signing authority and original-operation readers.

Earlier feature flags do not enable the replacement policy. Keep historical wallet reconciliation and current included recovery available during rollback. [Managed publication](maintainers/SITES_WORKSPACE.md) and native delivery retain their separate hosting and verification requirements.
