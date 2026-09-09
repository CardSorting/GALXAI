# Federation handover

Private handover, updated September 9, 2026. Implementation through `96ae392`; detailed evidence is in [the session record](docs/maintainers/RELAY_SESSION_VERIFICATION_20260909.md).

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

Open `npm run relay:open` or `npm run relay:desktops` on the controller host. Follow [desktop repair](docs/maintainers/RELAY_DESKTOPS.md), [credential recovery](docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) and [the runbook](docs/RELAY_VNEXT_RUNBOOK.md).

The private journal/registry protocol supports conditional recovery, not a distributed atomic transaction. Custom guest homes are supported by explicit selection; keyring-only storage uses reauthentication. Unrelated accounts require reviewed links to existing eligible authority or separate enrollment.

Physical phone input and guest semantic accessibility remain unverified. A device challenge is not completed account approval. Preserve these limits in future status reports.
