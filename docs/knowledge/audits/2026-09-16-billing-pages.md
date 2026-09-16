# Billing pages — navigation and recovery audit

<!-- docs-scope: operational-record -->

September 16, 2026 UTC. Local application work following the September 15 Stripe/lifecycle audit. The user requested separate billing pages, clearer paths and familiar established-app patterns. No deployment, database mutation, Stripe configuration change or payment was performed in this pass.

## Resulting structure

| Page | User question | Primary path |
| --- | --- | --- |
| Overview | What is my account's billing position? | View plan or add credit |
| Plan | What access do I have and what happens next? | Choose/manage Pro or recover payment |
| Credits | How much credit remains and how do I add more? | Review the quoted amount and open Checkout |
| Transactions | Where did my credit go? | Filter, load more and export loaded rows |
| Invoices | Where is the invoice for a payment? | Open the issued invoice or hosted history |
| Payment settings | How do I update my payment method? | Open the restricted Stripe portal |

The six canonical URLs, redirects, state contract, verification and rollback are maintained in [Billing pages](../../reference/billing-pages.md). The [local design record](../../../src/components/billing/DESIGN.md) describes the final surface. The earlier [second-pass audit](2026-09-15-billing-second-pass.md) remains historical evidence for the lifecycle safeguards.

## Familiar patterns applied

- [Notion](https://www.notion.com/help/billing): plan and billing-period context precede account management. GALX preserves its own single-account monthly offer and never copies seat rules.
- [Linear](https://linear.app/docs/billing-and-plans): one billing area gives direct access to plan, payment information and billing history, with visible payment problems. GALX adds explicit task pages under that common navigation.
- [Vercel](https://vercel.com/docs/pricing/manage-and-optimize-usage): usage is a distinct destination and question from plan membership. GALX distinguishes prepaid activity from subscription access and issued invoices.

These are adaptations of published interaction patterns, not claims about those companies' internal implementation, endorsements or measured improvements.

## Findings and corrections

### Navigation obscured separate tasks

Invoice/payment URLs redirected to one long Billing page. Section anchors placed plan choice, wallet funding, transactions and invoices in one scrolling document. Six actual pages now have their own titles, descriptions, canonical metadata, active navigation and links. The Overview summarizes rather than repeating the forms and history. Pricing, home and generation upgrade actions open Plan; balance/deposit actions open Credits. Old bookmarks and already-issued checkout URLs remain supported.

### Moving between pages could lose payment context

A naive page split would remount the top-up form and lose the amount, filter and confirmation context. The account-keyed layout now retains them. The original retry identity continues to govern payment retries. Both navigation and Overview shortcuts preserve pending receipt recovery. Filter failures explicitly identify the last successful rows, and export/pagination cannot operate on mismatched or uncertain results. Sign-in retains the requested billing destination.

### A streamed return redirect conflicted with client navigation

The first implementation combined a server-page redirect with a compatibility effect. Browser verification reproduced React error 310 on a returned checkout. Compatibility now resolves supported GET/HEAD returns and retired routes before rendering through private 307 responses. Only supported public query values reach the destination. The regular Overview page no longer throws a streamed redirect; fragment-only bookmarks use one browser transition. Return parameters still prove no payment or access.

### Legacy copy and error surfaces contradicted current capabilities

Billing's social preview still advertised historical discounts, rebates, budget caps and payment methods; the command menu promised a fixed credit match. These were replaced with current capability copy. Nested legacy error pages now reuse the restrained billing recovery boundary, avoiding duplicate headers, automatic error-page retries and operational explanations. Unavailable invoice links and empty histories have explicit, useful alternatives.

### Enlarged-text overflow

The browser pass exposed a long Transactions heading overflowing at 320px with doubled text. Safe word wrapping now keeps the shared heading inside its column. The full rerun passes every page at 320/390/1440px and doubled text. The independent reviewer also found that Overview Refresh updated credit but could leave the plan unchanged; it now refreshes both summaries, with a separate plan-loading announcement. The fixture changes the plan response and confirms that the same action updates it and reads credit again. Earlier failures remain in the release evidence.

## Verification scope and limits

The [retained verification record](../../../post-mortem/releases/2026-09-16-billing-pages.json) distinguishes fixture corrections, the reproduced return failure, responsive failures, final source hashes, build/asset scan, browser checks and independent finish-review scope. Actual final checks: 14 billing contract tests plus webhook boundary suites, 5 URL tests, 34 account-session tests, TypeScript, scoped lint, and an isolated production build passed. The private-boundary scan covered 678 browser/rendered assets. Browser verification completed 16 raw HTTP checks, 30 layout/Axe checks, 18 doubled-text checks, and all interaction scenarios at 320/390/1440px. Zero selected Axe violations or external requests were observed. The documentation fixture suite passed 38 tests.

The independent finish review initially returned **fix** for narrow heading reflow and Overview refresh scope. After correction, its verdict was **ship**, scoring both findings resolved. That verdict covers the two fixes, not a new whole-surface review or independent backend audit.

Browser requests to external services are blocked. Synthetic account data and quotes never reach live Stripe. Physical screen-reader use, real mobile hardware, hosted portal navigation and signed-in production acceptance remain separate.

No tax or commercial setting changed. The previously identified tax-registration decision and top-up database-lock-duration follow-up remain outside this navigation refactor. Existing ledger, webhook, payment ownership, price policy and paid-access authority remain the same.

## Detector triage

Three palette warnings were narrowly suppressed for `PlanPanel.tsx`, `BillingClient.tsx` and the Billing error boundary: the established local design already specifies the dark canvas and restrained indigo action text. These were action/link treatments, not a new decorative palette. No whole-rule or whole-file detector suppression was added. Genuine return-navigation and text-reflow failures were fixed and rechecked; no unresolved design warning is silently presented as a clean detector certification.
