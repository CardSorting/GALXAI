# Inference verification

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Verify each boundary independently: application authorization, configured app-to-controller transport, credential projection, capability discovery, eligible admission, worker execution, returned payload, and any application storage. See the [contract](FEDERATION_STRATEGY.md).

## Local regression checks

```sh
npm run test:relay:capabilities
npm run test:cooldown
npx tsc --noEmit
npm run lint
```

For worker lifecycle changes, build the worker image and run the isolated synthetic Docker canary as described in the [runbook](RELAY_VNEXT_RUNBOOK.md#validate-the-implementation). It uses synthetic credentials. Do not substitute the legacy shared-container deployment test.

Required scenarios include heterogeneous pools, loss/recovery without restart, shard removal, stale health across restart, concurrent denial/discovery, noisy failures, model-specific saturation, signed job affinity, receipt replay after capability loss, and uncertain admission. Test counts are recorded with each run rather than treated as permanent gates.

## Live verification

Confirm the actual deployed revision, worker image, ownership, and ingress. A health check, matching credential aliases, inventory listing, or HTTP 202 does not prove successful inference.

For chat, authenticate with the intended key and observe completed output without an SSE failure. For images, use the actual downstream client and its retry policy, require valid bytes, decode the image, inspect execution metadata, and visually inspect the artifact. Live probes can incur usage; synthetic tests do not run them.

The runbook documents `scripts/verify-dreambees-image.ts`. [ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md) records a successful public DreamBees image result on September 7, 2026, including request ID, dimensions, hash, and compatibility metadata. Its separate chat entitlement rejection was not a chat success. Paid Hive remained disabled.

Record failures and limits alongside successes. A docs-only change requires documentation validation, not another paid production image generation.
