# Billing boundary and account continuity

<!-- docs-scope: domain-reference -->

Private maintainer reference, reconciled September 18, 2026. This document
describes the current billing and access boundary after public Developer Access
was retired. Original wallet, native checkout, rebate, and seat proposals stay
in Git and their dated decision records; they do not establish current
capabilities. [Current operating state](../post-mortem/CURRENT_STATE.md)
distinguishes source changes from releases.

## At a glance

| Surface | Current contract | Payment behavior |
| --- | --- | --- |
| GALX Pro | Consumer Image Studio plan at $10/month | Active public subscription path |
| Creator | Image Studio plan at $15/month for one account | Active public subscription path |
| Studio | Image Studio plan at $35/month for one account | Active public subscription path |
| MAX | Highest individual Image Studio plan at $200/month | Active public subscription path; account sharing, seats, and shared workspaces are not included |
| GALX Nova private access | GALX products and explicitly authorized private cohorts | No public checkout or self-service purchase |
| Historical account records | Prior transactions, invoices, refunds, and credits | Retained for owner-scoped display and reconciliation |

The Developer Access subscription is not a current product. Do not publish a
Developer price, usage rate card, checkout button, enrollment form, waitlist,
or automatic API-key workflow. `/admin` is the authenticated control plane for
deliberate private provisioning; no public private-access page is exposed.

## What remains active

GALX Pro, Creator, Studio, and MAX are the active consumer Image Studio
subscriptions with the same currently supported controls and published
fair-use terms. Each is billed for one account; MAX does not add account
sharing, seats, roles, shared workspaces, or workspace billing. Their billing pages,
payment recovery, restricted payment portal, signed webhook lifecycle, and
owner-scoped records remain independent of private API access.

The billing system also retains the infrastructure needed to reconcile existing
records: subscription and invoice history, transaction and refund records,
webhook receipts, usage and accounting records, and the existing request
identity rules. Historical records are not silently converted into a private
API entitlement.

## Private access is an admin resource lifecycle

The private workflow follows a resource-console pattern familiar from managed
cloud products:

1. **Review** a bounded cohort and its intended use.
2. **Approve** the cohort with an explicit state and, when useful, an expiry.
3. **Provision** a credential only from the authenticated admin console.
4. **Allocate** traffic and usage limits appropriate to the approved workload.
5. **Observe** current metered consumption, remaining allocation, expiry, and
   audit history.
6. **Revoke or disable** the credential/cohort when the work ends, scope changes,
   or consumption is unsafe.

Approval does not mint a credential. A successful payment, historical invoice,
account credit, or public account session does not prove private API access.
The authoritative procedure is [Private access administration](operations/preview-admin.md).

## Metering is not billing

Metering remains first-class infrastructure even when GALX is not charging a
public developer subscription. Completed and pending work, allocations,
period totals, and remaining capacity support:

- safe private-cohort admission;
- abnormal-consumption detection;
- internal cost and accounting analysis;
- capacity planning and experiments; and
- future internal products without changing the current public contract.

Metered data is exposed through allowlisted, administrator-authorized views.
Do not expose supplier tokens, internal ledger rows, provider identifiers,
routing state, or diagnostics in public responses. No public usage price or
credit balance is implied by the existence of a metering record.

## Retired paths and compatibility

The former Developer checkout, quote, wallet-deposit, wallet-estimate,
automatic-reload, enrollment, feedback, and public provisioning paths are
closed. Compatibility responses are bounded and must not create a checkout,
wallet row, usage entitlement, access request, credential, or database record.

Historical checkout sessions remain processable only when required to reconcile
existing ledger, refund, dispute, or invoice records. Reconciliation must not
approve a private cohort or mint a key. Old return URLs may resolve to a
canonical informational or billing page, but they never prove payment, replay
a payment, or grant API access.

## Change and release checklist

Keep these concerns separate in source, docs, and tests:

- consumer billing and private API authorization;
- historical reconciliation and new product creation;
- metering/accounting and public pricing;
- admin credential management and public navigation; and
- local validation, deployment evidence, and hosted acceptance.

For navigation and compatibility details, use the [billing page contract](reference/billing-pages.md).
For signed-event recovery, use the [Stripe webhook runbook](runbooks/stripe-webhook-delivery.md).
For private access, use the [operator guide](operations/developer-preview.md)
and [admin console guide](operations/preview-admin.md).

Run the focused billing and access suites plus a production build after a
change. Scan rendered HTML, RSC responses, and browser assets for retired
checkout labels, public inference prices, enrollment links, raw pricing DTOs,
and operational implementation details.
