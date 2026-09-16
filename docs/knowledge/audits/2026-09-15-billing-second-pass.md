# Billing and Stripe — second audit and implementation pass

<!-- docs-scope: operational-record -->

September 15, 2026. Scope: billing account page, Pro subscription status/checkout/management, wallet confirmation and top-up continuity, Stripe endpoint readiness, public DTOs and operator provisioning. [Evidence](../../../post-mortem/releases/2026-09-15-billing-ux-audit.json) records local implementation, read-only provider checks, failed attempts and final verification. The earlier test-endpoint retirement remains a separate completed operation.

**Implementation integrity: pass within the tested scope.** The existing restrained dark billing design, server-owned financial authority, hosted checkout and explicit management remain coherent. The detector returned no findings before or after; source and interaction testing nevertheless found the issues below. This is a technical/UX implementation audit, not the unperformed two-independent-reviewer critique. Reviewer permission was requested and remained unanswered; no independent-review provenance is claimed.

## Familiar patterns and adopted decisions

| Primary reference | Relevant pattern | GALX application |
| --- | --- | --- |
| [Notion billing](https://www.notion.com/help/billing) | Current plan, price and billing date grouped in settings | Plan/access summary first, validated billing-period or cancellation-end date, clear monthly offer |
| [Linear billing](https://linear.app/docs/billing-and-plans) | Plan management, payment history and failed/past-due information in one billing area | Explicit payment-required state with a direct recovery action; management remains available during status failure |
| [Vercel usage guidance](https://vercel.com/docs/pricing/manage-and-optimize-usage) | Distinguish the current plan from usage and spend | Pro subscription and prepaid API/image balance have separate explanatory copy and sections |
| [Stripe Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal) | Authenticate the customer and use a short-lived hosted management session | Both management entry points select the same restricted configuration and server-owned customer |
| [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) | Subscription and invoice lifecycle events drive ongoing state | Required readiness coverage includes created/updated/deleted subscriptions and payment failures |

These are adapted interaction patterns. They do not import another product's prices, refund policy, access rules, annual plans, seats or architecture. No measured conversion improvement is asserted.

## Scoped health score

Scores are engineering judgments for this billing pass, not WCAG certification or production performance measurements.

| Dimension | Before | After | Evidence and limit |
| --- | --- | --- | --- |
| Accessibility | 3/4 | 3/4 | Associated amount help/error, explicit statuses, visible focus, enlarged controls; final Axe checks clean, physical screen-reader use untested |
| Request resilience / performance | 2/4 | 3/4 | Bounded cancellable reads, obsolete-response rejection, retained UI, stopped confirmation polling after verified access; no load benchmark |
| Responsive behavior | 2/4 | 4/4 | Three widths, nine state captures, 320px doubled-text reflow corrected and verified |
| Theming | 3/4 | 3/4 | Preserved the intentionally dark local design; no new global theme claim |
| Implementation integrity | 2/4 | 3/4 | Portal and lifecycle contracts strengthened; existing top-up transaction design remains a bounded follow-up |
| **Total** | **12/20** | **16/20** | **Good within the tested scope; remaining work is explicit** |

## Findings and resulting behavior

### P1 — management entry points had different permissions

`/api/stripe/portal` selected the account's default portal, which read-only inspection found allowed subscription updates. Pro management selected the dedicated portal with updates disabled. A user could enter broader billing controls through the general payment-settings button.

Both routes now select one unique active Pro portal. Runtime validation requires invoices, payment-method updates and period-end cancellation, and refuses subscription updates, missing/ambiguous configuration or a truncated catalog. There is no broader fallback. The live dedicated configuration satisfies this contract; the application correction is local until deployed.

### P1 — readiness could miss subscription lifecycle coverage

The shared required-event list omitted subscription creation, updates and deletion even though the receiver implemented them. Both current live endpoints already subscribed, so no current missed lifecycle delivery was established. The allowlist, provisioner and readiness checks now share these required events; regression tests and application preflight enforce them.

### P1 — refreshed plan requests could overwrite newer state

Plan refreshes shared a mounted flag but no request-generation guard. Overlapping focus/poll/manual requests could replace current status with an older result. Reads now cancel superseded requests, have finite deadlines and retain last checked display with a clear failure notice. Checkout is withheld while authority is uncertain. Current subscription evidence is bounded and explicitly allowlisted; it never replaces the separate paid-access proof.

### P2 — account refreshes destroyed the top-up form

Setting all billing data to null unmounted the form on focus refresh or transaction filtering, resetting the amount. The new flow retains the mounted form and payment request identity. Errors identify last checked data and prevent starting a payment until recovery. Browser tests verify custom amount and identical retry identity after refresh/filter/failure.

### P2 — no clear cancellation, payment recovery or return state

The plan surface previously offered only included/required/unavailable text. It now displays scheduled subscription end, period end, payment-required, paused, processing and ended states, with management recovery. Complimentary access has no invented subscription dates. A checkout return only triggers bounded status reads; it cannot grant access or trigger another purchase. A closed checkout can resume the retained attempt.

### P1 — narrow enlarged-text layout overflow

The initial browser pass reproduced overflow at 320px with 200% text. Summary values now stack on narrow screens and invoice actions wrap. The full confirmation pass passed all widths and enlarged-text checks. Ordinary mobile controls use 44px minimum heights, and the amount input uses 16px text to avoid small-input zoom behavior.

### P2 — invoice link validation allowed alternate ports

The existing host/scheme/credential checks now also reject alternate ports. Adversarial tests cover credential-bearing URLs, lookalike domains, non-HTTPS schemes and unexpected public fields.

## What already worked and was preserved

Hosted Checkout, dynamic payment-method selection, signature verification, mode separation, durable idempotency, webhook/ledger atomicity, authoritative customer ownership, current paid-invoice verification, generic public errors, and period-end cancellation remain in place. A disposable database rerun verified concurrency, uncertain acknowledgements, webhook-before-response ordering, terminal cancellation, refund isolation and 24 browser-role denials. No payment was submitted.

## Remaining work and acceptance limits

- **P2, billing maintainer — top-up transaction duration:** legacy top-up creation holds locks during Stripe requests. The SDK has finite timeouts, and idempotency/ownership must be preserved. A future durable-lease refactor needs provider-success/lost-ack, concurrent-customer, delayed-webhook and lock-contention tests; merely moving calls outside transactions would weaken coordination. This pass does not change the schema or claim load-readiness.
- **Business configuration — tax:** read-only Stripe inspection found no active tax registrations. Tax collection and registrations were left unchanged. Establish the applicable business/jurisdiction requirements before enabling automatic tax; turning on a flag alone is not registration.
- **Release operator — hosted acceptance:** this report records local source/build/browser verification. A compatible application release and actual signed-in Billing acceptance remain separate. No real charge, refund, cancellation, provider email, dunning configuration or whole-live-site audit occurred.
- **Optional independent design review:** the two-reviewer critique remains pending the user's preference. This does not invalidate the source, fixture, database or browser evidence, and must not be relabeled an independent review.

The scoped implementation is complete. Use the [recovery runbook](../../runbooks/stripe-webhook-delivery.md) and [release procedure](../../runbooks/release-readiness.md) for later hosted acceptance. Future refinement should address the explicit findings first; finish with a bounded polish pass rather than broad visual replacement.
