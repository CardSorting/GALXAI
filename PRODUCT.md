# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALX helps creators and builders turn imagination into visual reality. GALX Images is the primary user-facing product. Every generated image is public by default, streamed into a live community masonry discovery gallery. Image Studio provides high-resolution generative diffusion across 5 native aspect ratios with a floating composer dock, one-click prompt remixing, and lossless PNG downloads. The developer API provides access to the curated 5-model lineup via instant developer tier access ($10 deposit / $20 usable credit) or free preview cohorts. Legacy Sites has been retired due to technical quota and maintenance overhead.

## Primary Users & Jobs to Be Done

- Creators prompt, synthesize, and remix high-resolution visual artwork with zero waitlist.
- Community members explore the live public masonry stream, discover proven prompts, and fork creative styles with one click.
- Pro subscribers enjoy priority GPU inference queues, high-resolution multi-aspect ratio generation, and unlimited prompt remixing.
- Developers integrate the curated 5-model lineup through standard SDK and REST endpoints.
- Authorized staff inspect private operational evidence, monitor capacity, and review developer cohorts.

## Core Capabilities

The Image Studio supports fast prompt synthesis, 5 dynamic aspect ratios (`1:1`, `16:9`, `9:16`, `3:2`, `4:3`), an options popover dock, live progress capsules, owned library retrieval, Favorites, and direct binary downloads. Generated images are automatically published to the community masonry feed with key generation metadata (prompt, seed, model, aspect ratio) for public collective discovery. Accepted async image requests have durable owner-scoped receipts, while execution remains bounded and uncertain attempts are not automatically repeated. Legacy Sites has been sunset, with `/sites` routes redirecting to `/images`.

## Constraints & Invariants

- Public positioning explains the image generation experience, prompt remixing, public stream discovery, pricing, and capabilities. Homepage copy, metadata, and FAQ omit internal provider/model details and implementation diagnostics.
- GALX Images is a public product. Image Studio and generation require sign-in; the public masonry stream is discoverable by all visitors. Developer APIs require developer tier enrollment or verified cohort approval.
- Public responses use explicit allowlists and sanitized artifacts. Keep credential sources, topology, routing, and operational diagnostics private per [AGENTS.md](AGENTS.md).
- `/admin` uses independent server-side staff authorization. Customer approval and editable metadata never grant administration.
- Preserve explicit return destinations during authentication.
- Authorization and persistence are server-enforced. Caches optimize reads and batches; they do not grant access, fabricate successful saves, or make accepted work durable by themselves.
- Recovery preserves original operation identity. Acceptance is not completion, a timeout is not proof of non-dispatch, and cancellation does not promise a refund.
- Do not claim guaranteed availability, exact supplier quotas, unverified model identity, universal savings, or compliance certification.

## Current Strategy and Evidence

[Product surface strategy](docs/PRODUCT_SURFACE_STRATEGY.md) is the maintained scope. [Current operating state](post-mortem/CURRENT_STATE.md) records dated activation and acceptance evidence. Legacy Sites documentation and ADRs are preserved as dated historical records; the live product is GALX Images.
