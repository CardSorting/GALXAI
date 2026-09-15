# Isolated relay and account management API

<!-- docs-scope: current-guide -->

Private server/operator reference. Public clients use the application's allowlisted contract. This document covers the implemented pool services; the still-retained controller front door and signed jobs are in [legacy federation API](reference/legacy-federation-api.md). [Current state](../post-mortem/CURRENT_STATE.md) records which deployment serves public traffic.

## Controller routes

The new runtime is a fixed Premium or Standard service, with its own inference key and separate capability key. It is not a proxy for the other pool or the central database. Browser origins are rejected on server-only inference routes. The application derives tenant identity from a verified owner; an arbitrary caller header is not customer authentication.

| Method/path | Authority and behavior |
| --- | --- |
| `GET /health/live`, `/health` | Minimal process liveness |
| `GET /health/ready` | Minimal readiness; 503 unless recent reconciliation and at least one running account engine |
| `GET /v1/models` | Own inference key and delegated tenant; available assigned text model IDs |
| `POST /v1/chat/completions` | Own inference key, tenant and idempotency key; fixed-pool admission |
| `POST /v1/images/generations` | Premium only; explicit central image grant, sanitized artifact |
| `GET /v1/images/availability` | Own inference key; advisory boolean, no probe; Standard reports unavailable |
| `GET /v1/jobs/:id`, `/stream`, `/receipt` | Original tenant, account and epoch; no worker/pool migration |
| `POST /v1/jobs/:id/cancel` | Original request context; does not establish refund or final settlement |
| `GET /api/sites/contract` | Premium's distinct private capability key; challenged profile readiness, no generation |

The new runtime does not expose the legacy controller's `/api/capabilities`, `/api/telemetry` or `/federation` interface. Exact route and payload authority is [pool-runtime.ts](../src/relay/pool-runtime.ts).

## Local operator sessions and desktops

Premium and Standard have separate loopback monitor origins and purpose-specific operator/viewer cookies. Central principal authorization is checked for privileged requests. The native launcher issues a one-use ticket; neither provider credentials nor long-lived monitor keys enter browser storage.

| Method/path | Authority and effect |
| --- | --- |
| `POST /session/ticket` | Own host-held operator/viewer token; fresh central check, one-use 60-second ticket |
| `POST /session` | Exact-origin ticket exchange and explicit role; replace prior opposite-role session |
| `DELETE /session` | Revoke local operator/viewer browser sessions |
| `GET /api/status` | Authorized own-pool snapshot and bounded desktop state |
| `GET /assets/monitor*`, `/assets/desktop.js` | Private session-protected assets |
| `POST /api/registrations/prepare` | Operator; exact `id`, `desktopId`, `name`; save central intent before creating own desktop |
| `POST /api/registrations/manage` | Operator; exact `id`, `registrationId`, `expectedRevision`, `command`, optional `name` |
| `POST /api/accounts/action` | Operator; exact `id`, `accountId`, `expectedRevision`, `command`, optional `name` |
| `POST /api/registrations/signin`, `/desktop`, `/review`, `/register`, `/refresh`, `/start`, `/stop` | Operator; only saved registration `id`; centrally resolve owning desktop |
| `GET /desktops` | Private manual sign-in page |
| `/api/desktops/access`, `/session`, `/state` | Additional desktop-session exchange and bounded status |
| `POST /api/desktops/:id/launch`, `/clipboard`, `/signin`, `/signin-cancel`, `/start`, `/stop` | Allowlisted desktop actions on a centrally scoped registration; removed records allow stop only |
| WebSocket `/api/desktops/:id/display` | Operator plus desktop session and exact origin; active centrally scoped registration |

The generic desktop create/delete/link/enroll/credential-sync/organization routes from the legacy controller are not enabled in pool monitors. Use the central registration and account controls. Removing a record disconnects its active display sessions; a failed container stop is reported as incomplete cleanup, not failed central revocation.

## Manual credential authority

The monitor's operator route never accepts browser-supplied provider tokens. It reads the saved login only from the resolved owning desktop and hands a bounded candidate to the central registrar with a short-lived purpose ticket. Central validates identity, expiry, inventory and paid/free class. Register saves enrollment and assignment atomically, paused. Refresh requires the same assigned account/desktop and current revision. Removed or revoked authority cannot be bypassed by ticket replay or the legacy writer.

Central server routes use separate scoped principals: `/operator/status`, `/operation`, `/prepare`, `/manage_registration`, `/ticket`, `/set_account`; registrar `/review`, `/register`, `/refresh`; runtime `/claim`, `/heartbeat`, `/projection`, `/acknowledge`, `/acquire`, `/renew`, `/settle`. Viewer principals can read status/operation but cannot mutate. A runtime cannot perform registrar/operator actions. Every scope assertion is checked against authenticated principal identity. See [pool-central.ts](../src/relay/pool-central.ts) and [the schema contract](reference/relay-account-management.md#durable-schema).

External provider ingestion routes remain closed under [the authentication boundary](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md). GALX customer login/session refresh is a separate feature.

## Workspace organization

Pool monitors organize accounts and registrations with search/status/health filters and retained Removed views. They do not implement legacy custom tabs, drag/drop groups or editable pool selection. Rename affects labels only. Account removal revokes permanently; unfinished registration restoration requires a new review. The [management contract](reference/relay-account-management.md#account-and-registration-management) defines revision/idempotency rules and desktop cleanup.

## Request identity and bounds

New runtime generation requires a printable 1–128-character `Idempotency-Key`, verified delegated tenant and bounded JSON body. The front door caps generation input at 1 MiB with a ten-second body read; engine/profile limits also apply. Request fingerprint, tenant, workload, account and epoch are bound to durable execution identity. No upstream automatic retry runs.

An existing matching text operation may return its original job in the current epoch while its account engine exists. Image replay, epoch replacement or unavailable original context returns `result_unconfirmed`; it does not generate again. A changed payload under the same key conflicts. Internal jobs and streams are rebuilt into allowlisted public shapes, without upstream headers or operational objects.

The old controller's `X-Galx-Idempotency-Scope`, signed URLs and ten-minute process-local response cache belong to [legacy request identity](reference/legacy-federation-api.md#request-identity-and-bounds). They are not an additional promise made by the new runtime.

## Function calling

Both relays accept client-owned OpenAI-style function definitions and `tool_choice` (`auto`, `none`, `required`, or a declared function). Assistant `tool_calls` and `role: tool` results retain their original call IDs. Orphan, repeated or incomplete input pairs fail before engine admission. Completed responses carry bounded, nested-allowlisted `tool_calls` and `finish_reason: tool_calls`, preserved through JSON aggregation and SSE replay. Arguments are delivered only after terminal model success; partial argument frames are never text output. The relay does not execute callbacks or run an approval UI. Use the SDK agent loop for automatic execution and continuation. See [automatic agent tools](reference/automatic-agent-tools.md) for bounds, cancellation, errors and qualification. Durable Sites receipts remain text-output-only; use the chat contract for functions.

## Request recovery

| Response/state | Interpretation | Action |
| --- | --- | --- |
| `202` with job identity | Accepted existing/new text work | Retain its original ID/origin and read status/stream |
| `409 request_in_progress` | Same runtime admission is in progress | Inspect the original operation; no new key to bypass it |
| `409 idempotency_conflict` | Key has a different saved payload | Reconcile original intent |
| `409 result_unconfirmed` | Original image/result/epoch/account context unavailable | Preserve uncertainty; never redispatch to another pool |
| `403 capability_unavailable` | Workload is prohibited at this destination | Correct the deployment/request policy; no peer fallback |
| `503 service_busy`, `Retry-After: 5` | Standard found no eligible idle account or its recovery-start budget is waiting, before any engine attempt | Wait before resubmitting the same intent/key; the hint is not a provider reset promise |
| `503 service_unavailable` / `request_unavailable` | Readiness, authorization, admission or original context unavailable | Inspect the owning dependency and retained operation before retry |
| `409 record_changed` on management | Displayed account/registration revision is stale | Keep draft, close dialog, refresh and review before explicit retry |
| Saved removal with `desktopStopped:false` | Central removal committed; local cleanup failed | Registration → Removed → Stop desktop |

Central grants expire independently if renewal fails. Terminal persistence and original lease settlement can retry; execution cannot. Old incomplete records recover as unknown. Stored state alone does not guarantee retained artifact retrieval after epoch replacement. Product receipt recovery and legacy signed-job recovery remain separate contracts.

## Durable Sites text contract

Isolated Sites always selects Premium. Its private `local-v1` profile requests a durable text receipt and enforces time/byte/attempt bounds. Customer inclusion and fair usage remain application-owned; old fixed/metered operations retain original settlement only. Capability readiness uses a fresh challenge and the configured distinct capability key; it neither grants product access nor performs generation.

The new runtime requires the original tenant, epoch and account engine for receipt routing. It does not inherit the legacy retained-volume exception after worker replacement. Keep historical origins and keys for retrieval only. See [Sites operations](maintainers/SITES_OPERATIONS.md) and [legacy durable contract](reference/legacy-federation-api.md#durable-sites-text-contract).

## Image compatibility

Only Premium can execute the explicit image request with its own grant. No startup or scheduled image probe runs in isolated mode. Availability is advisory; actual provider acceptance remains separately qualified. The public alias is a capability name, not a promise of exact upstream model identity or dimensions.

Images default to re-encoded binary with safe headers. Explicit `b64_json` compatibility returns a narrow response; arbitrary upstream metadata, headers and errors are discarded. Product persistence and library visibility need separate acceptance.

## Private worker interfaces

Assigned engines listen internally and receive only their assigned execution material. Their local health/admin details are not an unrestricted monitor or public proxy. Runtime and monitor roles differ; an inference key cannot issue operator sessions. See [security](SECURITY.md), [central management](reference/relay-account-management.md) and [source](../src/relay/pool-monitor-server.ts).
