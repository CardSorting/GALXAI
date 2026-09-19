# Billing strategy and customer paths

<!-- docs-scope: domain-reference -->

Private maintainer reference, reconciled September 18, 2026. This document
describes the current billing boundary. Original wallet, native checkout,
rebate and seat proposals remain in Git and their dated decision records; they
do not establish current capabilities. [Current operating state](../post-mortem/CURRENT_STATE.md)
distinguishes source changes from releases.

## Separate surfaces

GALX Pro is the consumer Image Studio subscription: `$10 USD/month` for one
account, with the published image-creation terms and fair-use boundaries.

GALX Nova Developer Access is a separate `$50 USD/month` recurring subscription
for programmable access to supported Nova capabilities. It is an access fee,
not prepaid inference, a credit bundle or an included usage allowance. Usage is
billed separately at $0.02 per completed message with a default $25 monthly
hard cap. No usage credits are included and customer billing is not token-based.

The public status page at `/pricing/usage` makes that boundary explicit: usage
is billed at $0.02 per completed message with a default $25 monthly cap. The
page is not a token rate card, wallet balance or credit grant. Developer
checkout includes the live metered Price alongside the access Price; the
application reservation path remains authoritative for the hard cap.

The six billing destinations remain the account workspace: Overview, Plan,
Credits, Transactions, Invoices and Payment settings. Credits presents existing
account-credit records and historical reconciliation. It is not a Developer
usage or purchase ledger. `/developers` owns the Developer subscription path;
the private preview form remains separate.

Overview and Credits also show the authenticated message-usage summary: completed
and pending messages, accrued and remaining spend, cap progress, UTC reset date,
and durable in-app notices at 50%, 80%, and 100% of the monthly cap. The summary
is an allowlisted, no-store view; it does not expose supplier tokens, internal
ledger rows, Stripe identifiers, or diagnostics.

## Payment and confirmation

Pro and Developer Access create Checkout Sessions through the same existing
subscription writer. Pro uses the server-verified `galx_pro_monthly_v1`
recurring Price at `$10/month`. Developer uses its own
`galx_nova_developer_monthly_v1` recurring Price at `$50/month`, durable
request identity, Stripe webhooks and owner-scoped subscription state. The
restricted Stripe portal handles payment methods, invoice history and
period-end cancellation.

The former prepaid Developer/compute-pack catalog is retired. New calls to the
legacy quote, wallet-deposit, wallet-estimate, automatic-reload and generic
Developer checkout paths reject with a bounded response and make no provider or
database call. Developer subscription checkout creates no wallet row, usage
credit, balance or consumption entitlement.

Historical checkout sessions remain processable only when needed to reconcile
existing wallet ledger, refund or dispute records. That path is not a current
catalog and must never create or approve a row in
`private.developer_access_requests`. A successful active Developer subscription
creates only the subscription-backed API entitlement; the private preview
review workflow remains an independent access path.

## Account continuity and public responses

Existing account balances, transactions, invoices and refunds remain
owner-scoped and readable through explicit DTOs. Historical protocol keys and
ledger fields stay available to internal reconciliation code but are not
current product names or public entitlements. Public billing responses expose
only account-facing summaries, generic transaction descriptions and validated
Stripe-hosted invoice URLs.

Old return URLs and bookmarks remain resolvable where safe. They select a
canonical page and never prove payment, create a new session, or grant access.
No automatic retry or payment replay is allowed from a return URL.

## Change and release

Keep the consumer and Developer surfaces separate in copy, routes, Stripe
objects and access decisions. Do not delete historical Stripe objects or
rewrite customer records as part of this framing change. Provision the
Developer Price only through the private Nova procedure, after the existing
live/test Stripe authority and deployment conventions are verified. This
strategy does not authorize running that live procedure.

Use the [billing page contract](reference/billing-pages.md) for route,
compatibility and verification details. Use the
[Stripe webhook runbook](runbooks/stripe-webhook-delivery.md) for signed-event
delivery, mode separation and recovery. Local checks do not certify a hosted
payment or a live deployment.
