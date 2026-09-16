# ADR 0155: Shared quota containment and bounded agent continuation

<!-- docs-scope: decision-record -->

Date: 2026-09-16. Status: proposed. Owner: Relay and SDK maintainer. Delivery is tracked separately from this decision's review status. The provider output-cap assumption is partially superseded by [ADR 0157](0157-compatible-relay-output-budgets.md) after its live rejection; the remaining containment and checkpoint decisions are unchanged.

## Context

The owner identified correlated failures when independent user sessions share an account and exhaust its provider quota. Investigation found Standard-only recovery protections, an unfiltered Premium selection cursor, SDK history saved only at whole-turn success, unbounded repeated context, ignored output limits on ordinary isolated chat, and stream errors that could become false successful answers. Unlimited failover would move the same overload to another account and might repeat completed callbacks.

## Options

- Automatically replay whole sessions elsewhere: low apparent interruption, high duplicate-work and quota-amplification risk.
- Fail permanently and discard partial progress: simple, but repeats completed tools and makes long tasks unnecessarily fragile.
- Exclude exhausted accounts, preserve confirmed work, and offer explicit bounded continuation: selected. Unknown work remains subject to reconciliation.

## Decision

Both isolated pools use account eligibility, bounded slots, persistent quota observations and paced recovery. Standard keeps one healthy slot; Premium keeps four. Central remains the only account capacity ledger. Accepted work is never transferred across account/epoch or pool. One real authorized request probes a recovering account, with recovery starts spaced at least five seconds apart per pool.

An agent turn checkpoints model intent, tool intent, each confirmed tool result and completion. The application's awaited owner-scoped persistence callback supplies durability; otherwise state is in memory/export only. Confirmed terminal quota stops and explicit pre-dispatch rejection permit manual continuation from retained work under a new model-step identity. Unknown model/tool outcomes cannot replay. Callbacks still need domain idempotency; this is not exactly-once external execution.

The second audit adds per-owner non-queuing submission/observation/subscription limits, serialized terminal writes and a coalesced bounded settlement pass with backoff. Late pre-exhaustion success cannot clear probe state; transient-failure cooldowns are checkpointed. Tool batches use bounded concurrency, and explicit continuation retains a Retry-After-aware wait without spending another attempt on an early click. These local controls do not replace aggregate customer budgets or distributed admission.

Context bytes, per-step output and a conservative cumulative turn reservation limit spending. Original attempt/budget limits survive resume/import. Explicit application-supplied summaries can reduce older context while preserving complete recent tool groups and instructions; conversation identity rotates to avoid rehydrating discarded history. Compaction itself performs no model request. Error frames, truncated streams and missing terminal completion cannot produce success.

Use the familiar partial-rerun, checkpoint and bounded-backpressure patterns documented by [GitHub Actions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs), [Temporal](https://docs.temporal.io/activity-execution), [AWS](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html) and [Claude context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing). These sources inform the choices without importing their retry or durability guarantees.

## Consequences and confirmation

Explicit pauses replace hidden amplification. Conservative estimates can reject useful work early and are not exact tokenization or provider balance. Shared quota can still interrupt requests already in flight before the first observation. Recovery fairness is per account/request; customer aggregate policies remain independent. A caller must protect its checkpoint store and cannot assume a runtime update deploys the SDK.

Verify simultaneous users, same-account exclusion across models/restart, healthy sibling service, paced probes, unchanged accepted identity, owner denial, persisted callback progress, ambiguous-outcome blocking, bounded resume/compaction, raw error allowlists, terminal stream handling, TypeScript and production assets. Qualify real provider output-limit support separately before opening execution.

Rollback retains volumes, credentials, leases, unknown outcomes and checkpoints. Do not feed unfinished new checkpoints to old clients or clear counters to recover. [The canonical contract](../reference/shared-quota-recovery.md) owns defaults and procedure; [local delivery evidence](../../post-mortem/incidents/2026/2026-09-16-shared-quota/README.md) owns actual installation and acceptance.

Extends [ADR 0153](0153-central-account-authority-isolated-relays.md); preserves [ADR 0154](0154-relay-connection-lifecycle-and-legacy-retirement.md)'s connection and revocation authority. No earlier ADR is fully superseded.
