# ADR 0141: Sites Pro self-service launch

<!-- docs-scope: decision-record -->

Date: 2026-09-12. Status: accepted. Audience: private maintainers.
Extends [ADR 0140](0140-paid-sites-and-shared-fair-usage.md). The owner explicitly requested a strategy and its application to remove the missing-plan/missing-limits pause.

September 14 eligibility extension: [ADR 0148](0148-complimentary-pro-access.md) adds explicit complimentary Pro account grants. The original paid-subscription decision and dated launch evidence below are preserved.

## Decision

Launch GALX Pro at $20/month for one account, including Sites creation, updates and managed publication under fair usage. The live billing account contained recurring products for other applications and zero active subscriptions, but no GALX recurring product. Do not grant GALX entitlement from unrelated products or turn prepaid compute deposits into an indefinite paid plan. Existing Team/Enterprise published offers remain assisted; their seats and credits are outside this launch.

Use hosted subscription Checkout and a dedicated Billing Portal for payment-method changes and period-end cancellation. Add the plan to Pricing and Billing. Keep the Sites composer free of per-update prices. Payment details stay with Stripe. Checkout requires a verified owner and server-selected price, quantity, return URL and customer. One durable open attempt and provider idempotency prevent duplicate subscriptions across retries and browser sessions. Network calls never run inside database transactions.

Reuse the existing signed webhook and atomic event receipt for checkout, invoice and subscription lifecycle events. Store private subscription projections with event ordering; a canceled subscription cannot be resurrected by a delayed update. Do not use the projection or checkout-return query as payment authority. Read current active subscription coverage, matching paid invoice lines and settled, undisputed, unrefunded invoice payments before granting access. Period-end cancellation retains current paid coverage. Refund/dispute handling for subscriptions must not debit prepaid compute wallets.

## Initial operating policy

Adopt the explicit [launch policy](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/pro-launch-policy.json): 20 baseline messages per fixed UTC day, 2 shared outstanding requests, 1 protected baseline slot, and 1 outstanding request per account. Above baseline, continuation remains available under the original sharing rules. In each rolling 60 seconds, allow at most 6 pool attempts, 3 continuation attempts and 2 account attempts. Retain demand for 120 seconds. Use a 5-second snapshot, 2-second refresh, 4-second admission deadline, 3-second reserved grant, one provider attempt and a 45-second request deadline.

These are deliberately selected local operating limits, not measured provider quota. A fresh private compatibility preflight passed and two eligible workers were observed; this does not promise throughput or available tokens. The owner delegated this initial strategy, supplying the missing operator decision. The supplied numeric test fixture remains test-only. Preserve all fair-use accounting and unknown-outcome safeguards; no hidden absolute daily maximum, token weighting or automatic generation retry is added.

## Publication and rollout

The DNS worker previously selected only the legacy account cohort. Extend its private claim query to managed domain rows with a matching account-owned published snapshot. Keep native companion scope unchanged. Paid access remains checked on each publication request. Already authorized snapshots can finish provisioning after plan expiry; cancellation does not erase a published site or saved draft.

Provision the catalog and cancellation portal without creating subscriptions or charges. Apply the paired private-table migration, deploy the application, then enable the reviewed policy through the existing operator command. Keep cancellation and recovery accessible when admission is disabled. No active tax registrations were found, so this release does not enable automatic tax or invent registrations.

## Verification and consequences

Use the disposable PostgreSQL fixture for checkout contention, lost acknowledgements, webhook ordering, customer races, refund isolation, private-role denial, rollback and managed publication discovery. Validate actual paid coverage, cancellation and refunds in Stripe's sandbox, without production DB writes or real payments. Complete the production build, public-boundary tests and rendered desktop/mobile checks. Record live plan availability and the configured revision separately; do not describe a free account or unpaid checkout as paid-generation acceptance.

The operational runbook is [Sites fair usage](../maintainers/SITES_FAIR_USAGE.md). Later price, eligibility or capacity changes require another explicit operating decision. The initial launch has no automated expansion and makes no starvation-free scheduling guarantee.
