# Private image allowance and accounting lifecycle

<!-- docs-scope: current-guide -->

This is the canonical maintainer reference for human image allowance admission.
It documents the existing request receipt and reservation lifecycle; it does not
define plan values, provider pricing, automatic refunds, or an independent retry
system. The [public image boundary](image-public-boundary.md) owns product and
privacy behavior.

The publication-boundary migration preserves historical public Works only
when the generation owner is an enabled, discoverable Star with an active
profile and the private
generation metadata matches a completed persisted Star content attempt and its
generation ID. Unmatched, orphaned, or incomplete history is made private; do
not broaden that backfill based on a user-controlled visibility field.

## Activation source

`src/lib/billing/image-allowance-config.ts` is the single activation surface for
Workshop (`creator-v1`), Studio (`studio-v1`), and MAX (`team-v1`). Launch
monthly units and shared Standard/HD output weights are approved there.
Checkout status, allowance presentation, and dispatch admission all consult
this typed configuration. A missing, malformed, or unapproved value disables
checkout and private dispatch.

`private.galx_image_plan_period_usage` records an immutable-in-practice snapshot
for an admitted subscription period; it is accounting history, not a second
operator-editable source of plan values. Reservations and usage updates remain
in the existing `ImageRequestRepository` transaction lifecycle. Never seed
production allowances by inserting rows or infer business values from test
fixtures.

Approved values are also constrained to the storage contract: monthly allowance
must fit Postgres `INTEGER`, and each output weight must fit positive `SMALLINT`
with HD no less than Standard. Malformed or out-of-range configuration remains
unapproved at runtime, so checkout and dispatch fail closed before a request is
reserved.

## State model

`used_units` includes both active reservations and consumed work. It is increased
in the same transaction as the durable request receipt and reservation, before
any worker can claim the request. A release decrements it only when the guarded
reservation transition from `reserved` to `released` succeeds.

| Event/evidence | Request outcome | Reservation outcome | Accounting |
| --- | --- | --- | --- |
| Authenticated owner has active purchased entitlement and enough available units | Durable `queued` receipt | `reserved` before commit | Reserve the complete operation amount atomically |
| Worker claims a private request | `generating` | Remains `reserved` | No second reservation |
| Required artifacts are durably stored, owner-checked, and receipt completes | `completed` | `settled` (consumed) | Keep units in `used_units` |
| Owner cancels while the receipt is still queued | `cancelled` | `released` | Return units once |
| The dispatch window expires while the receipt is still queued | `failed` with `generation_not_started` | `released` | Return units once; the request was never claimed |
| Local capacity rejection or allowlisted typed 503 proves `not_accepted` before work began | `failed` with `generation_not_started` | `released` | Return units once |
| Accepted/unknown dispatch, timeout after claim, missing acknowledgement, worker loss, generic error, or storage uncertainty | May be terminally displayed as `failed` | Stays `reserved` | No automatic release, refund, or retry |

Only queued cancellation, queued expiry before claim, and the two proven
pre-execution rejection cases above release a reservation. A generic
`failed` receipt does not prove that execution did not happen. Each normalized
artifact must be durable, owner-scoped, match the exact request provenance, and
match that request's non-publishable/publication class before the receipt can
complete and consume allowance. If persistence or the completion
acknowledgement is uncertain, preserve the reservation for reconciliation.

## Concurrency and idempotency

The request insert, active subscription lock, period snapshot, usage-row lock,
unit comparison, usage increment, and reservation insert share one short
transaction. The subscription/period locks serialize concurrent claims against
the same allowance. The database uniqueness key on `(user_id,
idempotency_key)` returns the original receipt on replay; it never reserves a
second time, even if the operation was cancelled or the plan later changes.

Completion, release, cancellation, queued expiry, and cleanup all use state predicates and
update the request and reservation in a single database statement/transaction.
Repeated cleanup therefore cannot settle or release twice. Do not add an
automatic retry for an ambiguous outcome. A replacement operation requires a
new explicit user action and a new allowance reservation.

## Verification

`npm run test:image:db` uses the disposable Postgres harness and the canonical
approved configuration. It covers unapproved fail-closed admission, exact
Standard/HD reservation weights, concurrent full-allocation reservation,
request replay, successful settlement, known pre-dispatch release, queued
expiry release, ambiguous reservation retention, and non-reversible rollback
behavior. If the disposable database cannot start, report the integration
gate as `BLOCKED`, not verified.
