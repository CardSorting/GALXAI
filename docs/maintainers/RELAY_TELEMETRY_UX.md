# Account request status and management UX

<!-- docs-scope: current-guide -->

Private contract for the fixed Premium monitor. It uses Accounts, Connections and Activity with persistent destination identity and independent authorization. [The complete account reference](../reference/relay-account-management.md) owns state definitions and [the surface brief](../../.impeccable/surfaces/src-relay-pool-monitor-html.md) owns measured design choices.

Lead with attention count, recognizable name, request-status label/reason and next action. Pair icons with text. Keep saved state, relay confirmation, sign-in and desktop connection separate. Availability defaults to unknown because upstream supplies request outcomes, not continuous health. Cancellation, deadlines and transport loss do not add provider failures. Retained failures remain advisory and cannot veto reconnect or independently authorized Enable. Current credential rejection, expiry, revocation, cooldown and operator holds still apply. An intentionally paused account and a stopped completed-registration desktop are not failures.

Combine account search, saved status and Request status with Issues first/Name A–Z sorting. Connections gets its own search/status filters. Preserve filters, disclosure state and useful focus through refresh; announce result counts and provide Clear filters. Removed records stay out of active counts but remain available under Removed.

Use a consistent **Manage** disclosure. Rename preselects the existing name and retains drafts on failure. Removal names the record, explains permanent account revocation versus restorable unfinished registration, preserves history/files and initially focuses Cancel. Disable duplicate submission; stale revision conflicts require review after refresh. Exact explicit retries retain intent identity when available.

Central save and desktop cleanup have distinct outcomes. A failed stop keeps the removal saved and offers Removed → Stop desktop. Registered-account removal has no restore; unfinished restoration requires new review. Pool Pause stops old authorization and is not the legacy keep-worker maintenance hold.

Connect with native fixed-pool launchers, never token-paste forms. Refresh does not sign in or generate. Operational fields remain private; activity omits raw provider errors, prompts and guest output. Keyboard focus, dialogs and phone layouts have synthetic acceptance; physical phones, screen readers and streamed-pixel accessibility remain separate. Legacy organizer/hold semantics remain [scoped here](legacy-desktop-operations.md).
