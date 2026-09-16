# ADR 0156: Verified automatic relay activation

<!-- docs-scope: decision-record -->

Date: 2026-09-16. Status: proposed. Owner: Relay operator. Decision review and delivery evidence remain separate.

## Context

Manual sign-in and verified registration succeeded, but both monitors stayed at execution not activated until an owner opened the gates and enabled each account. The owner requests automatic readiness transitions after connection. Removing authorization or replaying onboarding would create false readiness and could undo deliberate pauses.

## Decision

The verified installer configures a persistent automatic-activation policy once. Host identity and isolation verification remain mandatory, but account presence in the other pool is unnecessary. A successful new manual Connect or compatible first Register enables the account atomically with its central enrollment and records one immutable enable operation.

The owning connection transaction and runtime claim/heartbeat reconcile execution when policy, installation evidence, fresh non-future ownership and a valid enabled connection meet the eligibility checks. The existing runtime checks, leases, cooldowns and quotas still control dispatch. No owner credential is added to a runtime or monitor, and no background provider generation or credential refresh is introduced.

Pause, removal and revocation remain explicit intent. Reconnect, replay and installer reconfiguration preserve existing pauses. Ordinary owner gate changes disarm automation; shutdown wins races with connection and remains closed across heartbeat/restart. Rearming requires fresh installer verification. Installation/runtime locks precede account/registration mutation to avoid inconsistent ordering.

The monitor explains waiting for an account, waiting for the relay, reconnect requirements and deliberate pauses. Successful connection is distinct from runtime acknowledgment and actual provider generation. The private status DTO adds one boolean; no public contract changes.

## Alternatives and consequences

Automatically opening gates from browser state would trust stale client data and broaden authority. Requiring each owner gate approval preserves safety but caused the reported stalled workflow. The selected policy retains server checks and removes repeated manual transitions without a new daemon or retry loop.

Legacy installations remain manual until configured. Existing paused accounts are not bulk-enabled. New connections made during a deliberate manual hold remain paused until explicitly enabled. The policy is durable installation intent, not continuous proof of host isolation or provider access; startup validation and per-request eligibility still apply.

This partially replaces the separate manual activation/new-account enable workflow described by ADRs [0153](0153-central-account-authority-isolated-relays.md) and [0154](0154-relay-connection-lifecycle-and-legacy-retirement.md). Their authority, immutable assignment and rejection/reconnect rules remain. [Account management](../reference/relay-account-management.md) owns the contract; [service operations](../runbooks/relay-pool-services.md) owns setup/rollback. [Delivery evidence](../../post-mortem/releases/2026-09-16-relay-automatic-activation.json) records actual local acceptance without certifying provider generation or public application cutover.
