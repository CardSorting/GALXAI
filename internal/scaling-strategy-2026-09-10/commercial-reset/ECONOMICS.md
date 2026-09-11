# Economics under downward pressure

The proposed business must pay for its service independently of an assumed supplier discount. Every number below is an illustrative planning input unless explicitly identified as a current published GALX offer. Actual revenue, support effort, supplier invoices, customer counts and fixed operating costs were unavailable. The model supplies price and operating constraints; it does not forecast demand.

## Fixed-price Sites sensitivity

The implemented content tariff defaults to $0.05 per completed generation. That is gross customer revenue per successful completion, not profit, a hosting fee or a supplier cost measurement. The rolling default of 20 admissions permits at most $1 of newly reserved customer work per account per rolling day; no subscriber is promised that this equals supplier remaining capacity or expense.

For an illustrative comparison, assume $0.002 of platform/collection overhead per completed operation, excluding support and failed attempts. This overhead and all supplier costs below are planning guesses, not invoices or processor quotes:

| Assumed supplier cost | Price less supplier cost and assumed overhead |
| --- | --- |
| $0.005 | $0.043 |
| $0.010 | $0.038 |
| $0.025 | $0.023 |
| $0.050 | −$0.002 |
| $0.100 | −$0.052 |

The illustrative break-even supplier cost is $0.048 before support, failures and company overhead. Failed/unknown work can consume supplier resources without a settled customer charge. Existing funded wallet balances, immutable receipts, acquisition grants and actual cash remain separate categories. The current implementation does not contain a supplier-cost meter or global cash-budget enforcement inferred from these numbers.

The table is a new scoped scenario and is not part of the older 178-case monthly agency model or its CSV totals. Preserve that model as the proposed subscription analysis. Replacing guesses with observed expense should guide future prices/allowances, without repricing accepted work or turning unknown token usage into invented accounting.

## Cost model

Let `P` be the monthly service fee, `H` the recurring support/delivery hours, `Q` the admitted logical requests and `F` fixed company cost. The illustrative account has $12 direct infrastructure, $0.08 per 1,000 requests, $75/hour loaded delivery labor, a $5 monthly reliability reserve, and payment cost of 3% plus $0.30 per monthly collection. These are explicit assumptions, not processor quotes or measured cloud costs. The inference bill is excluded from both platform revenue and platform cost because it is funded separately.

```
account contribution = P × (1 − payment rate) − fixed payment fee
                       − direct account infrastructure − request infrastructure
                       − support hours × loaded hourly cost − reliability reserve

price floor at target contribution margin m
  = (all non-percentage account costs) / (1 − payment rate − m)

accounts for company break-even = ceil(F / account contribution)
support capacity in accounts   = floor(available support hours / H)
```

“Contribution” here includes a discretionary reliability reserve and excludes acquisition and fixed company overhead. It is neither accounting gross margin nor net profit. Do not append an entire founder salary to fixed cost and also count all of that same salary as direct support. Allocate hours consistently; replacement-cost economics and actual cash payroll should be shown as separate views.

The chosen 75% platform contribution target is a management policy for this experiment, not a claimed industry standard. It leaves room for acquisition, development and fixed operating obligations. A lower target may work at scale or with a different cost structure, but does not create cash or customer demand.

## What different prices actually buy

All rows below assume 100,000 requests and 0.5 delivery hours per month, with no included inference.

| Monthly price | Monthly account contribution | Contribution margin | Interpretation |
| --- | --- | --- | --- |
| $49 | −$15.27 | −31.2% | Cannot support this assisted operating scope at the assumed cost |
| $99 | $33.23 | 33.6% | Leaves little for acquisition and fixed cost |
| $199 | $130.23 | 65.4% | Possible lower-service offer, but misses the chosen target |
| $299 | $227.23 | 76.0% | Meets the target in this base case; willingness to pay unproven |
| $499 | $421.23 | 84.4% | More headroom, but requires stronger demonstrated buyer value |

The target price floor is **$285.45**. This is why the experiment uses $299. It does not imply that established competitors cannot operate profitably at lower prices: their delivery effort, scale, scope and cost allocation differ. If customers value the job below this floor, either lower the cost to serve or choose another job. A spreadsheet cannot justify charging more than the customer values.

## Support is the binding risk

At $299 and 100,000 requests:

| Recurring support hours/account | Contribution/account | Accounts to cover $12,000 fixed/month | Support hours at break-even | Fits 32 support hours/month? |
| --- | --- | --- | --- | --- |
| 0.25 | $245.98 | 49 | 12.25 | Yes |
| 0.5 | $227.23 | 53 | 26.5 | Yes |
| 1 | $189.73 | 64 | 64 | No |
| 2 | $114.73 | 105 | 210 | No |
| 4 | −$35.27 | Impossible at this price | — | No |

The 32-hour support budget is a staffing assumption, not a customer service entitlement. At half an hour per account, it permits 64 accounts and $14,542.72 contribution toward fixed costs. At two hours it permits only 16 accounts and $1,835.68. Hiring or contracting support changes fixed or direct cost; it cannot be omitted to preserve a favorable chart.

A mixed cohort matters more than a median. If 20% of accounts require two hours and 80% require half an hour, mean effort is 0.8 hours and contribution is $204.73 per account. Covering $12,000 then requires 59 accounts and 47.2 support hours. A good median would hide that capacity shortfall. Track total hours, the mean and tail accounts; five pilots are too few for a stable p95 estimate.

At the base contribution, $6,000 fixed cost needs 27 accounts, $12,000 needs 53 and $20,000 needs 89. The last case exceeds the assumed support capacity. Five pilots yield only $1,136.15 recurring contribution. They test payment and delivery behavior; they do not establish a self-sustaining company.

One million requests at the same price and half-hour support lowers contribution to $155.23 under the simple variable-cost model. Real request size, streaming duration, storage and retry costs could be nonlinear. This is a stress case outside the proposed 100,000-request entitlement, not permission to sell ten times the load at the same price. Measure the complete cost envelope before quoting expansion packs.

## Managed compute is a separate business line

For estimated supplier workload `B`, customer markup `u`, unrecovered attempt fraction `r`, upstream gateway fee `g`, collection percentage `p` and loss reserve `l`:

```
collected compute charge = B × (1 + u)
supplier cost            = B × (1 + r) × (1 + g)
compute contribution     = collected charge × (1 − p)
                           − supplier cost − B × l − fixed collection fee
```

The example below uses $1,000 of estimated workload, 2% unrecovered attempts, 1% loss reserve and the assumed 3% + $0.30 collection cost. No additional support cost is included, making these results optimistic if managed procurement needs assistance.

| Customer markup | Upstream intermediary fee | Compute contribution |
| --- | --- | --- |
| 0% | 0% | −$60.30 |
| 5% | 0% | −$11.80 |
| 10% | 0% | $36.70 |
| 10% | 5% | −$14.30 |
| 20% | 0% | $133.70 |

A 20% compute markup is not recommended merely because its row is positive. The customer can compare it with alternatives and may refuse it. Customer-owned purchasing removes GALX's corresponding resale collection exposure but does not eliminate platform support, credential-handling obligations or supplier dependency. If managed procurement does not earn its fee, omit it from the offer.

The model treats the extra attempt cost as supplier liability not recovered through the customer quote. It does not assert that all retries are billable, or that customers should pay for every failed attempt. Actual supplier billing and GALX's customer charge contract must be reconciled separately.

## Existing allowances and price shocks

The existing $75/100-credit and $499/600-credit definitions require full-redemption tests. At a hypothetical supplier cost of $1 per credit, the first loses $25 and the second $101 before any service expense. At $0.50 per credit, they leave $25 and $199 before other costs. Face value is not measured COGS; neither scenario establishes the actual margin. The former $30 recurring free-credit definition likewise represents potential expense only if granted and used; current Solo pricing projection omits it.

Do not base viability on unused allowances, expired balances or customer confusion. Breakage can alter observed cost, but it is not a substitute for an enforceable limit and viable full-use unit economics. Purchasing or promising more credit than the cash budget can support turns growth into a liability.

If supplier prices halve, a percentage spread on a fixed workload roughly halves before fixed charges, while a valuable project subscription can retain its price. If supplier prices double, separately priced future compute can be requoted, but already accepted work and fixed credit promises retain exposure. If a supplier discount disappears, the business must still fund service and any accepted requests. If backup cost rises during an outage, use the approved incident budget or stop admitting unfunded work. None of these cases warrants a hidden model or price change.

## Acquisition, setup and retention

The $750 setup fee leaves $502.20 contribution at three delivery hours, $352.20 at five and **−$22.80 at ten**, before acquisition cost. Scope the engagement so it cannot become unpaid custom engineering. Setup contribution is one-time and should remain outside software MRR and recurring break-even calculations.

At $227.23 recurring contribution, illustrative CAC of $300, $750 and $1,500 has simple payback of 1.32, 3.30 and 6.60 months respectively, ignoring churn. CAC must include prospecting, calls, unsuccessful trials, sales tools and attributable acquisition labor. A low cash ad bill is not necessarily low acquisition cost.

The [acquisition scenarios](acquisition-scenarios.csv) also calculate expected first-year contribution with 2%, 5% and 10% monthly logo churn, no expansion and no infinite-lifetime assumption. These are stress inputs, not GALX retention measurements. A finite model is more honest than presenting a precise lifetime value before renewals exist. Observe logo retention, project expansion and contraction separately; token-price movement must not masquerade as software retention.

At $5 trial COGS, conversion rates of 2%, 5%, 10% and 25% imply $250, $100, $50 and $20 compute cost per payer before any human effort. The proposed 20-trial monthly cap limits that compute budget to $100; it does not make acquisition economical. No broad free compute program should launch before measured conversion and delivery costs justify it.

## Cash and scale gates

Maintain separate views of recurring service revenue, setup revenue, compute collections, actual supplier charges, payment fees, credits, refunds and outstanding obligations. Compute throughput is not software ARR. Formal financial-statement presentation depends on the actual commercial role; these management views are not a revenue-recognition determination.

Before activating additional accounts, prepare a weekly 13-week cash schedule. Include settled collections, supplier due dates, already funded supplier balances, purchased-credit delivery obligations, expected refunds, payroll/hosting and acquisition commitments. Define non-overlapping buckets so the same supplier invoice is not reserved twice. Unspent customer balances are not unrestricted cash for expansion.

Track company exposure as a cash amount, not only as a customer credit counter. Include maximum in-flight liability, unresolved attempts and the approved cost of a supplier outage. A $5 per-account reliability reserve in this model is not a guarantee that actual fallback is funded. For the bounded fixed-price experiment, set an explicit conservative cash planning reserve and use implemented account/runtime limits while liability remains uncertain. Revise the planning inputs with observed expense before increasing commitments. Other products retain their separately agreed funding contracts.

Do not scale while any cohort loses contribution at its promised full scope, recurring support exceeds staffed capacity, cash coverage fails, or unresolved completion/expense exceeds the operating budget. Missing token usage alone does not block a durably completed fixed-price Sites operation; legacy metered settlement still requires it. A sustainable offer must pass all four tests together: buyer value, account contribution, company fixed-cost coverage and liquidity.

## Reproduce and replace assumptions

Run `python3 internal/scaling-strategy-2026-09-10/commercial-reset/model.py`. It uses only the Python standard library and writes files in this directory. Edit [inputs.json](inputs.json) with dated actuals before making operating commitments.

| Output | What it tests |
| --- | --- |
| [platform-scenarios.csv](platform-scenarios.csv) | 75 combinations of price, support effort and request volume |
| [capacity-and-break-even.csv](capacity-and-break-even.csv) | 15 staffing and fixed-cost cases |
| [managed-compute-scenarios.csv](managed-compute-scenarios.csv) | 72 spread, retry and intermediary-fee cases |
| [acquisition-scenarios.csv](acquisition-scenarios.csv) | Nine CAC/churn cases over twelve months |
| [trial-scenarios.csv](trial-scenarios.csv) | Four trial-conversion cases |
| [setup-scenarios.csv](setup-scenarios.csv) | Three setup-effort cases |

Built-in checks validate independently calculable anchor values and financial invariants. They validate the arithmetic, not the realism of the assumptions or willingness to pay. Current published offer evidence is in [AUDIT.md](AUDIT.md); external product patterns and source qualifications are in [THESIS.md](THESIS.md) and [SOURCES.md](SOURCES.md).
