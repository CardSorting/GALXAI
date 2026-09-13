# Image persistence and execution failures

<!-- docs-scope: current-guide -->

## FM-IMG-001 — accepted request disappears

The original async image route stored a task in process memory and scheduled untracked background work. Another server instance could not retrieve it. The current [repository](../../src/lib/images/request-repository.ts) commits `private.galx_image_requests` before 202, scopes every operation to the verified owner, fingerprints idempotency keys and admits only one atomic dispatch claim. [The service](../../src/lib/images/request-service.ts) tracks work with Next.js `after`; reads can schedule an unclaimed queued request.

This is durable application receipt handling, not a durable distributed execution engine. Queued requests have a five-minute claim window. Generation has a 160-second receipt deadline and a 135-second service signal; route execution is bounded at 180 seconds. The database derives a failed read for expired work. A late authoritative completion can still be recorded; expiry never authorizes another dispatch. [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after) remains subject to the route's execution duration.

## FM-IMG-002 — missing artifacts or forgotten Favorites

R2 settings must exist in the deployed environment, not only `.env.local`. Receipt completion verifies all returned asset IDs belong to the owner and exist as completed library records. JSON URL retrieval returns opaque download links without loading every image. Download delivery sanitizes the artifact again.

Favorite updates flush pending owned assets before the mutation and require durable completion before acknowledgement. BroccoliDB is a bounded optimization, not authority for a successful save. Do not “fix” a database outage by returning a fabricated successful favorite or exposing an object-storage URL.

## FM-IMG-003 — uncertain generation gets repeated

Keep the original request ID and idempotency key. Check its owner-scoped status and library first. Claimed attempts are not automatically redispatched after a timeout or failed acknowledgement. Cancellation only succeeds before dispatch. Neither failure nor cancellation establishes a refund, and polling does not reconstruct a missing upstream artifact.

Regression commands: `npm run test:image:security`, `npm run test:image:db`, and `npm run test:broccolidb:hardening`. The database suite uses disposable PostgreSQL and covers cross-connection reads, concurrent claims, wrong owners, incomplete assets, cold Favorites and restricted database roles. Live acceptance is one authorized frontend generation, download decoding and My images/Favorites after reload. Preserve any ambiguous attempt rather than repeatedly clicking Generate.

Evidence: [September 13 recovery](../incidents/2026/2026-09-13-image-generation/README.md). Follow [image recovery](../runbooks/image-generation.md) for incident order.
