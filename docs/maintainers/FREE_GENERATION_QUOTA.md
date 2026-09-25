# Legacy free generation and current image allowance

<!-- docs-scope: current-guide -->

Private maintainer guide. The former one-time free Image quota is retired; this
document is not an offer, a reset procedure, or permission to create new free
image grants. Historical records remain available for safe reconciliation.
Public pages describe only the customer's purchased allowance and current
availability.

## Current image contract

Human image inference is available only through an explicit private creation or
private remix request from an authenticated account with an active eligible
purchased image tier, sufficient allowance, and successful admission. A
durable reservation must commit before dispatch. No image path may infer a free
grant from a user ID, API key, Site plan, historical purchase, public visit, or
client-provided field.

The sequence is:

`authenticated owner → purchased entitlement → quota check → reserve usage → admission → dispatch → terminal outcome → settle accounting`

Each idempotent receipt has one owner and one accounting identity. Reservation
is concurrency-safe: requests for the same subscription period cannot exceed
the allocation. Confirmed pre-dispatch rejection, queued cancellation, and a
queued receipt expiring before claim may release a reservation under existing
lifecycle rules. Successful work settles it; ambiguous or unknown execution
after claim remains reserved until authoritative reconciliation. Do not treat
a request as a charge, clear an uncertain reservation because it is old, or add
automatic retries for unknown outcomes.

The approved launch allocations and shared output weights live only in the
canonical typed configuration; accounting-period snapshots are not an alternate
activation source. If configuration is missing, malformed, or unapproved,
checkout and dispatch fail closed and the UI shows that private creation is
unavailable. Do not add an exhaustion fallback. When an allowance is exhausted,
reject before dispatch with the normal “Creation allowance exhausted” state;
public discovery remains unaffected. See the exact
[accounting lifecycle](private-image-accounting.md).

The legacy five-image balance is not exposed in the browser quota DTO and does
not authorize new work. Human request claims require a current purchased
reservation; old free-image usage rows cannot bypass that check. Preserve the
historical ledger for idempotency and reconciliation; do not reset, backfill,
or reinterpret its remaining count as purchased allowance.

## Other workspace allowances

Sites access, Site turns, and fair-use admission remain separate from the
Image Studio contract. Keep Site behavior documented in the
[Sites workspace](SITES_WORKSPACE.md), [Sites fair-use](SITES_FAIR_USAGE.md),
and [workspace operations](SITES_OPERATIONS.md) guides. Never couple Image
plan exhaustion or an image-service outage to Explore, Star archives, or
unrelated Sites access.

The shared account quota response contains only its supported Site fields.
Image plan, remaining units, and renewal information come from the dedicated
private image allowance contract. Project exact DTO allowlists; do not forward
legacy image counts, identity hashes, billing IDs, policy counters, or internal
failure details into a public response.

## Request lifecycle and recovery

Every human receipt is owner-scoped and classed Private Work before execution.
Claim must fail closed if a private receipt has no current reservation. A
Star-published receipt is a separate server-authorized class and may bypass a
human purchase reservation only through the controlled Star operation. A
client cannot request that class.

Keep cancellation, queued expiry, timeout-after-claim, pre-generation
rejection, completion, ambiguous upstream outcomes, safe reservation release,
and idempotent cleanup aligned with the image request lifecycle. The request
repository is not an automatic retry queue. A queued request expiring before
claim is known not to have dispatched; a timeout after claim, missing status
response, or worker restart does not prove non-dispatch. Preserve original
operation identity and inspect the private library before a manual new
operation.

## Operator and release guidance

Do not apply billing changes to a remote database or seed production image
allowances without explicit approval of the amounts and renewal behavior. Use
the existing documented billing, database, and private image recovery
procedures. A migration being present in source does not mean it has been
applied remotely.

For changes, run `npm run docs:impact`; inspect unmapped paths and reconcile all
affected guides. Run the quota/auth tests, image HTTP/security tests, isolated
database tests where the disposable integration environment is available,
TypeScript, lint, and a production build. Record actual results and scope.
Local fixtures do not prove hosted allowance configuration, live R2 privacy,
deployment, or real-user acceptance.
