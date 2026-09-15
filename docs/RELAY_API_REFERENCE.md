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
| `GET /v1/jobs/:id/receipt` | Owning principal | Read an opted-in durable text receipt; may use replacement worker on the original retained volume |
| `GET /api/sites/contract` | Administrator | Fresh challenged readiness for the selected Sites profile; starts no inference |

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
| `POST /api/desktops/organization` | Desktop session plus same origin; revision-checked custom tabs, membership and ordering |
| `POST /api/desktops/create` | Desktop session plus same origin; bounded creation with caller-generated workspace ID; does not enroll an account |
| `POST /api/desktops/:id/start`, `stop`, `delete` | Desktop session; delete requires the exact workspace name as confirmation |
| `POST /api/desktops/:id/launch` | Allowlisted Terminal or Chrome |
| `POST /api/desktops/:id/clipboard` | Explicit bounded text read/write |
| `POST /api/desktops/:id/link` | Existing shard or null; expected previous local link required; no change to durable desktop ownership |
| `POST /api/desktops/:id/traffic` | Linked shard and generation checked; pause/resume admissions |
| `POST /api/desktops/:id/enroll` | Desktop session and exact origin; explicitly validate/enroll the saved login or confirm an eligible legacy record |
| `POST /api/desktops/:id/credential-sync` | Configure saved-file sync or check an enrolled account in its bound desktop; never renew a provider session or accept token upload |
| `POST /api/desktops/:id/signin`, `signin-cancel` | Begin browser/device sign-in or cancel it |
| `POST /api/desktops/:id/credential-match` | Match saved account to existing eligible authority; link still requires review/save |
| WebSocket `/api/desktops/:id/display` | Same-origin desktop session, bounded connections and backpressure |

Monitor and desktop sessions are independent, process-local grants. Renewing a session invalidates its previous cookie. Session expiry/revocation closes display access. The page removes ticket fragments; admin keys and provider credentials do not enter browser storage. See [desktop operations](maintainers/RELAY_DESKTOPS.md).

## Manual credential authority

`POST /api/desktops/:id/enroll` is the private action behind **Enroll shard**, not an external ingestion API. Its body contains only `expectedShardId`: the current linked shard ID, or null for an unlinked workspace. Credential fields and all unknown fields are rejected. Success returns only `{ "shardId": "<opaque id>" }`; it means enrollment/link persistence, not worker or image readiness.

The action requires a valid desktop session, exact local origin, a saved running workspace and a safely readable guest login. A raw administrator bearer or read-only monitor cookie is not a substitute for that desktop session. The host rechecks the expected link, file and operation before writing. Database rules require a unique owning-desktop binding and a current encrypted revision; existing eligible accounts retain owner, counters, holds and history. Wrong-account, wrong-desktop, ambiguous and revoked/dead/quarantined records cannot be enrolled.

Anonymous, inference-only, raw-admin-bearer and monitor-session enrollment calls return 401. A wrong origin returns 403. Credential/unknown JSON fields return 400. Account/link/file conflicts and credential validation failures return bounded private errors; storage/inventory failures do not claim a saved enrollment. Repair the reported stage before an explicit retry. A lost response or failed local link checkpoint can be reconciled by retrying enrollment in the same desktop after storage recovery.

`signin` can begin an unlinked workspace's sign-in using a null expected shard. `credential-match` only proposes a matching retained account; `link` updates the local association and cannot transfer the database binding or confirm legacy authority. `credential-sync` requires the owning enrolled desktop. Its automatic setting checks saved logins; the operator still renews expired provider sessions manually.

Retired application routes are a separate boundary on the GALX application: POST `/api/auth/openai`, `/api/auth/ingest`, `/api/ingest`, `/api/auth/oauth/par`, `/api/auth/oauth/refresh`, GET `/api/auth/oauth/url`, and GET/POST `/api/auth/oauth/callback` return 410 with `{ "error": "Provider connections are unavailable." }`, private no-store caching and no account-cookie mutation. They never process credentials or start provider authentication. GALX account `/auth/callback`, account session endpoints and device grants remain distinct. See [the authentication reference](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md).

## Workspace organization

The private state response includes `organization: { available, revision, maxGroups, groups, ungrouped }`. Each group has `id`, `name` and ordered `desktopIds`; `ungrouped` is an ordered desktop-ID array. Organization mutations return that same allowlisted shape and require `expectedRevision` from the latest snapshot. Each action accepts only these additional fields:

| Action | Fields |
| --- | --- |
| `create` | `groupId` (new UUID), `name` |
| `rename` | `groupId`, `name` |
| `remove` | `groupId`; members return to Ungrouped |
| `reorder` | `groupId`, `beforeGroupId` (current group UUID or null for end) |
| `move` | `desktopId`, `groupId` (null for Ungrouped), `beforeId` (destination desktop UUID or null for end) |

Names are normalized, unique and limited to 1–40 characters; built-in tab names are reserved and at most 12 custom tabs are allowed. Stale revisions return `409 organization_changed`; refresh and review before retrying. Invalid fields return `400`, missing targets return `404`, and unavailable or unconfirmed storage returns `503`. These metadata actions do not change links, credentials, traffic or desktop lifecycle. The organizer's JavaScript and stylesheet are served only under the protected desktop asset routes.

## Request identity and bounds

Every new inference request names the exact model. The controller bounds JSON intake to 2 MiB and ten seconds. Provide `Idempotency-Key` per logical operation and preserve it with the same payload when recovering an acknowledgement. `X-Galx-Task-Id` is correlation only. The controller assigns a fresh request ID.

Admission replay receipts are tenant- and route-scoped. The controller persists a private identity tombstone after admission. Completed response bodies are cached for ten minutes; when that cache window expires, the identity and fingerprint remain permanently as `unknown` so a late retry cannot become new work. Pending entries also become unknown after controller loss. Response bodies stay process-local. The in-memory cache permits at most 1,000 keys, 32 MiB aggregate capture/response storage, and 8 MiB per response. Live and uncertain keys are not evicted to admit new work, so capacity exhaustion fails closed until an operator reconciles retained evidence. A large image can stream successfully without being retained for replay. Completed receipts can be retrieved after model capability loss, but a completed response body may be unavailable after controller replacement.

Preserve the response `X-Galx-Idempotency-Scope` and send it on retries. A changed scope rejects the request; without that precondition, a retained tombstone still blocks an uncertain key, while an expired response cache leaves the identity as unknown and unavailable evidence requires a new explicit reconciliation decision. This is not durable exactly-once execution.

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
| `410 relay_generation_gone` | Original stream/cancel generation unavailable | Recover an opted-in durable text receipt on its original retained volume when available; never move execution |
| `503 model_temporarily_unavailable` | No eligible shard for requested capability | Honor retry headers; inspect that model pool |
| `503 model_capacity_exhausted` | Eligible pool saturated | Honor retry headers; unrelated capacity is irrelevant |

Read `X-Should-Retry`, `Retry-After`, and execution state together. The adapters preserve status, safe upstream code, retry delay, execution state, request ID, and scope in `RelayDispatchError`; configured relay errors do not trigger automatic direct-provider fallback. A `5xx` alone does not establish safe replay.

Signed job URLs bind tenant and worker generation. Capability loss does not terminate accepted streams. Reconnection uses bounded retained events; missing events, EOF, or provider failure are not successful completion. Cancellation does not itself establish billing/refund settlement.

## Durable Sites text contract

The application-facing customer contract is [Site content generation](SITES_CONTENT.md). The fields in this section are private transport fields and must not be forwarded into that public response.

A fixed-price job uses `durable_receipt: true`, `sites_profile: "local-v1"`, explicit model/messages and no `max_tokens`. Combining this profile with a supplier ceiling, a different profile or a missing durable receipt flag is invalid. The local profile enforces byte/time/attempt bounds; it does not attest supplier quota or token-ceiling enforcement. The legacy metered path instead requests `require_output_limit: true` and `max_tokens` with durable receipts.

The administrator readiness query has `model`, `maxOutputTokens` and a fresh `nonce`; fixed mode also sends `profile=sites-local-v1`. Version 2 replies bind those values and exactly report `maxOutputBytes`, `maxWallTimeMs`, `maxAttempts`, `durableReceiptVersion` and `receiptRetentionDays`. Version 1 is the legacy `sites-text-v1` forwarding contract. Readiness response validation rejects extra/mismatched fields. See [ADR 0135](adr/0135-durable-sites-receipts-and-local-admission.md) and [Sites operations](maintainers/SITES_OPERATIONS.md) for limits and dispatch checks.

`GET /v1/jobs/:id/receipt` returns only `id`, `status`, `output`, `usage`, `retainedUntil`. Status is `pending`, `unknown`, `not_started` or `completed`. Output and usage can be null. A completed receipt with null usage supports fixed-price settlement, while metered settlement requires valid usage. A fenced `not_started` receipt supports a zero-cost close while its retained evidence is valid; after that window it becomes an `unknown` tombstone. Missing or unknown receipts do not authorize a zero-cost close.

The signed reference remains tenant-bound and has a 30-day lifetime. Unlike streams/cancellation, a receipt read can reach a replacement worker on the original shard's retained volume. This endpoint does not restart inference or extend the admission tombstone or process-local response-cache windows. Public account recovery supplies only the original operation ID; its server adapter resolves this private reference and saved price.

## Image compatibility

The canonical public capability is `openai-gpt-image-latest`; legacy application aliases resolve to it. Internal `gpt-image-2` has the explicitly enabled OAuth tool compatibility route described in [the contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility). Exact underlying model identity, dimensions and Image API quality semantics are not guaranteed on that route.

Execution metadata is private transport/administrator evidence. The product gateway must strip execution headers and internal objects from its allowlisted responses and re-encode image artifacts. A valid generation response does not establish application asset upload or paid transaction completion.

## Private worker interfaces

Workers have separate local health, telemetry, metrics and capability-probe routes. The controller's admin `/api/telemetry` aggregates worker observations; it is not an unrestricted proxy to all worker routes. Worker `/metrics` and `POST /api/capabilities/probe-image` remain private. A real image probe can incur usage.

The source authority for routes is [federation-server.ts](../src/relay/federation-server.ts) and [desktop-gateway.ts](../src/relay/desktop-gateway.ts). Use [the runbook](RELAY_VNEXT_RUNBOOK.md) for configuration and [security boundaries](SECURITY.md) for authorization.
