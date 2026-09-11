# GALX commercial reset

**Charge for a repeatable client operations workflow. Fund compute separately. Treat customer willingness to pay as an unproven hypothesis.** More generous inference allowances do not solve the business problem.

This private decision package supersedes the parent report's recommendation to make an included compute allowance the default offer. The technical audit and its accounting, security and resilience prerequisites still apply. The commercial recommendation is now narrower: test agencies operating several client AI projects, with client budget ownership, reconciled usage statements and project handover as the recurring job.

The proposed experiment is **$299 per agency per month, up to five active client projects, plus $750 for a bounded setup engagement. Compute is additional; no recurring free compute.** These are test prices derived from explicit cost assumptions, not validated market prices, existing entitlements or an implemented plan. They must earn acceptance against cheaper alternatives.

At the illustrative base cost, $299 produces $227.23 monthly contribution before fixed company costs and acquisition. Two support hours per customer reduce it to $114.73. A $12,000 fixed monthly cost requires 53 base-case accounts; five pilots only test the thesis. The model explicitly exposes when support capacity makes break-even impossible.

The implemented [Sites delivery strategy](SITES_ASSESSMENT.md) now uses a provisional fixed customer price and rolling account allowance. Supplier quota and token cost can remain unknown; durable completion, account funding, local limits and ownership still govern execution. Native-host private save/update has historical evidence. Direct CLI upload and full live paid delivery are separate from content activation.

Read:

1. [Business thesis and competitive pressure](THESIS.md) — why the old position fails, what established products demonstrate, the proposed buyer and reasons to reject the thesis.
2. [Second-pass commercial audit](AUDIT.md) — actual offer contradictions, unsupported assumptions, rendered-page observations and delivery gaps.
3. [Offer and operating policy](OFFER.md) — a concrete pilot, compute funding, capacity, support, renewal and positioning language.
4. [Economics and downside cases](ECONOMICS.md) — price floors, company break-even, support capacity, compute resale and acquisition economics.
5. [Execution and decision gates](EXECUTION.md) — immediate actions, 30/60/90-day evidence, scope limits and implementation acceptance.
6. [Source register](SOURCES.md) and [verification record](VERIFICATION.md).

Implementation navigation: [Sites assessment](SITES_ASSESSMENT.md), [ADRs 0134–0136](../../../docs/adr/README.md), [server operations](../../../docs/maintainers/SITES_OPERATIONS.md), [customer-local runbook](sites-automation/durable/LIVE_ADAPTERS.md), and [fixed-mode verification](sites-automation/durable/opaque-provider-verification.json). The narrow content path has provisional defaults of $0.05 per completed generation and 20 admitted operations per account per rolling day. It is locally implemented and verified; it was not deployed or enabled by that pass. The earlier metered release remained disabled. Native Codex Responses/tool-loop compatibility remains a separate integration and does not require adding another model supplier for the chosen workflow.

The editable [inputs](inputs.json), executable [model](model.py) and six CSV files provide 178 financial scenarios. All financial inputs are assumptions until replaced with invoices, measured effort and paying-customer records. Source and market evidence were checked September 10, 2026 against repository revision `4587642`.

The original September 10 commercial audit changed no customer terms, production pricing, credits, application code or infrastructure. Subsequent Sites implementation changed local application/relay code and is recorded separately; this documentation reconciliation deploys nothing. Existing customer commitments must be inventoried and honored before prospective offer changes. This directory remains private and excluded by the root deployment ignore rule.
