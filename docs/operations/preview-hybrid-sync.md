# Developer preview reads and hybrid sync

Private operational notes. Do not copy implementation details into public documentation, UI, responses, headers, or browser bundles.

## Scope and database impact

The preview application, approval checks, and admin workspace use fewer roundtrips and transfer less repeated application data. Existing PostgreSQL tables, RLS, grants, migrations, approval expiry, audit history, and identity verification are unchanged. No new infrastructure or migration is required. Reverting the application changes is sufficient to roll back.

Reads touch `private.developer_access_requests`, `private.developer_preview_feedback`, `private.preview_admin_members`, and `private.preview_admin_audit`. Risk is moderate because access decisions must remain fresh. Admin reads retain a staff membership share lock for the duration of one statement; writes retain transaction-scoped authorization locks and atomic audit records. Read timeouts use the existing pool's six-second ceiling.

## Read contracts

- A server-side BroccoliDB table holds application snapshots, scoped to each database pool and process. It has no WAL, disk persistence, browser storage, or external replication. Entries expire after 60 seconds, with at most 512 snapshots and 2 MiB of serialized payload. Expiry removes the associated eviction metadata too.
- Every application read checks its PostgreSQL tuple version (`xmin` plus `ctid`) before reusing a snapshot. This also detects edits made outside the application revision protocol, multiple updates inside one transaction, deletion, and recreation. The local snapshot is a response optimization, never an authorization source.
- Approval-only checks use the current database status and expiry. Positive and negative grants are never cached. Expiry uses statement time, including when an injected client is already in a transaction.
- Queued reads collect for up to a nominal 2 ms before dispatch, with at most 128 distinct read keys per batch, four concurrent queries, and 1,024 outstanding callers. Event-loop delays can extend that scheduling interval. Approval results are compact ordinal arrays; full application fields are returned only for changed or missing local snapshots.
- Only requests queued before dispatch share a query. A new request cannot join an already-running query that predates a committed revocation. A request already in flight retains normal PostgreSQL statement-snapshot semantics.
- A failed, incomplete, or overloaded check rejects the callers and cannot fall back to a cached approval. Later requests can retry. HTTP failures retain the existing sanitized 503 response and `private, no-store` policy.
- Each caller gets separate response objects and dates. Raw versions, batching fields, and storage details never enter public DTOs.

## Admin and write bundling

Each normal staff read now combines the current membership and the requested payload in one SQL statement. Detail reads include the application, its decision history, and feedback in that same statement. List responses include the current actor, so the browser no longer fetches a second session response on every refresh. The browser waits for identity hydration and cancels obsolete reads on account changes.

Staff invitations still bind through an audited transaction on first use. Subsequent reads do not repeatedly attempt to claim an invitation. Owner-only payloads are conditional on the current database role. Mutations retain revision checks, transaction-scoped staff locks, last-owner protection, and atomic audit writes; transaction setup statements now share one roundtrip.

An application INSERT returns its receipt in the same statement. An existing application is returned without rewriting its email, queue position, or permissions. A rare concurrent first-insert conflict requires a fresh read because the winning row may not be visible in the losing statement's snapshot. No no-op UPDATE is used to force a receipt.

## Measured checks

Measured on a disposable PostgreSQL 17 fixture with all 102 migrations:

| Operation | Before | After |
| --- | --- | --- |
| 64 queued approval checks in the fixture | 64 SQL calls | 1 SQL call |
| Normal admin session read | 5 SQL calls | 1 SQL call |
| Normal admin list read | 6 SQL calls | 1 SQL call, including actor |
| Normal admin detail read | 8 SQL calls | 1 SQL call |
| Application submission / ordinary retry | 2 SQL calls | 1 SQL call |
| Unchanged application response | 3,471 logical bytes on cold read | 93 logical bytes after version validation |

The application payload example is about 97% smaller on a warm read. Bytes are `JSON.stringify(result.rows)` in the test harness, not captured TLS/PostgreSQL wire traffic or a billing forecast. Actual benefits depend on concurrency, payload size, cache reuse, and server instance lifetime. Idle instances and cold starts still query PostgreSQL. Middleware authorization and upstream session verification remain separate checks; SQL counts above describe repository operations, not the entire HTTP request lifecycle.

Regression coverage includes cross-account and cross-pool isolation, current grants and expiry, changes by another process, same-transaction updates, cache expiry and eviction, burst limits, late arrivals, database failure, malformed results, concurrent first submissions, stale application edits, staff demotion/removal, and audit atomicity. Public DTO and browser asset checks include the new internal identifiers.

The production build, targeted lint, 14 preview/sync tests, six admin authorization tests, 19 image security tests, both preview/admin database suites, and 94 existing database tests passed. All 102 migration/rollback pairs passed static verification. The production-build browser suite captured 35 states at 390, 768, and 1440 pixels with no accessibility violations, document overflow, or page exceptions. Desktop and mobile inboxes each made one initial browser read. [Local verification receipt](evidence/preview-hybrid-sync-local.json).

## Rollout

This change requires a site deployment only. No new migration, owner setup, API gateway deployment, or environment variable is needed. Browser code and API list responses must be deployed together because the new browser consumes the actor from the list response. Previously loaded browsers continue to work with the additive response fields.

Status at verification: implemented and tested locally; not deployed.

## References

- [PostgreSQL WITH queries](https://www.postgresql.org/docs/current/queries-with.html): statement snapshots and data-modifying CTE behavior, including concurrent INSERT visibility.
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres): pooled serverless connections. This change preserves the existing pool and does not introduce named prepared statements or session state for reads.
