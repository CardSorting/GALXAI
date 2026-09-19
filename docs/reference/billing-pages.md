# Billing pages and payment paths

<!-- docs-scope: current-guide -->

Private maintainer contract. The current source separates the consumer plan,
existing account-credit history, and the Developer subscription path. A private
preview request remains a separate access path.
[Current operating state](../../post-mortem/CURRENT_STATE.md) distinguishes
local verification from a hosted release. This guide is not imported into
application content.

## Commercial boundaries

GALX has two distinct customer-facing paths:

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| GALX Pro | Consumer Image Studio plan for one account | Real Stripe subscription at $10 USD/month |
| GALX Nova Developer Access | Programmable access to supported Nova capabilities | $50/month recurring Stripe subscription; zero usage credits included; usage billed separately |

The `$50/month` Developer subscription is an access membership, not prepaid
inference, a credit bundle or an included usage allowance. Think of it like
membership to a managed workspace: the subscription gives access to the
service; consumption is billed separately. This change does not invent usage
pricing, metering, balances, limits or consumption billing. A successful active
subscription grants only the Developer/API entitlement. Cancellation or
expiration removes it through the existing subscription lifecycle.

The public usage-pricing boundary is `/pricing/usage`. It states that the
per-message rate is $0.02 with a default $25 monthly usage cap. It is not a
token rate card, calculator, balance or consumption checkout. Developer usage
is measured per completed message; no token-based selling contract is offered.
The live Stripe usage Price and Billing Meter are attached to the Developer
Access subscription, while the application hard cap remains authoritative.

Developer consumption endpoints now require the active Developer Access
subscription and the application message reservation path. The subscription
still represents API admission; it does not create a prepaid balance or a
legacy free grant. The existing consumer Image Studio image path remains
governed by the separate GALX Pro/account access contract.

Historical wallet payments, balances, refunds and disputes remain readable for
reconciliation. They are not a current Developer catalog and do not create or
approve a Developer access entitlement. Preserve their ledger evidence and prior
customer contract history.

## Destinations and user paths

| Destination | Address | Main task |
| --- | --- | --- |
| Overview | `/billing` | Review plan, message usage, threshold notices, and existing account-credit summaries; choose a task |
| Plan | `/billing/plan` | Review Pro access, renewal/end date, payment recovery, and subscription controls |
| Credits | `/billing/credits` | Review existing account credit and historical activity; subscribe to Developer Access separately |
| Transactions | `/billing/transactions` | Filter recorded account activity, load older rows, export loaded rows |
| Invoices | `/billing/invoices` | View owner-scoped invoices and use Stripe for hosted history/downloads |
| Payment settings | `/billing/payment-methods` | Open the restricted Stripe portal for saved payment methods and invoice history |

Pricing and consumer upgrade actions link to Plan. Developer links go to
`/developers`. Account-credit, transaction and invoice links are read/history
paths; none of them starts a new Developer payment. Both search menus expose
the six billing tasks through the canonical destination registry. Wallet
balances never imply Pro access, and a historical payment never implies
Developer approval.

The former `/calculator` and `/grants` public offers permanently redirect to
`/developers`; they no longer advertise token economics, matching credits or
an automatic key path.

The layout has persistent native links, one active destination, a breadcrumb,
task-specific heading and account context. Desktop uses a navigation rail;
mobile wraps the same links without hiding tasks inside a menu. Loading and
error boundaries remain within the billing shell. Error copy never renders
exceptions, stack traces or operational explanations. Billing metadata uses
current plan and account-record language rather than historical rebate or tier
claims.

## State and recovery

`BillingProvider` is keyed by account and remains mounted across billing
destinations. It owns the current billing snapshot, transaction filter and
account identity. It does not own a new credit amount, quote or Developer
checkout draft. Failed refreshes retain last checked account data with an
explicit notice; a changed filter shows the last successful filter until its
new result arrives. Export and pagination are disabled while rows do not match,
a request is pending, or the read failed.

Account replacement or logout removes the account provider and its state.
Historical receipt and plan-return parameters are display/recovery hints only.
They never prove payment, authorize access, or replay a payment. Existing
checkout return URLs continue to resolve to the relevant history or Plan page.

Overview refresh updates both its plan and account-credit summaries. The overview
and Credits pages also load an authenticated, no-store message-usage summary with
completed and pending messages, accrued and remaining dollars, the UTC reset date,
and durable 50%/80%/100% in-app threshold notices. The summary is an allowlisted
view of the public contract; it never exposes supplier tokens, internal ledger rows,
Stripe identifiers, or operational diagnostics. Plan reads are independent of
account-credit availability. Plan management and payment settings remain reachable
during a read failure; the API decides whether an authenticated payment profile
exists. The application never fabricates saved card details or treats account
credit as payment authority.

The `/api/billing` response remains an owner-scoped allowlisted snapshot. The
public DTO contains account-facing summary, transaction and invoice fields only;
private ledger notes, provider objects and operational diagnostics stay out of
responses. Billing pages expose a public shell to anonymous visitors with a
sign-in destination, never account data. The APIs independently reject absent,
forged and wrong-owner authority. Responses stay private/no-store and pages
noindex. Ordinary account users do not gain administrator access.

## Checkout and compatibility

`src/lib/billing/navigation.ts` owns the finite destination map used by UI
entry links, metadata, navigation and search. `compatibility.ts` remains the
middleware-only owner of retired addresses. Supported historical query values
are constrained before redirect; arbitrary destinations, tokens, duplicate
state parameters and malformed receipt values are discarded. Parameters select
a display/recovery path, never authorize payment or prove success.

The new customer checkouts are Pro and Developer Access subscriptions at
`/api/billing/plan`. They use separate server-verified recurring Prices,
subscription mode, durable request identity, webhook confirmation and the
restricted billing portal. The former `/api/stripe/checkout`,
`/api/billing/quote`, wallet deposit, wallet estimate and automatic-reload paths
are retained only as compatibility guards and reject new legacy/credit purchase
attempts with a bounded response. No legacy route may create a Developer
subscription or credit balance.

Historical Stripe checkout sessions remain fulfillable by the signed webhook
ledger for refund/dispute reconciliation. Fulfillment may update an existing
account record, but it must never insert or approve
`private.developer_access_requests` from historical evidence. Developer
subscription entitlement is recorded only from the verified Nova Price and
signed subscription lifecycle.

Developer Checkout repeats the access-only boundary in Stripe Checkout custom
text and subscription metadata. If the separate usage-pricing contract is not
published, the public inference route fails closed with a bounded dependency
response; model discovery and API-key admission do not create usage credits.

Old billing bookmarks continue to resolve to the canonical pages where safe:
plan returns go to Plan, historical credit/receipt returns go to Credits, and
unsupported purchase plans go to Pricing. Redirects do not create payments.

## Verification and release

Run the focused strategy and billing checks after source changes:

- `npm run test:stripe`
- `npm run test:billing:lifecycle`
- `npm run test:developer-preview`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`

Run the production build and the existing private-boundary/rendered-page
checks. The rendered scan must confirm that `/`, `/pricing`, `/developers`,
`/faq` and the billing shell do not expose retired pack names, match bonuses,
unverified usage rates, internal Stripe identifiers or operational diagnostics.
The scan must also confirm that Pro still offers only the verified `$10/month`
subscription path and Developer presents the verified `$50/month` recurring
access subscription with no included usage credits.

The existing private return-path migration remains a prerequisite for the Pro
checkout writer where it has not already been applied. This strategy change
adds only the additive subscription-entitlement migration; it does not alter
existing customer contracts, delete Stripe objects, or authorize a live
provisioning run. Live Stripe readback and hosted payment acceptance remain
separate evidence; do not claim deployment or live-site cleanliness from local
tests alone.

## References and scope

See the [local billing design record](../../src/components/billing/DESIGN.md),
[product surface strategy](../PRODUCT_SURFACE_STRATEGY.md),
[paid-access guidance](../maintainers/SITES_FAIR_USAGE.md), and
[webhook recovery](../runbooks/stripe-webhook-delivery.md). Historical wallet
and provider records remain evidence, not current product copy.
