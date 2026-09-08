# GALX architecture

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The [federation contract](FEDERATION_STRATEGY.md) defines relay behavior. The application gateway, host controller, isolated workers, database authority, and consuming agent runtimes have separate responsibilities.

| Component | Owns | Boundary |
| --- | --- | --- |
| Application gateway | Developer authentication, entitlements, API compatibility, application billing and assets | Public base `https://galx.ai/v1` |
| Federation controller | Registry projection, Docker ownership, capability index, model-specific admission, signed job affinity | Server-to-server `https://relay.galx.ai` |
| Shard relay worker | One assigned credential, upstream inference, local jobs and stream lifecycle | One active shard = one active container |
| PostgreSQL | Encrypted credential registry and platform lease/health authority | A local cache or telemetry sample cannot override authority |
| Cloudflare Worker | Its separately deployed edge routes | `api.galx.ai` is not an interchangeable gateway alias |
| Consuming application or agent | Tools, user interaction, durable operation tracking | Model output does not grant host execution permission |

## Request path

The gateway resolves its documented API request shape and delegates a specific model and operation. The federation looks up the model-to-shard index, filters by fresh capabilities and healthy ownership, then balances eligible load. Spare unrelated capacity is irrelevant. Chat and image evidence are separate.

The explicit OAuth image alias uses `gpt-5.6-terra` plus `image_generation` for `gpt-image-2` only when enabled and verified. The public ID is `openai-gpt-image-2`. Image-model selection is provider-managed and disclosed; native API-key execution stays exact. See [compatibility semantics](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

## Reconciliation and recovery

The controller independently reconciles registry state, container ownership, and worker evidence. Capability loss changes new-request eligibility without restarting useful workers or terminating accepted streams. Credential invalidation removes mappings before drain. Empty capabilities remain recoverable in the same worker.

Generation, inventory, model-evidence, and health-revision fences reject stale results. Controller receipts bridge acknowledgement recovery within a bounded process-local window; signed job URLs retain affinity to the originating worker generation. Neither mechanism establishes durable exactly-once execution.

Workers receive no database/vault keys, host home, repository, or Docker socket mounts. The host controller holds the registry and Docker authority and must be secured separately. Single-host Docker ownership is not a distributed lease.

## Source map

- `src/relay/capability-registry.ts`: capability evidence and reverse index.
- `src/relay/federation-server.ts`: authentication, admission, receipts, job affinity, and operational API.
- `src/relay/image-compatibility.ts`: explicit image alias.
- `scripts/run-relay-federation.ts`: controller launcher.
- `scripts/install-federation-service.ts`: supervised macOS installation.
- `scripts/verify-dreambees-image.ts`: actual downstream image-client verification.

See [deployment](DEPLOYMENT.md), [security](SECURITY.md), [request recovery](RELAY_API_REFERENCE.md), and [ADRs](adr/README.md). The September 7 production observation is recorded in ADR 0127; it is not a current availability assertion.
