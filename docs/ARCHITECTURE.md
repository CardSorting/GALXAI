# GALX architecture

<!-- docs-scope: current-guide -->

Private maintainer guide. The implemented relay strategy has one central account authority and one isolated Premium execution pool. [Current state](../post-mortem/CURRENT_STATE.md) records installation and activation; [ADR 0153](adr/0153-central-account-authority-isolated-relays.md) retains decision status separately. Customer documentation describes capability and access, never this topology.

## Authority and topology

| Component | Responsibility | Boundary |
| --- | --- | --- |
| Product application | Verified customer identity, entitlements, owned resources, durable product receipts and public responses | Server-only relay selection; customers cannot select provider accounts |
| Central account service | Manual registration, account names, encrypted credentials, exclusive assignments, lifecycle history and existing account leases/budgets | Supabase `mazhcjisettrzbqhorvp` only; no Docker socket |
| Premium runtime | Assigned paid accounts; text, Sites and images | Own Colima VM/daemon, execution project `prgjcyokylzcsqrjmkaa`, keys and state |
| Premium monitor | Fixed operator/viewer access, account management and manual sign-in desktop | Loopback origin and session; central authorization on privileged requests |
| Sign-in desktop | Manual provider sign-in and retained guest home | Created only on the Premium monitor's daemon |

The central service and TLS proxy run on Docker Desktop. Premium runs in its own Linux VM, daemon and disk with a persistent host boundary. The Mac administrator and physical host remain trusted infrastructure. A Compose network or schema label alone is not a host boundary.

The Premium runtime hosts one in-process relay engine per eligible assigned account inside its own runtime container. It does **not** create a Docker worker container per account or use the legacy federation guardian. The monitor alone has its daemon socket to manage desktops. The execution database holds installation identity and execution reservations/outcomes; it holds no account registry, credential table or second account-capacity ledger.

## Request path

With isolated-relay mode enabled, server deployment policy selects the Premium runtime for text, Sites and images. The Premium image switch remains available for an independent image cutover. Text includes [client-owned function calling](reference/automatic-agent-tools.md): the agent application executes its registered callbacks automatically and returns results for the next authorized model step. Provider account class is independent of GALX customer billing tier. No request falls back to the legacy transport after failure.

The selected runtime filters its assigned running engines for the requested model and uses health-aware rotation across eligible accounts. Before provider I/O it persists an execution reservation, obtains a destination-bound central lease and binds that lease to the reservation. Central authorization checks assignment, account/credential revision, installation epoch, workload and existing budget policy. Short grants renew while work is authorized and expire independently if central renewal fails.

The application delegates customer identity but does not decrypt assigned accounts or acquire a second account lease. Product quota and Sites fair usage remain separate admission layers. See [routing](ROUTING_ALGORITHMS.md), [queues](QUEUE_SPECIFICATION.md) and [the protocol reference](RELAY_API_REFERENCE.md).

## Account lifecycle

Open the fixed monitor, name a registration, manually sign in, review paid/free access and **Register account**. Registration commits centrally in paused state. Enable is separate and remains unavailable until execution is activated and prerequisites are met. Rename synchronizes the account and linked registration. Removal retains history and revokes a registered account permanently; only unfinished registrations can be restored with a fresh review. Every change uses expected revision and durable operation identity.

Health, saved state, relay confirmation and desktop connection are separate facts. Unknown health is not a failed account; a stopped sign-in desktop is normal for a registered account. See [account management](reference/relay-account-management.md) and [manual operations](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).

## Product identity and durable images

Account-facing routes verify session and ownership. GALX products can continue to
use the inference infrastructure, while private developer access follows an
administrator-controlled lifecycle: review a bounded cohort, provision a
credential, assign an allocation, inspect metered use, and revoke or expire the
credential. There is no active public Developer Access subscription or
self-service API-key path. Staff access has independent authority.

Product image receipts commit before async acknowledgement and claim one
dispatch. Completion requires owned stored artifacts. Public JSON uses explicit
allowlists; image artifacts are re-encoded and stripped of upstream metadata.
The public image alias does not promise an unverified underlying model. See
[image boundaries](maintainers/image-public-boundary.md).

The inference gateway still reserves work before dispatch, accounts for
completed consumption, enforces per-key allocations, and retains its request,
recovery and audit records. Metering is an operational control and accounting
source, not a public price promise. Public capability docs therefore describe
what an approved integration can call, while this private guide retains the
implementation authority needed to operate the system.

## Sites content and delivery

Current Sites generation uses the account-owned workspace, paid eligibility and the configured fair-usage/free-allowance rules. It is independent of provider account class. Publication, domains and conversation storage have their own durable contracts. Historical fixed/metered work retains its original settlement and recovery readers; accepted work never moves to a replacement pool. See [Sites operations](maintainers/SITES_OPERATIONS.md).

## Reconciliation and recovery

Central outage stops new registration and grants; active grants expire without silently extending authority. Failed terminal writes retain pending settlement and stop new admission. A restart recovers unfinished execution as unknown, never permission to redispatch. Saved records alone do not guarantee that an old artifact, stream or receipt remains retrievable after runtime epoch replacement.

The retained legacy federation still has separate operating duties for the existing deployment and historical work. It reads broad registry authority only within that trusted legacy controller, excludes centrally assigned accounts, and retains its own per-shard Docker workers, guardian, holds and receipt rules. Those mechanisms are not the new pool runtime. No public application cutover is implied by local installation.

## Source map

| Contract | Source |
| --- | --- |
| Central authorization and management | [pool-central.ts](../src/relay/pool-central.ts), [management migration](../supabase/migrations/20260915191404_relay_account_management.sql) |
| Scoped execution and recovery | [pool-runtime.ts](../src/relay/pool-runtime.ts), [pool-execution.ts](../src/relay/pool-execution.ts) |
| Monitor and health presentation | [pool-monitor-server.ts](../src/relay/pool-monitor-server.ts), [pool-monitor-model.js](../src/relay/pool-monitor-model.js) |
| Server application selection | [IsolatedRelayTransport.ts](../src/core/router/adapters/IsolatedRelayTransport.ts) |
| Local installation and access | [relay-local.mjs](../scripts/relay-local.mjs), [reviewed image manifest](../docker/relay-pools/local/images.json) |

Use [service operations](runbooks/relay-pool-services.md), [security](SECURITY.md) and the explicitly scoped [legacy operations](maintainers/legacy-federation-operations.md).
