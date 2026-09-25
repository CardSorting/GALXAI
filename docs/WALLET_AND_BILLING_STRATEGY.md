# Billing boundary and account continuity

<!-- docs-scope: domain-reference -->

Private maintainer reference, reconciled September 24, 2026. Product authority
is [ADR 0160](adr/0160-private-human-creation-star-publishing.md), the
[billing page contract](reference/billing-pages.md), and the
[current operating state](../post-mortem/CURRENT_STATE.md). Historic wallet,
checkout, and access proposals remain dated evidence; they do not define the
current Image Studio offer.

## At a glance

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| Explore GALX | Public Stars, published Works, archives, and Series | Browsing does not invoke inference |
| Workshop | Individual private Image Studio tier | Checkout is closed until bounded allowance terms are configured |
| Studio | Individual private Image Studio tier | Checkout is closed until bounded allowance terms are configured |
| MAX | Highest individual private Image Studio tier | Checkout is closed until bounded allowance terms are configured; no shared seats/workspace |
| GALX Pro | Separate Sites product where still supported | Its existing billing contract is independent of Image Studio allowance |
| Private integrations | Separately authorized access, not a public consumer product | No public self-service API checkout or onboarding |
| Historical account records | Prior transactions, invoices, refunds, and credits | Retained for owner-scoped display and reconciliation |

Image plans grant neither Star identity nor public publishing authority. There
is no human creator/publisher tier, public creator application, or upgrade path
that makes a human Work publishable.

## Private Image Studio access

An eligible purchased tier is intended to provide a bounded private image
allowance. The amount, output weights, and renewal contract must be explicitly
configured before checkout or generation is enabled. These values are not
inferred from plan price, historical free use, supplier cost, or capacity.
Until that configuration is approved, checkout and human generation fail
closed; do not present a tier as usable compute merely because a subscription
record exists.

The customer-facing allowance reports the tier, whether creation is available,
remaining usable units, and renewal timing where applicable. It does not expose
provider economics, suppliers, routing, scheduling, or internal diagnostics.
An exhausted allowance is a normal product state. No request is dispatched,
and there is no free, anonymous, or unlimited fallback. Public discovery and
previously completed private artifacts remain usable.

Every human image request enters the existing durable image lifecycle:

1. Verify the signed-in owner and current purchased entitlement.
2. Reserve the request's bounded allowance in the same transaction as its
   durable operation identity.
3. Admit the request and dispatch only after that reservation commits.
4. Settle completed work; release only a proven pre-dispatch rejection or
   queued cancellation; retain ambiguous outcomes until authoritative recovery.

Idempotency, timeout, cancellation, and retry behavior follow the image
lifecycle. A request is not itself proof of a charge or refund, and unknown
outcomes do not trigger automatic free retries.

## Historical billing and private access

Existing subscription, invoice, transaction, refund, webhook, and usage records
remain available for their original reconciliation purpose. Historical payment
does not by itself prove current Image entitlement, allowance, or Star
publishing authority. A billing return URL or receipt parameter cannot
authorize access or replay a payment.

The former public Developer Access subscription, self-service API onboarding,
and public inference-price offer are not current consumer products. Any
remaining private integration or operator provisioning process is separately
authorized and does not create public API access. Ordinary authentication or
an Image purchase does not grant administrator or Star privileges. Keep any
operational details in the private owning runbook.

## Change and release checklist

Keep these concerns separate in source, docs, and tests:

- public discovery and private human creation;
- a purchased Image entitlement and its bounded allowance;
- allowance reservation and terminal lifecycle settlement;
- customer billing and historical ledger reconciliation;
- private integration authorization and consumer access; and
- local source changes, deployment, and verified acceptance.

Preserve Stripe webhook fulfillment, historical reconciliation, and existing
Sites billing independently of Image allowance. Do not rename private plan
keys solely to change customer-facing tier language. Before release, verify
the approved plan allocations against the applied schema; rendered HTML,
metadata, raw HTTP/RSC responses, and browser assets must not expose internal
billing IDs, provider data, operational details, human publishing controls,
or a public API contract.
