# Troubleshooting

Reviewed 2026-09-07. First identify the component: hosted product API, standalone relay, application adapter, registry, or provider. Their keys, endpoint contracts, and health signals differ. See [API base URLs](API_BASE_URL.md).

## Relay diagnostic order

1. Read `/health/live` for process reachability and `/health/ready` for admission. A healthy response does not verify credentials or provider quota.
2. Open `/dashboard` or `/telemetry` on the relay origin. Enter an administrator key in the access form; the page keeps it only in memory.
3. Check registry refresh, eligible account count, credential-recovery reason, in-flight slots, and cooldowns.
4. Use the request trace and status URL to distinguish HTTP acknowledgement from completion. A 202 is accepted work, not an answer.
5. If necessary, run one small authenticated request and require completed SSE output without an error.

## Access problems

| Symptom | Action |
| --- | --- |
| 401 on relay data/inference | Use a relay key, not a provider token or a hosted product API key |
| 403 `admin_access_required` | Use `RELAY_ADMIN_API_KEYS`; an inference key cannot administer the fleet |
| Browser `origin_not_allowed` | Use same origin or explicitly configure the exact origin; authentication still applies |
| `untrusted_host` | Unauthenticated local mode requires a loopback Host header |
| App works directly but relay returns 401 | Load the updated adapter and `VM_RELAY_API_KEY` in the actual running app process |
| Dashboard stops polling | Fix its authentication or connection state; automatic retries pause on authorization errors |

Keys in the same inference entry share one relay principal. A changed key can lose access to older retained jobs. An administrator cannot read another key's jobs by virtue of being administrator. Never work around this with `X-Tenant-Id` or by forwarding provider secrets.

## Credential and capacity problems

Expired credentials need sign-in/rotation through the registry and a fleet sync. Provider-rejected credentials stay disabled locally until replacement can be identified. Clearing quota history does not change credential validity or provider cooldowns. The displayed three-hour usage window is not a known provider allowance.

`all_shards_unavailable` can mean expiry, rejection, cooldown, or full slots. Inspect the actual reason instead of increasing retry counts. Registry errors stop new selection; do not restore a stale personal credential file. `shards:doctor`, `shards:import`, and registry maintenance scripts are operator actions; review their effect before running mutating commands.

A reconnecting dashboard retains stale values with an explicit timestamp. Those values are not a current routing decision. Unknown provider quota remains unknown until reported.

## Request and recovery problems

- 400/413/408: provide a JSON object, supported fields, a bounded body, and timely upload. The relay is not the product API's full compatibility layer.
- 503 overload/memory/drain: honor retry guidance; accepted work has separate deadlines and shard slots.
- Retry/deadline exhaustion: automatic recovery has stopped. Inspect partial output and the trace before submitting again.
- Expired replay cursor: earlier output is no longer retained; restart does not reconstruct it.
- Cancelled job: local cancellation is idempotent; refund settlement is outside the relay.
- Tool compatibility: existing inference/output handling is retained, but the standalone relay does not implement every tool-role or structured tool round trip and does not execute tools locally.
- Large image frames: the configured payload limit also applies to provider WebSockets. Validate image size and memory limits together; do not assume arbitrary-resolution output is supported.

## Container and deployment problems

Compose requires `RELAY_API_KEYS`. The runtime is UID 1000 with a read-only root filesystem and private state volume. An existing volume with incompatible ownership may require a reviewed offline repair. The old host checkpoint directory is not automatically migrated. Dashboard source edits require rebuilding the image because the repository is no longer mounted.

A healthy old process does not mean the new code is deployed. Inspect the container image, user, mounts, and health, then verify authenticated inference. Use [the deployment runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) for canary/cutover/rollback. Do not delete the state volume during routine image rollback.

## Broader application issues

Application auth, wallet/seat accounting, PostgreSQL lease authority, storage lifecycle, and SDK behavior are separate from relay transport. Start with [architecture](ARCHITECTURE.md), [application API](API_REFERENCE.md), [registry authority](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md), and the relevant source/tests. Do not infer a fix from historical benchmark counts or simulation guarantees.
