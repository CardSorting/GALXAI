# ADR 0126: Capability-aware 1:1 shard relay federation

Date: 2026-09-07
Status: Implemented and canary-tested; production topology cutover pending.

## Problem

The existing relay enrolled multiple credentials into one container and selected healthy spare capacity before checking model access. Model aliases could also rewrite a requested chat model. Those behaviors cannot represent heterogeneous shard capabilities or model-specific exhaustion.

## Decision

Separate the host-owned container reconciler from the capability index and inference front door. Each managed worker receives one immutable shard credential, separate internal inference/admin keys, and its own checkpoint volume. Workers receive no database credentials, vault keys, Docker socket, or host-home mount. The controller alone reads and decrypts the existing credential registry; no database migration is required by vNext.

Docker container names are deterministic from shard identity, independent of controller namespace. Docker's unique-name constraint prevents two controllers on the same Docker engine from creating two active containers for the same shard. Labels establish controller ownership; removal verifies the owner and generation. The launcher holds an exclusive local controller lock. This is a single-host ownership implementation, not a distributed consensus claim. Multiple Docker hosts require a shared ownership lease before deployment.

Authenticated inventory establishes model eligibility before health and load selection. Startup is `DISCOVERING_CAPABILITIES`; unknown and expired evidence cannot admit requests. The reverse index supplies candidate shards without scanning unrelated shard pools. Healthy candidates are ordered by recent errors, active streams, latency, queue depth and remaining capacity. An absent pool returns `model_temporarily_unavailable`; a saturated eligible pool returns `model_capacity_exhausted`, both HTTP 503. No model substitution occurs in the relay or OpenAI adapter.

No federation-wide waiting queue is introduced. Admissions reserve only the requested model pool. Existing worker jobs retain their model tags. Reservations bridge acknowledgement-to-health-sample lag; fresh worker samples replace those provisional counts. A lost acknowledgement is not replayed and holds a conservative reservation for the bounded six-minute execution envelope. Images also have no ambiguous automatic replay.

Signed job identifiers bind the worker generation, tenant, original job ID and expiry. Job status, stream reconnection and cancellation use that original worker, even after capability removal. Internal authenticated delegation preserves tenant isolation inside each worker. A process restart is distinguished using Docker's `StartedAt`, not merely the container's stable ID; prior-process health cannot re-enable routing. Worker checkpoints report interrupted jobs as failed rather than replaying inference.

Capability removal never destroys a useful relay. Empty inventories enter `CAPABILITY_EMPTY`, expose their first-empty timestamp, and remain alive for rediscovery. Retention exceeds the requested 120-second recovery grace: empty state alone never triggers deletion. Deleted, revoked, expired or authoritatively invalid credentials retire the worker. Capability mappings disappear before drain; up to three drains proceed independently while other shards continue reconciliation.

## Evidence and fencing

- Standard OpenAI API keys use authenticated `/v1/models`. Codex credentials use the authenticated Codex model inventory adapter. On September 7 the usable shard returned visible API-supported model slugs; a different registry entry returned `token_revoked`. Credential alias equality was not treated as proof of availability.
- The Codex inventory endpoint is a provider-specific implementation surface, not a public stability guarantee. An unexpected schema fails closed without replacing the last valid inventory; its bounded TTL still expires.
- Default refresh is jittered between 48 and 60 seconds, with a 120-second evidence TTL and ten-second request deadline. Controller reconciliation runs every two seconds; worker heartbeats expire after fifteen seconds.
- Explicit model-denied responses withdraw that shard/model immediately. Generic 403/404 messages, `route`, rate limits, timeouts and transport failures do not establish capability loss. Provider cooldown deadlines remain authoritative in retry responses. Registry cooldowns also gate the federation pool and are carried into newly assigned worker configuration.
- A five-second restoration hold dampens flapping. Successful fresh discovery restores eligibility afterward. Old successful requests cannot undo a newer negative observation.
- Refresh tickets capture per-model evidence versions. A refresh merges unaffected models even when busy models complete during discovery; otherwise high throughput could starve inventory refresh. Out-of-order inventories and older health revisions are rejected.
- Image operations have separate internal `image:<model>` evidence. Chat inventory alone cannot advertise image synthesis. Known API image model inventory or explicit tool metadata can establish image eligibility; an administrator can run an actual image probe for an exact execution model. A probe must return an image payload before publishing availability. There is no inference from visual input support or from a global model catalog. Unadvertised image tool access expires unless renewed by a successful operation or a new explicit probe; paid probes are not scheduled automatically.

## Operational view

`GET /api/capabilities` exposes shards, exact evidence states and expiry, ownership, streams, capacity, freshness, and per-model eligible counts. Two or more eligible shards are `HEALTHY`, one is `FRAGILE`, and zero is `UNAVAILABLE`. These are redundancy states, not an SLA or measured throughput guarantee. `/federation` supplies model-first tables, shard drill-down, and separate capability/health fields. Administrator keys stay in page memory. A failed refresh labels the retained snapshot stale; disconnect clears it.

## Verification

The final run passed 55 capability/relay tests and all 19 cooldown tests. TypeScript passed; lint reported no errors and six existing warnings. Docker canary `test-mtru9zo7` passed the three-container failure/recovery and prior-process health-fencing checks on September 7.

The test suite exercises heterogeneous A/B/C pools, negative learning, noisy errors, stale discovery and health, busy-model refresh merging, empty recovery, ownership rotation, tenant isolation, signed job affinity, active stream continuation, and exact-model dispatch. Legacy relay transport and quota regressions run with explicitly supplied test inventories; production has no multi-shard test bypass.

A real three-container Docker canary uses only synthetic credentials and authenticated test inventories. It waits for worker refresh timers, withdraws B from A without restarts, deletes shard B, observes HTTP 503 for B while A/C remain eligible, and restores B on A without a restart. A further in-place restart check verifies prior-process health fencing. Test containers are removed; dedicated checkpoint volumes are retained by the driver.

Desktop 1440px and mobile 390px browser checks cover authentication, model drill-down, stale-state messaging, disconnect, key clearing, and page overflow. The design detector used degraded regex mode because optional parser modules were unavailable; it does not establish computed contrast compliance.

## Established patterns and sources

The separation between new-request readiness and existing-connection serving follows the distinction documented by [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/). Bounded timeouts and jittered periodic I/O follow the guidance in [Amazon's Builders' Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/). These are applied patterns, not claims that GALX runs Kubernetes or duplicates those systems' scale guarantees.

Provider inventory references: [OpenAI list models](https://developers.openai.com/api/reference/resources/models/methods/list) and [Codex app-server documentation](https://learn.chatgpt.com/docs/app-server). The latter does not promise stability for the private authenticated inventory URL used by this adapter.

## Rollout boundary

See [the vNext runbook](../RELAY_VNEXT_RUNBOOK.md). The currently deployed shared relay and public tunnel are unchanged by the canary. Do not rebuild the old multi-shard deployment with the vNext worker: it intentionally refuses multiple shard assignments. Production rollout must first drain the shared legacy worker, then start the controller and move the existing ingress to its front door. Paid Hive stays disabled until its exact public image path is verified on the new topology.
