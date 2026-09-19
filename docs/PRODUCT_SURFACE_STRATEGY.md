# GALX product surface strategy

<!-- docs-scope: current-guide -->

Private product authority, reconciled September 18, 2026. [PRODUCT.md](../PRODUCT.md) summarizes the experience; [current state](../post-mortem/CURRENT_STATE.md) records deployment evidence. Earlier inference-first, customer-local-only, and conversational website strategies are historical, superseded by the GALX Images surface and GALX Nova service framing.

## Product and access boundaries

| Surface | Current scope |
| --- | --- |
| Homepage | Image-first prompt cockpit, prompt inspiration, live community stream from real public data, Nova attribution, and a separate Developer route |
| Public guidance | Dedicated `/pricing`, `/faq`, and `/knowledge-base` guides explain image creation, public sharing, GALX Nova, published consumer terms, and the Developer subscription boundary |
| Images | Consumer creation surface: public-by-default visual generation, community stream, prompt remixing across five supported aspect ratios, owned library, Favorites, and sanitized image downloads |
| GALX Nova | Managed intelligence layer for reasoning and generation. The service name explains the relationship; it does not disclose or promise internal execution details |
| Developer | Separate API information and access path. Developer Access is $50/month recurring for API admission; usage is billed separately and no usage credits are included |
| Staff administration | Independent owner/reviewer/viewer membership, approval inbox, activity history and private feedback |
| Destination chat and arbitrary execution | Not introduced by the Image Studio; downstream and other proposals retain their own scope |

Public means users can discover and explore the live stream, while sign-in remains required before opening the full Image Studio or accessing owned library history. It does not mean unrestricted abuse or unmetered server compute: consumer plan terms remain governed by fair use and rate limiting.

## Positioning and commercial contract

Explain the creative friction removed: turning an idea into an image, testing compositions across aspect ratios, and discovering prompt inspirations. Explain user outcomes and supported capabilities, not internal execution mechanics. Homepage content and metadata attribute the experience to GALX Nova without making a foundation-model or performance claim.

Current consumer plan pricing is $10/month in the active product configuration and is separate from Developer access. Published consumer copy should describe image creation, exploration, remixing, downloads, and fair-use boundaries without adding unverified speed or capacity promises. Developer Access is a separate $50/month recurring API access subscription; usage is billed separately and zero usage credits are included.

For explanation, describe Developer Access as membership to a managed
workspace: the subscription provides API access to the service, while
consumption is billed separately. This is an explanation of the existing
subscription, not a workspace product, team-seat model or capacity promise.

Stripe follows the same boundary. GALX Pro and Developer Access use the existing subscription architecture with separate product/price identities. The former prepaid Developer/compute-pack checkout is retired: new quote and legacy checkout requests are rejected, the public Stripe configuration exposes no pack catalog, and historical wallet sessions remain available only for ledger/refund reconciliation. A paid historical wallet session never creates or approves a Developer access entitlement.

Historical product records retain their original evidence and contract history. They do not define the current GALX Images, GALX Nova, or Developer narrative.

## Execution and evidence

Public documentation uses capability contracts and explicit response fields. Operational topology, credential sources, readiness mechanics and diagnostics stay private under [AGENTS.md](../AGENTS.md). Keep server-verified identity, independent staff authority, durable ownership and uncertain-operation recovery intact.

Measure completed user journeys, durable image generations, prompt remix engagement, stream discovery, and repeat use. Distinguish implementation, local tests, component deployment and real customer acceptance. [Incident records](../post-mortem/INCIDENTS.md) retain failed attempts and verification limits; a successful image test does not qualify checkout or third-party integrations.
