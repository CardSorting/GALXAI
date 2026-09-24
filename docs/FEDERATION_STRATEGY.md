# Relay execution and account authority contract

<!-- docs-scope: current-guide -->

Private current strategy. The implemented central/Premium service is defined by [the account contract](reference/relay-account-management.md), [architecture](ARCHITECTURE.md) and [service procedure](runbooks/relay-pool-services.md). [Current state](../post-mortem/CURRENT_STATE.md) distinguishes local installation from serving activation and the retained legacy deployment.

## Ownership and capability are separate

Canonical accounts, encrypted credentials, manual registration, exclusive assignments, lifecycle commands and account leases/budgets live only in `mazhcjisettrzbqhorvp`. Premium uses verified paid provider accounts and can handle text/Sites/images subject to observed capability. GALX customer billing is independent.

Premium has a dedicated local VM, Docker daemon, runtime/monitor containers, execution project, profile, keys and state. The runtime hosts assigned account engines in-process and has no daemon socket or central database/vault authority. Its monitor has only its own daemon authority for manual desktops. Persistent host policy protects the boundary; a network on a shared daemon is insufficient.

No account enters Premium through host discovery. The central registrar validates the manual saved login and commits registration/assignment atomically. Legacy enrollment, refresh and lease wrappers reject assigned accounts.

## Eligibility before load

In full isolated mode, the application chooses Premium before dispatch for text, Sites and images. An independent Premium image switch remains available for image availability/generation. The path skips legacy account selection and never falls back to another deployment. The runtime verifies its execution gate and fresh scoped projection, then rotates across matching healthy engines. This service does not use the legacy load-weighted reverse index.

The engine reserves durable execution identity, acquires the existing central lease and binds it before provider I/O. Assignment, installation epoch, revision, credential, workload, permission, expiry and budget checks are central. There is no legacy, alternate-model or uncertain-execution fallback.

## Dynamic evidence and lifecycle

| State/change | New pool behavior |
| --- | --- |
| Named registration with saved login | Requires explicit Review access and Register account; not serving capacity |
| Registered account | Saved paused; explicit Enable after execution activation |
| Enabled, current assigned account | Own runtime can start an in-process engine and acknowledge its revision |
| Pause, revocation, removal or revision change | Stop old engine/authorization; do not assume legacy hold/drain semantics |
| Expired sign-in | Repair manually in the bound desktop, then explicitly save reviewed sign-in |
| Unknown or stale connection | No healthy claim or new authorization from cached data |
| Removed unfinished registration | Retained history/files; Restore requires registration gate and new review |
| Removed registered account | Access revoked permanently; no restore or re-enable |

Rename updates account and linked registration labels without changing identity. Management requires an own-pool operator, expected revision and immutable request identity. Exact explicit replay returns its original saved outcome; concurrent edits cannot overwrite a newer revision. Removal commits centrally, disconnects desktop sessions and attempts stop; incomplete cleanup stays actionable under Removed.

## Health authority and stale results

The monitor separates saved state, relay confirmation and health. Applied needs matching revision/epoch and a fresh non-future heartbeat. Health labels distinguish expiry, access denial, cooldown, repeated failures and overdue application from unknown connectivity. A registered account's stopped desktop is not a failure. No issues detected describes observed metadata, not a provider canary.

Runtime grants last 30 seconds and renew every eight seconds with independent expiry. Central ownership uses epoch fencing and a greater-than-60-second stale-owner handoff. These are different from the UI's 45-second confirmation freshness. Observation-only health cannot mint a grant, clear cooldowns or widen account authority.

## Explicit Codex image-tool compatibility

The public capability alias does not promise an unverified underlying model. The assigned Premium engine uses the standalone image contract implemented in the shared engine with its own central image grant. No startup or periodic paid image probe runs in isolated execution. Client-owned function calls return arguments to the caller and do not execute on the provider or relay host. A Premium label and chat inventory do not verify image support; the first real image trial remains explicit.

Availability reads inspect in-process image evidence directly and do not generate or reserve capacity. Fresh success is available; absence or expiry is unknown; chat inventory alone cannot deny image access. A new explicit trial still needs a central image grant. Successful application image results are persisted through the same owned storage/manifest/library path before receipt completion. Artifacts are decoded/re-encoded; upstream URLs, identifiers, arbitrary errors and metadata stay out of public output. The legacy standalone-image candidate has its own older probe configuration and unresolved acceptance in current state; do not transfer that cadence or historical success to the pool contract.

## Parent and subagent execution

Each logical request carries its original idempotency key, payload and verified tenant identity. Task IDs only correlate. The execution project records reservation, lease binding and outcome; it does not own a second account-capacity balance. Replayed image requests and unavailable original contexts are reported unconfirmed instead of redispatched.

Terminal persistence and original lease settlement may retry. An unconfirmed terminal write blocks new local admission. Restart recovers incomplete records as unknown. A retained record does not guarantee stream/artifact recovery after epoch replacement or account removal. See [request recovery](RELAY_API_REFERENCE.md#request-recovery). This is not exactly-once upstream execution.

## Sites content and durable recovery

The product's included generation, free allowance where applicable, paid access and shared fair usage remain separate from provider account class. Isolated Sites selects Premium and retains its original request/receipt context. It never repeats generation to settle an uncertain result.

Historical fixed/metered work keeps its original pricing, occupancy and receipt reader. Legacy signed receipt references may support retained-volume reads under their own contract; the new runtime does not inherit that recovery guarantee across epochs. Publication, domains and native delivery remain independent of relay completion. See [Sites operations](maintainers/SITES_OPERATIONS.md).

## Operational visibility

Open **GALX Monitors** or the fixed Premium app. The console has Accounts, Registration and Activity with separate operator/viewer sessions and central authorization. Name/status/health filters, issues-first ordering and Manage dialogs affect only its own authorized snapshot. Registration is manual; refresh does not sign in or generate content. Operational records and assets remain private.

The older `relay:open` and `relay:desktops` commands address only the retained single-controller federation. Its per-shard Docker workers, guardian, holds, reverse index and signed jobs remain documented in [legacy operations](maintainers/legacy-federation-operations.md) and [legacy API](reference/legacy-federation-api.md), not as the new pool runtime.

## Verification and deployment boundary

Central migrations, the Premium execution schema and local service images are installed and tested. At the [management acceptance](../post-mortem/releases/2026-09-15-relay-account-management.json), registration was open and execution closed. Manual paid sign-in, provider qualification and public application cutover remain separate. Hosted SSH targets are optional future deployment inputs, not missing prerequisites for the installed local setup.

Keep earlier ADRs and dated fixtures as history. They do not certify physical-host separation, real provider capability, screen readers or production throughput. Use the [service runbook](runbooks/relay-pool-services.md) for activation and retention-preserving rollback.
