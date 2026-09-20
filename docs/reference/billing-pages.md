# Billing pages and payment paths

<!-- docs-scope: current-guide -->

Private maintainer reference. Public billing now covers the consumer GALX Pro
plan and historical account records. Public Developer Access checkout,
enrollment, credential provisioning and inference price discovery are retired.
This guide is not imported into application content.

## Commercial boundary

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| GALX Pro | Consumer Image Studio plan for one account | Active public Stripe subscription at the verified consumer price |
| GALX Nova private access | Explicitly authorized private integrations and GALX products | No public checkout or self-service purchase path |
| Historical account records | Prior transactions, invoices and ledger history | Readable only for the applicable account and reconciliation |

The former Developer subscription and prepaid/compute purchase paths are not
public products. Retain their backend price identities, webhook handling and
historical records where needed for reconciliation; do not expose them in
public DTOs, page metadata, checkout copy or browser bundles.

Metering remains infrastructure. Private cohorts and internal consumers can be
bounded by administrator-assigned allocation, and completed usage remains
available for accounting, anomaly detection and capacity planning. No public
usage rate card or self-service inference billing promise is implied.

## Destinations

| Destination | Address | Main task |
| --- | --- | --- |
| Billing overview | `/billing` | Review the current consumer plan and existing account records |
| Plan | `/billing/plan` | Review Pro access, renewal and payment recovery |
| Credits | `/billing/credits` | Review historical account-credit activity where applicable |
| Transactions | `/billing/transactions` | Filter and export recorded account activity |
| Invoices | `/billing/invoices` | View owner-scoped invoices and hosted history |
| Payment settings | `/billing/payment-methods` | Open the restricted payment portal |

The public pricing page links only to the consumer plan. Retired developer
pricing paths redirect to the neutral home surface, and retired checkout,
quote, wallet purchase and inbound-application endpoints return bounded 410
responses without creating storage records. Key-management pages redirect to
the neutral home surface; their server-side infrastructure remains available to
administrators.

## State and recovery

Billing responses remain owner-scoped, allowlisted and private/no-store. They
contain account-facing plan, transaction and invoice fields only; provider
objects, private ledger notes, internal diagnostics and private cohort state do
not cross the public boundary. A historical payment never proves private API
authorization. A return URL or receipt parameter never authorizes access or
replays a payment.

On a billing or payment-provider outage, show a finite recovery message and
preserve the last known account context where safe. Never report a successful
payment or access grant before server-side confirmation. Pro management and
historical record views remain independent of private developer provisioning.

## Compatibility and backend preservation

`src/lib/billing/navigation.ts` and the retired-surface compatibility map own
public destinations and redirects. Existing Stripe webhook fulfillment,
metering, accounting, subscription records, key records, traffic controls and
internal service integrations remain in place for reconciliation and private
operation. Avoid deleting or replacing those components merely because their
public distribution path is closed.

The admin-only private-access workflow is documented in
[Private access administration](../operations/preview-admin.md). It uses the
existing key repository and metering path, with administrator checks, bounded
allocations and revocation.

## Verification and release

```sh
npm run test:stripe
npm run test:billing:lifecycle
npm run test:developer-preview
npm run test:preview-admin
npx tsc --noEmit
npm run lint
npm run build
```

Rendered HTML, RSC responses and browser assets must not contain retired
checkout labels, public inference prices, enrollment links, raw pricing DTOs or
operational implementation details. Confirm that Pro remains usable and that
ordinary users cannot purchase, subscribe, provision or automatically receive
general-purpose API access.
