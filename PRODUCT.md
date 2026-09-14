# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALX helps builders turn an early idea into a site they can revise, preview and share at a public GALX address. Sites leads the homepage. Image generation remains an accessible public product. The developer API is a private preview with individual approval and small cohorts.

## Primary Users & Jobs to Be Done

- Builders move from an idea to an early site without arranging development, prototyping and publication separately.
- Creators generate images, download them and maintain their own image library and Favorites.
- Approved developers try integrations, report private feedback and help validate reliability before broader access.
- Authorized staff review cohort applications, manage time-bounded access and inspect private operational evidence.

## Core Capabilities

The Sites workspace supports conversations, draft versions, previews and explicit managed publication. A verified account has a one-time allowance of one Site with three turns and five images, subject to availability. Temporary free-creation pauses preserve prompts and saved work; the composer offers a manual recheck and plan link. GALX Pro includes continuing Sites creation under fair usage; revisions and conversation turns follow that policy. Images and API usage retain separate account/billing contracts. Follow [Sites operations](docs/maintainers/SITES_OPERATIONS.md) and the customer [Sites guide](docs/SITES_WORKSPACE.md) for the implemented scope. Do not imply arbitrary application execution beyond the actual product contract.

The image studio supports creation, owned library retrieval, Favorites and downloads. Accepted async image requests have durable owner-scoped receipts, while execution remains bounded and uncertain attempts are not automatically repeated.

## Constraints & Invariants

- Public positioning explains the idea-to-site experience, revisions, included public address, pricing and the purpose of an extremely early public beta. Homepage copy, metadata and FAQ omit provider/model names and implementation details.
- Images and Sites remain public products with sign-in required before workspace entry and their existing entitlement and ownership requirements. Other developer APIs require verified signup and individual approval; signup, payment and existing keys are not grants.
- Small cohorts support controlled demand, better performance and private feedback. Participant-reported savings are observations, not guaranteed savings or a promise of uniform outcomes.
- `/admin` uses independent staff authorization: owners manage staff; owners/reviewers manage access; viewers are read-only. Customer approval and editable metadata never grant administration.
- Preserve explicit return destinations during authentication. Do not infer product priority from a legacy default redirect.
- Authorization and persistence are server-enforced. Caches optimize reads and batches; they do not grant access, fabricate successful saves or make accepted work durable by themselves.
- Public responses use explicit allowlists and sanitized artifacts. Keep credential sources, topology, routing and diagnostics private.
- Recovery preserves original operation identity. Acceptance is not completion, a timeout is not proof of non-dispatch, and cancellation does not promise a refund.
- Do not claim guaranteed availability, exact supplier quotas, unverified model identity, universal savings or compliance certification.

## Current Strategy and Evidence

[Product surface strategy](docs/PRODUCT_SURFACE_STRATEGY.md) is the maintained scope. [Current operating state](post-mortem/CURRENT_STATE.md) records dated activation and acceptance evidence. ADRs retain topic-specific history; the original inference-first retirement in ADR 0119 does not override later restored Images, public Sites or the developer waitlist.
