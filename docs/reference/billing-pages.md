# Billing pages and payment paths

<!-- docs-scope: current-guide -->

Private maintainer reference. Orbit and Foundry are independent relationships;
new Sites subscription sales are closed. Historical billing remains intact.
See [Orbit and Foundry](../maintainers/ORBIT_FOUNDRY.md) for launch controls.

## Commercial boundary

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| GALX | Public discovery, following and supported saving | No subscription needed; no zero-dollar tier |
| Orbit | $10 USD per Star per month; digital patron work and support | No generation or creative control; independent subscriptions |
| Foundry | $200 USD per month; bounded private creation | Existing allowance and Standard/HD costs; no Sites, Orbit, seats or shared workspace |
| Sites | Closed to new subscription sales | Infrastructure, existing eligibility and historical records preserved |
| Private integrations | Separately authorized internal/private access only | No public checkout or self-service API access |
| Historical account records | Prior transactions, invoices and ledger history | Remain available for applicable owner-scoped display and reconciliation |

The former one-time free Image balance is retired and cannot authorize new
work. No public image offer is unlimited or anonymous. An active Image purchase
provides only the configured monthly private allowance and renewal terms; it
does not enable human publication, public profiles, feeds, Series, or uploads.

## Image entitlement and allowance

All new live recurring checkout remains disabled pending payment release acceptance.
The September 26 tax follow-up enables automatic tax and current billing-address
collection in both local session writers. Active live tax settings and a US
registration were observed; deployment and provider payment acceptance remain
separate. See the complete [tax procedure](../maintainers/ORBIT_FOUNDRY.md#checkout-tax).
A test Foundry checkout is available only when the server-side plan price and policy
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
| `/billing/plan` | Review Foundry and the VANTA Orbit canary, renewal and payment recovery |
| `/billing/transactions` | Filter and export account-owned activity |
| `/billing/invoices` | View owner-scoped invoices and hosted history |
| `/billing/payment-methods` | Open the restricted payment portal |
| `/pricing` | Review public discovery, Orbit and Foundry availability |
| `/profile/vanta` | Follow VANTA freely; inspect its Orbit terms, patron status and protected works |

Billing responses remain owner-scoped, allowlisted and private/no-store. They
contain customer-facing plan, transaction and invoice fields only; provider
objects, ledger notes, internal diagnostics and allocation policy do not cross
the public boundary. A historical payment never proves image entitlement or
Star publishing authority. A return URL or receipt parameter never authorizes
access or replays a payment.

Orbit management uses its own account/Star-scoped endpoint and customer mapping;
its portal is opened from the Orbit panel, not the historical account payment tab.
Period-end cancellation preserves current paid access. Public return parameters
do not confer patron access. Preserve Stripe webhook fulfillment, historical
reconciliation, and existing Site billing independently of Image allowance. Do not rename private plan keys
or rewrite protocol identifiers solely to change customer-facing language.

## Verification and release

Run the focused billing lifecycle and Image allowance/auth tests, type check,
lint, and production build after a change. Before deployment, perform the
explicit-target database precheck, then verify checkout and allowance behavior
against the applied schema and canonical approved configuration.
Rendered HTML, metadata, raw HTTP/RSC responses, and browser assets must not
expose billing IDs, provider data, operational details, or public API access.
