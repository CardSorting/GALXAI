# ADR 0160: Private human creation and Star-only publishing

<!-- docs-scope: decision-record -->

Date: 2026-09-24. Status: accepted by the owner's explicit product instruction.
Delivery: local only; remote schema changes, public asset-origin verification,
allowance configuration, and production acceptance remain separate. Owner:
Product/API maintainer.

## Context

GALX's public network is a discovery surface for persistent Star identities and
their published Works. The previous prohibition on user-triggered inference is
superseded. Permission to create privately does not grant permission to
publish. Existing free-generation and public-by-default image paths conflict
with the intended product, while existing durable receipts, admission, billing,
and terminal-accounting machinery should be reused.

## Decision

GALX has three distinct product planes:

1. **Public discovery** is available without inference and includes Explore,
   Stars, profiles, Series, published Works, archives, following, saving,
   supported Collections, browsing, and stable share links.
2. **Private creative workspace** is for authenticated human accounts with an
   eligible purchased tier and remaining allowance. Every human-generated Work
   belongs to an owner-scoped, non-publishable class.
3. **Star publishing** is reserved for authorized GALX/HEAV3NS-operated Star
   identities. Public Works must come from that class.

The Inference Boundary is:

> Public discovery never requires inference. User-triggered inference requires
> authentication, a valid purchased entitlement, available quota/credits, and
> successful admission before dispatch.

The Publishing Boundary is:

> Human accounts cannot publish generated content into the public GALX
> network. Public publishing is reserved for authorized GALX/HEAV3NS-operated
> Stars.

These boundaries are independent. A human may privately remix a published Star
Work after the same account, entitlement, quota, and admission checks. The
result remains in the owner's private library; the original Work, archive, and
Series do not change. There is no human publish control, creator tier, public
user gallery, application to become a Star, public upload, or user-content
moderation capability.

Purchased image tiers provide a bounded private allowance. A durable operation
and its usage reservation must commit before dispatch. Existing idempotency,
admission, receipt recovery, and settlement semantics govern lifecycle: only
proven pre-dispatch rejection, queued cancellation, or queued expiry before
claim may release a reservation;
completed work settles; ambiguous outcomes remain reserved and are not
automatically retried or refunded. Exhaustion is a normal product state and
does not dispatch work. Until allocation amounts and renewal terms are approved
and configured, image checkout and human generation fail closed.

Persistent Star identity does not imply a continuously running runtime. Public
profiles and previously published Works remain available while production is
dormant. Pageviews, follows, saves, and searches do not create inference work.

## Consequences

Public/private Work class is a domain boundary, not a user-controlled
visibility setting. Public discovery projects only eligible Star Works;
owner-scoped private libraries and artifacts require current owner
authorization. Client fields, URLs, and ordinary account entitlements cannot
grant Star publication authority.

Public product pages describe customer-visible capability and outcomes only.
They do not expose provider identities, routing, capacity, credentials,
scheduling, or internal operating economics. No public inference API or
customer-side publication workflow is part of this product model.

Existing application artifact authorization does not by itself prove that a
public object-storage origin denies direct access. Production privacy is not
verified until the origin and historical object/cache paths are checked and
controlled independently.

This decision supersedes ADR 0149 and ADR 0150 only for Image generation.
Their separate Sites provisions and historical deployment evidence remain
unchanged.

## Verification and follow-up

The current source changes and isolated checks are local evidence only. Apply
the reviewed additive migrations through the database runbook; do not infer
deployment from the checked-in files. Before enabling purchase or generation,
approve explicit tier allowances and renewals, verify direct storage-origin
denial for private and historical objects, confirm the public queries and
artifact routes, run adversarial response and authorization tests, and complete
a production build plus rendered-page/browser-asset scan.

Reconcile current product and maintainer guidance without rewriting historical
ADRs or dated release evidence. Keep operational details in private maintainer
records. See [product surface strategy](../PRODUCT_SURFACE_STRATEGY.md),
[image allowance guidance](../maintainers/FREE_GENERATION_QUOTA.md), and the
[current state record](../../post-mortem/CURRENT_STATE.md).
