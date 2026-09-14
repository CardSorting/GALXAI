# Image generation and library recovery

<!-- docs-scope: current-guide -->

Use this for Images, Favorites, async generation and download failures. Start with [triage](triage.md) and preserve the existing request/session.

| Symptom | Inspect privately | Safe next action |
| --- | --- | --- |
| Expired-session error on a signed-in account | Auth result vs transport failure; public Auth configuration type | Verify with the dedicated Auth client; retain 401 for rejected tokens and 503 for temporary verification failure |
| POST 202 followed by missing status | Exact deployment, applied image migration, owner and receipt ID | Confirm the durable repository is serving both POST and GET; do not recreate the generation |
| Free quota denied or appears stale | Server account allowance, original receipt state and release evidence | Follow [quota operations](../../docs/maintainers/FREE_GENERATION_QUOTA.md); refresh the counter and preserve unknown execution deductions |
| Request fails immediately | Correlated admission category, optional quota projection, credential expiry, storage and service reachability | An explicit `generation_not_started` result permits a new manual attempt; generic failure stays uncertain. Empty optional quota objects must project as absent; do not reset counters, grant permissions or mark expired credentials healthy. |
| Request remains pending | Receipt claim/deadline and correlated execution evidence | Read the original receipt; inspect the library for completed assets before a new submission |
| Download or library unavailable | Owner-scoped asset row, object existence, sanitized artifact delivery | Repair delivery separately from synthesis; do not regenerate an existing image |
| Large library or preview stalls | Bounded page RPC/index deployment, query selectivity, cache/processing admission and storage read limits | Use the [scale guide](../../docs/maintainers/image-library-scale.md); retry retrieval, never silently return partial hot history or regenerate |
| Favorite acknowledged then disappears | Durable asset flush, mutation result and owner filter | Require durable mutation before success; verify after reload |

## Preflight before releasing a repair

Check the source and target separately. The image path requires the private image-request migration, application database access, working public Auth verification, required server-only image storage configuration and a reachable generation service. Local `.env.local` or a deployment marked Ready is not sufficient proof. The admin client must continue rejecting publishable credentials; never promote a public key to privileged authority.

Use [database operations](../../docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) for migrations. The durable-receipt migration is additive; its rollback refuses to drop populated receipts. The separate bounded-library migration adds only a page function and ordering indexes; apply it before the compact client, and remove dependent readers before its non-destructive SQL rollback. Retain it during compatible application rollback. Never substitute the old process-local image queue or silently retry claimed generation.

The quota migration must also precede dependent image handlers. Its rollback retains grants and usage; stop new free admission by rolling back the application, never by deleting allowance records.

Run `npm run test:free-quota`, `npm run test:free-quota:db`, `npm run test:image:security`, `npm run test:image:db`, `npm run test:developer-preview`, and a production build for image/auth/persistence changes. Run BroccoliDB hardening when its write path changes. For library/thumbnail changes also run `npm run test:image:scale` and `npm run test:image:library-db`, plus the controlled large-library browser fixture. The database runner uses an isolated disposable fixture, never production data. Record actual totals and failures in the incident, not permanent test counts in this guide.

The studio preserves a bounded collection of receipt IDs across reload and navigation. Recover request uses the saved exact POST key and payload after an acknowledgement loss. Check status/Resume updates only retrieves accepted work. Transient status failures must not remove receipts; known non-start failures stop observation and trigger an advisory availability read. A confirmed capability outage disables new submissions and offers Check availability (GET only), while existing receipt recovery remains available. An unknown read does not erase the last known outage. Inspect private logs to correlate historical generic failures; do not rewrite old receipts solely from a library page being empty.

## Live acceptance

1. Use an existing authorized signed-in browser session. Open My images and Favorites without signing out; verify the expected owned data or honest empty states.
2. If a real generation is authorized, submit one bounded request with a recognizable harmless prompt. Record time, request ID and settings. Inspect the same request until completion or a bounded failure.
3. View the resulting image, reload My images and verify it remains. Download it, decode the actual artifact, and check metadata/header sanitation within the release's scope.
4. Favorite it, confirm acknowledgement, reload and verify Favorites. Do not count optimistic UI state alone as persistence.
5. Check anonymous/forged and cross-owner denial with controlled fixtures, plus public responses, rendered pages and associated browser assets. Keep diagnostics private.

Record any untested paths: multiple images, paid settlement, interrupted in-flight recovery, sustained load and unrelated Sites flows require separate evidence. A single successful generation cannot certify all of them.

## Missing historical artifacts and test isolation

A completed catalog row with a missing object is a storage consistency issue. Establish the exact owner, operation and object identity from private records before repair. A test-like name alone does not authorize deletion. If retained original bytes match both the catalog SHA-256 and size and fully decode, restore only that missing object with a conditional create (`If-None-Match: *`). Stop on an existing object or fingerprint mismatch. Verify uncached storage readback, unchanged catalog/receipts, and sanitized live original/thumbnail delivery with expired and foreign-owner denial. Do not regenerate or substitute a visually similar image.

The historical `npm run test:relay:image` name now runs a disposable PostgreSQL/local-object contract fixture through the isolated runner. It does not load application dotenv files, call the relay, or generate paid images. Cleanup removes only this run's owned fixture rows before its local objects; the runner tears down its owned container and temporary directory. Direct invocation without an explicitly allowed loopback test database fails before application imports. Never use object-only session deletion as cleanup for durable production image records. Keep separately authorized live acceptance outside automated fixtures.
