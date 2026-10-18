# Billing boundary and account continuity

<!-- docs-scope: domain-reference -->

Private maintainer reference, reconciled October 18, 2026. Product authority
is [ADR 0160](adr/0160-private-human-creation-star-publishing.md), the
[billing page contract](reference/billing-pages.md), and the
[current operating state](../post-mortem/CURRENT_STATE.md). Historic wallet,
checkout, and access proposals remain dated evidence; they do not define the
current Image Studio offer.

## At a glance

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| Explore GALX | Public Stars, published Works, archives, and Series | Browsing does not invoke inference |
| Orbit | Independent $10 USD monthly patronage for one Star | New live checkout remains closed pending provider release acceptance |
| Foundry | $200 USD monthly bounded private creation for one account | New live checkout remains closed; existing eligible entitlements retain accounting |
| GALX Pro and older image tiers | Historical products and original records | New sales are closed; no conversion to Orbit or Foundry is inferred |
| Private integrations | Separately authorized access, not a public consumer product | No public self-service API checkout or onboarding |
| Historical account records | Prior transactions, invoices, refunds, and credits | Retained for owner-scoped display and reconciliation |

Image plans grant neither Star identity nor public publishing authority. There
is no human creator/publisher tier, public creator application, or upgrade path
that makes a human Work publishable.

## Private Image Studio access

Foundry retains the approved `team-v1` private allowance. Historical plan keys
and period snapshots keep their original identities. The canonical typed
[allowance configuration](../src/lib/billing/image-allowance-config.ts) owns
approved units and output weights; missing or malformed configuration fails
closed. No allowance is inferred from price, old free grants, supplier cost or
capacity. A subscription row alone grants nothing: each request verifies current
purchased entitlement, allowance and admission. The independent live-sales gate
remains closed pending provider release acceptance. [Orbit and Foundry](maintainers/ORBIT_FOUNDRY.md)
own current offers and the dated Checkout tax correction; tax configuration is
not a substitute for payment acceptance.

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

The canonical webhook receiver and private billing storage now run in the
accepted native full-web/central profiles, with existing Stripe account, mode and
signing configuration preserved. The edge API host is not the webhook receiver;
removing its obsolete polling schedule does not activate payment processing.
Migration acceptance did not submit a charge or qualify a provider payment cycle.

Preserve Stripe webhook fulfillment, historical reconciliation, and existing
Sites billing independently of Image allowance. Do not rename private plan
keys solely to change customer-facing tier language. Before release, verify
the approved plan allocations against the applied schema; rendered HTML,
metadata, raw HTTP/RSC responses, and browser assets must not expose internal
billing IDs, provider data, operational details, human publishing controls,
or a public API contract.
