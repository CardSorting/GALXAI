# Capability-aware relay vNext

vNext consists of one host controller/front door and one isolated Docker worker per active OpenAI shard. The controller is infrastructure; it is not a relay owning multiple shards. The existing shared production relay has not been replaced.

## Validate the implementation

```sh
npm run test:relay:capabilities
npm run test:cooldown
npx tsc --noEmit
npm run lint
docker build -f Dockerfile.relay -t galxai-relay:vnext .
GALX_DOCKER_CANARY=1 npm run test:relay:docker
```

The Docker test creates a unique ownership namespace and three synthetic shards, checks model loss, recovery, and restart fencing, then removes only its containers. It does not read real shard credentials. It needs Docker Desktop's `host.docker.internal` reachability. Its inventory server contains test data only. Checkpoint volumes are retained; they can be removed separately after the test if no longer needed.

## Start the host controller

Supply the existing database/admin-registry and vault configuration through `.env.local`. Supply separate `RELAY_API_KEYS` and `RELAY_ADMIN_API_KEYS` for the front door. Do not put secret values in shell arguments or source control.

```sh
RELAY_FEDERATION_NAMESPACE=vnext-canary \
RELAY_FEDERATION_PORT=3301 \
RELAY_FEDERATION_IMAGE=galxai-relay:vnext \
npm run relay:federation
```

Unlike the synthetic Docker test, this command reads actual active registry credentials. **Do not run it alongside the legacy shared relay using those same shards.** For pre-cutover testing, use a separate credential registry or use the synthetic test command above.

The default listener is loopback only. Open `http://127.0.0.1:3301/federation` and enter the administrator key to inspect capability pools. `GET /api/capabilities` and `GET /health/ready` require an administrator key. `/health` reports service liveness only. Inference uses the existing `/v1/chat/completions`, `/v1/images/generations`, and job route shapes. Every new inference request must name the exact model.

The launcher stores a signing secret and controller lock under ignored `.relay/federation-<namespace>/` with restrictive permissions. Preserve the secret across controller restarts so signed job links remain verifiable. If a crash leaves the lock, verify its PID is no longer running before removing that lock. Never remove a live controller's lock. Graceful shutdown drains owned workers and retains checkpoint volumes.

## Configuration and bounds

| Setting | Default | Purpose |
| --- | --- | --- |
| `RELAY_FEDERATION_NAMESPACE` | `vnext-canary` | Controller ownership label and lock scope |
| `RELAY_FEDERATION_PORT` | `3301` | Host loopback front door |
| `RELAY_FEDERATION_IMAGE` | `galxai-relay:vnext` | Per-shard worker image |
| `CAPABILITY_REFRESH_INTERVAL_MS` | `60000` | Worker refresh upper interval; jitter is 80–100% |
| `CAPABILITY_TTL_MS` | `120000` | Maximum model evidence lifetime |
| `RELAY_SHARD_CONCURRENCY` | `4` | Per-worker active stream admission |

Worker tuning variables apply to worker configuration; the current driver uses its bounded defaults. Changing host environment variables does not silently propagate them into workers. Change driver configuration explicitly before tuning a fleet. Capability snapshots show effective capacity and evidence deadlines.

Empty capabilities do not delete a worker, including after 120 seconds. An invalid credential is removed and suppressed until its credential revision changes. Unknown/degraded/stale/empty shards do not serve new requests. There is no cross-model fallback and no global waiting queue that can borrow another model's capacity.

## Image verification

Model inventory is not proof of an image tool. Image operation records use an internal `image:<model>` key in the registry; API callers send the model ID without that prefix. A model can therefore be healthy for chat and unavailable for images.

On the assigned worker, an administrator can POST `/api/capabilities/probe-image` with an exact `model` and a small `prompt`. This performs a real upstream generation and can incur usage. It publishes availability only after receiving an image payload and passing the observation fence. It does not guess another model or grant aliases. Do not schedule paid probes blindly; establish an upstream-advertised tool inventory or choose a measured verification cadence. No production probe is run by the synthetic test suite.

## Production cutover checklist

1. Keep paid Hive entry disabled. Save the current deployment image and ingress target for rollback.
2. Validate the synthetic canary and confirm the actual shard inventory can be authenticated using the intended registry/vault configuration.
3. Stop new admissions to the legacy shared relay and drain its active streams. Stop the shared container before assigning its shards to vNext.
4. Start the controller under the host's process supervisor with the persistent signing secret and registry access. Confirm one worker per active shard and correct model pools. Never run two controllers for the same namespace; multi-host deployment needs a distributed ownership lease first.
5. Route the existing authenticated ingress to the controller's loopback front door through the host's established tunnel setup. The controller is not directly Internet-exposed.
6. Verify the actual downstream chat and image clients end-to-end. Only enable paid Hive after its requested image model produces a valid image through that public path.
7. For rollback, pause ingress, drain and stop vNext workers, restore the saved shared relay image/configuration and original ingress, then verify downstream requests again. Do not run both topologies with the same credentials during rollback.

The existing `docker-compose.relay.yml` describes the legacy shared deployment and is not a vNext fleet launcher. Rebuilding that deployment with the new worker without this migration will fail its one-shard guard. No tunnel change or production cutover is performed by this implementation's tests.


## Parent and subagent request contract

Give each logical operation its own `Idempotency-Key`, and reuse that key only with the same payload when recovering its acknowledgement. `X-Galx-Task-Id` correlates a parent or child operation; it does not grant tenant authority. The controller supplies trusted tenant identity and a fresh `X-Request-Id`. The chat and image adapter options accept `taskId`, `idempotencyKey`, and `idempotencyScope`.

| Response | Caller action |
| --- | --- |
| `202` | Save the signed `id`, `statusUrl`, and `streamUrl`. Poll or reconnect to those URLs; do not submit another job. `Operation-Location` is the status URL and `Location` is the stream URL. |
| `409 request_in_progress` | Retry the same request with the same key after `Retry-After` to retrieve its acknowledgement. Admission may still be pending. |
| `409 idempotency_conflict` | The key belongs to different parameters. Reconcile the original operation; use a new key only for intentionally different work. |
| `409 result_not_retained` | Work finished but exceeded the response cache budget. Do not repeat synthesis to retrieve it. |
| `relay_admission_unknown` or `idempotency_scope_changed` | Execution is uncertain. Inspect any existing job or operator trace; do not blindly replay. |
| `job_transport_unavailable` | Retry the existing job URL using `Retry-After`; admission already happened. |
| `503` before admission | Honor `Retry-After` and `X-Should-Retry`. Capacity is specific to the requested model. |

The adapters preserve HTTP status, the safe error code, execution state, retry delay, request ID, and retry scope in `RelayDispatchError`. They do not automatically replay failures or expose raw provider error messages.

The controller's explicit-key receipts are **process-local**, tenant- and route-scoped, retained for ten minutes from admission. They hold at most 1,000 live keys and 32 MiB of response/capture bytes, with an 8 MiB per-response cap. A full key window rejects new keyed work instead of evicting live deduplication evidence. Large images still stream, but their bytes may not be retained for replay. Completed receipts remain retrievable after model capability loss. These are bounded retry semantics, not durable exactly-once execution.

Save the `X-Galx-Idempotency-Scope` response header and send it with a retry when available. A changed controller scope rejects the retry explicitly. Without that precondition, a controller restart or expired receipt may permit new execution under the same key. Recovery across an acknowledgement lost before receiving any scope requires external operation tracking; a stable key alone is insufficient. Signed job links remain generation-bound and never attach to a replacement worker.

## Throughput and failure isolation

The controller polls at most 32 jobs per batch, at most two per worker generation, with four concurrent calls and per-job backoff from two to sixteen seconds. Selected work rotates to the tail. Worker status/cancel/stream traffic uses a separate tenant rate bucket from inference admission. Stale generation reservations do not consume replacement-worker capacity.

Docker ownership reads inspect up to 64 containers per command and time out after five seconds. Capability and acknowledgement bodies have explicit size limits. Registry reads and container listing overlap; startup/discovery and retirement are bounded to three concurrent operations. A draining invalid shard does not stall healthy shard reconciliation. Shutdown rejects new admissions immediately, allows accepted HTTP work up to thirty seconds, aborts remaining front-door I/O, and attempts every owned worker removal even if one fails.

Successful requests cannot erase a concurrent authoritative model denial. A newer inventory or worker generation fences older observations, and equal-revision health replays cannot clear a local failure. Generic route errors, throttling, and transport failures remain insufficient evidence of model permission loss.

These choices follow the explicit caller intent and bounded retry principles described in [AWS's idempotent API guidance](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/), while retaining GALX's exact-model routing and one-worker-per-shard lifecycle. The synthetic tests validate correctness and bounded scheduling; they are not a production throughput benchmark or DreamBees end-to-end image verification.

## Explicit Codex image-tool compatibility alias

`RELAY_CODEX_IMAGE_TOOL_ALIAS=true` opts OAuth workers into this compatibility contract:

| Requested image ID | Execution | Image model selection |
| --- | --- | --- |
| Public `openai-gpt-image-2` / relay `gpt-image-2` | `gpt-5.6-terra` with `image_generation` | Provider-managed; **not a guarantee of exact GPT-Image-2** |

This is an intentional alias, not a fallback after an error. It applies only to that ID and OAuth shards. API-key workers continue to request the exact image model. Other image model IDs are not remapped. [OpenAI's image guide](https://developers.openai.com/api/docs/guides/image-generation) distinguishes the mainline model calling the image tool from the tool's own image-model selection.

The execution model must be present in fresh authenticated inventory, and a real image probe must succeed before the alias enters routing. A chat-model listing alone never grants image eligibility. Alias evidence expires after one hour; active image successes renew it. Idle enabled workers make one paid startup verification and then at most one successful re-verification per 50 minutes, using spare capacity. Failed verification backs off 10, 20, then 40 minutes. This maintenance can consume upstream image quota; enable the flag only for fleets intended to serve this compatibility route. Expired evidence fails closed until successful verification. A negative model observation removes eligibility without destroying an otherwise useful worker.

Worker and public gateway responses expose `execution.requestedModel`, `execution.executionModel`, `execution.routingMode`, `execution.tool`, and `execution.imageModelSelection`, with `X-Galx-Execution-Model` and `X-Galx-Routing-Mode` headers. Capability records expose the alias mode and dependency; signed job identity and model-specific scheduling remain unchanged. Configuration changes require worker replacement; they are not silently applied to existing containers.

## Supervised macOS deployment

`node --import tsx scripts/install-federation-service.ts` generates and validates a launchd plist under the ignored controller state directory. Set `RELAY_CODEX_IMAGE_TOOL_ALIAS=true` explicitly for the compatibility route. After draining and stopping the legacy container, run the same command with `--install` to install and bootstrap `com.galxai.federation.production` on loopback port 3001. It uses the repository's `.env.local`; the plist contains no credentials. The installer refuses to overwrite an existing installed service.

The registry projector accepts both encrypted OAuth `accessToken` and API-key `apiKey` records. An API-key credential gets a stable internal account identity derived from its key. Malformed or unreadable active credentials still fail closed. Upstream 401 responses retire the corresponding worker until its credential revision changes; registry records are not deleted by the controller.

To verify DreamBees through its actual client, load its server environment and run:

```sh
DREAMBEES_ROOT=/path/to/DreamBees-Rooms \
DREAMBEES_IMAGE_OUTPUT=/tmp/dreambees-verified.png \
node --env-file=/path/to/DreamBees-Rooms/.env.local --import tsx scripts/verify-dreambees-image.ts
```

This makes one real image request with the client's own retry policy, validates its PNG using DreamBees' image validator, and logs only status, request ID, execution metadata, elapsed time, byte count, and SHA-256. Visually inspect the saved artifact before declaring verification complete.
