# GALX scaling decision

**Current recommendation: test the bounded paid Sites/client-operations workflow through the existing relay, with a fixed customer price and explicit account limits.** Keep the working provider primary. Expand the catalog only when paid demand or funded continuity obligations justify it.

The [commercial reset](commercial-reset/README.md) supersedes this package's initial allowance-led positioning. It contains a deeper competitive audit, a concrete $299/month agency experiment, support-capacity and company break-even models, and explicit stop conditions. Prices and costs are hypotheses, not implemented plans or observed demand.

This is private strategy material, based on repository revision `4587642` and official sources accessed September 10, 2026. The planning assumption is an API product for developers and teams, with chat as a separate consumption surface. Customer segmentation and production unit economics remain unverified.

The concept to validate is **a paid operating workflow for client budgets, usage statements and project handover, with separately funded consumption**. Neither unrestricted flat-rate inference nor generic gateway access establishes a sustainable differentiated business.

| Decision | Recommendation |
| --- | --- |
| Continue operating the existing provider? | Yes. Preserve the working service while making bounded changes. |
| Add another provider for this workflow? | No. Use the existing relay; separately evaluate future continuity work if funded demand justifies it. |
| Launch an all-model catalog immediately? | No. Deliver the bounded existing-relay workflow first. |
| Offer a flat monthly subscription? | Test a bounded operating service; no recurring included compute in the proposed default. |
| What happens at a usage or funding limit? | Stop additional admission by default; continuation needs prior authorization, funds and a separate cap. |
| Current implementation milestone? | Fixed-price Sites admission, durable completion, account limits and customer-owned delivery are locally implemented; general inference findings retain separate scope. |
| Select a price to test? | The reset proposes $299/month plus bounded setup. Final pricing requires actual cost and paid renewal evidence. |

The audit reproduced concrete gaps: identical stream content counted as **32 versus 126 completion tokens** under different chunking; a failed buffered charge retained **zero pending entries**; operational fields in a chat quota response; and lost tool-call data in async chat retrieval. These are expansion blockers, not evidence that every request currently fails. Existing safeguards also passed **66 scoped checks**, and an isolated production build passed on the required **Node 22.21.1** runtime. The package records four unrelated, pre-existing documentation-index issues separately.

Read the package in this order:

1. [Commercial reset](commercial-reset/README.md) — current thesis, positioning, offer, downside model and commercial gates.
2. [Initial strategy and tradeoffs](STRATEGY.md) — technical alternatives and first-pass commercial analysis, with superseded proposals marked.
3. [Technical audit](AUDIT.md) — findings, evidence, counterchecks, severity, and closure criteria.
4. [Implementation plan](IMPLEMENTATION.md) — staged work, concrete tickets, ownership, acceptance tests, and rollback.
5. [Initial allowance economics](ECONOMICS.md) — conditional sensitivity analysis; current business economics are in the reset.
6. [Verification](VERIFICATION.md) — what was actually checked and what remains unverified.
7. [Sources](SOURCES.md) — original documentation and evidence qualifications.

The current narrower implementation is [fixed-price Sites delivery](commercial-reset/SITES_ASSESSMENT.md), governed by [ADRs 0134–0136](../../docs/adr/README.md). It permits conservative assumptions for opaque supplier quota and expense, while requiring real authorization and completion evidence. Its local changes do not close unrelated general-chat/tool findings or prove production rollout. The original audit made no runtime changes; subsequent implementation and the earlier metered deployment have separate dated records.
