# Supabase authority and operational boundaries

<!-- docs-scope: domain-reference -->

Private component reference, reconciled September 15, 2026. Use [the database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) for current procedures and the actual migrations for object-specific privileges. This reference does not substitute generic policies for reviewed schema.

## Identity and authorization

Application identity is verified server-side. Public Auth credentials can verify a bearer token without constructing an administrator client; a publishable key never grants admin authority. Temporary verification failure must remain distinct from a rejected credential. User IDs and editable metadata are not proof of authorization.

Developer approval, staff membership and resource ownership remain independent current checks. BroccoliDB snapshots and batching optimize payloads, not grants. An unavailable authoritative read cannot become cached permission or a fabricated successful write.

## Database ownership

Use explicit privileges and owner/tenant predicates with RLS appropriate to each table's exposure. Private receipts and staff/preview records are not browser-queryable storage. Do not infer direct access from ordinary authentication or a server role name. Definer functions need an actual justified privilege boundary, fixed trusted search paths, restricted callers and adversarial tests.

Financial, audit and accepted-operation state must commit atomically at their defined boundary. Image receipts commit before async acknowledgement, claims arbitrate dispatch, and success requires owned committed assets. Favorites commit before acknowledgement. Keep record identity across uncertainty rather than manufacturing success from local memory. Native session creation, lookup, rotation and revocation and device-grant approval/polling require authoritative results. No cache may restore a denied/revoked session or acknowledge a failed write. Native account provenance and previous-token grace are enforced in the authentication engine; [workspace auth](operations/workspace-auth.md) owns the source contract and rollout limitations.

## Manual shard authority

Migration `20260914231914` enforces [manual desktop-only enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md). The host validates the persisted running desktop and saved provider login before calling its SQL-only registrar; ordinary application persistence cannot create authority.

| Schema boundary | Enforcement |
| --- | --- |
| `managed_desktop_id uuid` | Unique when non-null; one bound account per desktop |
| `desktop_enrolled_at timestamptz` | Paired with the binding; preserved first-enrollment time, not a unique timestamp |
| Binding constraint | Both fields absent or both present on an OpenAI OAuth record |
| Protected-field trigger | Credentials, credential expiry, identity/owner and binding changes require the private writer role |
| `galx_desktop_writer` | No-login, non-inheriting function owner; not granted to service, anonymous or authenticated roles |
| Private enrollment/refresh functions | Controlled administrator SQL callers, pinned search path, account/binding checks and conditional revision replacement |
| Generic upsert and service insert | Disabled; `ShardRepository.saveShard` only updates allowlisted policy metadata |
| Controller and database admission | Both reject records without confirmed desktop provenance |

Existing ciphertext, source labels, ownership, quotas, counters, holds and history remain retained. Source labels are historical data, not enrollment evidence. Matching eligible legacy accounts need explicit confirmation; no backfill infers bindings from identity hints or files. Revoked/dead/quarantined and differently bound accounts cannot be revived or reassigned by enrollment.

Expired managed records remain available for manual same-desktop repair. Saved-file sync never independently renews a provider session, and there is no credential-write Data API fallback. Deliberate vault rewrap uses the trusted administrator writer role while preserving plaintext and provenance. Database owners can change schema/roles and remain outside this application's denial boundary.

The [database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) owns rollout, privilege inventory and rollback. Private function names and these columns must not appear in public DTOs or client bundles.

## Optional admission policy projection

`galx_shard_accounts.sliding_window_quota = {}` means no optional sliding window is configured. The repository projects only this empty object as absent; nonempty policies retain their configured limits and fail closed when malformed. Local candidate selection excludes expired credentials before scoring; durable lease admission still enforces permissions, expiry, quotas, concurrency and fencing. Do not repair projection bugs by altering production limits or restoring revoked entries.

Image receipt failures retain a minimal `failureCode` in their existing private JSON payload only for proven non-start. No schema migration or privilege change is needed; compatible older readers treat it as generic failure. Owner checks and atomic usage release remain in the same statement.

## Migrations, tests and evidence

Migration and rollback files are reviewed together. Additive schema may be retained during application rollback; populated records can make destructive rollback intentionally unavailable. Read current CLI help, verify the intended target/pending list, preserve vault configuration and apply only the reviewed set.

`db:status` is inventory; `db:verify` is static verification; `db:test` creates an isolated fixture. The legacy `db:migrate` apply path is disabled. Direct mutation scripts are not automatic release or diagnosis steps. Exact current commands and safeguards live in [the runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

Record source, migration application, deployment and actual-client results separately in [post-mortem](../post-mortem/README.md). Keep secrets, dumps, topology and operational diagnostics out of public documentation and browser artifacts.

## Account-session revocation (September 13 correction)

Canonical account verification combines Auth `getUser` with the authenticated, owner-bound active-session lookup. `auth.sessions` remains private; the callable invoker wrapper returns a boolean and accepts no IDs. Current-browser logout checks the revocation postcondition. Native session CRUD/rotation/revocation uses configured PostgreSQL, or the administrator Data API only when PostgreSQL is unconfigured, without failure fallback. See the complete [workspace auth procedure](operations/workspace-auth.md#active-session-rollout-and-recovery) for migration sequencing, isolated tests and rollback constraints. This is source policy, not a deploy receipt.
