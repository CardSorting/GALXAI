# GALX capability and commercial strategy

**Commercial supersession:** the [commercial reset](commercial-reset/README.md) replaces this first-pass report's allowance-led business recommendation. The current proposal charges for a client-operations workflow with separately funded compute. The allowance discussion below is retained as an evaluated alternative, not the active default offer. Broader provider qualification remains a separate expansion proposal; fixed-price Sites uses the narrower implemented contract below.

Keep the working relay as the sole model supplier for the current Sites workflow. The immediate strategy is fixed-price content generation, durable completion recovery and customer-owned save/publication. Conservative price and allowance assumptions are sufficient to implement this bounded offer; complete supplier quota and exact cost visibility are not activation prerequisites. A second supply path is an optional future continuity project.

This is an internal decision report. The evidence date is September 10, 2026; source revision is `4587642`. The assumed initial buyer is a developer or team running applications and agents. This is inferred from the existing API, SDK and governance surfaces, not established customer research. The recommendation remains useful for a chat-led product, but its allowances and concurrency limits would need separate validation.

## Implemented Sites decision — September 11

[ADRs 0134–0136](../../docs/adr/README.md) now define the implemented strategy. The default customer quote is $0.05 per durably completed generation and 20 admitted operations per verified account in a rolling 24 hours, behind an explicit cohort and enable flag. The price and allowance are provisional product choices. They do not assert supplier cost, quota, model identity or profitability.

The wallet reserves the accepted maximum before dispatch. The worker applies local byte/time/attempt limits and persists the completion receipt. A matching completed receipt settles the fixed charge even if token usage is absent; uncertainty preserves the reservation, while positive non-dispatch evidence closes it at zero. Recovery reads the original operation without generating again. The legacy metered mode retains its separate usage/ceiling requirements.

A deterministic customer-local companion turns short generated content into a verified site artifact and uses the customer's own Sites connection for save/private publication. It does not require the relay to implement a native Codex model/tool session. Native-host delivery has historical evidence; direct CLI archive save remains unqualified. Those delivery facts are separate from content activation.

The fixed implementation passed local application, database, companion, build and container checks. It was not deployed or activated by that pass. [Sites operations](../../docs/maintainers/SITES_OPERATIONS.md) owns rollout and recovery; [the current assessment](commercial-reset/SITES_ASSESSMENT.md) separates implementation, delivery evidence and commercial assumptions. The broader alternatives below retain their September 10 research scope.

## Broader decision structure

There are three independent decisions: how many suppliers serve the product, which capabilities customers can select, and how customers pay. A second supplier can improve continuity without adding a large public catalog. A monthly subscription can include a narrow capability set. Conversely, a broad catalog can remain entirely pay-as-you-go. Combining all three changes in one launch makes it difficult to identify whether a regression came from an adapter, a product promise or a charging rule.

The current service has one provider in its catalog and a router that dispatches through one provider adapter. It has substantial resilience within that path: capacity admission, fenced leases, recovery controls and capability eligibility. Those controls are useful investments to preserve. They do not establish independence from a provider-wide incident, an account-level restriction, or GALX's own shared dependencies. [The technical audit](AUDIT.md) distinguishes those findings from dated operational evidence.

The long-term product promise should be dependable access to useful work, understandable cost and controllable consumption. Offering every model is easy for customers to understand superficially, but expensive to support: differences in tools, context limits, schemas, streaming, billing units and retention policies become GALX's responsibility. A model should enter the supported catalog only when that responsibility is justified by a customer need and an evidence-backed contract.

## Strategic alternatives

| Option | Availability benefit | Commercial benefit | Maintenance exposure | Decision |
| --- | --- | --- | --- | --- |
| One supplier, current packaging | Preserves operational familiarity; retains provider concentration | Simplest near-term offer | Lowest adapter count, but existing accounting work remains | Keep as today's operating baseline |
| One supplier, new subscription allowance | Does not diversify availability | Tests willingness to pay for predictable access | Adds financial state and lifecycle work | Pilot only after billing gates |
| Current supplier plus one independent backup | Can recover a qualified subset of failures | Stronger continuity proposition | One additional adapter and a bounded test matrix | Future continuity option; not required for Sites |
| Many direct providers plus universal subscription | Potentially broad coverage; many failure interactions | Broad choice and one bill | Highest integration, evaluation and support load | Defer until demand and margins justify it |
| Current supplier plus one managed aggregator | Faster access to alternatives; aggregator is another shared dependency | Broad catalog with less adapter ownership | Supplier-policy verification and gateway dependency still required | Procurement alternative if direct integration is uneconomic |
| Self-hosted models as immediate fallback | Can diversify some supplier risks | Potential future cost control at scale | GPU operations, capacity planning, quality and patching burden | Defer; no utilization case established |

These are qualitative judgments, not benchmark scores. For a future supplier-continuity product, a minimal two-supplier design buys information with a limited adapter commitment. The implemented Sites product accepts the existing supplier dependency and does not add this interface or a second provider.

## Industry comparison

| Reference | Observed pattern | Application to GALX |
| --- | --- | --- |
| Cursor | Subscription plans, on-demand spending controls, and explicit treatment of enforcement lag | Make extra usage a deliberate decision; define cap semantics precisely[^1][^2] |
| Poe | Subscription points and purchasable additional points | Broad access can share an allowance without making compute unlimited[^3] |
| Hugging Face | Monthly credits followed by centralized pay-as-you-go | Separate included allowance from subsequent consumption; supplier pass-through is a pricing policy, not proof of profit[^4] |
| OpenRouter | Provider constraints and separately configurable model fallbacks | Distinguish an alternate serving path from an alternate model; check capabilities before dispatch[^5][^6] |
| LiteLLM | Routing abstractions plus reservation and budget controls | Treat budgets as admission state; verify modality-specific gaps rather than assuming the proxy covers them[^8][^9] |
| Cloudflare AI Gateway | Managed fallback and unified billing | Buying gateway capability can reduce integration work, but adds fee and dependency considerations[^12][^13] |

The familiar commercial pattern is access plus a finite allowance, with more usage available under clear terms. None of these sources establishes that GALX can profitably sell unrestricted frontier inference at a small flat fee. Nor does a competitor's subsidized or bundled offer establish GALX's cost basis.

The engineering lesson is similarly specific. Preserve familiar API envelopes where meaningful, but validate the semantics. Anthropic's compatibility documentation describes ignored fields and recommends its native API for fuller support; a base-URL change is therefore insufficient evidence for production interchangeability.[^10] Google offers an OpenAI compatibility path, which helps evaluation but still requires GALX-specific conformance checks.[^11]

## Product definition

Offer a small set of explicitly described capabilities. For text, a practical initial division is general work and demanding reasoning/coding. Existing identifiers can remain supported during migration, but they must resolve exactly to a verified contract. A GALX capability alias may have several qualified implementations; a vendor-specific identifier must preserve the vendor/model promise. Unknown identifiers should fail with an actionable validation error.

For a customer-selected model, failover may change the serving route only where the same promised model is verified. Changing the model requires an explicit capability-mode choice or a previously agreed substitution policy. For capability mode, publish the quality, context, modality, tool and charging contract. Keep supplier choice and routing records private. This reconciles continuity with the repository's public-information boundary.

Start with text and tool use as the second-supplier evaluation scope. Images remain a separate qualification track because generation side effects, asynchronous retrieval, metadata sanitation, output dimensions and billing units differ. Audio, video, search and native computer-use capabilities enter only after paid customer demand and dedicated acceptance. A common API should preserve supported distinctions, rather than discard useful features to produce nominal uniformity.

Keep application chat and unattended API workloads separately budgetable. API agents can consume an allowance continuously, in parallel and through long tool loops. A human chat pattern is not a safe forecast for API consumption. Teams need a shared organization ceiling with stricter project, key and member ceilings; members should not be able to increase the organization's financial commitment. One account and one invoice do not require one undifferentiated consumption pool.

## Commercial design

This section records the initial conditional allowance proposal. Use [the revised offer](commercial-reset/OFFER.md) for current commercial planning; it includes no recurring inference allowance by default.

The recommended package is a monthly service subscription plus a stated quantity of GALX usage credit. The subscription pays for the product's access and governance value; the allowance funds defined consumption. The customer sees the public rate card, remaining included credit, purchased credit and any enabled extra-spend limit. Expensive capabilities consume more credit. A token count alone is unsuitable as the cross-model currency because input, output, caching, reasoning and images have different cost structures.

At allowance exhaustion, default to a pause with a clear choice to buy credit or enable capped overage. A prepaid overage wallet is the simpler first release; an automatic recharge requires separate consent, recharge-size and monthly limits. Postpaid invoicing should be restricted to customers with approved commercial terms. An enabled limit is a maximum commitment, not an upfront credit purchase.

Use expiring subscription entitlements and purchased credit as distinct balances. Decide and disclose subscription rollover before launch; a no-rollover included allowance is the planning default. Preserve existing purchased-credit commitments and record promotional grants separately. Changes to price or credit policy apply prospectively with versioned terms. Do not reinterpret historical grants as cash revenue or silently revoke them to finance new providers.

For fallback inside a priced capability, maintain the quoted customer rate. GALX absorbs an allowed backup-cost difference from a bounded reliability budget. A higher customer price requires advance authorization and a new quote or policy selection. If no qualified route fits the remaining budget, return an honest unavailable or spending-limit response. Quietly changing model quality, privacy constraints or price would undermine the reason to buy the abstraction.

Keep the existing payment processor and durable payment-event handling. Evaluate a rating platform before building a complicated credit and contract engine. Stripe's current comparison directs complex credit burndown and enterprise pricing toward Metronome while retaining simple existing metering, and notes integration limitations.[^18] That evaluation is a bounded procurement decision; it should not delay closing the current usage-loss path. A rating system and an invoice processor do not replace GALX's own atomic admission limits.

No exact monthly price is approved by this report. [The economics model](ECONOMICS.md) supplies price constraints and stress cases. Net collections, real supplier expense and observed customer usage must determine the initial allowance. The existing promotional packs already require a material cost advantage to remain profitable at full redemption. An industry-looking pricing page cannot substitute for that evidence.

## Availability and shared failures

Adding a supplier only helps requests that the alternate can accept under the same functional and commercial constraints. A long-context tool request, a strict output schema, a privacy restriction or an exhausted backup quota can remove the alternative. Availability must therefore be measured by capability and customer policy, not by counting vendor logos.

Use the following planning model:

`A = A_shared × [1 − p_primary × (1 − e × s × (1 − p_backup_given_primary_failure))]`

Here `A_shared` is the availability of common GALX dependencies, `e` is the fraction of failed primary requests eligible for the backup, and `s` is successful switching within the customer deadline. The backup failure probability is conditional on primary failure; it must not be replaced with its ordinary failure rate without evidence of independence. The formula is a sensitivity model, not an observed SLA. It also assumes that these aggregate factors adequately summarize the workload; correlated customer policies and demand can violate that approximation.

For illustration, shared availability of 99.95%, primary failure of 0.1%, eligibility of 80%, switching success of 99% and conditional backup failure of 20% produce approximately **99.9134%** overall availability. With no backup, the same assumptions give **99.8501%**. Perfectly independent, fully eligible backup math would look better, but would conceal the actual constraints. Shared-dependency downtime remains a ceiling.

The September 9 records document database egress and authority-recovery work. Treat that as evidence that supplier diversification is only one reliability track. Keep database health, request admission, credential freshness, service-process health and artifact retrieval in the failure inventory. Do not add a distributed database or another cloud as a reflex: identify measured failure contributions first, and improve recovery or isolation where it changes the user outcome.

Define success as a usable completion or retrievable artifact within the promised contract. An accepted task, an open stream, a keepalive, a status-page green light or HTTP 200 without a valid result is not enough. Track first meaningful output, completed streams, tool/schema correctness, cancellation, queue wait, retrieval success and reconciliation separately. This follows the user-centered SLO approach; the actual targets remain GALX decisions.[^15]

Retries must share one end-to-end budget. Classify invalid requests, permission failures, capacity errors, transient failures and uncertain execution separately. Honor cancellation and remaining time. Once output or a side-effecting operation has begun, a second execution can create duplicate work and charges. Preserve a pending reconciliation state where outcome is uncertain. Google SRE and AWS guidance support aggregate retry controls and backoff; no fixed retry count is a universal standard.[^14][^16]

## Provider qualification and maintenance

For a future independent-supplier evaluation, the September 10 research proposed Anthropic's native API first for the assumed coding/tool workload and Google's API as the comparison candidate. This is an order for a small evaluation, not a finding that one has superior quality, price or availability. Measure both against the same task set and fully loaded cost. If customer evidence identifies a different workload, change the candidate order.

An aggregator is a credible alternative when maintaining even one additional native adapter is too expensive. Compare OpenRouter, Cloudflare AI Gateway and Hugging Face against the required subset, contractual authority, billing evidence and failure independence. The September 10 snapshot of Cloudflare's unified billing page specified a 5% purchase fee and possible negative credit balances; factor both into risk and cost.[^13] Do not count a backup routed to the original supplier as independence from that supplier. Avoid stacking gateways whose retries and policies cannot be controlled.

The proposed new-supplier evaluation should record the intended service terms, credentials, verified capability/identity, available quota and usage information, retention/region constraints, support and deprecation procedures. Unknown values must stay explicit. A mode that promises token-based billing or a supplier-enforced ceiling needs matching evidence. Fixed-price Sites instead uses local admission and durable completion under ADR 0134, so incomplete quota or cost information does not impose those metered prerequisites. This research did not examine supplier commercial records or establish a conclusion about the current arrangement.

Budget maintenance explicitly. Assign each adapter an owner, a recorded feature matrix, a contract-test suite, a canary workload and a removal plan. Review release/deprecation notices weekly, sampled quality and cost monthly, and a forced-primary-failure drill at each material routing release. Those cadences are proposed operating choices. Cap the initial supported surface at two suppliers and two text profiles until the operating load is measured.

Use a narrow provider interface inside the existing service. Reuse leases, privacy eligibility and payment records after validating their semantics. Keep the first new adapter behind a feature flag and an account allowlist. Avoid moving routing, metering and authentication into separate services just to resemble a larger company's diagram. A managed gateway becomes attractive when its annual total cost is lower than owned integration, evaluation, incident and upgrade work for the required scope.

## Business validation and reversal criteria

Recruit five to ten existing or qualified prospective developer customers for discovery and a limited pilot. This is a proposed sample, not current demand. Ask them to identify a recent interruption, the cost of that interruption, required tool/model behavior, their current monthly spend and what they would pay for reliable continuation. Test a capability bundle against exact-model selection and a usage-only offer. Measure conversion, retention, support burden and margin after actual consumption.

Do not describe broad access as the moat. Larger gateways already provide discovery and consolidated billing. GALX needs a focused advantage: reliable completion of a valuable workload, correct integration with agent tools, understandable consumption, and strong team spending controls. Whether customers value that advantage is a testable hypothesis. The first milestone is a small group returning to the service with positive contribution after real usage.

Stay with the primary while qualifying alternatives if the second route fails capability, commercial or cost gates. Prefer a managed alternative if direct integration consumes more maintenance than the continuity benefit justifies. Retain usage-only pricing if willingness to pay for membership is weak. Expand beyond two suppliers only when unmet paid demand, failure coverage or savings exceed the incremental recurring support burden. Investigate dedicated capacity after sustained demand and supplier guarantees justify the commitment.[^19]

The broader expansion work and exit criteria remain in [IMPLEMENTATION.md](IMPLEMENTATION.md). Fixed-price Sites follows its own implemented operations runbook; future supplier and subscription work requires a separate scope decision.

## Sources

[^1]: Cursor, [Spend limits](https://prod.cursor.com/help/account-and-billing/spend-limits), accessed September 10, 2026.
[^2]: Cursor, [Pricing](https://cursor.com/pricing), accessed September 10, 2026.
[^3]: Poe, [Purchases FAQs](https://help.poe.com/hc/en-us/articles/19945140063636-Poe-Purchases-FAQs), accessed September 10, 2026.
[^4]: Hugging Face, [Pricing and Billing](https://huggingface.co/docs/inference-providers/pricing), accessed September 10, 2026.
[^5]: OpenRouter, [Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection), accessed September 10, 2026.
[^6]: OpenRouter, [Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks), accessed September 10, 2026.
[^8]: LiteLLM, [Router](https://docs.litellm.ai/docs/routing), accessed September 10, 2026.
[^9]: LiteLLM, [Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users), accessed September 10, 2026.
[^10]: Anthropic, [OpenAI SDK compatibility](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk), accessed September 10, 2026.
[^11]: Google, [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), accessed September 10, 2026.
[^12]: Cloudflare, [Fallbacks](https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/), April 20, 2026.
[^13]: Cloudflare, [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/), August 7, 2026.
[^14]: Google, [Handling Overload](https://sre.google/sre-book/handling-overload/), accessed September 10, 2026.
[^15]: Google, [Implementing SLOs](https://sre.google/workbook/implementing-slos/), accessed September 10, 2026.
[^16]: AWS, [Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html), accessed September 10, 2026.
[^18]: Stripe, [Compare basic usage-based billing and Metronome](https://docs.stripe.com/billing/subscriptions/usage-based/compare-metronome), accessed September 10, 2026.
[^19]: Google Cloud, [Provisioned Throughput](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/provisioned-throughput), accessed September 10, 2026.

Full source qualifications and internal records: [SOURCES.md](SOURCES.md).
