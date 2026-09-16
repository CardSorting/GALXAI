# Shared-account quota exhaustion and costly continuation

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260916-SHAREDQUOTA, SEV-3 prevention investigation; owner: Relay and SDK maintainer. The owner reported a failure mode involving multiple users sharing one account and sessions ending on quota exhaustion. No production onset, affected-user count, actual lost work or measured provider balance was established. Reproductions use synthetic local HTTP/WebSocket providers and caller-owned tools.

## Cause and contributing conditions

The shared engine already prevented concurrent probes within an exhausted account, but Premium selection lacked Standard's eligibility filtering, pool recovery pacing, immediate checkpoint writes and admission-denial backoff. Premium could keep selecting an exhausted account despite healthy alternatives. Ordinary isolated text did not forward the configured output bound because forwarding was conditioned on a durable Sites receipt.

The SDK retained session history only after a complete turn. A subsequent model failure could lose completed callback outputs from the session snapshot. Full history and tool results were replayed without cumulative token/context bounds. Its SSE parser swallowed malformed/error frames and did not require terminal completion, risking partial output presented as success. The public chat route also needed to retain safe recovery evidence and distinguish an error-bearing stream from a successful completion.

## Containment and recovery

The source now applies bounded account selection/recovery in both pools, keeps central authority, forwards isolated output limits, preserves original request identities, and makes continuation explicit under a retained turn budget. Agent checkpoints retain tool results before another request. Unknown model/tool outcomes remain blocked for reconciliation. Context compaction is explicit and does not spend quota on a summary call. Customer-facing recovery data is allowlisted and reveals no provider-account detail.

See [shared quota recovery](../../../../docs/reference/shared-quota-recovery.md) for the complete contract and limitations. The local installation preserves volumes, desktop sessions, central/monitor pins and closed execution gates. Compatible application/SDK distribution and real provider qualification are separate acceptance steps. Detailed local evidence is retained in [verification.json](verification.json).

## Verification and limits

The evidence record distinguishes regression checks, production build/compiled scan and installed local acceptance. No real generation or quota exhaustion is induced. Checkpoint durability requires the caller's owner-scoped awaited persistence callback. Unknown external side effects cannot be resolved by an SDK checkpoint alone. The runtime's quota snapshot is best-effort local evidence, not a replicated quota ledger. No new customer graphical chat screen or public application deployment is claimed.

## Prevention and closure

[FM-CTRL-002](../../../failure-modes/controller.md#fm-ctrl-002--shared-account-exhaustion-amplifies-recovery-work) covers this failure. ACT-025 tracks real manually enrolled provider qualification, bounded-output acceptance and compatible caller rollout. Source and local installation do not close that remaining acceptance action. Original accepted jobs/receipts must remain inspectable and must not be replayed to test recovery.

## Second audit and local containment — September 16

The [second verification record](second-pass-verification.json) retains the later `quota-20260916-r2` runtime installation and closed gates. The [audit](../../../../docs/knowledge/audits/2026-09-16-shared-quota-second-pass.md) documents coalesced bounded settlement, per-owner request allowances, late-success fencing, retained transient cooldowns, bounded callback batches and explicit capacity waits. The earlier verification remains historical evidence for the first implementation. ACT-025 still requires real provider and compatible caller acceptance; local fault fixtures do not establish production capacity.

## First live account qualification — September 16

After the separately recorded automatic activation, the owner requested end-to-end tests of both installed accounts. The [live canary evidence](../../../releases/2026-09-16-relay-account-canaries.json) records one short text request per pool, each with a 64-token output cap and a durable receipt. Both requests returned HTTP 202, then failed without output. Both receipt statuses and durable execution states remain unknown; settlement was acknowledged with success false and no confirmed usage. Neither account has passed live generation acceptance.

No uncertain request was resubmitted. Each runtime recorded zero automatic upstream retries and zero quota cooldown ejections. Unauthorized receipt reads returned 401 and wrong-owner reads returned 404. Execution remained allowed and account revisions remained acknowledged. These observations distinguish working registration/activation from failed generation; they do not prove a revoked credential, exhausted quota or incompatible request. The detailed failure reason was not retained in the available private logs or durable records. ACT-025 now starts with diagnosing that failure, followed by successful provider/output-bound acceptance; caller distribution and checkpoint-store acceptance remain separate. Images, Sites, other models and load/exhaustion were not tested.

## Live generation recovery — September 16

The owner requested a fix after the failed canaries. One new Premium request with an allowlisted private diagnostic confirmed HTTP 400: the connected transport rejects `max_output_tokens`. The shared-quota runtime had enabled this unqualified field for both pools. Registration, activation and account authorization were separate and working.

The [generation recovery record](../../../releases/2026-09-16-relay-generation-recovery.json) records the corrected runtime pins and installation. Ordinary text omits the unsupported field on its first and only attempt; a conservative local byte budget stops observed text/reasoning/function overflow without retry or fabricated success. Explicit provider-enforced cap requests remain unavailable. This local guard cannot bound hidden provider reasoning or total remote spending; actual terminal usage remains authoritative. Private job-associated diagnostics contain only allowlisted categories, never provider messages or credentials.

One fresh request per installed account now returns `RELAY_OK`, with completed receipts, successful terminal streams and settled execution records showing 22 input + 7 output tokens each. Both monitors retain automatic activation and Enabled/Applied at revision 2. Seventy relay tests, 17 receipt/boundary/authorization checks, TypeScript, the production build, 69 installed local checks, 55 image checks and a compiled public-boundary scan pass. No old failed job was replayed or purged. ACT-027 records this repair; ACT-025 remains open for compatible caller distribution and owner-scoped checkpoint/continuation acceptance. Images, Sites, every model and sustained/shared-quota load remain separate qualifications.

The [final runtime acceptance](../../../releases/2026-09-16-relay-generation-recovery-final.json) adds a truthful unavailable strict-cap preflight and permanent-rejection retry veto. Both final installed accounts again returned `RELAY_OK` in about 2.3 seconds with 29 actual tokens settled each. All 71 relay regressions pass; original failed and preceding successful execution records are independently read back as retained. The preceding recovery remains dated evidence for its earlier image pins.
