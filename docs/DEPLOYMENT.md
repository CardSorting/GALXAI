# Deployment boundaries

<!-- docs-scope: current-guide -->
> Private release guide. Use [the runbook](RELAY_VNEXT_RUNBOOK.md) for controller operations and [the dated verification matrix](maintainers/RELAY_SESSION_VERIFICATION_20260909.md#component-deployment-boundary) for observed rollout.

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

Run appropriate [hardening checks](maintainers/RELAY_HARDENING.md), production build, public-response tests and rendered/browser-asset scans. Separate canary cleanup from production workspaces. Validate actual downstream behavior for changed transport; paid entry and entitlement remain separate acceptance.
