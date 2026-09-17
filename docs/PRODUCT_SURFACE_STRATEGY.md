# GALX product surface strategy

<!-- docs-scope: current-guide -->

Private product authority, reconciled September 16, 2026. [PRODUCT.md](../PRODUCT.md) summarizes the experience; [current state](../post-mortem/CURRENT_STATE.md) records deployment evidence. Earlier inference-first, customer-local-only, and conversational website (Sites) strategies are historical, superseded by the public GALX Images surface.

## Product and access boundaries

| Surface | Current scope |
| --- | --- |
| Homepage | Images-first prompt cockpit, instant prompt inspiration chips, live infinite masonry community stream, model & aspect ratio selector, pricing followed by FAQ |
| Public guidance | Dedicated `/pricing`, `/faq`, `/knowledge-base` guides with capability-only copy, explaining visual synthesis, aspect ratios, community streams, and account tiers |
| Images | Flagship public product: public-by-default visual generation, Pinterest-style live community masonry feed, prompt remixing across 5 aspect ratios, durable async receipts, owned library, Favorites and sanitized PNG downloads |
| Sites (Retired) | Retired product surface; decommissioned September 2026 due to unsustainable quota consumption and technical setup overhead. Legacy `/sites` routes gracefully redirect to `/images` |
| Developer preview | Signup, project introduction, GitHub/LinkedIn profiles and cohort interest; instant access via $10 Developer Tier ($20 compute credit) or cohort approval before private API access |
| Staff administration | Independent owner/reviewer/viewer membership, approval inbox, activity history and private feedback |
| Destination chat and arbitrary execution | Not introduced by the Image Studio; downstream and other proposals retain their own scope |

Public means users can discover, explore the live stream, and generate visuals in Images without developer-preview approval. Sign-in is required before opening the full Image Studio or accessing owned library history. It does not mean unrestricted abuse or unmetered server compute: free welcome allowances and Pro plans are governed by fair use and rate limiting.

## Positioning and commercial contract

Explain the creative friction removed: crafting complex visual assets, testing compositions across aspect ratios, and discovering prompt inspirations. Explain user outcomes and visual diffusion fidelity, not internal relay mechanics. Homepage content and metadata follow public-facing model naming and omit upstream backend topology.

The one-time welcome allowance provides five free image generations under [quota operations](maintainers/FREE_GENERATION_QUOTA.md); it is not an unlimited free pass. Current Pro pricing ($29/month) includes priority GPU queues, high-resolution rendering, unlimited 1-click prompt remixes, and community stream participation under fair use. Developer API compute carries separate pay-as-you-go credit terms ($10 Developer Tier with $20 usable credit).

The conversational website builder (Sites) has been completely sunset. Existing Sites assets and historical per-generation billing records retain their originally accepted contract and recovery path without repricing history.

## Execution and evidence

Public documentation uses capability contracts and explicit response fields. Operational topology, credential sources, readiness mechanics and diagnostics stay private under [AGENTS.md](../AGENTS.md). Keep server-verified identity, independent staff authority, durable ownership and uncertain-operation recovery intact.

Measure completed user journeys, durable image generations, prompt remix engagement, stream discovery, and repeat use. Distinguish implementation, local tests, component deployment and real customer acceptance. [Incident records](../post-mortem/INCIDENTS.md) retain failed attempts and verification limits; a successful image test does not qualify checkout or third-party integrations.
