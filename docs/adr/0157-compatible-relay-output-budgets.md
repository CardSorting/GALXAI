# ADR 0157: Compatible relay requests and honest output budgets

<!-- docs-scope: decision-record -->

Date: 2026-09-16. Status: proposed. Owner: Relay maintainer. Delivery evidence is separate from decision acceptance.

## Context

Both manually connected accounts passed activation/readiness but failed real text generation. A new, independently identified diagnostic request confirmed HTTP 400 with an unsupported `max_output_tokens` parameter. The earlier shared-quota change enabled an unqualified provider field. Public errors appropriately hid internal details, but no private sink retained the allowlisted rejection observation.

## Decision

Ordinary isolated text omits the unsupported field on its first and only provider attempt. It never catches rejection and resubmits. Keep input/turn reservations, account slots, grant expiry, wall deadlines, quota exclusion, recovery pacing and no cross-pool borrowing. Enforce a conservative local budget of one unit per observed UTF-8 output byte; include text, observed reasoning/summary text, function arguments and completed call envelopes. Reject overflow before publishing the overflowing data or executing a function; close the transport and retain an unknown outcome without estimated usage or fabricated success.

The budget is not a tokenizer and cannot cap hidden reasoning, already buffered remote work or total provider charges. Actual terminal usage remains authoritative even above estimates. Explicit requests for a provider-enforced ceiling remain unavailable before provider I/O, including their private preflight; permanent request rejections carry a retry veto. This partially supersedes ADR 0155's expectation of forwarding output caps; all its identity, quota containment, checkpoint and replay decisions remain.

Retain only allowlisted rejection categories and job identity in private container logs. No raw provider error, prompt, credential or account email enters this diagnostic. Host administrator access is required; inference responses and monitor/browser assets do not gain a diagnostic endpoint. Observability failure cannot alter request state or retry decisions.

## Verification and consequences

Exercise unsupported strict-cap rejection before reservation, overflow in text/multibyte/reasoning/function paths, subsequent independent account availability, unknown receipts, absent retries, private diagnostic allowlists, sink failure, authorization, production build and compiled public boundary. Qualify one fresh short request on each installed account; retain original failed requests without replay. Images, Sites, every model and hidden-reasoning spending remain separate qualifications.

The official [Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create) documents a token ceiling, and [WebSocket mode](https://developers.openai.com/api/docs/guides/websocket-mode) describes that API's contract. Those references do not prove that a separately connected account transport accepts every field. The observed rejection controls this adapter's behavior.

Rollback retains accounts, state volumes, execution identities and receipts. The older image restores the known rejection and must not be reopened as a serving fix. [Shared quota recovery](../reference/shared-quota-recovery.md) and the [service runbook](../runbooks/relay-pool-services.md) own the complete implementation and installation procedure. [Current state](../../post-mortem/CURRENT_STATE.md) owns actual acceptance.
