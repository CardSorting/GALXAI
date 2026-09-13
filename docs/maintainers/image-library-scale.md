# Large image libraries

<!-- docs-scope: current-guide -->

Private maintainer guide for the `/images` library. The implementation was deployed to `galx.ai` on September 13 at `c9c9121`, after its additive migration. The [release record](../../post-mortem/releases/2026-09-13-image-library-scale.json) separates live read-only acceptance from local scale fixtures; it is not a production capacity promise. [ADR 0146](../adr/0146-bounded-image-libraries.md) records the tradeoffs; [dated local evidence](../knowledge/audits/2026-09-13-image-library-scale.json) records tests. Generation receipts remain governed by [ADR 0144](../adr/0144-durable-images-and-incident-documentation.md).

## User experience

Create starts blank and appends validated completions. Image/Grid, the filmstrip, explicit selection, the labeled waiting simulation and prompt recovery remain. The recent collection retains at most 120 images and uses a 16 MiB estimated string budget. An explicitly selected image and the newest result are retained even when a legacy inline artifact exceeds the budget; at most those two records can exceed it. The string estimate is not a browser heap measurement. Old entries are released from recent results, not deleted from saved history. The interface says “recent images” and links to all saved images.

My images and Favorites fetch one 36-image page. Previous/Next controls appear above and below the grid. Uniform square frames contain each image without cropping; responsive columns keep previews compact, including two columns on narrow phones. On phones, the reuse action is an icon with its accessible name retained. Opening a thumbnail shows the original in the native lightbox. Search, chronological sort, Favorites and refresh retain explicit controls. The page indicator describes the current browsing position, not an exact total across a changing collection.

Create does not fetch saved history until the library opens. Switching Create/library retains the current page and refreshes that page on return. Same-view refresh and a failed page request retain the visible images. Retry repeats the failed cursor and requested page. A successful page change replaces the previous page, moves focus to the library heading and reveals it without animated travel. Search/sort/favorite-filter changes reset pagination; requests are cancelled and obsolete responses ignored. A current-owner API 401 unmounts the studio and offers sign-in recovery; 403 clears inaccessible library/detail content without starting a sign-in loop. The supported library-view URL and existing account-scoped per-tab drafts survive sign-in. See [workspace authentication](../operations/workspace-auth.md). An empty later page offers a return to page one, since concurrent deletion can change the collection.

Cards carry a 300-character prompt preview. The full prompt is fetched only for inspection or reuse. A detail failure preserves the preview image and offers Retry details; copy/reuse remain disabled until full text arrives. Closing or browsing the lightbox cancels obsolete detail retrieval so a late response cannot reopen or replace the current image. Reuse fetches the full prompt before filling the composer. The lightbox snapshots only the current bounded source collection and releases it when closed. Page changes are not snapshot-isolated across concurrent inserts, deletes or Favorites changes; a page number is local navigation context.

## BroccoliDB and authority

BroccoliDB is a bounded process-local cache and write buffer. PostgreSQL owns durable image metadata; storage owns the binary artifacts. Neither a cache hit nor a locally queued write proves durable success. The new work uses existing BroccoliDB tables, the existing PostgreSQL connection governor, existing storage, and Sharp; no vendor, distributed cache or dependency was added.

| Working set | Bound and behavior |
| --- | --- |
| Hot image metadata | 512 records, 16 MiB serialized payload, 60-second TTL, LRU eviction |
| Query-shaped pages | 128 pages, 8 MiB serialized payload, 15-second TTL, LRU eviction |
| Pending writes | 128 distinct records, 16 MiB serialized payload; never evicted to admit another write |
| Database read coordination | Eight active, 64 distinct admitted reads, identical in-flight work shared; queued work expires after eight seconds |
| Adapter metadata | 512 records, 8 MiB serialized payload, 60-second TTL |
| Sanitized thumbnails | 128 entries, 16 MiB encoded bytes, five-minute TTL |
| Artifact processing | Two active, 64 distinct admitted operations; eight-second queue wait; originals are not retained by this thumbnail cache |

Limits are per process, not a global tenant quota, total process-heap limit or distributed invalidation guarantee. Existing storage has a separate 64 MiB byte cache. BroccoliDB indices and JavaScript overhead are additional to serialized byte accounting. Expiry is checked on access/admission/metrics; count and byte caps remain enforced even while idle. Coalescing bounds unique work, not the number of HTTP clients waiting on the same result. Existing ingress limits remain relevant.

Page cache keys include owner and normalized filters/cursor. Mutations invalidate the affected owner's pages; an epoch prevents an earlier query from repopulating a page after local invalidation. Another process's metadata changes can remain visible in a page for its short TTL. Artifact/detail authorization always queries the owner-scoped authoritative row, even for a warm thumbnail. Concurrent reads can share the same in-flight statement snapshot. A read already underway before deletion retains normal concurrent-read semantics; previously delivered bytes cannot be recalled.

A failed configured database query returns unavailable, never the old partially warmed 200-record cache as a complete library. Unconfigured nonproduction fixtures retain their local-only fallback. Single-asset lookup queries by verified owner and ID rather than warming a recent slice, so older images remain reachable. Page/detail Data API reads have an eight-second abort; direct PostgreSQL uses the existing bounded pool. Failed reads are not cached as empty collections.

Writes coalesce by asset ID and flush in batches of at most 64. A full queue rejects admission before changing retained pending records. Flush failure keeps the pending records; completion still requires the existing durable asset check. Adapter enqueue failure propagates rather than reporting a successful catalog insertion. A binary upload that succeeds before metadata failure can remain orphaned for later private reconciliation; this is not a transactional storage/database commit or a new automatic cleanup policy. Do not regenerate an uncertain operation solely to rebuild its library row.

The legacy R2 session listing is still limited to its first 100 objects and is not the large-library browsing contract. Adapter listings no longer return an arbitrary hot-cache subset as if it were complete. The legacy summary RPC and its API default remain for older callers; exact counts/facets may still scan the owner library. `/images` explicitly uses the compact path. This change does not claim to scale every legacy list or storage manifest.

## Pagination and public contracts

The additive `fn_page_user_image_library` RPC selects only a page plus one row and omits full-library counts/facets. Partial B-tree indexes cover completed images and completed Favorites in `(user_id, created_at DESC, id DESC)` order. Forward/reverse keyset queries use both timestamp and ID. Cursors preserve PostgreSQL microseconds and bind to owner, filters, sort and summary mode. Invalid, oversized, duplicate or unknown query parameters return a generic 400; an input user ID never selects ownership. SQL values remain bound parameters. The service-role-only function is `SECURITY INVOKER` with a fixed empty search path; browser roles cannot execute it.

`GET /api/images/library?summary=none&limit=36` returns nullable total/stats, empty session facets, cursor links and explicit card DTOs. Each card contains only ID, completion status, prompt preview, ratio, quality, favorite flag, creation time and opaque original/thumbnail URLs. Owner-authenticated detail retains the full allowlisted record. The default summary contract remains available; it is not silently changed into an approximate count. Compact reads accept limits from 1 through 100, while the studio fixes its page size at 36.

The substring search remains compatible with existing prompt/revised-prompt/model/tag matching. Rare matches or filtered sessions can inspect many owner rows; the new ordering indexes do not make every search constant time. Measure selectivity and query plans before adding a search index or changing search semantics. No new search service, GIN index or full-text ranking is introduced.

## Image delivery

The opaque original capability also addresses `/v1/images/assets/[token]/thumbnail`. Capability validation and authoritative owner/asset lookup precede every thumbnail cache hit. Invalid, expired, foreign or deleted-image capabilities return 404. Storage or processing failure returns a generic 503 with Retry-After. Public responses remain `private, no-store` with explicit headers; no storage keys, upstream fields or metadata are forwarded.

Thumbnails are freshly encoded WebP, fit inside 512×512 without enlargement, and have a 512 KiB output ceiling. Originals retain their existing sanitized format and dimensions. Both paths enforce supported single-frame raster input, 32 MiB input and a 40-million-pixel decode limit, orientation correction and sRGB conversion. Encoding strips EXIF/XMP/comments. Sharp processing has a 15-second deadline. Node storage reads enforce 32 MiB while streaming and a 15-second AbortSignal; bounded reads do not automatically retry. Gzip expansion is bounded too. Other storage callers retain their existing options. Native Worker binding acquisition has its platform lifecycle; the new image HTTP routes execute in Node.

Thumbnail cache keys use authoritative owner, asset identity, hash and update time. Identical work shares storage/decode processing. Native browser image loading remains lazy; full-resolution display/download is on demand. The on-demand design avoids a migration/backfill of stored images but the first preview still requires reading and decoding its original. Many cold instances or low cache reuse can therefore retain appreciable storage/CPU cost. It is not a CDN cache or pre-generated derivative system.

## Familiar precedents

[Apple's Photos caching API](https://developer.apple.com/documentation/photos/phcachingimagemanager) supports target-sized image requests and starting/stopping bounded asset preloading. GALX applies the same principle to small grid previews and original detail, without claiming an Apple Photos implementation or adding speculative original downloads.

[Facebook's photo-viewer engineering account](https://engineering.fb.com/2011/02/10/web/developing-facebook-s-new-photo-viewer/) describes an overlay that preserves browsing context and separates image/metadata loading. That 2011 account is a historical pattern reference, not evidence of today's Facebook architecture. GALX preserves the library page under its lightbox and fetches full prompt detail only when needed.

[PostgreSQL's pagination guidance](https://www.postgresql.org/docs/17/queries-limit.html) requires predictable ordering and explains the cost of skipped OFFSET rows. Its [index-ordering guidance](https://www.postgresql.org/docs/current/indexes-ordering.html) explains why matching B-tree order helps LIMIT queries. GALX uses bounded pages rather than growing an infinite-scroll DOM or adding a virtualizer solely to hide retained data. Explicit pages retain native keyboard and screen-reader behavior and a useful retry boundary.

## Validation, rollout and recovery

Run `npm run test:image:scale`, `npm run test:image:library-db`, `npm run test:image:db`, `npm run test:image:security`, `npm run db:verify`, `npm run db:test`, relevant BroccoliDB/transport regressions, lint and a production build. The database runner creates its own disposable PostgreSQL container and blocks external services. It tests 50,000 owned images, bidirectional traversal of 10,000 rows per sort including timestamp ties, owner/filter cursor isolation, older details, deletion after warm access, privileges, query plan and migration rollback/reapply. HTTP fixtures inspect real serialized bodies, headers and thumbnail pixels/metadata; unit fixtures exercise byte/count admission, stalled streams, expiry and recovery.

Workspace browser fixtures must first supply a verified server session through the [authentication harness](../operations/workspace-auth.md). Legacy local-storage-only identity fixtures require adaptation; do not bypass entry checks. Their prior results remain dated evidence.

Serve the local production build and run `scripts/verify-image-studio-ui.ts` and `scripts/verify-image-library-scale-ui.ts` with the documented browser modules from [studio verification](image-studio-review.md). The latter blocks external requests, simulates a 10,000-image library, checks 100 desktop page changes, desktop/phone DOM bounds, full-prompt loading, retry, view continuity, closed-dialog races and authorization clearing. Retain completed results and visually inspect the desktop/phone captures. Scan rendered pages and browser assets with `npm run docs:check:build`; these checks are local and do not certify the live site.

Before rollout, follow [database operations](POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md). Migration `20260913071757_image_library_bounded_pages.sql` adds only the function and two indexes; it does not rewrite/delete history or change roles on the table. It uses a two-second lock timeout and a 60-second statement timeout. Ordinary index creation can block writers while building. For a large busy target, review size/write load and plan a maintenance window or separately reviewed concurrent index creation before applying the function migration. Do not assume `IF NOT EXISTS` verifies an existing index definition.

Apply the approved migration before deploying the compatible application. Missing RPC/index deployment is not a reason to silently return a partial cache. A compatible application rollback can leave the additive SQL in place. The paired down migration removes only this RPC and indexes, preserving all image records; roll back dependent application readers first. Retain durable receipts and the public artifact/auth boundary. No migration application or deployment is authorized merely by these local test commands.

Monitor actual page latency, database work, unavailable responses, thumbnail bytes/CPU, queue waits, process memory and cache reuse after an authorized rollout. Compare representative cold and warm sessions at the same traffic level. The local measurements in the evidence record are fixture timings, not SLOs, total browser memory, real network savings, sustained multi-instance capacity or proof the site cannot fail. Physical-device, full assistive-technology and live load acceptance remain separate work.
