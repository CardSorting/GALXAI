# GALX architecture

<!-- docs-scope: current-guide -->
> Private architecture guide. The [federation contract](FEDERATION_STRATEGY.md) defines relay behavior; customer content follows [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md).

| Component | Responsibility | Authority boundary |
| --- | --- | --- |
| Product application | Customer authentication, entitlements, allowed response contracts | Keeps internal operations out of public output |
| PostgreSQL registry | Encrypted credential/control-plane state | Authoritative; projections cannot restore removed rows |
| Host controller | Reconcile owned workers, capabilities, admissions and recovery | Single host; exclusive namespace lock |
| Shard worker | One assigned credential and inference lifecycle | At most one active managed worker per eligible shard |
| Desktop manager | Isolated operator workspaces and explicit links | Desktop session required; not serving capacity |
| Credential bridge | Validate saved guest login and conditionally replace authority | Recoverable private intent plus registry compare-and-swap |
| Browser monitor | Read-only capability, health and activity views | Delegated local session; no browser admin key |

## Request path

Product clients use `https://galx.ai/v1`. The server adapter chooses the explicit internal capability and calls the authenticated controller. Eligibility precedes load selection. Signed jobs preserve original principal/generation. Uncertain admission is reconciled without automatic replay.

The public image capability is `openai-gpt-image-latest`. Its internal compatibility semantics are [documented privately](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility); public aliases cannot promise unverified model identity.

## Sites content and delivery

The account-session endpoint `/api/sites/content` is separate from `/v1` inference credentials. Its server adapter owns quote validation, fixed-price reservations, a rolling account allowance and atomic settlement against durable relay completion. Missing supplier usage can coexist with a known fixed-price completion; missing completion evidence remains unresolved.

A private customer-local companion validates generated text, builds a fixed static artifact and saves/publishes under the customer's Sites ownership. It receives no relay or database credentials. Native-host upload, source/version identity and owner-private publication are separate from content billing. [ADRs 0134–0136](adr/README.md) and [Sites operations](maintainers/SITES_OPERATIONS.md) define this added path.

## Reconciliation and recovery

Explicit validated enrollment creates authority. Cold-start inventory validation precedes allocation. Workers maintain fresh capability evidence; empty evidence does not trigger deletion. A 401 suppresses that revision, while transient discovery failures back off.

Manual holds stop admissions and replacement starts, preserving an existing worker for repair. Registry removal, revocation, expiry and rotation still control authority. Desktop sign-in can supply a refreshed credential for the linked account; it cannot silently enroll another account or resume traffic.

Application database-backed leases remain distinct from federation's local reservations. Private journals support recovery but are not cross-store atomic transactions.

## Source map

| Area | Source |
| --- | --- |
| Lifecycle and ownership | [federation-lifecycle.ts](../src/relay/federation-lifecycle.ts), [docker-shard-driver.ts](../src/relay/docker-shard-driver.ts) |
| Controller and sessions | [federation-server.ts](../src/relay/federation-server.ts), [monitor-sessions.ts](../src/relay/monitor-sessions.ts) |
| Desktop access and state | [desktop-gateway.ts](../src/relay/desktop-gateway.ts), [desktop-manager.ts](../src/relay/desktop-manager.ts) |
| Credential handoff | [desktop-credential-refresh.ts](../src/relay/desktop-credential-refresh.ts), [desktop-journal.ts](../src/relay/desktop-journal.ts) |
| Explicit enrollment | [manage-shards.ts](../scripts/manage-shards.ts), [operator-enrollment.ts](../src/relay/operator-enrollment.ts) |

See [operations](RELAY_VNEXT_RUNBOOK.md), [security](SECURITY.md) and [dated verification](maintainers/RELAY_SESSION_VERIFICATION_20260909.md).
