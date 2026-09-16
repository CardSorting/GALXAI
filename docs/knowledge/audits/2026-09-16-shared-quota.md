# Shared quota and continuation audit — September 16, 2026

<!-- docs-scope: operational-record -->

The reported failure mode is credible: several user sessions can consume the same account, then amplify exhaustion by restarting expensive work elsewhere. This audit reproduced the behavior with isolated HTTP/WebSocket fixtures. It did not establish a production incident duration, affected-user count or exact provider quota.

## Findings and corrections

| Priority | Finding | Result |
| --- | --- | --- |
| P1 | Premium selection could continue choosing an exhausted account | Both pools filter current eligibility, reserve bounded slots and retain cooldown evidence; healthy accounts continue independently |
| P1 | Concurrent failures and recovery could repeatedly amplify backoff or admission | One quota observation per job, shared account exclusion, paced recovery and stale-success fencing |
| P1 | Ordinary isolated text silently omitted its configured output bound | Forward the bound and enforce server input/output limits before new execution |
| P1 | SDK history was committed only after a complete turn | Checkpoint model/tool intent, every completed callback and final output; resume retains the original attempt and usage budget |
| P1 | Error frames and truncated streams could become false successful answers | Explicit terminal evidence is required, error streams remain failures, and partial text is separate from completed history |
| P1 | Multiple restored callers could act on the same checkpoint | Await revision-aware persistence before dispatch; an owner-scoped compare-and-swap rejects the stale caller |
| P1 | A failed save could lose input, hide parallel results or show Ready after the final answer | Preserve local evidence, stop writes at the failed revision and require Check saved progress |
| P2 | Continuing long conversations repeatedly enlarged model input | Bound serialized context and cumulative reservations; provide explicit application-supplied compaction without another model request |

These are implementation findings, not measured production impact scores. Source corrections are covered by focused regressions and the [verification record](../../../post-mortem/incidents/2026/2026-09-16-shared-quota/verification.json).

## Recovery ergonomics

The SDK exposes one recovery action for each observed state. **Working** prevents another simultaneous turn. **Continue** starts the next bounded step after a confirmed stop. **Check status** retains an uncertain request or tool identity. **Check saved progress** identifies an unconfirmed write. **Shorten context** requests a reviewed summary. **Review progress** explains a reached turn limit without promising that retry resets it. Completed callbacks are retained; incomplete model text is display-only.

This is an SDK/API contract for calling applications, not a new graphical chat interface. No visual, screen-reader or live customer-browser acceptance is claimed in this pass. The existing registration UI and its earlier acceptance remain separate.

The design follows bounded retries/backpressure, partial reruns, durable progress and explicit context reduction. Primary research and the precise implementation limits are retained in the [canonical recovery guide](../../reference/shared-quota-recovery.md#familiar-patterns-and-deliberate-limits).

## Delivery and remaining acceptance

Both local runtime images were installed with existing state volumes, desktops and account assignments retained. Central and monitor images were unchanged. Registration remains open and execution closed. Installed service isolation, authorization and image packaging checks passed; no real provider generation was submitted.

The chat application and SDK changes are source-tested and production-built, not published to existing callers. Crash-safe and cross-process continuation depends on an application-owned, authenticated checkpoint store with atomic revision checks. Unknown external side effects still require reconciliation. Context estimates are conservative bounds, not a tokenizer or supplier balance. Per-turn limits do not replace aggregate customer spend and concurrency controls.

ACT-025 retains real provider output-bound qualification, compatible caller rollout and durable store acceptance. [Current state](../../../post-mortem/CURRENT_STATE.md) is the delivery authority; [ADR 0155](../../adr/0155-shared-quota-containment-and-bounded-continuation.md) remains proposed. No source or local fixture result automatically accepts that decision or completes the outstanding live acceptance.
