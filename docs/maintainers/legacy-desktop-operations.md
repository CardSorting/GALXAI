# Legacy desktop operations

<!-- docs-scope: current-guide -->
This guide applies only to the retained single-controller federation and its existing desktops, as identified in [current state](../../post-mortem/CURRENT_STATE.md). Premium and Standard use the [local pool service procedure](../runbooks/relay-pool-services.md) and [central management contract](../reference/relay-account-management.md). These legacy commands do not create or administer either new pool. Assigned accounts are excluded from legacy enrollment, refresh and lease authority.

> Private operator interface. [ADR 0131](../adr/0131-private-operator-desktops-and-maintenance.md) governs access/lifecycle; [ADR 0132](../adr/0132-recoverable-desktop-credential-handoff.md) governs synchronization, with the owning-desktop and manual-only restrictions in [ADR 0152](../adr/0152-manual-desktop-only-shard-authority.md).

## Open a workspace

Double-click **GALX Relay Monitor** on the host desktop to open Relay Desktops, or run `npm run relay:desktops` from the project. `npm run relay:open` opens the separate read-only monitor. The launcher uses host-held admin authorization to obtain a one-use, 60-second ticket. The page exchanges it for an origin-bound, HttpOnly, SameSite=Strict cookie and removes the fragment. The admin key never belongs in browser storage.

Sessions last at most 12 hours, live in the controller process and are separate for monitor and desktops. Reopening through the launcher replaces the prior session for that purpose. Restart or expiry requires reconnecting. These interfaces are loopback-only: foreign origins, forwarding headers and nonlocal clients are rejected. Inference keys cannot issue grants.

`npm run relay:monitor` starts the terminal HUD; its `o` shortcut opens the same HTML monitor. For a nondefault controller port, supply `RELAY_PORT` to the launcher (for example, `RELAY_PORT=3301 npm run relay:open`).

Build changed guest code with `npm run relay:desktops:build`. `RELAY_DESKTOP_IMAGE` defaults to `galxai-relay-desktop:v1`. Building an image does not update existing workspace containers.

## Organize workspaces

Choose **Manage workspaces** under **Your workspaces**. **By health** automatically separates attention, healthy capacity, holds/cooldowns, setup and unconfirmed evidence. A stopped repair desktop can accompany a healthy serving shard; each row reports desktop state separately. Health categories cannot be changed by dragging.

Use the **Healthy** and **Deactivated** checkboxes beside search in any tab. Healthy requires confirmed serving capacity. Deactivated includes stopped desktops or manually paused new work; expiry, rejection and automatic cooldown alone do not imply deactivation. Select both for either status, or leave both unchecked to show all. Search further narrows the results, counts follow the current filters, and **Clear filters** restores all statuses. Filters follow tab changes and survive reload through the private URL fragment; they do not change saved organization or traffic. A stopped repair desktop can match both filters while its linked shard continues serving.

**New tab** creates a custom group, such as a provider or project name. **All groups** displays columns; a named tab isolates one group. Drag a workspace by its grip to another column or named tab, or between rows to reorder it. **Move** provides destination and position controls for keyboard and touch. **Edit tab** renames or reorders tabs and can remove a tab after confirming that its workspaces return to **Ungrouped**. No desktop is stopped or deleted by organization changes.

Names, membership and order are shared by administrator sessions on that controller and saved in the private `<desktop-journal>.organization.json` file with mode `0600`. A revision precondition prevents stale windows from overwriting newer edits. New desktops enter Ungrouped, and deleted desktop IDs are omitted. Organization storage is independent of the credential/lifecycle journal: failures disable organization writes without stopping desktops or credential synchronization. Up to 12 custom tabs are supported, each with a unique name of 1–40 characters.

The organizer preserves an existing display connection, and **Back to desktop** returns to it. Direct links use `/desktops#view=workspaces&tab=health`; the same administrator session requirements apply. New organization assets and `/api/desktops/organization` are private and reject ordinary inference keys, monitor sessions, foreign origins and unknown mutation fields.

## Understand the three objects

| Object | Meaning |
| --- | --- |
| Shard credential | Retained account authority and revision; needs confirmed owning-desktop provenance before serving |
| Inference worker | Serving process, generation, capabilities and capacity |
| Desktop workspace | Manually created terminal/browser environment and saved home; its local link is distinct from the durable enrollment binding |

The desktop is a Linux container with Terminal and Chromium in a macOS-inspired shell. It is not a macOS VM or hardware isolation. Each has its own network, persistent home and browser profile. It receives no host home, source checkout, Docker socket, database access or vault root. Resource and operation limits bound consumption.

Viewer connection is independent of shard health. Creating a desktop does not enroll an account. Complete sign-in there and explicitly choose **Enroll shard**. Linking selects existing authority with an expected-link precondition and does not expose credentials to the page.

## Enroll a new or unconfirmed account

1. Manually create a workspace with **New**, or select the matching existing desktop. Start it if stopped.
2. Choose **Set up shard** or **Inspect shard** to open the inspector, then **Sign in**. Complete the provider interaction inside this desktop.
3. Choose **Enroll shard**. This reads the saved guest login and confirms the account in the database; the page accepts no pasted token.
4. Wait for the saved result. **Enrollment saved · waiting for worker status** is a persistence result, not ready capacity. Verify the worker-applied revision and requested capability separately.

An eligible legacy account uses this same confirmation flow. No label, saved link or unexpired token automatically establishes enrollment. Each confirmed account keeps one owning desktop; another desktop cannot take its binding. Revoked/dead/quarantined rows and ambiguous matches fail closed. Preserve the existing home and resolve a conflict before trying a different workspace.

## Repair flow

For a new or unconfirmed account, sign in and choose **Enroll shard** in its inspector. For an already enrolled account, open its bound desktop; **Change linked shard → Find matching shard** can recover its local link. Matching reads the saved guest login and selects one existing registered account for review; the desktop name is only a label. Choose **Save link**, then **Check now** to validate and synchronize that account. Automatic sync checks already enrolled, linked, running desktops when enabled. It cannot enroll accounts or renew an expired provider session. A genuinely new account requires **Enroll shard** after sign-in. An ambiguous, unavailable or mismatched lookup requires investigation before enrollment; it does not authorize creating a duplicate. Existing unconfirmed accounts require explicit enrollment rather than matching alone.

Expired registered accounts remain in the private link selector as **Sign-in expired**. They cannot allocate workers until fresh credentials pass validation; traffic also requires confirmed serving health. Removed and revoked rows are not repair targets. Legacy rows remain retained; until confirmed with Enroll shard they contribute no serving capacity. Matching alone never saves the link or changes credentials.

1. Open the shard's linked desktop.
2. Inspect capabilities, worker generation, traffic state and the latest structured activity reason.
3. Pause new work if intervention requires a maintenance hold.
4. Complete sign-in in Terminal, Chrome or the native device-code panel.
5. Inspect validation and the saved registry revision. A held shard cannot start a replacement worker after rotation.
6. Once the saved authority is reviewed, resume explicitly when replacement is needed, then verify the new worker and capabilities. Admission stays gated by fresh evidence. For an unchanged worker, inspect its health before resuming.

Test each stage separately: an accepted provider inventory proves authentication and model discovery; **Ready for work** confirms saved credentials and current worker eligibility. Finally, send a small request through the normal authenticated API and verify its completed result. Neither a successful browser login nor inventory acceptance proves that inference completed.

A durable hold blocks admissions and replacement starts while preserving an existing worker, including after credential rejection. Accepted work can finish. A hold cannot override removed, revoked, expired or changed registry authority. Resume removes only the hold.

Graceful controller stop drains/removes unheld workers. Apply and verify a hold before restart when preserving an existing worker is required. Holds survive restart; desktop processes have a separate lifecycle.

## Terminal and sign-in

| Command | Purpose |
| --- | --- |
| `galx-relay login` | Interactive provider CLI sign-in using file-backed storage |
| `galx-relay login-device` | Device-code sign-in |
| `galx-relay cancel-login` | Cancel the active device-code attempt |
| `CODEX_HOME=/home/operator/path/to/codex-home galx-relay use-login` | Select a custom saved guest login |
| `galx-relay setup` | Configure a separate local relay privately in the guest |
| `galx-relay start`, `status`, `logs`, `stop` | Manage that local guest relay |

The guest relay is separate from the serving fleet. Closing its viewer keeps it running. Stopping the desktop closes it; run start again after resuming. Local setup is not registry enrollment or fleet readiness. External HTTP/CLI enrollment is disabled. See the [manual enrollment procedure](legacy-desktop-enrollment.md).

Native sign-in exposes a fixed provider URL, expiring code, status and cancellation. Custom guest homes require explicit selection. Keyring-only logins require file-backed reauthentication. Never paste a token into a browser control. See [credential recovery](legacy-desktop-enrollment.md).

## Mouse, keyboard and accessibility

The viewport supports pointer/keyboard interaction, scaling and reconnect. Native controls provide launch, connection status, accessible actions, bounded text transfer and escape from guest keyboard capture. Composed Unicode text is supported; sent drafts are cleared.

Guest content can contain sensitive information. Keep screenshots and clipboard content private; activity excludes guest output and credential contents. Native controls and synthetic input have been tested. Physical phone input and semantic accessibility inside streamed pixels remain unverified; the stream does not expose a guest accessibility tree.

## Stop, disconnect and delete

| Action | Effect |
| --- | --- |
| Close viewer or disconnect session | End access; keep workspace and home |
| Stop desktop | Stop processes; preserve home/configuration |
| Start desktop | Resume environment; inspect any local relay independently |
| Change/unlink shard | Change the local association only; the database binding remains with its enrolled desktop |
| Delete desktop | Explicit confirmation removes owned resources and persistent home; does not release or transfer the database binding |

Do not delete a workspace as a health-repair shortcut. A missing or deleted bound home is an administrator recovery incident; automatic reassignment or external credential import is not supported. Review its saved login, ownership and traffic hold separately. Production resources are separate from disposable preview cleanup. See [recovery](../RESILIENCE_AND_DISASTER_RECOVERY.md) and [API reference](../reference/legacy-federation-api.md).
