# Commercial reset and Sites verification

The original September 10 commercial-only revision added private strategy and a financial sensitivity model without runtime changes. The subsequent fixed-price Sites implementation and this documentation reconciliation are separate passes; neither their local tests nor these documentation edits imply production activation.

## Original commercial audit — September 10

- Re-read current product constraints, pricing projections, solution pages, billing and governance call sites, and the three existing investor drafts. Findings distinguish source definitions, source call-site evidence, rendered content and unverified production behavior.
- Read current official pricing/behavior pages for nine products. Recorded scope and date conflicts in [SOURCES.md](SOURCES.md). No competitor profitability or GALX customer demand is inferred from product pricing alone.
- Generated 178 financial scenarios across six CSV files. Validated contribution and price-floor anchors, support/request cost sensitivity, nonpositive zero-markup resale under the configured costs, capacity impossibility and finite retention calculations. Independently checked representative reported dollar amounts against the CSVs.
- Checked three prerendered pages from the earlier isolated production build, excluding script/style text. `/pricing` includes monthly compute-credit language; `/solutions/small-business` includes the pooled-credit offer; `/solutions/enterprise` includes SLA and certification language. [Observations](render-observations.json) record exact markers. This is static local HTML evidence, not a live browser inspection or a certification audit.
- Checked local Markdown links and financial file structure; verified the deployment ignore rule still excludes `/internal/`. [artifact-checks.json](artifact-checks.json) records the final artifact checks.

## Relationship to prior runtime checks

The earlier [verification record](../VERIFICATION.md) documents 66 passing scoped tests, an isolated production build on Node 22.21.1 and a scan of 616 local assets for eight selected markers. The [manifest](../verification-manifest.json) records those original runtime/log hashes. The commercial-only revision did not repeat that runtime suite/build. Later Sites implementation changed the application and has independent verification below.

Those checks do not establish commercial correctness, production SLOs or that the live site is clean. The new rendered-page findings illustrate the limits of the earlier selected-marker scan. A subsequent application-copy or billing implementation change must run the relevant adversarial/authentication tests and production build, inspect the affected rendered pages and scan browser assets before making a release claim.

The original documentation-index check found four scope/catalog issues in two unrelated documents. The September 11 documentation reconciliation supplies their missing scope/catalog metadata and reruns whole-corpus navigation validation. This metadata repair does not re-certify those features.

## Limitations

No supplier invoice, production finance export, active-customer count, paid interview, actual support log or renewal cohort was available. The $299 offer, $750 setup, cost assumptions, target margins and discovery gates remain proposed. A passing financial model cannot establish a viable market. Supplier commercial authorization, actual capacity and complete client-operations delivery still require the evidence specified in [EXECUTION.md](EXECUTION.md).

The commercial reset supersedes the earlier default allowance recommendation. Historical allowance scenarios remain clearly labeled for evaluating existing promises and optional future offers. Existing obligations were not revoked or repriced.

## Fixed-price implementation — September 11

[The fixed-mode record](sites-automation/durable/opaque-provider-verification.json) contains log hashes and scope for 103 application regressions, 52 disposable PostgreSQL/HTTP checks, 68 companion checks, both TypeScript projects, a production build and a network-disabled container restart. Counts overlap. The scan covered 633 local rendered/browser assets and 25 private markers with no matches. No live supplier request, production wallet write or new deployment occurred in this pass.

The provisional price and rolling account allowance are implemented assumptions. Complete supplier quota visibility, exact supplier prices and token counts for fixed completions are not requirements. Durable completion, account authorization and original-price recovery remain enforced. The earlier release and native-host publication evidence retain their own dates and do not become fresh live verification through this documentation update.

## Documentation reconciliation — September 11

Added ADRs 0134–0136 and reconciled affected predecessor decisions, public API documentation, private operations/recovery guides, customer-local delivery commands, product strategy, commercial assumptions and handover. Earlier metered/upload findings are retained in dated records and [verbatim documentation snapshots](historical-docs/README.md). Those records no longer impose supplier transparency or a second provider on the fixed-price workflow.

The documentation validator passes for 284 documents and 136 contiguous ADRs, including scope, catalog coverage, local targets and current-guide anchors. All 240 relative links in the 29 internal Markdown files pass. Public JSON examples and both explicit documented rate cards match the implementation. Five public entry documents contain none of the selected private implementation markers. `git diff --check` passes.

The [separate documentation-pass application record](sites-automation/durable/documentation-application-verification.json) records 103 passing regression tests, an isolated production build on Node 22.21.1, and 633 local rendered/browser assets scanned against 25 private markers with no matches. The first sandbox run could not bind localhost test listeners (`EPERM`); the authorized rerun passed. Existing implementation/deployment evidence was preserved. No runtime source, production credentials, wallet state, Site publication or deployment was changed by this documentation pass; no live-site scan is claimed.
