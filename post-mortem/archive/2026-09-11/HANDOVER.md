# Federation handover

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../CURRENT_STATE.md) and the [incident runbooks](../../runbooks/triage.md).

<!-- docs-scope: operational-record -->

Private handover, reconciled September 11, 2026. The September 9 enrollment implementation through `96ae392` is recorded below; newer Sites work has its own dated section. Enrollment evidence is in [the session record](../../../docs/maintainers/RELAY_SESSION_VERIFICATION_20260909.md).

## Dated deployed state

The enrollment investigation identified all 11 rejected production rows as exact leaked integration fixtures. Conditional cleanup revoked 11, skipped zero and preserved rows/ciphertext/counters. After controller reload there was one desired shard, one healthy worker and zero active rejected records; five capabilities were eligible at observation.

A temporary hold then explicit resume preserved the serving container and generation, existing desktop and shard link. The updated worker image was built for future allocations; the existing worker was retained. This pass did not establish a new GALX application or DreamBees follow-up deployment.

Earlier September 7/8 actual-client image results remain dated evidence. No new live image generation or paid-entry transaction occurred in the enrollment pass. Actual new provider sign-in still requires the operator.

## Invariants to preserve

- Retain automatic worker lifecycle; retire bulk host-cache discovery and automatic account seeding.
- Validate explicit new enrollment and save create-only. Refresh existing authority through a linked desktop.
- Keep shard authority, serving worker and repair desktop states separate.
- Pause blocks new admissions/replacement starts; accepted work can finish. Registry revocation, expiry and rotation still win.
- Use delegated host-launched sessions. Ordinary inference access is not administration.
- Keep operational details private and public images/JSON sanitized and allowlisted.
- Preserve revision/generation fences and original operation identity; do not replay uncertain synthesis.
- Keep mutating integration fixtures on the explicit isolated test database.

## Operations

Open `npm run relay:open` or `npm run relay:desktops` on the controller host. Follow [desktop repair](../../../docs/maintainers/RELAY_DESKTOPS.md), [credential recovery](../../../docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [the runbook](../../../docs/RELAY_VNEXT_RUNBOOK.md).

The private journal/registry protocol supports conditional recovery, not a distributed atomic transaction. Custom guest homes are supported by explicit selection; keyring-only storage uses reauthentication. Unrelated accounts require reviewed links to existing eligible authority or separate enrollment.

Physical phone input and guest semantic accessibility remain unverified. A device challenge is not completed account approval. Preserve these limits in future status reports.

## Sites strategy handover — September 11

The uncommitted working tree based on `4587642` now implements fixed-price Sites content through the existing relay. Provisional server defaults are $0.05 per durably completed generation and 20 admitted operations per account per rolling day, with explicit cohort, funding and local limits. Missing supplier quota/cost is accepted as unknown; missing completion is not guessed. Pending operations retain their original price and recover through authenticated reads.

[ADRs 0134–0136](../../../docs/adr/README.md), [Sites operations](../../../docs/maintainers/SITES_OPERATIONS.md), and the [customer-local delivery runbook](../../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/LIVE_ADAPTERS.md) are the current instructions. The fixed-mode implementation passed 103 application, 52 database and 68 companion checks, type checks, production build, packaged restart and the 633-asset local scan; counts overlap. [Evidence](../../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/opaque-provider-verification.json) records their scope.

The earlier [September 11 production release](../../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/RELEASE_20260911.md) deployed a metered precursor with paid generation disabled. The fixed-mode pass did not deploy or enable it, issue live supplier requests or charge customers. Historical native-host save/private-update success remains separate from a full live billed workflow. Preserve volumes/signing authority and fixed-price settlement compatibility during rollout or rollback. Direct CLI archive save remains a separate unqualified path.
