# Subscription and fallback economics

**Historical scenario analysis:** the [commercial reset economics](commercial-reset/ECONOMICS.md) now control business planning. The $20 allowance example below is not a proposed plan. It remains useful for assessing existing grants and the risks of any future funded allowance.

**For future funded subscriptions, test finite allowances against fully loaded cost and continuity expense.** The September 10 evidence did not establish actual gross margin, heavy-user distribution or supplier discounts. The monthly examples below remain assumptions.

The later fixed-price Sites strategy deliberately chooses a provisional $0.05 completed-generation price and 20 admitted operations per rolling day without requiring exact supplier cost or quota. [The current sensitivity model](commercial-reset/ECONOMICS.md) shows positive and negative contribution cases from generalized supplier-cost assumptions. Customer reservations and local time/byte/attempt limits constrain admission; they do not prove a supplier-cost ceiling. Missing usage remains null and a durable completion can settle the agreed fixed price. [ADR 0134](../../docs/adr/0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) owns this scoped decision; it does not implement the monthly allowance model below.

## Definitions

Use three separate quantities: customer cash collected, public usage-credit valuation, and supplier expense. A $25 deposit credited as $42.50 is $25 of receipts and $42.50 of future consumption rights at the applicable rate card. It is not $42.50 of revenue. Subscription revenue recognition and credit-liability accounting need the company's accounting policy; the model below is contribution planning, not a financial statement.

For each account-month:

`contribution = subscription + overage revenue − supplier expense − payment fees − infrastructure/support − refund/incident provision`

`supplier expense = served credit × [(1 − backup fraction) × primary cost per credit + backup fraction × backup cost per credit] × attempt-cost multiplier`

The attempt multiplier represents supplier cost from retries and incomplete work that customer billing may not recover. Backup fraction is weighted by consumption, not request count. Different rates for cached input, output, reasoning, tools and images must be captured in actual attempt costs before an aggregate model is trusted.

At full allowance use, the largest affordable allowance `A` for target contribution `m` is:

`A ≤ [P × (1 − payment percentage − m) − fixed payment fee − infrastructure/support − risk provision] / effective supplier cost per credit`

Use a nonnegative numerator; otherwise the membership fee cannot support any allowance at the chosen target. Unredeemed allowances must not be the only reason the package is viable. A base plan with positive contribution can still lose money during a correlated outage that shifts most eligible work to a more expensive source.

## Illustrative cases

[economics-inputs.json](economics-inputs.json) assumes a **$20 monthly fee**, **20 included credit units**, payment costs of **3% plus $0.30**, **$2** of allocated infrastructure/support, and a **$0.50** incident/refund provision. These are editable planning assumptions. The payment values are not a Stripe quote. One fixed fee per month is assumed; multiple top-ups increase that expense.

| Full-use scenario, no extra attempt cost | Supplier cost per credit | Supplier expense | Contribution | Margin |
| --- | --- | --- | --- | --- |
| Hypothetical favorable primary cost, no backup | $0.35 | $7.00 | $9.60 | 48.00% |
| 5% of consumption moves to $1.00 backup | $0.3825 blended | $7.65 | $8.95 | 44.75% |
| 25% moves to backup | $0.5125 blended | $10.25 | $6.35 | 31.75% |
| All consumption uses $1.00 backup | $1.00 | $20.00 | −$3.40 | −17.00% |
| Supplier cost equals public credit valuation, even without backup | $1.00 | $20.00 | −$3.40 | −17.00% |

**No $0.35 cost ratio has been verified for GALX.** It exists to show how even favorable ordinary economics can deteriorate during fallback. At a 50% target margin, these same assumptions leave **$6.60** for supplier expense: at a $1.00 cost ratio, the full-use allowance can be only 6.60 units; at $0.35 it can be approximately 18.86 units. Higher retry cost, support or gateway fees reduces it further.

With unbounded flat-rate usage, a customer consuming 50 credit units at a $1.00 supplier-cost ratio costs $50 before overhead, against $20 of subscription revenue. Contribution becomes **−$33.40**. Under the hard-stop allowance, served use is bounded at 20 units. Under the illustrated optional overage, a $10 extra-spend ceiling at $1.25 per unit admits at most eight additional units. These are consequences of the model's cap, not proof that the current code enforces it.

Paid overage must itself have positive marginal contribution. If supplier cost per unit is `c`, incremental nonpayment expense is `v`, and payment fraction is `r`, a price floor before target margin is `(c + v) / (1 − r)`. Add fixed transaction expense appropriately. Passing through a $1 supplier charge for $1 of customer cash cannot fund payment processing or support without another revenue source.

## Existing promotional offers

The checked configuration grants these amounts for a first eligible deposit, including a $5 welcome credit:

| Deposit | Credit | Minimum supplier-cost advantage to break even before all other costs |
| --- | --- | --- |
| $25 | $42.50 | 41.18% |
| $50 | $85.00 | 41.18% |
| $100 | $180.00 | 44.44% |
| $250 | $505.00 | 50.50% |
| $500 | $1,005.00 | 50.25% |

The threshold is `1 − cash/credit`, assuming all credits are redeemed at the same valuation used to measure supplier cost. This is a break-even requirement, not an observed discount. Payment fees, overhead, incident expense and desired profit increase it. Repeat top-ups do not necessarily receive the welcome grant. The $10 product has a separate definition mismatch recorded as A08; it is excluded from this table rather than silently choosing one promise.

The September 10 official text-model price snapshot corroborated the then-checked local rate card, but do not establish GALX's actual supplier expense.[^17] Avoid applying a speculative wholesale multiplier to public model prices. For capacity purchased through subscriptions or commitments, allocate fixed supply cost and utilization explicitly; marginal cost near zero is not the same as zero fully loaded cost. Commercial permission for the intended service remains a separate gate.

## Reproducible model

Run from the repository root:

```sh
python3 internal/scaling-strategy-2026-09-10/model-economics.py
```

The standard-library script reads [inputs](economics-inputs.json) and regenerates:

- [economics-scenarios.csv](economics-scenarios.csv): 192 combinations of packaging, demand, supplier ratio, fallback fraction and extra attempt cost.
- [promotion-break-even.csv](promotion-break-even.csv): first-deposit break-even requirements.
- [economics-summary.json](economics-summary.json): allowance ceilings and the availability sensitivity example used in the strategy report.

Each scenario includes served/unserved use, supplier expense, receipts, fees and contribution. The script contains the formulas and checks cap and demand invariants. It does not sample a customer population, infer p95 behavior, calculate an outage probability forecast, or model taxes, foreign exchange and accounting revenue recognition.

## Evidence for future subscription or expansion decisions

Collect an authorized, private aggregate dataset for a representative 30-day baseline and at least one pilot renewal. Include cohort size, net payments, redeemed included/promotional/purchased credit, per-capability demand, p50/p90/p95/p99 account consumption, peak concurrency, request input/output/cached usage, tool/image expense, attempt and cancellation cost, queue/retrieval failures, refunds and allocated support. Use pseudonymous account IDs and avoid prompt/response content.

Preserve time windows and price versions so supplier invoices reconcile with recorded attempts. Flag uncertain outcomes instead of treating missing usage as zero. Existing stream and batching defects mean historical application usage alone may be insufficient; compare supplier-side records where authorized and available. No SQL export or live customer-data query was performed by this audit.

Before expanding funded subscription commitments, evaluate median and heavy-use cohorts separately, full-redemption economics, 5%/25%/100% backup consumption, a supplier price increase, doubled support cost and negative payment events. Set maximum monthly supplier exposure independently of customer-facing allowance totals. Unused-credit subsidy can improve a viable product; it should not be the only control against unbounded demand.

## Sources

[^17]: OpenAI, [Compare models](https://developers.openai.com/api/docs/models/compare), accessed September 10, 2026. Source details and scope: [SOURCES.md](SOURCES.md#s17).

Local offer definitions: [Stripe config](../../src/lib/stripe/config.ts), [product descriptions](../../src/lib/stripe/products.ts), and [welcome-credit eligibility](../../src/lib/billing/quote.ts). All other numerical assumptions here are analytical inputs, not external market facts.
