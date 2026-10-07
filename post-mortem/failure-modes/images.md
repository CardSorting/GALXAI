# Image persistence and execution failures

<!-- docs-scope: current-guide -->

## FM-IMG-001 — accepted request disappears

The original async image route stored a task in process memory and scheduled untracked background work. Another server instance could not retrieve it. The current [repository](../../src/lib/images/request-repository.ts) commits `private.galx_image_requests` before 202, scopes every operation to the verified owner, fingerprints idempotency keys and admits only one atomic dispatch claim. [The service](../../src/lib/images/request-service.ts) tracks work with Next.js `after`; reads can schedule an unclaimed queued request.

This is durable application receipt handling, not a durable distributed execution engine. Queued requests have a five-minute claim window. Generation has a 160-second receipt deadline and a 135-second service signal; route execution is bounded at 180 seconds. The database derives a failed read for expired work. A late authoritative completion can still be recorded; expiry never authorizes another dispatch. [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after) remains subject to the route's execution duration.

## FM-IMG-002 — missing artifacts or forgotten Favorites

R2 settings must exist in the deployed environment, not only `.env.local`. Receipt completion verifies all returned asset IDs belong to the owner and exist as completed library records. JSON URL retrieval returns opaque download links without loading every image. Download delivery sanitizes the artifact again.

The [October 7 Star delivery incident](../incidents/2026/2026-10-07-star-image-delivery/README.md)
demonstrated a separate configuration guard: local generation, previews and
public feed/profile rows succeeded while downloads returned generic 503 because
the serving environment lacked `R2_PRIVATE_IMAGES_BUCKET_NAME`. Verify the
hosted private bucket setting and server credentials before a residency. A
configuration update needs a new deployment; verify the exact accepted package
and candidate delivery before moving existing web aliases. Retain the private
bucket, prior release and original artifacts. Do not expose the bucket or
regenerate images to repair delivery.

Favorite updates flush pending owned assets before the mutation and require durable completion before acknowledgement. BroccoliDB is a bounded optimization, not authority for a successful save. Do not “fix” a database outage by returning a fabricated successful favorite or exposing an object-storage URL.

## FM-IMG-003 — uncertain generation gets repeated

Keep the original request ID and idempotency key. Check its owner-scoped status and library first. Claimed attempts are not automatically redispatched after a timeout or failed acknowledgement. Cancellation only succeeds before dispatch. Neither failure nor cancellation establishes a refund, and polling does not reconstruct a missing upstream artifact.

Regression commands: `npm run test:image:security`, `npm run test:image:db`, and `npm run test:broccolidb:hardening`. The database suite uses disposable PostgreSQL and covers cross-connection reads, concurrent claims, wrong owners, incomplete assets, cold Favorites and restricted database roles. Live acceptance is one authorized frontend generation, download decoding and My images/Favorites after reload. Preserve any ambiguous attempt rather than repeatedly clicking Generate.

Evidence: [September 13 recovery](../incidents/2026/2026-09-13-image-generation/README.md). Follow [image recovery](../runbooks/image-generation.md) for incident order.

## FM-IMG-004 — available capacity rejected before dispatch

An empty optional sliding-window object must project as absent; otherwise undefined arithmetic denies otherwise usable accounts. Expired credentials must not win selection ahead of usable candidates. The database remains authoritative for the resulting lease and all configured limits. A proven pre-dispatch rejection persists only `generation_not_started`; generic failed historical receipts are not retroactively reclassified.

If application admission is repaired but generation is still unavailable, inspect the independent registry/capability boundary. Partial I/O reservations can starve cold-read recovery by consuming every small refill. The guard now requires the complete reservation before I/O; see [registry recovery](../../docs/RELAY_VNEXT_RUNBOOK.md#registry-reservation-recovery). Never reset counters, remove journals or widen permissions as a workaround.

## FM-IMG-005 — Premium connection or observation missing

A ready Premium runtime does not connect the hosted application. Empty production origin/key settings produce unknown availability; a disconnected tunnel blocks reachability. The former pool check called a worker availability path that was absent, so it reported false even after successful synthesis. Read in-process image evidence directly and preserve unknown for absent/expired evidence. The independent application image switch must select Premium for both observation and dispatch without a legacy/Standard fallback.

Transport success is not durable image completion. The Premium branch must share the existing owned image persistence and library flush before completing its receipt. Regression coverage includes direct engine evidence, no GET generation, image-only routing with no Standard config, invalid configuration, sanitation, legacy-admission bypass and persisted owned asset IDs. Preserve original ambiguous receipts.

## FM-IMG-006 — public lightbox escapes the viewport

A modal z-index cannot overtake navigation when the modal remains inside a lower stacking context. Render public image dialogs through a body-level portal, then keep the backdrop above every application-shell layer. Lock background scrolling only while the dialog is open and restore both body styles and the previously focused element on close.

Do not size the lightbox from requested aspect metadata alone. The sanitized artifact's intrinsic dimensions govern containment because stored or historical metadata can describe a different requested shape. Give the dialog explicit viewport-bounded rows and columns, set every grid/flex minimum to zero, use a border-box media cell, and contain the image within both axes. On narrow viewports, keep close, previous, next and zoom controls inside the media layer while the details panel scrolls independently. Verify the actual deep link in clean desktop and narrow-viewport browsers; a successful build does not detect stacking or overflow failures.

## FM-IMG-007 — inactive Star loses established public work

Runtime activation answers whether a Star may start new work. It is not
publication history. Reusing `actor.is_enabled` in backfills or public views can
silently withdraw completed work when a bounded cohort is deactivated, and can
block curatorial review of a completed candidate. Keep activation checks in
new-request admission. Public projections must instead validate the autonomous
identity, discoverable active profile and publication state. Preserve legacy
publication provenance in a private append-only archive; restore only rows whose
attempt, generation, request and stored asset agree, before the release cutoff,
and which have no candidate or selection event.

Regression coverage must prove that a disabled Star cannot start a new request,
can still have a completed candidate selected, keeps established public works
visible, and cannot archive post-cutover or already-reviewed work. Browser roles
and `service_role` receive no archive-ledger access. Reconcile the public feed
and profile views after every actor-lifecycle or publication migration; do not
activate Stars or regenerate work to repair continuity.
