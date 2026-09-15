# System topology and maintainer onboarding

<!-- docs-scope: current-guide -->

Private onboarding. Read [current state](../post-mortem/CURRENT_STATE.md), [architecture](ARCHITECTURE.md), [the federation contract](FEDERATION_STRATEGY.md) and [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md). Deployment observations and accepted strategy have separate authority.

## Follow a request

Trace verified product identity and entitlement through the server adapter, requested-capability admission, assigned worker and original recovery reference. Public responses expose allowlisted customer fields and sanitized artifacts. Prompts, task IDs, model output and caller-provided account hints cannot grant permission. Uncertain outcomes retain their original identity.

## Follow an account

Start with a manually created Relay Desktop. The operator signs in inside it and explicitly chooses **Enroll shard**. The host validates saved credentials and commits a unique owning-desktop binding to the encrypted registry. An eligible legacy record needs the same explicit confirmation. Creating, polling, matching and linking do not enroll; API/CLI/file ingestion and host-cache import are closed.

The controller and database admission both reject unconfirmed authority. Cold inventory preflight precedes allocation; fresh requested-model evidence gates routing. One registered row, one running desktop and one eligible worker are different counts. Worker reconciliation remains automatic.

## Follow a repair

Open the owning desktop through the host shortcut. Start it if stopped, review the link and any maintenance hold, then manually renew the provider sign-in. Saved-file sync validates and conditionally persists the new login for that bound account. It cannot renew the provider session, enroll another account, move a database binding or resume traffic.

Inspect saved authority, worker application and requested capability independently. A hold blocks replacement starts; review before resuming. Preserve the desktop home and private journals, and investigate a lost home or conflicting binding as a recovery incident rather than importing elsewhere.

## Practice and evidence

Host launchers issue separate monitor and desktop sessions. Ordinary GALX sessions, preview approval and inference keys do not authorize desktop administration. Use synthetic fixtures and the [manual database tests](maintainers/RELAY_HARDENING.md) for practice; never start a second controller against production authority.

Use [enrollment/recovery](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [desktop operations](maintainers/RELAY_DESKTOPS.md), [API recovery](RELAY_API_REFERENCE.md#request-recovery) and [security](SECURITY.md) for complete procedures. Historical ADRs and September 9 measurements remain dated evidence. ACT-022 tracks real manual account acceptance; the image incident remains separate in current state.
