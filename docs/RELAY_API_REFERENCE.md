# Standalone relay API

Reviewed 2026-09-07 against `src/relay/relay-server.ts`. This is the local transport API, not the product API documented in [API_REFERENCE.md](API_REFERENCE.md). The app adapter translates the relay's asynchronous chat contract for its callers.

## Authentication and ownership

Send `Authorization: Bearer <relay-key>` or `X-Galx-Api-Key`. Do not send provider credentials. Inference keys submit work and access jobs owned by the same authenticated key. Administrator keys additionally access `/api/*` and `/metrics`; they do not bypass job ownership. Invalid/missing keys receive 401 and valid inference-only keys receive 403 on administrator routes. Local no-key mode is limited as described in [relay security](relay-security.md).

Browser origins must pass the origin policy independently of key authentication. Health and dashboard HTML are public; operational data is not. Opaque `X-Galx-Task-Id` values correlate telemetry, not authorization.

## Routes

| Method and path | Access | Contract |
| --- | --- | --- |
| `GET /health`, `/health/live`, `/health/ready` | Public | Process/admission status, not provider authentication |
| `GET /`, `/dashboard`, `/telemetry` | Public shell | Operator UI; enter administrator key for data |
| `GET /metrics` | Administrator | Prometheus exposition |
| `POST /v1/chat/completions` or `/chat/completions` | Inference | HTTP 202 asynchronous job acknowledgement |
| `GET /v1/jobs/:id` | Job owner | Status, output chunk count, trace, terminal/recovery fields |
| `GET /v1/jobs/:id/stream` | Job owner | SSE output/replay within memory retention |
| `POST /v1/jobs/:id/cancel` | Job owner | Idempotent cancellation, no financial transaction |
| `POST /v1/images/generations` or `/images/generations` | Inference | Synchronous JSON with base64 image data |
| `GET /api/dashboard/stats`, `/api/telemetry`, `/api/shards`, `/api/quota/status` | Administrator | Operational snapshots |
| `POST /api/shards/sync` | Administrator | Refresh fleet projection; does not enroll a new token |
| `POST /api/shards/enroll` | Administrator | 409 with registry enrollment instructions |
| `POST /api/quota/profile` | Administrator | Validated mode/custom local cap/window |
| `POST /api/quota/reset` | Administrator | Clears local request history only; send a JSON object |

## Chat lifecycle

Submit a JSON object with `model` and nonempty `messages`; supported roles are `system`, `developer`, `user`, and `assistant`. The relay validates model identifiers, reasoning effort, and token limits. Message arrays are normalized for the upstream wire. The code accepts some fields it does not forward; this is not full OpenAI tool, multimodal, or parameter compatibility. Tool-call content does not grant execution authority: there is no local tool executor.

A successful initial response is 202 with `id`, `streamUrl`, `statusUrl`, `traceId`, and polling guidance. It also provides `Location`, `Operation-Location`, and `Retry-After`. Follow the returned stream or status URL with the same inference credential. `estimatedWaitSec` and `queuePosition` are null, not predicted completion times.

Status includes `terminal`, `pollAfterMs`, `outputChunks`, `error`, and `recovery` (`state`, retry counters, next retry time, and deadline). Terminal jobs stop automatic recovery and omit retry polling guidance. The `recovery.retriesUsed` fallback after session removal derives from recorded failovers; it is not a durable complete attempt ledger.

SSE deltas are output chunks, not tokenizer counts. Completion uses `[DONE]`; failures use an error event and cancellation uses a cancelled event. A transport ending without successful completion is not a successful answer. `Last-Event-ID` replays retained chunks only. Invalid cursors return 400; expired replay windows return 409; unknown or unauthorized jobs return 404. Restart does not restore replay buffers.

Chat deduplication is based on the relay's principal-scoped request hash and configured TTL. Do not describe it as provider-side exactly-once execution or assume every product API idempotency parameter is supported.

Cancellation returns `cancellationApplied`, `refunded: null`, and `refundStatus: not_managed_by_relay`. A repeated cancellation does not apply a second cancellation. Cancellation does not prove the provider stopped computation before receiving the close.

## Images

The relay selects an eligible account. OAuth-backed image synthesis uses the provider's `image_generation` tool; platform API keys use the configured implementation's image REST path. Successful output is base64 JSON. Image requests use a wall deadline, cancellation, bounded failover, and principal-scoped idempotency. Concurrent reuse of an image key returns 409; successful retained results can be reused; a conflicting completed request returns 409. Failures are not cached.

The application router, outside this relay, may upload images to R2 and return URLs or session metadata. The relay does not provide image-library listing/deletion endpoints. See [ADR 0121](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md).

## Operational failures

| Signal | Meaning and response |
| --- | --- |
| `origin_not_allowed`, `untrusted_host` | Browser/Host boundary rejected the request; fix trusted configuration |
| 401 / 403 `admin_access_required` | Supply a valid relay key; administrator routes require administrator privilege |
| `payload_too_large`, `request_timeout` | Reduce body size or complete intake within the deadline |
| `relay_overloaded`, `relay_memory_pressure`, `server_draining` | No new work admitted; honor retry guidance |
| `shard_registry_unavailable` | Restore registry connectivity; local credential fallback is disabled in registry mode |
| `all_shards_unavailable` | No eligible account; inspect credentials, cooldowns, and slots |
| `relay_retry_budget_exhausted`, `retries_exhausted_*` | Automatic request recovery has stopped |
| `job_wall_time_exceeded`, `relay_restarted_start_new_request` | Terminal deadline/restart failure; inspect partial output before resubmitting |

Provider limits may be unknown. No local cap does not mean unlimited provider quota. `Retry-After` is retry guidance, not a reservation or guarantee that another attempt will succeed.
