# ADR 0135: Durable Sites receipts and local admission

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Components: relay worker, federation, server billing adapter.
Status: implemented and locally verified; the fixed-price local profile is not deployed by this pass. Earlier durable receipt rollout is separately dated below.
Audience: private maintainers. Extends [ADR 0126](0126-capability-aware-shard-relay-federation.md) for opted-in text jobs and supports [ADR 0134](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md).

## Problem and decision

A stream and a process-local admission cache cannot prove a completed result after worker replacement. Billing needs durable evidence of the original execution without starting another request. Persist a tenant-bound receipt before dispatch, mark dispatch before opening the supplier attempt, and commit completion evidence before broadcasting successful completion.

The worker journal is independent of stream replay and stored on its retained volume. A replacement writer fences the previous writer. Queued work becomes `not_started`; previously running work becomes `unknown`. Only positive fenced non-dispatch evidence can release a reservation automatically. Failed, cancelled, expired or missing work is not equivalent to non-dispatch.

Receipts have an allowlisted shape: `id`, `status`, `output`, `usage`, `retainedUntil`. Status is `pending`, `unknown`, `not_started` or `completed`. Valid usage comes from a completed supplier response with consistent integer totals and no unaccounted retries/failovers. A receipt can be completed with null usage. Fixed-price settlement uses that completion; metered settlement still requires usage within its saved limits.

## Local profile and admission

The new private `sites-local-v1` readiness profile returns version 2 with the challenged model/planning token quantity, nonce, maximum 12,000 output bytes, maximum 30,000 ms wall time, one attempt, durable receipt version 1 and minimum 30-day retention. The token quantity is a planning/correlation field; this profile does not attest a supplier token ceiling. Ordinary requests and the legacy version-1 metered profile retain their contracts.

The application checks readiness using server-only administrator authority before a quote or new generation. The request has a fresh challenge, HTTPS or loopback HTTP origin, no redirect, no cache, a six-second deadline and a 4 KiB response bound. Responses must match the exact field contract. An ordinary inference key or user session is insufficient.

The federation checks every currently eligible worker with at most eight concurrent reads and a four-second deadline, then verifies the eligible generations have not changed. During admission it reserves capacity and checks the selected worker again. A failed check before dispatch releases that admission reservation and leaves its idempotency key usable. This is a readiness check, not a model request.

Actual fixed-mode jobs request `durable_receipt: true` and `sites_profile: "local-v1"`. They omit `max_tokens`; a local profile combined with a required supplier ceiling, a token ceiling, a different profile or no durable receipt is rejected. The worker limits serialized messages/output to 12,000 bytes, applies at most 30 seconds including queue time, and makes one provider attempt. Oversized output, a provider error or a receipt commit failure cannot cause an unrecorded automatic retry.

## Identity and recovery

Customer operation IDs are scoped to the verified account before relay dispatch. The accepted job reference and original relay origin are saved before stream consumption. Authenticated customer recovery calls the application with its original operation ID; only the server resolves the private reference and reads the receipt. Public DTOs never expose the relay origin, signed transport reference, internal model, raw usage object, server rate card or administrator fields.

Federation signed receipt references bind tenant, job and original shard and last 30 days. Receipt reads may reach a replacement generation using that shard's retained volume. Stream and cancellation URLs remain bound to the admitting generation. This is the specific exception to the original-generation rule in ADR 0126; it does not move execution or stream state.

The ten-minute process-local admission cache remains a separate mechanism. Restart, changed scope or cache expiry never authorizes an application to repeat uncertain generation. The application hold survives those events and is the financial admission authority. Reconciliation uses GET, the original origin and saved rate; it does not generate, switch providers, guess a job reference or accept customer-supplied usage.

## Storage and failure limits

The receipt store uses SQLite rollback journaling, full synchronization, private permissions, content hashes, application/schema identity and a fenced writer. Its default capacity is 10,000 records. Completed receipts with valid usage and confirmed non-dispatch receipts have 30-day storage deadlines. Completed receipts without valid usage and unknown outcomes currently have no automatic storage expiry. Even after fixed-price settlement, a missing-usage receipt continues occupying this bounded store; admission fails when capacity is exhausted. This is an operational capacity limit to monitor, not a claim of unlimited retention or replicated disaster recovery.

The journal may contain generated content. Preserve its volume and federation signing authority through upgrades. A lost volume, removed shard, expired signed reference, missing accepted ID or changed origin can require operator investigation. A financial reservation does not expire merely because transport evidence becomes unavailable. A cancelled connection does not prove remote computation stopped.

## Evidence, rollout and compatibility

The [September 11 release record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/RELEASE_20260911.md) records live metered-receipt recovery across worker replacement. The later [local verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/opaque-provider-verification.json) adds missing-usage fixed-price completion, concurrent settlement, stale-price recovery, old-worker rejection, local-limit checks and a packaged restart test. These facts do not establish deployment of version 2 or a live paid transaction.

Retain compatible application settlement code when rolling back a worker or controller. Pause before replacing incompatible components, preserve volumes and signing state, and confirm existing receipt recovery before resuming. The [operations guide](../maintainers/SITES_OPERATIONS.md) owns rollout and reconciliation procedures. [ADR 0130](0130-image-receipts-and-uncertain-outcomes.md) remains the separate image contract.

Source: [receipt store](../../src/relay/durable-receipts.ts), [contract](../../src/relay/sites-contract.ts), [worker](../../src/relay/relay-server.ts), [federation](../../src/relay/federation-server.ts), [preflight](../../src/lib/billing/sites-relay-preflight.ts), [transport](../../src/core/router/adapters/RelayChatTransport.ts).
