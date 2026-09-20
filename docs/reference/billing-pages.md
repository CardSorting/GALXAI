# Billing pages and payment paths

<!-- docs-scope: current-guide -->

Private maintainer reference. Public billing now covers the consumer Image Studio
plans and historical account records. Public Developer Access checkout,
enrollment, credential provisioning and inference price discovery are retired.
This guide is not imported into application content.

## Commercial boundary

| Surface | Current meaning | Payment behavior |
| --- | --- | --- |
| GALX Pro | Consumer Image Studio plan for one account at the published $10/month contract | Checkout is permitted only when the server-side Price and policy match |
| Creator | Image Studio plan for one account at $15/month | Checkout is permitted only when the server-side Price, plan key, and policy match |
| Studio | Image Studio plan for one account at $35/month | Checkout is permitted only when the server-side Price, plan key, and policy match |
| Team | Image Studio plan for one account at $75/month | Checkout is permitted only when the server-side Price, plan key, and policy match; shared workspaces are not included |
| GALX Nova private access | Explicitly authorized private integrations and GALX products | No public checkout or self-service purchase path |
| Historical account records | Prior transactions, invoices and ledger history | Readable only for the applicable account and reconciliation |

## Image plan catalog strategy

The sellable ladder is Start free plus four one-account Image Studio
subscriptions: GALX Pro at $10/month, Creator at $15/month, Studio at
$35/month, and Team at $75/month. Each active tier has a deterministic Stripe
Product and recurring Price. The server validates the allowlisted plan key,
product, amount, currency, interval, metadata and private paid-price policy
before creating Checkout.

The ladder is intentionally capability-led rather than a copy of another
provider's plan names. Every paid tier currently provides the existing Image
Studio controls, owner-scoped Private mode, personal library, favorites, remix
and downloads under the same published fair-use boundary. Team is a one-account
commercial tier today; seats, roles, shared libraries, priority, video,
uploaded-image editing and workspace billing are not current promises.

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

The public pricing page shows the one-time five-image welcome allowance beside
the four active paid options, so the free-to-paid path matches the real Image
Studio experience. Video, Fast/Relax lanes and uploaded-image editing are not
current consumer capabilities. Private mode is an existing owner-scoped
sharing control available to signed-in creators, not a paid-tier entitlement.
Retired developer
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

The image catalog is provisioned and activated with live-key guarded commands:
`npm run stripe:provision:image-plans` prepares deterministic inactive entries,
`npm run stripe:activate:image-plans` performs the reviewed production
activation and allowlist update, and `npm run stripe:verify:image-plans` is a
read-only live check. Activation refuses to reconcile Pro when an active
subscription uses the old price, and it does not enable Stripe Tax without
confirmed registrations.

Rendered HTML, RSC responses and browser assets must not contain retired
checkout labels, public inference prices, enrollment links, raw pricing DTOs or
operational implementation details. Confirm that Pro remains usable and that
ordinary users cannot purchase, subscribe, provision or automatically receive
general-purpose API access, and webhook fulfillment records the allowlisted
plan key without exposing provider IDs.
