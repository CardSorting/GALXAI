# Developer and operator observation protocol

<!-- docs-scope: current-guide -->

Private maintainer procedure.

Observe the intended user task before teaching internal terminology. For product clients, test model selection, unavailable/accepted/uncertain states and recovery without exposing execution topology or provider diagnostics. Internal execution metadata is administrator-only evidence.

For operators, use the fixed Premium/Standard monitor. Test finding an unhealthy account, distinguishing registration from an enabled account, renaming, handling a concurrent update, removing the intended record, and finding failed desktop cleanup under Removed. Check that users understand saved versus applied changes, unknown health, permanent account removal and restorable unfinished registration.

Test keyboard access, initial Cancel focus in destructive dialogs, text-plus-icon status, responsive filtering, preserved search/focus on refresh and viewer restrictions. Familiar management patterns should reduce unnecessary confirmations while retaining an explicit consequence for removal.

Record sample, environment, task completion, first blocking moment, repeated requests and recovery success without secrets or unnecessary user data. Small studies are bounded evidence, not universal UX scores. See [monitor UX](../maintainers/RELAY_TELEMETRY_UX.md), [account contract](../reference/relay-account-management.md) and [verification](../maintainers/RELAY_HARDENING.md).
