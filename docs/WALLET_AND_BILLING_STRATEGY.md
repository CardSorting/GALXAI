# Billing strategy and customer paths

<!-- docs-scope: domain-reference -->

Private maintainer reference, reconciled September 16, 2026. This document describes the current billing entry strategy. Original wallet, native checkout, rebate and seat proposals remain in Git and their dated decision records; they do not establish current capabilities. [Current operating state](../post-mortem/CURRENT_STATE.md) distinguishes source changes from releases.

## Separate purchases and tasks

GALX Pro and prepaid credit are separate contracts. Pro is the current monthly Sites offer; [paid-access guidance](maintainers/SITES_FAIR_USAGE.md) owns verification and limitations. Prepaid credit supports usage where authorized. Neither purchase grants developer preview approval or acts as an administrator credential. Team and enterprise needs use assisted support, not a retired self-service seat checkout.

The [billing page contract](reference/billing-pages.md) owns six task destinations: Overview, Plan, Credits, Transactions, Invoices and Payment settings. Account links open Overview, subscription actions open Plan, credit actions open Credits, and financial history links open Transactions or Invoices as labeled. Both search menus and the CLI use these destinations.

## Purchase and confirmation

Credits offers one hosted checkout form with a server-derived quote. The customer sees the one-time charge and resulting credit before opening Stripe. The CLI only prefills the amount; it does not promise a bonus or create a Checkout session. Pro has its own subscription action and management path.

Retry identities and original provider parameters survive uncertain responses. New checkouts return to the task page; previously issued URLs continue through constrained redirects. A URL or browser event never proves payment, unlocks a key, or adds a balance. Signed server processing and owner-scoped account state remain authoritative. The [webhook runbook](runbooks/stripe-webhook-delivery.md) owns delivery diagnosis, mode separation and recovery.

## Management and recovery

Transaction views filter recorded activity and export only loaded rows. Invoices link to actual owner-scoped records and hosted history. Payment settings uses a restricted Stripe portal for saved payment methods, invoices and period-end cancellation. Arbitrary plan changes remain disabled.

The application does not offer the former native express-pay checkout, crypto purchase path, immediate key reveal, automatic reload setup or one-click refund flow. Existing automatic-reload status can direct the customer to support; refund requests use billing support. Do not revive those features through old components, search terms, link labels or unverified pricing claims.

Account-scoped drafts and retry hints survive movement among billing tasks. Failed refreshes show last checked data with an explicit warning; new payments stay disabled while authority is uncertain. Empty states explain the next useful action. Private diagnostics stay out of pages, errors, metadata and browser assets.

## Change and release

Use the canonical destination registry for new links. Retired addresses have middleware redirects only; historical payment identifiers and operational records are preserved. Apply the additive private return-path migration before the new checkout writer, and retain both return contracts during presentation rollback. The [page contract](reference/billing-pages.md#verification-and-release) contains exact release prerequisites, tests and rollback instructions. Local tests do not certify a hosted payment or live deployment.
