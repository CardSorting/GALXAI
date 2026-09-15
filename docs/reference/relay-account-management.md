# Central account management and isolated relay contract

<!-- docs-scope: current-guide -->

Private implementation reference for the installed Premium and Standard services. [Service operations](../runbooks/relay-pool-services.md) owns installation and activation. [Current state](../../post-mortem/CURRENT_STATE.md) owns dated acceptance. [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md) remains a proposed decision record; implemented code, applied migrations and local acceptance are recorded separately.

## Fixed destinations and authority

| Destination | Provider accounts | Workloads | Account authority | Execution authority |
| --- | --- | --- | --- | --- |
| Premium | Paid, verified during manual review | Text, Sites, images | `mazhcjisettrzbqhorvp` | `prgjcyokylzcsqrjmkaa` |
| Standard | Free, verified during manual review | Text only | `mazhcjisettrzbqhorvp` | `enbtzuxkguehtnrhuvlu` |

Both pools have the same intended text catalog, subject to the account's verified access. GALX customer billing tiers do not select or classify provider accounts. Standard rejects Sites/images and generic tool/image aliases before provider calls. No peer discovery, account borrowing, shared sessions or cross-pool retry exists, including for text.

Pool and installation scope derive from the authenticated central principal. A request body, UI filter or database session variable cannot grant another destination. An account has one retained assignment and one owning desktop; moving it across pools is unsupported. Existing unassigned accounts remain separate and cannot be silently promoted.

## Installed local boundaries

The central service and TLS proxy run on Docker Desktop. Each pool has a dedicated Colima Linux VM with its own daemon, disks, runtime container, monitor container, state and keys. Persistent guest firewall rules deny the peer directly and through Mac-forwarded services. The Mac and its administrator remain a common trusted boundary.

Only central receives the main database login and vault settings. A runtime receives its own restricted execution database login and narrow central runtime principal. It hosts assigned account engines in-process; it has no Docker socket. Each monitor receives its own operator/viewer/registrar principals and its own daemon socket for desktops. Neither VM receives the other's configuration, browser profiles or credentials. A monitor's daemon access is powerful within its own VM.

The fixed monitor ports are 13311 and 13312 on loopback; runtime ports are 13301 and 13302. The local central origin uses verified HTTPS on 13443. **GALX Monitors**, **GALX Premium** and **GALX Standard** issue one-use scoped sign-in links. The signed-out app link contains no credential. Startup preserves the central ownership handoff interval; local listeners alone do not prove execution readiness.

## Durable schema

The main migration set contains the manual desktop policy, central foundation `20260915073601`, central authorization `20260915081527`, legacy assignment guard `20260915163434` and management `20260915191404`. Each execution project contains only its fixed execution migration `20260915082628`. Never apply the application's migration directory to either execution project.

| Main-project relation | Purpose |
| --- | --- |
| `public.galx_shard_accounts` | Canonical encrypted account identity, credential revision, expiry and existing policy metadata |
| `private.galx_relay_pools` / `galx_relay_installations` | Fixed account class/workloads and immutable installation scope |
| `private.galx_relay_account_assignments` | Exclusive account, pool, installation and desktop relationship |
| `private.galx_relay_registration_operations` | Retained enrollment/assignment result |
| `private.galx_relay_principals` / `galx_relay_installation_runtime` | Hashed scoped principals, gates, ownership epoch and heartbeat |
| `private.galx_relay_registrations` | Prepared/reviewed/registered workflow, tickets, monotonic revision and removal marker |
| `private.galx_relay_account_control` | Desired/acknowledged account state, credential/model metadata and removal marker |
| `private.galx_relay_control_operations` | Immutable account command results |
| `private.galx_relay_management_operations` | Immutable unfinished-registration rename/remove/restore results |
| `private.galx_relay_lease_bindings` | Destination/workload/epoch binding to the existing account lease ledger |

Private relations use forced RLS and explicit privilege denial. Application, ordinary authenticated, service, desktop-writer and control roles cannot directly read/write the management journal. Narrow SQL functions check service principal and scope. Database owners remain trusted; this does not contain a malicious owner.

## Manual registration and renewal

1. Open the correct fixed monitor with operator access; choose **Register account** or **Add account**.
2. Name the registration and create its sign-in desktop. Preparation saves central operation identity before local desktop creation. Same-intent retry reuses the original IDs.
3. Start sign-in and complete the provider flow manually inside that desktop. A saved login is not yet central enrollment.
4. **Review access** validates the saved credential, identity, expiry, model inventory and paid/free classification through the central registrar. Review tickets expire after two minutes; reviewed evidence expires after five minutes.
5. **Register account** commits canonical enrollment, exclusive assignment and result centrally, in paused state. Enable is a separate action after execution activation.
6. For renewal, open the account's matching registration, manually sign in in the same desktop, then use **Update saved sign-in → Save new sign-in**. There is no background provider-session renewal or automatic pool credential-save loop.

The monitor resolves desktops from scoped saved registrations. Browser account-management requests do not carry provider tokens. The registrar alone handles the bounded saved-file candidate. External account ingestion, host discovery and direct broad writers remain closed. Assigned accounts cannot be changed through legacy enrollment or lease paths.

## Account and registration management

The **Manage** menu appears in the same place on accounts and registrations. Operators can rename or remove; viewers can inspect/filter only. Names are trimmed, limited to 1–64 characters and reject control characters. Display names never change identity, assignment or storage paths; duplicate display names are not account identity.

| Command | Central result | Desktop/result recovery |
| --- | --- | --- |
| Rename account | Update account label and linked registration name together | Preserve sign-in and retained history |
| Rename unfinished registration | Update its label and revision | Existing desktop identity remains the same |
| Pause/Enable | Save desired state and a new account revision | Owning runtime applies it separately; Enable is not a claim of ready capacity |
| Remove account | Revoke access permanently, mark linked registrations removed, invalidate tickets/review | Disconnect desktop sessions, then attempt stop; no restore or re-enable |
| Remove unfinished registration | Mark removed and clear pending tickets/review | Hide from active results; preserve files/history and attempt stop |
| Restore unfinished registration | Clear removed marker while registration gate is open | Requires new review; no old ticket or review is restored |

Removal retains assignments, credentials, leases and operational records; it is not data erasure. It does not remotely invalidate a provider session. Central commit precedes local cleanup, so stop failure returns a saved removal with incomplete cleanup. Filter Registration by **Removed** and choose **Stop desktop**. Removed records reject new sign-in, review, register, refresh and start actions. Old direct desktop controls and new display connections also check removal; Stop remains allowed.

Management requests carry an expected revision and immutable operation ID. Stored results bind actor, pool, installation, target and request fingerprint. Exact replay is reauthorized and returns the original result. A changed body or scope cannot reuse the ID. Registration revisions advance on every update, including review/ticket changes; account and registrar mutations use consistent locking order. Stale revisions return `record_changed` rather than overwriting newer state.

Dialogs name the affected record and consequence. Removal initially focuses Cancel. Rename keeps the draft on error. Close and refresh after a conflict before reviewing and explicitly retrying. Browser session storage retains non-secret exact intent when available. No uncertain mutation or generation retries automatically.

## Health, filters and confirmation

Accounts combine name search, Status and Health filters with **Issues first** or **Name A–Z** sorting. A summary links to attention items. Default lists/counts exclude removed records; Removed is a separate status. Registration has its own search and active, attention, in-progress, ready, registered, unknown and removed filters. Filtering only uses the already-authorized own-pool snapshot.

| Condition | Presentation |
| --- | --- |
| Expired or unconfirmed sign-in expiry | Sign-in required; repair the owning registration |
| Central access unavailable | Access unavailable; inspect saved sign-in |
| Reported cooldown or future cooldown deadline | Cooling down; respect the recorded limit |
| At least three consecutive reported failures | Repeated failures; review before enabling |
| Allowed execution, unmatched revision, at least 90 seconds since save | Update not confirmed; inspect the owning runtime |
| Monitor disconnected or relay confirmation unavailable | Status unavailable/Awaiting relay; unknown health, not an account failure |
| Current metadata with no detected issue | No issues detected; not proof of a successful provider request |
| Removed registration with a still-running desktop | Desktop still running; stop to finish cleanup |

Health uses an icon, label and explanation. Saved state is distinct from relay confirmation. Applied requires a non-future heartbeat younger than 45 seconds and matching revision/epoch. A registered account inherits account health even when its desktop is stopped; unfinished registration needs a usable desktop to proceed. Polling is every ten seconds while visible and preserves filters, disclosures and useful focus. Refresh failure retains a labeled snapshot and disables mutations.

## Execution and recovery

The runtime claims its installation epoch, recovers old execution records and reconciles scoped accounts. Central owner handoff requires the prior heartbeat to be over 60 seconds old; no startup override weakens that check. The runtime selects among its own matching engines and persists identity before acquiring/binding the central account lease.

Grants last 30 seconds and renew every eight seconds, with independent expiry and a ten-minute central maximum. Central outage denies new grants and renewal. Account changes invalidate old authorization. Pause in this implementation stops old engines/renewal; it is not the legacy hold that preserves a worker and lets all accepted work drain normally.

Terminal writes and original lease settlement can retry. Unconfirmed terminal writes block new local admission. Restart marks incomplete work unknown without redispatch. A crash between acquire and local bind may leave a lease to expire; it cannot authorize another provider attempt. Retained records do not guarantee artifact/receipt retrieval after account removal or epoch replacement. No cross-host job migration exists.

## Public and legacy boundaries

The isolated application adapter chooses one deployment pool and skips legacy account decryption/selection and the second account lease. Product usage, ownership and entitlement remain independent. Existing receipts retain their original configured origin and key for retrieval only. Keeping a legacy receipt reader does not permit legacy dispatch fallback.

The retained single-controller federation still has its own per-shard Docker workers, guardian, maintenance holds, weighted capability selection and signed receipt rules. Its [operations](../maintainers/legacy-federation-operations.md) and [API](legacy-federation-api.md) are scoped to that deployment. These contracts must not be applied to the new pool runtime.

Operational snapshots, topology, provider access details and audit records remain behind server administrator authorization. Public JSON uses explicit nested allowlists; images default to sanitized binary, with allowlisted explicit JSON compatibility. No upstream headers or internal object graph may pass through wholesale.

## Verification and rollback

The [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) records applied central schema, final local image IDs, database/authorization tests, 28 browser variants, 69 live checks and installed monitor acceptance. At that observation both pools had zero accounts, registration open and execution closed. Manual sign-ins, provider qualification and public application cutover remain outstanding. Do not turn an old count into a live health claim.

Use the [database procedure](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) and [local service procedure](../runbooks/relay-pool-services.md). Close gates before rollback, preserve assignments, removed markers, journals, homes and original operations. The management DOWN closes protocol access and retains schema/history; it does not undo revocation or revive accounts. Image rollback alone cannot roll back central state.
