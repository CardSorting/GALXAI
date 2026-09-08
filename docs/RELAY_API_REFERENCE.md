# Federation relay API

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

This reference describes the controller front door at `https://relay.galx.ai`. Product clients use `https://galx.ai/v1` and application credentials. Worker administration is a separate private interface. See the [federation contract](FEDERATION_STRATEGY.md).

## Controller routes

| Method and path | Access | Meaning |
| --- | --- | --- |
| `GET /health` | Public | Process liveness only |
| `GET /federation`, `/federation.js` | Public shell | Capability dashboard; data requires administrator authentication |
| `GET /health/ready` | Administrator | Whether some model capacity is routable; not requested-model readiness |
| `GET /api/capabilities` | Administrator | Shards, evidence freshness, model pools, ownership, and capacity |
| `GET /v1/models` | Inference | Eligible chat model IDs; image capabilities are inspected separately |
| `POST /v1/chat/completions` | Inference | Explicit-model chat admission; retain returned job URLs |
| `POST /v1/images/generations` | Inference | Explicit-model image generation |
| `GET /v1/jobs/:id` | Owning principal | Existing signed job status |
| `GET /v1/jobs/:id/stream` | Owning principal | Existing signed job stream |
| `POST /v1/jobs/:id/cancel` | Owning principal | Cancel existing job |

Use configured bearer inference/admin keys. Authentication, tenant delegation, and job ownership are enforced separately; task IDs and caller-supplied tenant headers do not grant authority. The controller is a server-to-server front door; browsers use an application backend. Invalid controller administrator authentication returns 401; worker privilege errors have their own contract.

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

Public `openai-gpt-image-2` maps to relay `gpt-image-2`. With the explicit OAuth alias enabled and verified, execution uses `gpt-5.6-terra` plus `image_generation`; the provider chooses the image model. Exact GPT-Image-2, dimensions, and quality are not guaranteed on this route. Native API-key requests remain exact. No other image ID is remapped.

Inspect the `execution` metadata and `X-Galx-Execution-Model` / `X-Galx-Routing-Mode` headers. See [verification and refresh rules](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility). A valid image response does not establish an application asset upload.

## Private worker interfaces

Workers expose additional local health, dashboard, telemetry, metrics, and capability-probe routes. These are not all forwarded by the controller. In particular, worker `/metrics`, `/api/telemetry`, and `POST /api/capabilities/probe-image` are private administration surfaces, not public federation routes. Image probes perform real inference and can incur usage. Use the [runbook](RELAY_VNEXT_RUNBOOK.md) for worker inspection and deployment configuration.
