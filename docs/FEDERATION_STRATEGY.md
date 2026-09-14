# Federation contract

<!-- docs-scope: current-guide -->
> Private maintainer contract, reconciled September 11, 2026. Public documentation follows [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md).

## Ownership and capability are separate

A shard is registered credential authority; an inference worker executes requests; a repair desktop is an independent operator workspace. An eligible shard can own **at most one active managed worker** on a Docker host. Registered, rejected, expired, paused or unavailable records are not a count of serving containers. A desktop link does not enroll an account or add capacity.

The controller reads the encrypted PostgreSQL registry and reconciles owned containers. Each worker receives one assigned credential, separate internal inference/admin keys and its own checkpoint volume. Workers receive no registry access, vault root, host home or Docker socket. Deterministic shard container names, ownership labels, generation checks and the launcher's external kernel-held local guard enforce single-host ownership. A permanent compatibility marker blocks an incompatible old launcher during rollout; ambiguous legacy ownership fails closed. Multiple Docker hosts require a distributed ownership lease and a fencing-capable resource boundary before sharing credentials.

Kubernetes could add pod restart and capability probes, but it would not repair the single-host stale-marker failure or prove that an uncertain Docker mutation and its descendants have ended. Kubernetes leader election also does not by itself fence a paused old controller. The current single-host strategy therefore keeps the local kernel guard, external guardian and one launchd restart authority; a Kubernetes migration is not part of this repair. Reconsider orchestration only with a multi-host ownership lease, durable state contract and fencing at the resource-management boundary.

**Automatic worker lifecycle remains supported. Ambient credential population is retired.** Starting a controller or creating a desktop must not scan host logins or enroll an unknown account. Use [explicit enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md); refresh an existing account through its [linked desktop](maintainers/RELAY_DESKTOPS.md).

## Eligibility before load

Cold starts validate authenticated model inventory before Docker allocation. A 401 rejects that credential revision; transport errors, timeouts, 403 and 5xx responses do not permanently reject credentials. Inventory acceptance proves inventory access, not an inference handshake or image tool.

A worker starts in `DISCOVERING_CAPABILITIES`. Only fresh, verified capabilities with usable health and capacity admit work. The reverse index selects within the requested model pool before considering recent errors, streams, latency, queue depth and spare capacity. An unavailable pool returns `model_temporarily_unavailable`; a saturated eligible pool returns `model_capacity_exhausted`, both HTTP 503.

There is no federation-wide waiting queue or implicit cross-model fallback. A catalog entry or live process is not proof of present capability.

## Dynamic evidence and lifecycle

| Condition | Behavior |
| --- | --- |
| Fresh eligible capability | Admit within that model's capacity |
| Unknown, stale, degraded or empty capability | Stop new admissions; retain worker for rediscovery |
| Authoritative credential 401 | Persist revision-specific rejection; suppress repeated starts |
| Transient discovery/start failure | Retry with bounded backoff |
| Unexpected worker stop or disappearance | The controller is the only federation-worker restart authority; it waits with exponential backoff and pauses after five attempts in ten minutes with a private restart-budget alert |
| Operator maintenance hold | Block admissions and replacement starts; preserve an existing worker, including a rejected one |
| Credential removed, revoked, expired or changed | Retire old authority; a hold cannot override registry authority |
| Explicit resume | Remove hold; rejection, cooldown and capability checks still apply |

Empty capability state alone never deletes a worker, including after 120 seconds. Rotation permits validation of the new revision; stale failures cannot poison it. Journal failures must not be reported as saved state.

Desktop connection, saved home, account link, sign-in and serving status are independent. Closing the viewer keeps the workspace running; stopping it preserves its home; deletion is explicit. See [desktop operations](maintainers/RELAY_DESKTOPS.md).

## Health authority and stale results

Observations are fenced by credential revision, worker generation and inventory revision. Success cannot erase a concurrent authoritative denial. Equal-revision health replay cannot clear a local failure. Generic transport errors, throttling and route failures are insufficient evidence of model permission loss.

The database-backed application pool retains its separate lease authority. Federation uses local reservations and signed worker jobs; it does not acquire a database lease per upstream attempt.

## Explicit Codex image-tool compatibility

The canonical public capability is `openai-gpt-image-latest`. Legacy application image aliases resolve to it, not independent fallback providers. The internal protocol ID remains `gpt-image-2`.

With `RELAY_CODEX_IMAGE_TOOL_ALIAS=true`, eligible OAuth workers use `gpt-5.6-terra` with `image_generation` for that internal ID. Image-model selection is provider-managed; exact GPT-Image-2 identity, dimensions and Image API quality semantics are not guaranteed. API-key workers request their exact image model. This explicit compatibility route does not authorize other substitutions.

Fresh execution-model inventory and real image evidence are required. Evidence lasts one hour; generation success renews it. Idle enabled workers perform a paid startup probe and successful renewal no more frequently than every 50 minutes, with failure backoff of 10, 20, then 40 minutes and spare-capacity checks. Inventory alone never proves image support.

Internal transport and administrator records preserve execution identifiers. Public bodies, headers, errors, streams and artifacts must not expose them. Binary images are sanitized by default; explicit JSON uses an allowlisted contract. See [the image boundary guide](maintainers/image-public-boundary.md).

## Parent and subagent execution

Each logical operation gets an idempotency key, reused only for the same payload and principal. Task IDs correlate work; they do not grant authority. Accepted jobs return signed tenant- and generation-bound recovery URLs. Status, cancellation and stream recovery target the original worker even after capability removal; streams and cancellation cannot attach to a replacement. Durable text receipt reads have the retained-volume exception below.

The supervised controller retains a private admission tombstone journal across restart: ten minutes for completed identity records, 1,000 keys, 32 MiB aggregate and 8 MiB per retained response in memory. Prompts, credentials and response bodies are never persisted. A pending record becomes `unknown` after controller loss and never authorizes replay; completed response bodies remain process-local and may return an explicit non-retained result after restart. A full or unavailable journal rejects new keyed admissions rather than guessing. Preserve the returned scope; changed scope or unknown admission requires reconciliation, not blind replay. Images dispatch once. This is not durable exactly-once execution.

See [request recovery](RELAY_API_REFERENCE.md#request-recovery) and [ADR 0130](adr/0130-image-receipts-and-uncertain-outcomes.md).

## Sites content and durable recovery

Current application Sites work uses eligible paid-plan inclusion and shared fair admission under [ADR 0140](adr/0140-paid-sites-and-shared-fair-usage.md). The application does not quote or debit new per-generation wallet charges. The local execution profile verifies byte, wall-time, attempt and receipt readiness across eligible workers and again at dispatch; it does not invent supplier quota or token-usage evidence.

Durable text receipts are separate from the controller admission tombstones. A receipt can be read after replacement of its original worker using that shard's retained volume and the original tenant-bound signed reference. Streams and cancellation stay on the admitting generation. Missing references, expired signatures or lost volumes do not authorize replay or release uncertain occupancy. [Sites operations](maintainers/SITES_OPERATIONS.md) and [fair usage](maintainers/SITES_FAIR_USAGE.md) own current admission, retention, rollout and recovery.

Earlier fixed/metered operations retain their accepted tariff, hold and settlement semantics. Confirmed durable completion can settle an original fixed charge without fabricating token usage; uncertain completion retains the hold. Those contracts do not apply to new included work. The legacy metered profile retains its own ceiling/usage requirements.

The public browser workspace owns private drafts and versioned managed publication. The optional native companion remains a distinct workflow; neither application admission nor a relay receipt proves native-host publication, direct CLI upload support or a completed customer billing interaction. See [workspace operations](maintainers/SITES_WORKSPACE.md).

## Operational visibility

Run `npm run relay:open` or `npm run relay:desktops` on the controller host. The launcher delegates a browser session without exposing the admin API key. Monitor sessions are read-only; desktop sessions separately authorize actions. Anonymous pages provide generic connection guidance; operational assets and data require server authorization.

Read capability, traffic hold, worker health and desktop connection separately. Structured activity provides safe event codes, timestamps and correlation identifiers. Prompts, tokens, raw provider errors and login contents stay out of the feed. Stale or partial telemetry is labelled.

## Verification and deployment boundary

[ADRs 0131–0133](adr/README.md) govern access, handoff and enrollment. [The runbook](RELAY_VNEXT_RUNBOOK.md) defines operations; [the session record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) dates verification and deployment.

Actual provider sign-in remains an operator action. Keyring extraction, cross-store atomic transactions, physical phone input, semantic accessibility within streamed pixels and a complete paid-entry transaction are not established by synthetic tests.
