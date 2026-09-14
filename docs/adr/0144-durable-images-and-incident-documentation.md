# ADR 0144: Durable image requests and maintained incident operations

<!-- docs-scope: decision-record -->

Date: 2026-09-13. Private maintainer decision. Image repair is deployed with bounded actual-client verification; the documentation/CI changes are local until separately committed and pushed.

## Decision and precedence

Public async image requests commit owner-scoped PostgreSQL receipts before acknowledgement and use an atomic single-dispatch claim. Completion requires authoritative owned image records. This supersedes process-local application queue storage for `/v1/images/requests`; it does not replace the relay's bounded admission cache or promise exactly-once upstream execution. The single-dispatch and uncertain-outcome rules of [ADR 0130](0130-image-receipts-and-uncertain-outcomes.md) remain.

Verify public bearer sessions with a dedicated bounded Auth client, independent of administrator configuration and database traffic throttling. Distinguish temporary verification failure from a rejected token. Favorites must durably commit before successful acknowledgement. Preserve the public DTO/artifact boundary in [ADR 0129](0129-public-image-artifacts-and-verified-identity.md).

Maintain one private incident system in `post-mortem`: a dated current-state record, append-only observations/actions, incident register, known failure modes, runbooks and explicit prevention actions. [ADR 0128](0128-documentation-authority-and-federation-contract.md) is extended with complete catalog checks, source-bound review and generated views; older operational observations remain historical evidence.

## Failure and recovery semantics

Queued work can be claimed within its bounded window; claimed work is not leased for another dispatch after uncertainty. Deadline expiry reports bounded failure rather than another synthesis. Stored assets and original receipt identity are retained. A late authoritative completion can be recorded; status expiry is not proof that no side effect occurred. Cancellation does not imply a refund.

The historical stopped controller was recovered by archiving a proven stale lock after process/listener/file-identity checks. The follow-up launcher now uses a kernel-held local guard and external guardian for automatic crash recovery; its isolated evidence is dated separately, and production rollout/legacy-marker migration remain open. Keep those deployment limits explicit rather than treating local drills as production acceptance.

## Evidence and limits

[The image incident](../../post-mortem/incidents/2026/2026-09-13-image-generation/README.md) records migration, deployment, security and isolated-database tests, a real signed-in generation, download and Favorites persistence. It does not establish load capacity, paid settlement or interrupted in-flight recovery from that single browser test.

[The documentation incident](../../post-mortem/incidents/2026/2026-09-13-documentation/README.md) records consolidation and local validation. CI enforcement is not live until the workflow is pushed and executed. Fingerprints detect monitored source drift, not every semantic error. Storage-accounting verification and automatic controller detection remain open.
