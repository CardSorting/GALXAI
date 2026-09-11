# Proposed pilot offer and operating policy

This is a private commercial experiment. Prices, scope and limits below are proposed terms to validate, not an active plan or public launch copy. The pilot must distinguish what works today, what is assisted manually and what is not yet available. [EXECUTION.md](EXECUTION.md) controls the proposed agency pilot. The implemented fixed-price Sites content path has its own admission and rollout contract below.

## Implemented Sites content tariff

The local implementation offers a separately quoted content generation, with provisional defaults of $0.05 per completed operation and 20 admitted operations per account per rolling 24 hours. A completed invalid draft is charged; a repair is another accepted quote. A durable completed receipt permits settlement without token usage. An uncertain completion stays reserved, and only confirmed non-dispatch returns the full reservation automatically.

The server enforces wallet funding, one unresolved Sites hold, daily allowance, cohort membership and local byte/time/attempt limits. The price is a customer product choice, not a claim about supplier cost. Exact upstream quota and a supplier token ceiling are not activation prerequisites for this mode. Use [Sites operations](../../../docs/maintainers/SITES_OPERATIONS.md) for defaults and deployment status.

Content generation is one part of a Site deliverable. Packaging, customer-owned hosting access, verified save/private publication and support are separate. This tariff does not implement or change the proposed agency subscription, setup fee, image pricing or signup credit. It was not activated in production by the implementation pass.

## One offer

| Term | Proposal | Reason |
| --- | --- | --- |
| Buyer | Agency managing recurring AI features for several clients | Repeated monthly ownership and reconciliation job |
| Service fee | $299/month per agency, month-to-month | Funds the operating product independently of inference consumption |
| Included operating scope | Up to five named, active client projects | Makes the unit visible and prevents unlimited project administration |
| Setup | $750 one-time; documented scope of at most five delivery hours | Funds migration, baseline review and first reconciliation setup |
| Compute | Additional; no included or recurring free compute | Removes a presumed subsidy from the offer |
| Monthly traffic envelope | Initially 100,000 admitted logical API requests across the agency | Bounds platform work; does not include inference cost |
| People | Up to ten internal collaborators plus one restricted billing reviewer per project | Enough for pilot collaboration without selling broad enterprise identity scope |
| Support | Published staffed business hours; next-business-day initial response target | A response target is not a resolution guarantee or a 24/7 SLA |
| Service history | Proposed 30-day interactive operational history; downloadable customer usage statement each period | Bounds interactive storage; statutory/accounting record retention remains separately defined |
| Pilot cohort | At most five agencies | Limits total support, financial and operational exposure while learning |
| Expansion | Candidate $40/additional active project after marginal-cost validation | Project expansion must not silently increase shared request or compute ceilings |

The exact staffing window, eligibility, request size/context limits, retention scope and refund terms must be written before accepting pilot obligations. The table intentionally does not invent a production-safe concurrency number. Assign each pilot a numeric cap from a capacity test and record it in the agreement. No pilot goes live with that field unset.

An active project is a named client/environment group enabled for chargeable service during the period. Production and staging for the same client count together under that project's budget policy. Renaming a project or rotating keys does not reset its allocation. Archiving prevents new requests and preserves agreed export access. Added projects require an owner-approved price change; invoice periods use a stated timezone and effective timestamp. Start with manual reviewed changes instead of an elaborate proration engine.

The proposed agency traffic envelope counts admitted logical API requests, not individual chunks or internal retry attempts. The implemented Sites rolling allowance is separate and counts every admitted Sites operation, including confirmed-unused and uncertain attempts; recovery reads do not add a count. Invalid or rejected requests do not consume the customer quota. Internal attempts still consume resources; retain observed usage and expense privately, with absent facts marked unknown. Request body size, maximum output, deadline, concurrency and storage are separate safeguards; one counted request cannot imply unlimited work. Provider charges and the treatment of partial/cancelled results need their own clear contract.

## What the customer receives

The pilot should deliver one approved budget record per client, restricted access for the responsible people, a usage statement attributable to that client, and an explicit process for budget changes, project closure and handover. The statement should explain billed consumption, credits and adjustments using allowed customer fields. It must not expose upstream authentication, routing or administrator diagnostics.

The recurring demonstration is a month close. A client reviewer can see their own statement, the agency can reconcile totals, and neither can alter another client's budget or read another client's activity. A handover changes authorized ownership without moving historical charges to a new payer by accident. If these operations require manual assistance, disclose it and record the time as delivery cost.

No client-to-client payout or payment distribution is included. Agencies continue invoicing their own clients through their existing arrangements. The first product exports evidence for those invoices; it does not become a marketplace or claim to replace a general ledger.

## Funding compute

The preferred economic structure is that compute has an identified payer and an enforceable budget independent of the GALX subscription. Customer-owned upstream billing is one implementation option, subject to supplier permission, secure handling and a supported operational contract. It is not currently established as shipped by this audit. Do not build a general credential marketplace before validating demand.

Where the existing prepaid service is used, durable reservation and settlement must be complete and available funds must cover the accepted customer charge. For fixed-price Sites, local admission limits and explicitly assumed supplier expense support the initial bounded experiment; exact supplier quota/cost transparency is not a prerequisite. Other usage-priced products retain their separate pricing and evidence contracts. Company cash planning must distinguish observed expenses from assumptions. Credit proceeds are not freely spendable subscription profit. Already accepted requests retain their agreed rate; changed supplier economics affect future accepted work after a versioned quote change.

For a later managed-compute option, disclose any service fee and evaluate it separately. A small markup can become negative after collection fees, unrecovered attempts and an intermediary fee. A 5% or 10% fee must not be described as profitable without measured cost evidence. The [compute model](managed-compute-scenarios.csv) demonstrates the sensitivity; the base business assumes no compute resale profit.

Do not silently fall back from a customer's funding path to GALX-funded consumption. Such continuation requires an approved spend policy, funds and a compatible capability contract. If funding or safe capacity is unavailable, return the defined temporary-unavailability or budget response. Never quietly lower quality, change the selected model identity or raise the price.

## Spending and capacity controls

At 50%, 80% and 95% of the relevant allowance, show useful warnings to authorized budget owners. At exhaustion, stop admitting additional chargeable work unless the owner previously enabled a separately capped continuation. Alerts are advisory; an atomic admission decision must enforce the boundary. A delayed event consumer is insufficient enforcement.

Any additional request pack must be quoted before use. A candidate price is $40 per extra 100,000 admitted requests, subject to actual resource cost and acceptance tests; compute remains additional. A pack does not increase concurrency. Until expansion is implemented, an explicit reviewed plan change is required. No automatic tier upgrade, unbounded postpaid tail or account borrowing from another client's balance.

Reserve resources for existing obligations and reject excess admission predictably. Free evaluation traffic should have its own small budget and scheduling limit. Do not make an unfunded availability promise by letting every production request bypass all limits. A financial ceiling and a service-capacity ceiling protect different failure modes.

The support budget is a company management limit, not a quota used to refuse legitimate defect reports. Plan on half an hour of ordinary recurring support per account in the financial base case. Track troubleshooting, reconciliation and incident allocations too. If measured delivery exceeds the budget, stop adding similar accounts, repair the cause or revise prospective scope. Optional custom integrations need a separate agreement; defects in the sold contract remain GALX's responsibility.

## Acquisition, renewal and transition

Use a demo with synthetic data for open evaluation. After financial controls pass, a qualified trial may have at most $5 of supplier-cost exposure and 20 such trials per month: a $100 monthly compute acquisition budget. This is a proposed budget, not a current grant. It has no automatic monthly renewal, cannot grow merely with signups and excludes unsupported expensive modalities.

A candidate referral reward is a one-time $50 service credit after a referred agency's second paid cycle, only if the cohort's contribution supports it. Do not reward signups, promise permanent recurring compute or introduce matching-credit promotions without a measured acquisition case. Sales and trial-support labor belong in acquisition cost even when no ad money is spent.

Renew on the stated scope, with visible usage and an explicit price/version record. Permit cancellation and useful export. Do not use annual prepayment to conceal weak month-two renewal. Consider annual commitments only after retention evidence, with a discount limited by actual servicing or acquisition savings and an allowance for refund/fulfillment exposure.

Before changing existing offers, inventory paid subscriptions if any, active negotiated arrangements, purchased balances, promised promotions and unresolved adjustments. Honor those commitments according to their terms. Announce prospective terms with effective dates and preserve earlier accepted request prices. This proposal does not authorize clawbacks or automatic repricing of existing users.

## Positioning language for validation

The category hypothesis is **AI project operations for agencies**. The benefit hierarchy is client budget ownership, understandable usage statements and easier project handover. The reason to believe must become a demonstrated workflow and customer-confirmed saved effort.

For private discovery, use: “We are testing a workspace for agencies that run AI features for multiple clients. The aim is to make each client's approved budget, monthly usage and project handover easier to manage. The proposed service is $299 a month for five projects, with compute charged separately.” This is honest about experimental status and contains no claim of cheaper models or guaranteed savings.

Only after the acceptance evidence exists, a capability-focused headline could be: “Manage AI usage across your client projects.” Supporting copy could describe approved budgets, client statements and project handover. Keep these as proposed copy until delivered. Public copy must omit credential sources, topology, routing mechanics and implementation diagnostics under the repository's public-information boundary.
