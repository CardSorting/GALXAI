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
