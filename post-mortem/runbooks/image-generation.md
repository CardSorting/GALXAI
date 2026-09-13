# Image generation and library recovery

<!-- docs-scope: current-guide -->

Use this for Images, Favorites, async generation and download failures. Start with [triage](triage.md) and preserve the existing request/session.

| Symptom | Inspect privately | Safe next action |
| --- | --- | --- |
| Expired-session error on a signed-in account | Auth result vs transport failure; public Auth configuration type | Verify with the dedicated Auth client; retain 401 for rejected tokens and 503 for temporary verification failure |
| POST 202 followed by missing status | Exact deployment, applied image migration, owner and receipt ID | Confirm the durable repository is serving both POST and GET; do not recreate the generation |
| Request fails immediately | Storage configuration and generation-service reachability | Repair the failing dependency; a stored failure does not authorize replay |
| Request remains pending | Receipt claim/deadline and correlated execution evidence | Read the original receipt; inspect the library for completed assets before a new submission |
| Download or library unavailable | Owner-scoped asset row, object existence, sanitized artifact delivery | Repair delivery separately from synthesis; do not regenerate an existing image |
| Large library or preview stalls | Bounded page RPC/index deployment, query selectivity, cache/processing admission and storage read limits | Use the [scale guide](../../docs/maintainers/image-library-scale.md); retry retrieval, never silently return partial hot history or regenerate |
| Favorite acknowledged then disappears | Durable asset flush, mutation result and owner filter | Require durable mutation before success; verify after reload |

## Preflight before releasing a repair

Check the source and target separately. The image path requires the private image-request migration, application database access, working public Auth verification, required server-only image storage configuration and a reachable generation service. Local `.env.local` or a deployment marked Ready is not sufficient proof. The admin client must continue rejecting publishable credentials; never promote a public key to privileged authority.

Use [database operations](../../docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) for migrations. The durable-receipt migration is additive; its rollback refuses to drop populated receipts. The separate bounded-library migration adds only a page function and ordering indexes; apply it before the compact client, and remove dependent readers before its non-destructive SQL rollback. Retain it during compatible application rollback. Never substitute the old process-local image queue or silently retry claimed generation.

Run `npm run test:image:security`, `npm run test:image:db`, `npm run test:developer-preview`, and a production build for image/auth/persistence changes. Run BroccoliDB hardening when its write path changes. For library/thumbnail changes also run `npm run test:image:scale` and `npm run test:image:library-db`, plus the controlled large-library browser fixture. The database runner uses an isolated disposable fixture, never production data. Record actual totals and failures in the incident, not permanent test counts in this guide.

## Live acceptance

1. Use an existing authorized signed-in browser session. Open My images and Favorites without signing out; verify the expected owned data or honest empty states.
2. If a real generation is authorized, submit one bounded request with a recognizable harmless prompt. Record time, request ID and settings. Inspect the same request until completion or a bounded failure.
3. View the resulting image, reload My images and verify it remains. Download it, decode the actual artifact, and check metadata/header sanitation within the release's scope.
4. Favorite it, confirm acknowledgement, reload and verify Favorites. Do not count optimistic UI state alone as persistence.
5. Check anonymous/forged and cross-owner denial with controlled fixtures, plus public responses, rendered pages and associated browser assets. Keep diagnostics private.

Record any untested paths: multiple images, paid settlement, interrupted in-flight recovery, sustained load and unrelated Sites flows require separate evidence. A single successful generation cannot certify all of them.
