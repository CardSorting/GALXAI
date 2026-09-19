# Product: GALX

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALX is where people create. GALX Images is the consumer experience for turning a prompt into an image and exploring what others create. Creations are public by default and may appear in the community stream. Behind the experience is GALX Nova, our managed intelligence layer for reasoning and generation. Developer is the separate route to programmable access to supported Nova capabilities through the API.

## Primary Users & Jobs to Be Done

- Creators describe, create, explore, remix, and download images.
- Community members discover public creations and find their next idea.
- Pro subscribers use the published consumer image plan under its fair-use terms.
- Developers subscribe for access to supported GALX Nova reasoning and generation capabilities through the documented API.
- Authorized staff inspect private operational evidence, monitor capacity, and review developer cohorts.

## Core Capabilities

The Image Studio supports prompt creation, five supported aspect ratios (`1:1`, `16:9`, `9:16`, `3:2`, `4:3`), live progress, owned library retrieval, Favorites, prompt reuse, and direct image downloads. Public feed responses expose an explicit allowlist of customer-facing fields; seeds, provider/model internals, and operational diagnostics are not public content. Accepted async image requests have durable owner-scoped receipts, while execution remains bounded and uncertain attempts are not automatically repeated.

## Constraints & Invariants

- Public positioning explains the image generation experience, prompt remixing, public stream discovery, pricing, and capabilities. Homepage copy, metadata, and FAQ omit internal provider/model details and implementation diagnostics.
- GALX Nova is the managed intelligence service name. “Managed” describes the customer relationship; it does not promise unlimited capacity, guaranteed outputs, a dedicated cluster, human review, enterprise support, or a proprietary foundation model.
- GALX Nova Developer Access is a $50/month recurring API access subscription. Usage is billed separately at $0.02 per completed message, with no usage credits and a default $25 monthly hard cap. The billing workspace shows message quantity, accrued/remaining spend, reset date, and durable 50%/80%/100% in-app threshold notices. Do not describe this as token billing or expose supplier economics.
- Consumer plan pricing and Developer access are separate surfaces. A Developer price decision does not authorize changing consumer plan entitlements.
- GALX Images is a public product. Image Studio and generation require sign-in; the public masonry stream is discoverable by all visitors. Developer APIs require an active Developer Access subscription or a separately approved private preview account; historical purchases do not grant access.
- Stripe strategy has two active boundaries: GALX Pro is the consumer subscription at $10/month; GALX Nova Developer Access is a separate $50/month recurring subscription. Its fee admits API access and creates no usage-credit balance.
- Public responses use explicit allowlists and sanitized artifacts. Keep credential sources, topology, routing, and operational diagnostics private per [AGENTS.md](AGENTS.md).
- `/admin` uses independent server-side staff authorization. Customer approval and editable metadata never grant administration.
- Preserve explicit return destinations during authentication.
- Authorization and persistence are server-enforced. Caches optimize reads and batches; they do not grant access, fabricate successful saves, or make accepted work durable by themselves.
- Recovery preserves original operation identity. Acceptance is not completion, a timeout is not proof of non-dispatch, and cancellation does not promise a refund.
- Do not claim guaranteed availability, exact supplier quotas, unverified model identity, universal savings, or compliance certification.

## Current Strategy and Evidence

[Product surface strategy](docs/PRODUCT_SURFACE_STRATEGY.md) is the maintained scope. [Current operating state](post-mortem/CURRENT_STATE.md) records dated activation and acceptance evidence. Legacy product documentation and ADRs are preserved as dated historical records; the live product is GALX Images with GALX Nova behind the experience.
