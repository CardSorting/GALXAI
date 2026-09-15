# Relay service implementation audit — September 15, 2026

<!-- docs-scope: operational-record -->

**Historical checkpoint.** The observations and pending items below are preserved as recorded before later local installation and management releases. They are not current setup requirements. Use [current delivery](delivery-plan.md), [the implemented account contract](../../docs/reference/relay-account-management.md) and [current state](../../post-mortem/CURRENT_STATE.md) for subsequent completion and remaining acceptance.

Private audit checkpoint. [Release evidence](../../post-mortem/releases/2026-09-15-relay-services.json) records exact tests, applied schemas and image IDs. [Current state](../../post-mortem/CURRENT_STATE.md) remains production authority. The [earlier foundation audit](pre-service-audit-2026-09-15.md) preserves its original findings; their old “unimplemented” labels do not describe this release.

## Implemented and checked

Central scoped principals, manual paid/free registration, immutable pool assignment, revision-checked lifecycle controls, current-epoch execution grants and the existing account lease ledger are integrated. Separate execution schemas have no account/credential tables. Legacy account readers exclude assignments; legacy enrollment, refresh and leases deny them. Two actual HTTP monitor backends enforce fixed scope, independent sessions, read-only denial and origin checks. Both desktop/mobile UI fixtures pass; the reviewer scored four fixes resolved.

Standard rejects forbidden workloads before admission/provider access. Premium's image trial has its own central grant and never triggers an automatic image probe. The application chooses one text pool and only Premium for Sites/images, with no peer/legacy dispatch fallback or second account lease. Recovery retains original configured job origins. Public wire DTOs omit internal fields and images are re-encoded.

Five Docker service targets and three separate Compose files are built and container checked. Verification caught and fixed a server/browser module-name collision. Explicit component files replace shared environment inheritance; host-check and gate tools are implemented. Applied database checks retain all canonical accounts, with zero assignments and closed gates.

## Activation requirements still open

- Actual separate Premium/Standard host targets, private central HTTPS endpoint, matching platform images and restricted secret delivery.
- Complete address/route review, persistent peer denial, distinct daemon/host checks, proxy restrictions and reboot acceptance on those hosts.
- Manual sign-in and registration of paid/free accounts, current runtime acknowledgments and own-pool text/Sites/image qualification.
- Compatible application deployment, real customer response/authorization and billing/usage acceptance; retained old origins for unknown jobs.

No candidate production stack or actual provider sign-in/generation was run. Local proofs do not establish physical isolation or close the existing image incident. Follow the [service runbook](../../docs/runbooks/relay-pool-services.md); no further account-schema redesign is required to start host installation.
