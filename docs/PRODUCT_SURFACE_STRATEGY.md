# GALX product surface strategy

<!-- docs-scope: current-guide -->

Private product authority, reconciled September 13, 2026. [PRODUCT.md](../PRODUCT.md) summarizes the experience; [current state](../post-mortem/CURRENT_STATE.md) records deployment evidence. Earlier inference-first and customer-local-only strategies are historical, superseded for the public Images/Sites surfaces.

## Product and access boundaries

| Surface | Current scope |
| --- | --- |
| Homepage | Sites-first idea, prototype, revision and public-address pitch; pricing followed by FAQ; extremely early public beta expectations |
| Sites | Public product with authenticated owned drafts, continuing conversations, preview/version history and explicit managed publication; paid-plan and fair-use requirements remain |
| Images | Public product with existing account/usage requirements, creation, durable async receipts, owned library, Favorites and sanitized download |
| Developer preview | Signup, project introduction, GitHub/LinkedIn profiles and cohort interest; individual approval before private API/tool access |
| Staff administration | Independent owner/reviewer/viewer membership, approval inbox, activity history and private feedback |
| Destination chat and arbitrary execution | Not introduced by the image studio or bounded Sites workspace; downstream and other proposals retain their own scope |

Public means users can discover and engage with Images and Sites without developer-preview approval. Sign-in is required before opening the Images or Sites workspaces, including saved-Site routes. It does not mean anonymous workspace access or generation, free unlimited compute, public drafts or unrestricted data access. Preserve ownership and entitlement checks.

## Positioning and commercial contract

Explain the pain removed: arranging development, producing an early prototype, revising it and publishing a shareable version. Explain user outcomes and the early beta's purpose, not implementation. Homepage content and metadata omit provider/model names. “Unlimited revisions and turns” must retain the established fair-use meaning, without promising unlimited concurrent capacity or abuse tolerance.

Current Pro pricing and eligible plan mappings come from the maintained billing/product configuration and [Sites fair usage](maintainers/SITES_FAIR_USAGE.md), not historical fixed-price draft documents. Images/API usage and prepaid credits retain separate terms. Existing per-generation Sites receipts retain their originally accepted contract and recovery path; do not reprice history.

Small developer cohorts support controlled demand and a trustworthy first experience. Participant savings reports are observations requiring attribution and bounded claims, not guaranteed inference discounts. Signup/payment never substitutes for approval.

## Execution and evidence

Public documentation uses capability contracts and explicit response fields. Operational topology, credential sources, readiness mechanics and diagnostics stay private under [AGENTS.md](../AGENTS.md). Keep server-verified identity, independent staff authority, durable ownership and uncertain-operation recovery intact.

Measure completed user journeys, durable revisions/images, publication readiness, feedback and repeat use. Distinguish implementation, local tests, component deployment and real customer acceptance. [Incident records](../post-mortem/INCIDENTS.md) retain failed attempts and verification limits; a successful image test does not qualify checkout or Sites publication.
