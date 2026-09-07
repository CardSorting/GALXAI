# Relay hardening checklist and evidence

Current strategy is [ADR 0122](../adr/0122-isolated-authenticated-relay-and-bounded-recovery.md), reviewed 2026-09-07. This guide identifies what to verify rather than duplicating a second configuration specification.

## Implemented boundaries

- Inference-key job ownership and a separate administrator boundary for operational endpoints.
- Exact-origin browser policy, local Host checks, non-cacheable data, and memory-only dashboard keys.
- Bounded request bodies, read deadlines, mutation admission, and rate buckets.
- Per-process shard concurrency, provider-informed cooldown, finite retries, shared retry credits, and an absolute job deadline.
- Terminal cleanup, cancellation checks after registry waits, and no double release during backoff cancellation.
- Expiry exclusion, rejection-preserving state updates, and fingerprint-aware credential replacement.
- Bounded in-memory replay and explicit failure for interrupted jobs after restart.
- Non-root/read-only container, no host personal/source mounts, private checkpoint volume, and disabled host credential discovery.

The relay retains its existing inference/output handling and has no local model-tool executor. It does not implement a complete tool-role protocol, a per-user execution sandbox, global lease ownership, an egress firewall, or financial settlement. An administrator key does not bypass job ownership. Shared inference keys share a principal.

## Verification commands

```sh
node --import tsx --test scripts/test-relay-hardening.ts scripts/test-relay-adaptive-quota.ts scripts/test-relay-telemetry.ts scripts/test-relay-client-auth.ts
npx tsc --noEmit
node --env-file=.env.local --import tsx scripts/test-relay-docker.ts
```

Local tests require socket access. The Docker suite inspects the designated live deployment and may start it if absent. Verify image/user/mounts and a minimal authenticated inference after a canary or cutover. A mock upstream cannot prove real provider access.

## UX contract

Display output chunks and explicit unknown measurements. Keep acknowledgement separate from completion. Surface retry count/deadline, stopped recovery, credential replacement, registry pause, and stale telemetry. Cancel controls reflect pending/terminal state. Authorization failures pause automatic polling. No control should imply that resetting history repairs upstream credentials or that cancellation issues a refund.

## Limits to preserve in reviews

A live process can have no eligible provider accounts. Replay is not crash recovery. Mid-stream continuation is not exactly-once output. Sanitized telemetry does not make request checkpoints content-free. Checkpoint writes can fail and process-local rejection is not replicated. Container isolation does not protect a separately running host agent or application fallback.

[Runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) · [API](../RELAY_API_REFERENCE.md) · [Telemetry](RELAY_TELEMETRY.md)
