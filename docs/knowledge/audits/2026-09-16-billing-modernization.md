# Billing navigation modernization — September 16, 2026

<!-- docs-scope: operational-record -->

Local successor to the [six-page audit](2026-09-16-billing-pages.md). The user requested canonical billing navigation throughout the workspace and removal of legacy presentation. [Verification](../../../post-mortem/releases/2026-09-16-billing-modernization.json) records actual checks and limits; [the current guide](../../reference/billing-pages.md) owns behavior and release instructions.

## Implemented

- One destination registry supplies Overview, Plan, Credits, Transactions, Invoices and Payment settings. API-key, signup, pricing, home, team-history, command-menu, search, SDK and CLI links now select their intended task. Assisted team purchase links contact support.
- Removed old checkout/top-up/Lumi and alias page implementations, duplicate purchase modals and unused quick-peek/paywall UI. Minimal middleware redirects preserve bookmarks and issued payment returns. Internal financial history and protocol identifiers are retained.
- New credit Checkout sessions return to Credits. New Pro attempts return to Plan through a persisted private return contract; older attempts keep their exact Stripe parameters. API-key browser retry hints retain the same account/amount request identity in Credits.
- Corrected a production-build redirect conflict: the broad vault redirect intercepted deposit bookmarks. Its exact deposit exception now lets the billing handler discard unsupported query fields.
- Reconciled active guides, design link destinations, scripts and the former wallet strategy document. Removed instructions for unimplemented native checkout, crypto, immediate key reveal, auto-reload setup and one-click refunds.

## Verification

18 billing/navigation/public-boundary tests plus webhook signature/mode/body checks; 34 account-session tests; 5 URL tests; 94 general database checks; 29 credit-payment checks; 17 plan scenarios with 24 role denials. All 113 migration/rollback pairs passed static verification. Disposable fixtures applied all 113 migrations. Old return parameters, uncertain acknowledgements, invalid stored paths and evidence-preserving rollback were checked without Stripe network access.

Clean production build passed TypeScript and generated 272 pages. All 1,404 runtime source/config files matched the validation copy; the compiled private-boundary scan covered 643 browser/rendered assets. Scoped lint found no errors; four existing neighboring-source warnings remain, while the focused billing/config pass has none. CLI valid/invalid amounts behaved as documented.

Browser verification passed 23 raw HTTP checks, 30 layout/Axe checks, 18 enlarged-text checks and navigation/recovery interactions at 320, 390 and 1440px, with no external requests. Reviewed the Overview, Credits, Plan, Payment settings and enlarged Transactions captures. Existing billing hierarchy and native task navigation remain intact. 38 documentation fixture tests passed.

## Release boundary

This pass did not deploy or apply a live migration, configure Stripe, charge, refund or cancel. Apply `20260916003207_billing_canonical_returns.sql` before the compatible application writer. Retain the additive column, both return readers and resolvable paths during presentation rollback. Hosted signed-in and real settlement acceptance remain separate. Earlier lock-duration and tax follow-ups are unchanged; this is not an exhaustive live-site or physical-device certification.
