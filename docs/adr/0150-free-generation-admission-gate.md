# ADR 0150: Bounded free admission and paid capacity protection

<!-- docs-scope: decision-record -->

Date: 2026-09-14. Status: proposed. Owner: Product/API maintainer. Delivery: deployed.

## Problem and direction

The user requested stricter free-tier controls, especially for Sites, to protect paid use. Per-account lifetime quotas alone cannot bound aggregate usage across many accounts. Free Site requests also shared the paid baseline lane, and the composer lacked a distinct availability gate.

Add an expiring, paused-by-default private budget for each free resource. Serialize aggregate reservations, cap outstanding work and rolling/cumulative units, and permit only one unsettled free operation per account across resources. Preserve aggregate attempt consumption even when the customer's quota is refunded. Recheck a pause at dispatch; retain ambiguous reservations until affirmative evidence. Pro remains outside this extra budget.

Free Sites may enter only the first quarter of healthy shared concurrency and rolling attempts, counting paid demand too. Tiny pools remain paid-only. Verified tier and prior quota reservation are required; no browser plan, editable user metadata or priority flag is authority. Existing paid fair-use limits, current membership checks, artifact sanitation and recovery remain in force.

This partially strengthens [ADR 0149](0149-one-time-free-generation.md): its one-time allowance persists, but allowance alone no longer establishes availability. Browser-only disabling, per-account-only throttling and automatic replenishment were rejected because they cannot bound account farming or uncertain execution. Supplier balances and cost estimates are not inferred from local workload units. Operators must measure headroom before issuing a short-lived budget.

## Familiar UX patterns

Use public status and remaining allowance near the composer, a firm stop before new generation, preserved work, manual recheck and a visible plan link. Do not auto-purchase, auto-resubmit, fabricate a reset countdown or disclose private admission diagnostics. The comparative review uses [Claude's demand-sensitive free limits](https://support.claude.com/en/articles/8114491-get-started-with-claude), [Vercel's free-tier pauses](https://vercel.com/docs/plans/hobby), and [Lovable's usage nudges and stop states](https://docs.lovable.dev/introduction/credits-and-usage), inspected September 14, 2026. These support interaction patterns, not claims about their private schedulers or GALX capacity.

## Delivery and recovery

The [quota runbook](../maintainers/FREE_GENERATION_QUOTA.md) owns the exact contract, migration ordering, revision-checked operator command and retained-state rollback. [Local evidence](../knowledge/audits/2026-09-14-free-admission-gate.json) records validation. The migration seeds both resources paused. The [September 14 release](../../post-mortem/releases/2026-09-14-free-generation-gate.json) records both applied migrations and the corrected application. A revision-checked image trial allows one outstanding unit, three hourly and ten cumulative, expiring September 15 at 03:25 UTC without renewal. Free Sites remain paused under the preserved paid-capacity policy. These are dated deployment facts; the decision status remains proposed and live free generation/load acceptance is not claimed.
