# Federation relay API

<!-- docs-scope: current-guide -->
> Private server-to-server and operator reference. Product clients use the separately allowlisted application contract.

This reference describes the controller front door at `https://relay.galx.ai`. Product clients use `https://galx.ai/v1` and application credentials. Worker administration is a separate private interface. See the [federation contract](FEDERATION_STRATEGY.md).

## Controller routes

| Method and path | Access | Meaning |
| --- | --- | --- |
| `GET /health` | Public | Process liveness only |
| `GET /federation` | Local monitor session for operational view | Anonymous requests receive generic connection guidance only |
| `GET /federation.js` | Local monitor session | Private operational browser code |
| `GET /api/telemetry` | Administrator | Aggregated controller/worker monitor snapshot |
| `GET /health/ready` | Administrator | Whether some model capacity is routable; not requested-model readiness |
| `GET /api/capabilities` | Administrator | Shards, evidence freshness, model pools, ownership, and capacity |
| `GET /v1/models` | Inference | Eligible chat model IDs; image capabilities are inspected separately |
| `POST /v1/chat/completions` | Inference | Explicit-model chat admission; retain returned job URLs |
| `POST /v1/images/generations` | Inference | Explicit-model image generation |
| `GET /v1/jobs/:id` | Owning principal | Existing signed job status |
| `GET /v1/jobs/:id/stream` | Owning principal | Existing signed job stream |
| `POST /v1/jobs/:id/cancel` | Owning principal | Cancel existing job |

Use configured bearer inference/admin keys. Authentication, tenant delegation, and job ownership are enforced separately; task IDs and caller-supplied tenant headers do not grant authority. The controller is a server-to-server front door; browsers use an application backend. Invalid controller administrator authentication returns 401; worker privilege errors have their own contract.

## Local operator sessions and desktops

These routes are loopback-only and enforce host, origin and forwarding-header restrictions. The normal entrypoints are `npm run relay:open` and `npm run relay:desktops`. An ordinary inference key is not administrator authority.

| Method/path | Authorization and effect |
| --- | --- |
| `POST /api/monitor/access`, `POST /api/desktops/access` | Host-held admin key issues a one-use 60-second ticket for the selected purpose |
| `POST /api/monitor/session`, `POST /api/desktops/session` | Same-origin ticket exchange; HttpOnly, SameSite=Strict cookie, at most 12 hours |
| `DELETE /api/monitor/session`, `DELETE /api/desktops/session` | Revoke that browser session; desktop sockets close |
| `GET /api/monitor/state`, `GET /api/monitor/capabilities` | Read-only monitor session |
| `GET /desktops` | Authorized workspace view; anonymous response is a generic connection page |
| `GET /desktops/assets/*` | Desktop session, except generic login script |
| `GET /api/desktops/state` | Desktop session; refreshed workspace and linked shard state |
| `POST /api/desktops/create` | Desktop session plus same origin; bounded creation with caller-generated workspace ID |
| `POST /api/desktops/:id/start`, `stop`, `delete` | Desktop session; delete requires the exact workspace name as confirmation |
| `POST /api/desktops/:id/launch` | Allowlisted Terminal or Chrome |
| `POST /api/desktops/:id/clipboard` | Explicit bounded text read/write |
| `POST /api/desktops/:id/link` | Existing shard or null; expected previous link required |
| `POST /api/desktops/:id/traffic` | Linked shard and generation checked; pause/resume admissions |
| `POST /api/desktops/:id/credential-sync` | Configure sync or check saved login; no token-upload contract |
| `POST /api/desktops/:id/signin`, `signin-cancel` | Begin browser/device sign-in or cancel it |
| `POST /api/desktops/:id/credential-match` | Match saved account to existing eligible authority; link still requires review/save |
| WebSocket `/api/desktops/:id/display` | Same-origin desktop session, bounded connections and backpressure |

Monitor and desktop sessions are independent, process-local grants. Renewing a session invalidates its previous cookie. Session expiry/revocation closes display access. The page removes ticket fragments; admin keys and provider credentials do not enter browser storage. See [desktop operations](maintainers/RELAY_DESKTOPS.md).

## Request identity and bounds

Every new inference request names the exact model. The controller bounds JSON intake to 2 MiB and ten seconds. Provide `Idempotency-Key` per logical operation and preserve it with the same payload when recovering an acknowledgement. `X-Galx-Task-Id` is correlation only. The controller assigns a fresh request ID.

Receipts are tenant- and route-scoped, process-local, and retained for ten minutes from admission: at most 1,000 live keys, 32 MiB aggregate capture/response storage, and 8 MiB per response. Live keys are not evicted to admit new work. A large image can stream successfully without being retained for replay. Completed receipts can be retrieved after model capability loss.

Preserve the response `X-Galx-Idempotency-Scope` and send it on retries. A changed scope rejects the request; absent this precondition, restart or receipt expiry can permit new execution with the same key. This is not durable exactly-once execution.

## Request recovery

| Response | Execution meaning | Next action |
| --- | --- | --- |
| `202` | Accepted | Save `id`, `statusUrl`, `streamUrl`; `Operation-Location` is status and `Location` is stream |
| `409 request_in_progress` | Admission/result pending | Retry the same key and payload after `Retry-After` |
| `409 idempotency_conflict` | Key already represents different parameters | Reconcile original operation; do not treat as a retry |
| `409 result_not_retained` | Finished, response unavailable for replay | Do not repeat synthesis to retrieve bytes |
| `409 idempotency_scope_changed` | Prior execution uncertain across scope change | Inspect original job/trace before new work |
| `502 relay_admission_unknown` | Acknowledgement lost; execution uncertain | No blind replay; conservative capacity hold is bounded |
| `502 job_transport_unavailable` | Job already accepted | Retry its existing URL using retry guidance |
| `410 relay_generation_gone` | Original worker generation unavailable | Reconcile original execution; never attach to replacement worker |
| `503 model_temporarily_unavailable` | No eligible shard for requested capability | Honor retry headers; inspect that model pool |
| `503 model_capacity_exhausted` | Eligible pool saturated | Honor retry headers; unrelated capacity is irrelevant |

Read `X-Should-Retry`, `Retry-After`, and execution state together. The adapters preserve status, safe upstream code, retry delay, execution state, request ID, and scope in `RelayDispatchError`; configured relay errors do not trigger automatic direct-provider fallback. A `5xx` alone does not establish safe replay.

Signed job URLs bind tenant and worker generation. Capability loss does not terminate accepted streams. Reconnection uses bounded retained events; missing events, EOF, or provider failure are not successful completion. Cancellation does not itself establish billing/refund settlement.

## Image compatibility

The canonical public capability is `openai-gpt-image-latest`; legacy application aliases resolve to it. Internal `gpt-image-2` has the explicitly enabled OAuth tool compatibility route described in [the contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility). Exact underlying model identity, dimensions and Image API quality semantics are not guaranteed on that route.

Execution metadata is private transport/administrator evidence. The product gateway must strip execution headers and internal objects from its allowlisted responses and re-encode image artifacts. A valid generation response does not establish application asset upload or paid transaction completion.

## Private worker interfaces

Workers have separate local health, telemetry, metrics and capability-probe routes. The controller's admin `/api/telemetry` aggregates worker observations; it is not an unrestricted proxy to all worker routes. Worker `/metrics` and `POST /api/capabilities/probe-image` remain private. A real image probe can incur usage.

The source authority for routes is [federation-server.ts](../src/relay/federation-server.ts) and [desktop-gateway.ts](../src/relay/desktop-gateway.ts). Use [the runbook](RELAY_VNEXT_RUNBOOK.md) for configuration and [security boundaries](SECURITY.md) for authorization.
