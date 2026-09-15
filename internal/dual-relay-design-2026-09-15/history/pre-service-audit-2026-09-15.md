<!-- Historical pre-service audit. Superseded for current delivery by production-audit-2026-09-15.md. -->

# Production audit: central foundation and activation barriers

<!-- docs-scope: research-reference -->

Historical pre-implementation evidence, preserved in full. Statements about missing services, pending schemas and host prerequisites describe this checkpoint only. Use [current account management](../../../docs/reference/relay-account-management.md) and [current state](../../../post-mortem/CURRENT_STATE.md) for the implemented strategy.

September 15, 2026. This pass examined the actual account/enrollment/lease/repository/installer boundaries and applied the first dormant main-project migration. It did not change the prototype UI or deploy the complete runtime split. [Dated application evidence](../../../post-mortem/releases/2026-09-15-central-relay-foundation.json) records the exact scope.

## Outcome

Migration `20260915073601` is applied only to `mazhcjisettrzbqhorvp`. It adds four private tables with forced RLS and no application-role grants. Pool metadata requires paid accounts and text/Sites/images for Premium, and free accounts and text for Standard. This dormant schema does not verify an upstream account's subscription or enforce workload admission; those checks remain part of the pending registration and runtime interfaces. Existing account IDs, encrypted credentials, desktop bindings, quotas and leases remain in the original authority.

Production verification found 109 applied migrations, all 56 accounts retained, zero assignments, zero installations, zero saved pool registrations, zero enabled pools, four forced-RLS tables and zero exposed table/role pairs across anonymous, authenticated, service and desktop-writer roles. No account was classified automatically.

The activation gate is a database CHECK constraint plus a write guard. It cannot be opened through a normal SQL update or a feature flag. A later reviewed migration must accompany the scoped registrar/projection/lease deployment. Neither schema presence nor an installation reservation proves runtime readiness.

## Familiar operational patterns

- **Expand before switching traffic.** [Prisma's expand-and-contract guide](https://docs.prisma.io/docs/guides/database/data-migration) describes adding compatible schema before moving consumers. Here the first migration is additive and dormant; the current controller keeps its existing contract while the new path is built. No Prisma dependency was introduced.
- **Execution groups have a security boundary.** [GitHub runner groups](https://docs.github.com/en/actions/concepts/runners/runner-groups) organize and restrict access to runner sets. Here pool identity is constrained centrally and assignment relationships are exclusive; runtime authorization must still enforce those groups on each hop. A label or tab color cannot substitute for it.
- **Explicit privileges.** [Supabase's current role guidance](https://supabase.com/docs/guides/database/postgres/roles) recommends service-specific database access. The [new-table Data API change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) also reinforces deliberate grants. The migration explicitly revokes access and forces RLS instead of depending on project defaults.
- **Status describes the stage actually reached.** `npm run relay:accounts:status` reports `database-foundation` and `servingReadiness: not-verified`. Its dedicated, bounded database connection is validated against the main project; it cannot borrow an already-created process pool, fall back to the Data API or read a local registry. Output has an explicit field allowlist.

These are bounded adaptations from primary documentation, not equivalent product/security guarantees.

## Findings and disposition

| Severity | Finding and source | Impact | Disposition |
| --- | --- | --- | --- |
| P0 for activation | [Installer](../../../scripts/install-federation-service.ts) passes root `.env.local` into the controller | Copying it into both runtimes would distribute central database/vault authority | Keep split registration disabled. Replace with role-specific service configuration before launching either new pool. |
| P0 for activation | [ShardRepository](../../../src/lib/supabase/repositories/ShardRepository.ts) and [ShardProjectionReader](../../../src/lib/supabase/repositories/ShardProjectionReader.ts) expose broad registry access | Runtime filtering would not remove access to peer credentials | Restricted central projections and execution authorization remain required. No new runtime database login was provisioned. |
| P0 for activation | [Current lease function](../../../supabase/migrations/20260914231914_manual_desktop_shard_enrollment.sql) lacks pool/installation/workload binding | A new assignment table alone cannot prevent cross-pool admission or replay | Leave current leases unchanged and no new assignments active. Extend the single central ledger before activation; never add a second account-capacity ledger. |
| P1 | No production table represented exclusive pool assignment or durable pool-registration identity | Pool state existed only in design/prototype | Foundation added: account primary-key exclusivity, installation/pool composite FK, exact assignment/receipt relationship, immutable history and indexed ownership keys. |
| P1 | Generic inventory could report a database connection as serving readiness | Operators could activate too early | Added read-only stage-aware command with explicit disabled gates and required next steps. |
| P1 | Reusing a global PostgreSQL pool could ignore a later main-project URL validation | A process might query a previously configured database | New inventory uses a dedicated connection bound to the validated URL, with bounded connection/query timeouts and no fallback. |
| P2 | Integrity linter interpreted `BEFORE TRUNCATE ON` as destructive SQL | A protective trigger failed the mandatory checker | Corrected the narrow matcher; tests still reject real truncation, quoted targets and a destructive statement later on the same line. No exception or blanket trigger waiver. |
| Pending dependency | Separate execution hosts have not been selected in this session | No host/network isolation can be installed or demonstrated | Requested host names/SSH targets or a provisioning requirement. No additional hosting charge or remote installation was initiated. |

P0 entries are barriers to activating the proposed split, not claims of a new production incident. The existing deployed controller remains governed by its current runbook.

## Mechanical checks

- **58 new database checks:** role/read/write denial, closed activation, fixed capabilities, installation scope, wrong desktop, atomic assignment/receipt constraints, concurrent cross-pool claim, immutable history and retained rollback/reapply. A fixture-only DDL override exercises relationships behind the deliberately closed gate.
- **94 full database regression checks** and **28 manual desktop checks** passed in separate disposable PostgreSQL 17 fixtures. Owned containers were removed.
- **14 Node tests** passed for central-target validation, inventory allowlists, SQL safety detection, existing public-information boundaries and identity authorization.
- `npm run db:verify`: 109 migration/rollback pairs, zero fatal violations and zero warnings after the narrow detector correction.
- Production build and TypeScript validation passed. The build keeps its existing lint skip; targeted checks do not certify the whole repository lint state.
- Scanned 1,331 generated HTML/JavaScript files for seven new private schema/inventory/audit markers: zero matches. This is a built-artifact check, not live-site privacy certification.
- Live security advisors returned no new-table findings and one unrelated Auth warning: leaked-password protection disabled. This migration does not change Auth settings.
- Database SQL application and the read-only inventory were verified separately. No real provider registration, generation, monitor authorization, lease expiry/fencing or separate-host outage acceptance occurred.

## Required next slice

Implement central, pool-scoped administrator registration and runtime interfaces with existing manual sign-in validation and verified account eligibility for the target pool. Commit canonical enrollment, assignment and operation result together; derive pool from authenticated service context; reauthorize exact replays; preserve revoked identities. Bind the existing lease protocol to assignment/installation/workload/generation, then expose only the assigned execution material. Standard must deny Sites/images before selection, probes, aliases and provider access, including retry/recovery paths.

After those interfaces pass adversarial tests, deploy to two separately identified hosts with independent databases for execution state, local resource ownership, credentials, networks and monitor sessions. Prove both-direction peer denial and expiry behavior before an activation migration opens the central gate. Preserve accepted receipts and never use cross-pool failover, including text.

The foundation DOWN is a safe disable/retention rollback, not destructive schema reversal. It preserves identities and outcomes and refuses to undo a later activation implicitly. [The delivery plan](../delivery-plan.md) and [canonical central contract](../central-account-control.md) remain the detailed target.
