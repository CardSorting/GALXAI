# Supabase authority and operational boundaries

<!-- docs-scope: domain-reference -->

Private component reference, reconciled September 15, 2026. Use [the database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) for current procedures and the actual migrations for object-specific privileges. This reference does not substitute generic policies for reviewed schema.

## Identity and authorization

Application identity is verified server-side. Public Auth credentials can verify a bearer token without constructing an administrator client; a publishable key never grants admin authority. Temporary verification failure must remain distinct from a rejected credential. User IDs and editable metadata are not proof of authorization.

Developer approval, staff membership and resource ownership remain independent current checks. BroccoliDB snapshots and batching optimize payloads, not grants. An unavailable authoritative read cannot become cached permission or a fabricated successful write.

## Database ownership

Use explicit privileges and owner/tenant predicates with RLS appropriate to each table's exposure. Private receipts and staff/preview records are not browser-queryable storage. Do not infer direct access from ordinary authentication or a server role name. Definer functions need an actual justified privilege boundary, fixed trusted search paths, restricted callers and adversarial tests.

Financial, audit and accepted-operation state must commit atomically at their defined boundary. Image receipts commit before async acknowledgement, claims arbitrate dispatch, and success requires owned committed assets. Favorites commit before acknowledgement. Keep record identity across uncertainty rather than manufacturing success from local memory. Native session creation, lookup, rotation and revocation and device-grant approval/polling require authoritative results. No cache may restore a denied/revoked session or acknowledge a failed write. Native account provenance and previous-token grace are enforced in the authentication engine; [workspace auth](operations/workspace-auth.md) owns the source contract and rollout limitations.

## Central relay account and execution authority

The implemented authority is [central account management](reference/relay-account-management.md). Only `mazhcjisettrzbqhorvp` owns canonical encrypted accounts, manual desktop provenance, exclusive immutable assignments, registration/review state, account revisions, lifecycle operations, runtime principals/epochs and bindings to the existing account lease/budget ledger. The central private tables force RLS and have no customer/service-role table grants. A restricted login executes the private protocol; hashed principal lookup determines role, pool and installation. Request JSON cannot broaden that scope.

Premium `prgjcyokylzcsqrjmkaa` and Standard `enbtzuxkguehtnrhuvlu` each hold only fixed installation identity and execution reservations/outcomes. Restricted runtime logins cannot manage accounts, read credential tables or obtain the main vault key. Runtime projections carry only own-account access under central authorization. No registry, credential copy or second capacity ledger is deployed there.

Management migration `20260915191404` is applied only centrally. Rename/remove/restore require expected revision and immutable operation identity tied to actor, pool, installation, record and request hash. Every registration mutation advances revision, including review/ticket updates. Concurrent changes cannot overwrite newer state. Registered-account rename synchronizes the linked registration. Account removal retains canonical identity, assignment, ciphertext, leases and immutable operation history, revokes access and cannot be undone through restore. Unfinished registration removal permits restoration only with fresh review.

Connection lifecycle `20260916013944` separates rejected credentials from desired enabled/paused/revoked state. Scoped, revision-fenced rejection reports withhold access until verified same-account reconnect. Owner-only legacy retirement erases unused unbound credential material, preserves operational IDs and adds immutable tombstones excluded from identity matching. Neither retirement nor reconnect can restore a removed account. See the complete [lifecycle contract](reference/relay-account-management.md#manual-registration-and-renewal).

Central removal commits before monitor desktop cleanup; a failed stop is reported separately. These transactions cannot promise upstream session revocation or file erasure. Management rollback closes gates/protocol while retaining columns/history; it does not restore removed accounts. See [database operations](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md#central-relay-authorization-and-execution-projects) for exact schema, roles, migration pairing and evidence.

## Manual desktop provenance and retained writers

Base migration `20260914231914` pairs `managed_desktop_id uuid` with `desktop_enrolled_at timestamptz`, uniquely binds non-null desktops and protects credential/identity/provenance fields with a private no-login writer role. Generic upsert/service inserts are disabled; ordinary repository saves allow only policy metadata. Source labels and existing ciphertext do not establish provenance.

New pool registration is explicit manual sign-in followed by an atomic Connect action that verifies and registers in paused state. Renewal is explicit **Reconnect → Save new sign-in** in the owning monitor; no background bridge establishes authority. Legacy **Enroll shard** and conditional saved-file synchronization remain only for eligible unassigned accounts in [legacy enrollment](maintainers/legacy-desktop-enrollment.md). Legacy readers, credential writers and acquire/renew/release functions reject assigned accounts or bound leases. No account is automatically classified, copied or reassigned.

Revoked/dead/conflicting records cannot be revived by enrollment. Deliberate [vault rewrap](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) preserves plaintext, identity and binding under reviewed administrator authority. Database owners can change schema and remain trusted; application-role denial is not protection from the owner.

## Installation and acceptance

The schemas and local central/Premium/Standard services are installed and tested. Separate Colima VMs provide separate daemons, disks and peer-denial rules; the Mac/admin remains shared infrastructure. Use [current state](../post-mortem/CURRENT_STATE.md) for current account counts and gate evidence. Registration, execution activation, actual provider generation and public application cutover are distinct acceptance steps. [ADR 0153](adr/0153-central-account-authority-isolated-relays.md) retains its own decision status rather than deriving acceptance from schema installation.

## Optional admission policy projection

`galx_shard_accounts.sliding_window_quota = {}` means no optional sliding window is configured. The repository projects only this empty object as absent; nonempty policies retain their configured limits and fail closed when malformed. Local candidate selection excludes expired credentials before scoring; durable lease admission still enforces permissions, expiry, quotas, concurrency and fencing. Do not repair projection bugs by altering production limits or restoring revoked entries.

Image receipt failures retain a minimal `failureCode` in their existing private JSON payload only for proven non-start. No schema migration or privilege change is needed; compatible older readers treat it as generic failure. Owner checks and atomic usage release remain in the same statement.

## Migrations, tests and evidence

Migration and rollback files are reviewed together. Additive schema may be retained during application rollback; populated records can make destructive rollback intentionally unavailable. Read current CLI help, verify the intended target/pending list, preserve vault configuration and apply only the reviewed set.

`db:status` is inventory; `db:verify` is static verification; `db:test` creates an isolated fixture. The legacy `db:migrate` apply path is disabled. Direct mutation scripts are not automatic release or diagnosis steps. Exact current commands and safeguards live in [the runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md).

Record source, migration application, deployment and actual-client results separately in [post-mortem](../post-mortem/README.md). Keep secrets, dumps, topology and operational diagnostics out of public documentation and browser artifacts.

## Account-session revocation (September 13 correction)

Canonical account verification combines Auth `getUser` with the authenticated, owner-bound active-session lookup. `auth.sessions` remains private; the callable invoker wrapper returns a boolean and accepts no IDs. Current-browser logout checks the revocation postcondition. Native session CRUD/rotation/revocation uses configured PostgreSQL, or the administrator Data API only when PostgreSQL is unconfigured, without failure fallback. See the complete [workspace auth procedure](operations/workspace-auth.md#active-session-rollout-and-recovery) for migration sequencing, isolated tests and rollback constraints. This is source policy, not a deploy receipt.
