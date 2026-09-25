# Billing pages and payment paths

<!-- docs-scope: current-guide -->

Private maintainer reference. Image subscriptions and Sites subscriptions are
separate products. Customer-facing Image tiers buy bounded private creative
allowance; they do not grant Star identity or publication permission.

## Commercial boundary

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| GALX Pro | Separate Sites account plan | Its existing checkout, eligibility, and publishing terms are unchanged by Image allowance work |
| Workshop | Individual private Image Studio tier | Bounded monthly allowance and Standard/HD unit cost are shown from the canonical allowance configuration |
| Studio | Individual private Image Studio tier | Bounded monthly allowance and Standard/HD unit cost are shown from the canonical allowance configuration |
| MAX | Highest individual private Image Studio tier | Bounded monthly allowance and Standard/HD unit cost are shown from the canonical allowance configuration; no seats or shared workspace |
| Private integrations | Separately authorized internal/private access only | No public checkout or self-service API access |
| Historical account records | Prior transactions, invoices and ledger history | Remain available for applicable owner-scoped display and reconciliation |

The former one-time free Image balance is retired and cannot authorize new
work. No public image offer is unlimited or anonymous. An active Image purchase
provides only the configured monthly private allowance and renewal terms; it
does not enable human publication, public profiles, feeds, Series, or uploads.

## Image entitlement and allowance

An Image checkout is available only when the server-side plan price and policy
match and a bounded allowance is configured for the plan. Private generation
and remix independently recheck current account ownership, purchased
entitlement, usable allowance, and admission. The user-facing allowance shows
the tier, whether creation is available, remaining usable units, and renewal
time without exposing internal provider economics.

Launch allowance values and Standard/HD output weights are approved in
`src/lib/billing/image-allowance-config.ts`. The public pricing and signed-in
plan surfaces derive their presentation from that configuration; do not copy
the values into a second billing source. Invalid or missing configuration
still fails closed. Do not infer future allocations from plan price, provider
cost, historic free use, or a sample account.

Usage is reserved with the durable operation before dispatch. Confirmed
pre-dispatch rejection and queued cancellation may release the reservation;
completed work settles; an ambiguous outcome stays reserved pending
authoritative reconciliation. Idempotency, timeouts, and refunds follow the
existing image lifecycle rather than a request-equals-charge shortcut.

## Destinations and recovery

| Destination | Purpose |
| --- | --- |
| `/billing` | Review current account billing and applicable historical records |
| `/billing/plan` | Review supported plan, renewal and payment recovery |
| `/billing/transactions` | Filter and export account-owned activity |
| `/billing/invoices` | View owner-scoped invoices and hosted history |
| `/billing/payment-methods` | Open the restricted payment portal |
| `/pricing` | Review public discovery and private-creation availability |

Billing responses remain owner-scoped, allowlisted and private/no-store. They
contain customer-facing plan, transaction and invoice fields only; provider
objects, ledger notes, internal diagnostics and allocation policy do not cross
the public boundary. A historical payment never proves image entitlement or
Star publishing authority. A return URL or receipt parameter never authorizes
access or replays a payment.

Preserve Stripe webhook fulfillment, historical reconciliation, and existing
Site billing independently of Image allowance. Do not rename private plan keys
or rewrite protocol identifiers solely to change customer-facing language.

## Verification and release

Run the focused billing lifecycle and Image allowance/auth tests, type check,
lint, and production build after a change. Before deployment, perform the
explicit-target database precheck, then verify checkout and allowance behavior
against the applied schema and canonical approved configuration.
Rendered HTML, metadata, raw HTTP/RSC responses, and browser assets must not
expose billing IDs, provider data, operational details, or public API access.
