# Central account management and isolated relay contract

<!-- docs-scope: current-guide -->

Private implementation reference for the installed Premium service. [Service operations](../runbooks/relay-pool-services.md) owns installation and activation. [Current state](../../post-mortem/CURRENT_STATE.md) owns dated acceptance. [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md) remains a proposed decision record; implemented code, applied migrations and local acceptance are recorded separately.

## Fixed destinations and authority

| Destination | Provider accounts | Workloads | Account authority | Execution authority |
| --- | --- | --- | --- | --- |
| Premium | Paid, verified during manual review | Text, Sites, images | `mazhcjisettrzbqhorvp` | `prgjcyokylzcsqrjmkaa` |

GALX customer billing tiers do not select or classify provider accounts. Premium accepts client-owned function calling as text inference and handles text, Sites and images after central admission. No account borrowing, shared sessions or legacy dispatch fallback exists.

Pool and installation scope derive from the authenticated central principal. A request body, UI filter or database session variable cannot grant another destination. An account has one retained assignment and one owning desktop; moving it across pools is unsupported. Existing unassigned accounts remain separate and cannot be silently promoted.

## Installed local boundaries

The central service and TLS proxy run on Docker Desktop. Premium has a dedicated Colima Linux VM with its own daemon, disks, runtime container, monitor container, state and keys. The Mac and its administrator remain a common trusted boundary.

Only central receives the main database login and vault settings. A runtime receives its own restricted execution database login and narrow central runtime principal. It hosts assigned account engines in-process; it has no Docker socket. Each monitor receives its own operator/viewer/registrar principals and its own daemon socket for desktops. Neither VM receives the other's configuration, browser profiles or credentials. A monitor's daemon access is powerful within its own VM.

The fixed Premium monitor uses port 13311 on loopback and the runtime uses port 13301. The local central origin uses verified HTTPS on 13443. **GALX Monitors** and **GALX Premium** issue one-use scoped sign-in links. The signed-out app link contains no credential. Startup preserves the central ownership handoff interval; local listeners alone do not prove execution readiness.

## Durable schema

The main migration set contains the manual desktop policy, central foundation `20260915073601`, central authorization `20260915081527`, legacy assignment guard `20260915163434`, management `20260915191404`, connection lifecycle `20260916013944`, automatic activation `20260916040459` and reuse-safe registry revisions `20260919090000`. Each execution project contains only its fixed execution migration `20260915082628`. Never apply the application's migration directory to either execution project.

| Main-project relation | Purpose |
| --- | --- |
| `public.galx_shard_accounts` | Canonical encrypted account identity, credential revision, expiry, irreversible legacy retirement marker and existing policy metadata |
| `private.galx_relay_pools` / `galx_relay_installations` | Fixed account class/workloads and immutable installation scope |
| `private.galx_relay_account_assignments` | Exclusive account, pool, installation and desktop relationship |
| `private.galx_relay_registration_operations` | Retained enrollment/assignment result |
| `private.galx_relay_principals` / `galx_relay_installation_runtime` | Hashed scoped principals, gates, persistent automatic-activation policy, ownership epoch and heartbeat |
| `private.galx_relay_registrations` | Prepared/reviewed/registered workflow, tickets, monotonic revision and removal marker |
| `private.galx_relay_account_control` | Desired/acknowledged account state, credential/model metadata, connection state, rejected credential revision, verification time and removal marker |
| `private.galx_relay_control_operations` | Immutable account command results |
| `private.galx_relay_management_operations` | Immutable unfinished-registration rename/remove/restore results |
| `private.galx_relay_lease_bindings` | Destination/workload/epoch binding to the existing account lease ledger |

Private relations use forced RLS and explicit privilege denial. Application, ordinary authenticated, service, desktop-writer and control roles cannot directly read/write the management journal. Narrow SQL functions check service principal and scope. Database owners remain trusted; this does not contain a malicious owner.

## Manual registration and renewal

1. Open the correct fixed monitor with operator access and choose **Connect account**.
2. Name the connection and create its sign-in desktop. Preparation saves central operation identity before local desktop creation. Same-intent retry reuses the original IDs.
3. Complete provider sign-in manually inside that desktop.
4. Choose **Connect account**. The central registrar verifies identity, expiry, model access and paid/free class, then commits review, enrollment and exclusive assignment in one transaction. Under a verified automatic-activation policy, new accounts start enabled and record an immutable enable operation in that same transaction. Manual installation holds leave new accounts paused. The existing review/register endpoints remain compatible, but the monitor does not require their separate clicks.
5. Wait for **Applied**; activation proceeds automatically when the owning relay is ready. Existing intentionally paused accounts still require an explicit Enable. A saved sign-in and verified model list do not prove successful generation.
6. For an existing account, use **Reconnect** or **Connection settings**, sign in to the same account in its original desktop, then choose **Reconnect account**. Identity, assignment, settings and history remain in place. There is no background provider-token renewal or automatic file-save loop.

Connect uses a two-minute purpose-bound ticket. A failure rolls back the review as well as enrollment. After an uncertain response, Refresh reads the original operation; a committed connection clears its stale error. An explicit Connect retry returns the registered operation without rereading credentials or creating another account. The browser never retries a mutation automatically.

The monitor uses a bounded single-flight/reconciliation pattern for availability. Safe central status and operation reads retry transient control-service failures with short exponential backoff and jitter, spend from a shared retry budget and trip a short circuit breaker after repeated failures; one half-open probe tests recovery while the rest fail fast. Credential writes remain single-shot. Concurrent Connect requests for one registration share one in-flight operation, while different actions on that registration are rejected until the first action is observable. Saved credential reads go through the desktop manager's bounded I/O bulkhead, coalesce duplicate reads, and do not overlap a background sign-in check on the same desktop; independent desktops remain parallel. The browser coalesces status refreshes, uses jittered visible-only polling instead of synchronized intervals, pauses while hidden or offline, reconnects with a capped backoff, preserves the last confirmed snapshot, and disables mutations until a fresh status is available. If a response is lost, a session-scoped intent records only the operation identity and the monitor checks the persisted registration result after reload; it never resends the credential mutation. The browser contract is an explicit allowlist: internal control identity, credential material, container identity and implementation-only revisions are not returned to the page. Recovery guidance stays beside the affected connection with plain-language next steps and a direct path back to Connections. Transient 429/503 responses advertise a short retry hint, while provider or database errors remain bounded and allowlisted.

The monitor resolves desktops from scoped saved registrations. Browser account-management requests do not carry provider tokens. The registrar alone handles the bounded saved-file candidate. External account ingestion, host discovery and direct broad writers remain closed. Assigned accounts cannot be changed through legacy enrollment or lease paths. The scoped protocol calls its restricted base writer after authentication; legacy entry points continue rejecting assigned accounts.

### Automatic activation and holds

The installer verifies host isolation and identity, then calls owner-only `private.relay_configure_automatic_activation` with the evidence hash. This arms `automatic_activation` without promoting existing paused accounts. It requires no account outside Premium. Runtime/registrar/browser principals cannot arm the policy or call its internal reconciler directly.

New Connect and compatible first Register commits enable exactly once. Repeated Register, registered Connect replay and Reconnect preserve current intent. The registration commit and own-runtime claim/heartbeat reconcile a closed gate only when policy and registration are enabled, isolation evidence exists, the ownership heartbeat is non-future and younger than 45 seconds, and an assigned enabled account has verified current credentials (over 30 seconds remaining), matching class/models and no rejection, removal, retirement or revocation. No provider generation probe or credential refresh is automatic.

Installation and runtime row locks order reconciliation against owner closure. Every ordinary owner gate configuration disarms the policy; `close` and registration-only holds survive refreshes, retries and restarts. Only deliberate verified reconfiguration can rearm. Account Pause remains explicit and persists through reconnect/reconfiguration; automatic heartbeat recovery never enables a paused account. Once execution is allowed, existing per-account eligibility, cooldown, lease and quota checks remain authoritative. Activation is not a claim that capacity or provider access stays continuously available.

The monitor receives only an `automaticActivation` boolean alongside its existing private DTO. It distinguishes waiting for an account, reconnect required, intentional pauses, waiting for the relay and activation in progress. Its connection form explains that a successful new connection enables automatically; no browser-supplied activation flag is accepted.

### Credential rejection and reconnect

Connection state (`connected` or `sign_in_required`) is independent of desired state (`enabled`, `paused`, `revoked`) and removal. On observed credential rejection, the runtime immediately excludes its engine from readiness and dispatch, then reports the exact credential/control revision and its current epoch. Central checks pool, assignment and fresh ownership, ignores stale reports, records the rejected revision and advances control revision. It withholds the envelope and denies new/renewed grants. Generic outages and quota responses do not mark credentials rejected.

A new manually saved credential must validate and match the original account/desktop. Refresh cannot clear rejection using the same rejected token; even the unchanged-token path goes through the locked database check. A successful replacement clears connection rejection and advances revision without changing desired state. An enabled account can therefore resume after successful reconnect; a paused account stays paused. Explicit revocation/removal remains terminal. Expiry is also shown as Reconnect required even without a rejection report. Last verified is evidence of the latest successful access check, not continuous provider readiness.

### Retire obsolete legacy credentials

Retirement is a deliberate owner-authorized cleanup, not part of ordinary reconnect or a browser action. `private.retire_legacy_credentials(text[])` accepts an explicit, distinct, bounded ID set; locks records; and rejects the entire set if any record is missing, non-OpenAI, desktop-bound, assigned, in flight or holds an active lease. Only the database owner can call it. The no-login writer helper erases ciphertext, IV and tag, sets expiry to zero, retracts permission and stamps `credential_retired_at`. Operational IDs, counters, leases and journals remain. A trigger prevents restoring retired identity, credential or binding fields. Database backups and external provider sessions are outside this database cleanup.

Retired tombstones are excluded before the registrar decrypts or matches identities. New canonical connection IDs use a stable central-connection namespace, so fresh verified enrollment does not collide with a retired legacy ID. A still-live or explicitly removed bound account remains a conflict; retirement cannot be used to bypass that authority. The migration creates the capability but does not choose or retire records automatically. Reconcile exact scope and active leases before applying; retain only aggregate evidence, never secret backups in incident records. Purged credentials have no rollback: recovery requires manual sign-in.

Errors use fixed allowlisted messages. Missing/expired/rejected sign-ins direct the operator to sign in; temporary inventory failures retain the saved login. A remaining `credential_account_ambiguous` requires administrator inspection of active identity/binding records. Never choose an arbitrary match, revive a removed account or open execution to suppress the conflict. Unknown failures stay generic and cannot expose provider response text or credentials.

## Account and registration management

The **Manage** menu appears in the same place on accounts and registrations. Operators can rename or remove; viewers can inspect/filter only. Names are trimmed, limited to 1–64 characters and reject control characters. Display names never change identity, assignment or storage paths; duplicate display names are not account identity.

| Command | Central result | Desktop/result recovery |
| --- | --- | --- |
| Rename account | Update account label and linked registration name together | Preserve sign-in and retained history |
| Rename unfinished registration | Update its label and revision | Existing desktop identity remains the same |
| Pause/Enable | Save desired state and a new account revision | Owning runtime applies it separately; Enable is not a claim of ready capacity |
| Remove account | Revoke access permanently, mark linked registrations removed, invalidate tickets/review | Disconnect desktop sessions, then attempt stop; no restore or re-enable |
| Remove unfinished registration | Mark removed and clear pending tickets/review | Hide from active results; preserve files/history and attempt stop |
| Restore unfinished registration | Clear removed marker while registration gate is open | Requires a fresh connection check; no old ticket or review is restored |

Removal retains assignments, credentials, leases and operational records; it is not data erasure. It does not remotely invalidate a provider session. Central commit precedes local cleanup, so stop failure returns a saved removal with incomplete cleanup. Filter Connections by **Removed** and choose **Stop desktop**. Removed records reject new sign-in, review, register, refresh and start actions. Old direct desktop controls and new display connections also check removal; Stop remains allowed.

Management requests carry an expected revision and immutable operation ID. Stored results bind actor, pool, installation, target and request fingerprint. Exact replay is reauthorized and returns the original result. A changed body or scope cannot reuse the ID. Registration revisions advance on every update, including review/ticket changes; account and registrar mutations use consistent locking order. Registry resource revisions also continue after retained append-only history when a deterministic account ID is enrolled again. Stale revisions return `record_changed` rather than overwriting newer state.

Dialogs name the affected record and consequence. Removal initially focuses Cancel. Rename keeps the draft on error. Close and refresh after a conflict before reviewing and explicitly retrying. Browser session storage retains non-secret exact intent when available. No uncertain mutation or generation retries automatically.

## Health, filters and confirmation

Accounts combine name search, Status and Health filters with **Issues first** or **Name A–Z** sorting. A summary links to attention items. Default lists/counts exclude removed records; Removed is a separate status. Connections has its own search and active, attention, in-progress, ready, registered, unknown and removed filters. Filtering only uses the already-authorized own-pool snapshot.

| Condition | Presentation |
| --- | --- |
| Expired, unconfirmed or explicitly rejected sign-in | Reconnect required; repair the existing connection |
| Central access unavailable | Access unavailable; inspect saved sign-in |
| Reported cooldown or future cooldown deadline | Cooling down; respect the recorded limit |
| At least three consecutive reported failures | Repeated failures; review before enabling |
| Allowed execution, unmatched revision, at least 90 seconds since save | Update not confirmed; inspect the owning runtime |
| Monitor disconnected or relay confirmation unavailable | Status unavailable/Awaiting relay; unknown health, not an account failure |
| Current metadata with no detected issue | No issues detected; not proof of a successful provider request |
| Removed registration with a still-running desktop | Desktop still running; stop to finish cleanup |

Health uses an icon, label and explanation. Saved state is distinct from relay confirmation. Applied requires a non-future heartbeat younger than 45 seconds and matching revision/epoch. Connections needing attention stay expanded in the main list; healthy completed connections collapse under Connected accounts. Errors appear once beside the affected action. A registered account inherits account health even when its desktop is stopped; unfinished registration needs a usable desktop to proceed. Polling is every ten seconds while visible and preserves filters, disclosures and useful focus. Refresh failure retains a labeled snapshot and disables mutations.

## Execution and recovery

The runtime claims its installation epoch, recovers old execution records and reconciles scoped accounts. Central owner handoff requires the prior heartbeat to be over 60 seconds old; no startup override weakens that check. The runtime selects among its own matching engines and persists identity before acquiring/binding the central account lease.

Premium uses health-aware account rotation across models, with up to four ongoing jobs per healthy account, immediate provider-cooldown exclusion and bounded backoff after explicit central admission denial. Reconciliation refreshes cooldown/model observations even without a control revision change. These local admission restrictions do not introduce another account budget or change management authority. The monitor's central health snapshot is not live local scheduling telemetry; a busy response alone does not identify a broken registration.

Grants last 30 seconds and renew every eight seconds, with independent expiry and a ten-minute central maximum. Central outage denies new grants and renewal. Account changes invalidate old authorization. Pause in this implementation stops old engines/renewal; it is not the legacy hold that preserves a worker and lets all accepted work drain normally.

Terminal writes and original lease settlement can retry. Unconfirmed terminal writes block new local admission. Restart marks incomplete work unknown without redispatch. A crash between acquire and local bind may leave a lease to expire; it cannot authorize another provider attempt. Retained records do not guarantee artifact/receipt retrieval after account removal or epoch replacement. No cross-host job migration exists.

## Public and legacy boundaries

The isolated application adapter chooses one deployment pool and skips legacy account decryption/selection and the second account lease. Product usage, ownership and entitlement remain independent. Existing receipts retain their original configured origin and key for retrieval only. Keeping a legacy receipt reader does not permit legacy dispatch fallback.

The retained single-controller federation still has its own per-shard Docker workers, guardian, maintenance holds, weighted capability selection and signed receipt rules. Its [operations](../maintainers/legacy-federation-operations.md) and [API](legacy-federation-api.md) are scoped to that deployment. These contracts must not be applied to the new pool runtime.

Operational snapshots, topology, provider access details and audit records remain behind server administrator authorization. Public JSON uses explicit nested allowlists; images default to sanitized binary, with allowlisted explicit JSON compatibility. No upstream headers or internal object graph may pass through wholesale.

## Verification and rollback

The [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) records applied central schema, final local image IDs, database/authorization tests, 28 browser variants, 69 live checks and installed monitor acceptance. The later [connection acceptance](../../post-mortem/incidents/2026/2026-09-16-relay-registration/connection-lifecycle.json) records retirement of 56 unused legacy credentials and one manually verified Premium connection, paused and acknowledged. The later [automatic activation release](../../post-mortem/releases/2026-09-16-relay-automatic-activation.json) records the installed Premium policy. Generation qualification and public application cutover remain separate. Do not turn an old count into a live health claim.

Use the [database procedure](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) and [local service procedure](../runbooks/relay-pool-services.md). Close gates before rollback, preserve assignments, removed markers, journals, homes and original operations. The automatic-activation DOWN disarms automation and closes both gates/protocol while retaining policy and history. The lifecycle DOWN closes both gates and protocol access while retaining retired tombstones and rejection evidence. The management DOWN similarly retains schema/history; it does not undo revocation or revive accounts. Image rollback alone cannot roll back central state.
