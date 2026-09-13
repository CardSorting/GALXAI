# ADR 0146: Bounded image library browsing and preview delivery

<!-- docs-scope: decision-record -->

Date: 2026-09-13. Owner: Product/API maintainer. Decision status: proposed for maintainer review. Delivery: deployed to `galx.ai` at `c9c9121` on September 13 after migration `20260913071757`; bounded read-only acceptance is recorded separately. The user's explicit commit, push and deploy request authorized this release, not automatic architecture acceptance.

## Context and decision drivers

Thousands of saved images must not require retaining every card, downloading every original or scanning full-library summaries on each page. The prior session array, accumulated saved pages and metadata buffers grew without sufficient bounds. An outage could fall back to an incomplete hot cache, and single-asset lookup depended on a recent warm slice. BroccoliDB should accelerate owned data without becoming its authority.

## Options considered

An accumulating infinite feed retains unbounded records even if DOM nodes are virtualized. A virtualizer plus bounded page eviction is possible but adds scroll/focus restoration and retry complexity. Explicit fixed-size pages provide a simpler native-accessible working set. A new distributed cache or pre-generated thumbnail pipeline could improve cross-instance reuse but adds services, invalidation or a backfill; the current change uses existing infrastructure and measures its limits.

## Decision

Implement 36-image cursor pages for saved history and a bounded recent session collection. Keep compact thumbnail cards, a context-preserving lightbox and full prompt retrieval on inspection/reuse. Add a page-only PostgreSQL function with stable timestamp/ID order, both browsing directions and owner/filter-bound cursors. Keep the legacy full-summary contract available.

Use bounded BroccoliDB metadata/page caches, coalesced reads and bounded durable-write admission. Authoritative owner-scoped lookup precedes every artifact cache hit. Generate sanitized 512-pixel WebP previews on demand with bounded processing, storage byte limits and deadlines. PostgreSQL remains durable metadata authority; no cached record grants permission or proves a write committed.

## Consequences and recovery

Normal browsing work no longer grows with all previously visited pages. Old saved images remain independently retrievable. A failed page leaves the current page usable; a failed authority check returns unavailable rather than an invented complete collection. Exact full-library counts and facets are omitted from compact browsing. Concurrent changes can shift local page positions, and selective substring searches may still scan many owner rows.

Caches are process-local and byte accounting does not equal total heap usage. A cold thumbnail still reads its original. Large legacy inline results can exceed the normal recent string budget for the selected/newest records. Storage upload and metadata persistence remain separate commits. These limits are explicit in the [owning guide](../maintainers/image-library-scale.md).

Apply the additive migration before the application. Review index lock impact on the actual target. Rollback can leave additive SQL in place; remove the RPC/indexes only after reverting dependent readers. Preserve image records, durable receipts and sanitized delivery.

## Confirmation and delivery

[Dated local evidence](../knowledge/audits/2026-09-13-image-library-scale.json) separates source review, disposable SQL tests, HTTP/adversarial checks, browser fixtures and compiled scans. The [September 13 release](../../post-mortem/releases/2026-09-13-image-library-scale.json) records migration privileges/indexes, hosted application CI, production aliases, signed-in library/lightbox/navigation and sanitized original/thumbnail retrieval. One old fixture-named row points to a missing object and remains a private reconciliation follow-up. The separate gateway workflow still fails its previously recorded obsolete diagnostic assertion and did not deploy. Live throughput, production query timings, physical-device usability, new generation and billing settlement were not tested in this release. Do not promote this decision's status during generated documentation synchronization.

## Relationships

Extends [ADR 0144](0144-durable-images-and-incident-documentation.md) for library scale and [ADR 0129](0129-public-image-artifacts-and-verified-identity.md) for sanitized thumbnail delivery. Neither predecessor's receipt, uncertainty, identity or public-boundary rules are superseded.
