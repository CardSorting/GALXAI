# Relay desktops and manual repair

<!-- docs-scope: current-guide -->
> Private operator interface. [ADR 0131](../adr/0131-private-operator-desktops-and-maintenance.md) governs access/lifecycle; [ADR 0132](../adr/0132-recoverable-desktop-credential-handoff.md) governs synchronization.

## Open a workspace

Run `npm run relay:desktops` on the controller host, or `npm run relay:open` for read-only inspection. The launcher uses host-held admin authorization to obtain a one-use, 60-second ticket. The page exchanges it for an origin-bound, HttpOnly, SameSite=Strict cookie and removes the fragment. The admin key never belongs in browser storage.

Sessions last at most 12 hours, live in the controller process and are separate for monitor and desktops. Reopening through the launcher replaces the prior session for that purpose. Restart or expiry requires reconnecting. These interfaces are loopback-only: foreign origins, forwarding headers and nonlocal clients are rejected. Inference keys cannot issue grants.

`npm run relay:monitor` starts the terminal HUD; its `o` shortcut opens the same HTML monitor. For a nondefault controller port, supply `RELAY_PORT` to the launcher (for example, `RELAY_PORT=3301 npm run relay:open`).

Build changed guest code with `npm run relay:desktops:build`. `RELAY_DESKTOP_IMAGE` defaults to `galxai-relay-desktop:v1`. Building an image does not update existing workspace containers.

## Understand the three objects

| Object | Meaning |
| --- | --- |
| Shard credential | Registered account authority and revision |
| Inference worker | Serving process, generation, capabilities and capacity |
| Desktop workspace | Separate terminal/browser environment, saved home and optional shard link |

The desktop is a Linux container with Terminal and Chromium in a macOS-inspired shell. It is not a macOS VM or hardware isolation. Each has its own network, persistent home and browser profile. It receives no host home, source checkout, Docker socket, database access or vault root. Resource and operation limits bound consumption.

Viewer connection is independent of shard health. Creating a desktop does not enroll an account. Linking selects existing authority with an expected-link precondition and does not expose credentials to the page.

## Repair flow

For an already signed-in, unlinked desktop, open **Link shard → Find matching shard**. Matching reads the saved guest login and selects one existing registered account for review; the desktop name is only a label. Choose **Save link**, then **Check now** to validate and synchronize that account. Automatic sync also checks linked, running desktops when enabled. A missing match requires separate administrator enrollment; creating another desktop does not enroll it.

Expired registered accounts remain in the private link selector as **Sign-in expired**. They cannot allocate workers until fresh credentials pass validation; traffic also requires confirmed serving health. Removed, revoked or otherwise ineligible registry rows are not repair targets. Matching alone never saves the link or changes credentials.

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

The guest relay is separate from the serving fleet. Closing its viewer keeps it running. Stopping the desktop closes it; run start again after resuming. Local setup is not registry enrollment or fleet readiness.

Native sign-in exposes a fixed provider URL, expiring code, status and cancellation. Custom guest homes require explicit selection. Keyring-only logins require file-backed reauthentication. Never paste a token into a browser control. See [credential recovery](RELAY_CREDENTIAL_ENROLLMENT.md).

## Mouse, keyboard and accessibility

The viewport supports pointer/keyboard interaction, scaling and reconnect. Native controls provide launch, connection status, accessible actions, bounded text transfer and escape from guest keyboard capture. Composed Unicode text is supported; sent drafts are cleared.

Guest content can contain sensitive information. Keep screenshots and clipboard content private; activity excludes guest output and credential contents. Native controls and synthetic input have been tested. Physical phone input and semantic accessibility inside streamed pixels remain unverified; the stream does not expose a guest accessibility tree.

## Stop, disconnect and delete

| Action | Effect |
| --- | --- |
| Close viewer or disconnect session | End access; keep workspace and home |
| Stop desktop | Stop processes; preserve home/configuration |
| Start desktop | Resume environment; inspect any local relay independently |
| Change/unlink shard | Change explicit association; recheck expected state before sync |
| Delete desktop | Explicit confirmation removes owned resources and persistent home |

Do not delete a workspace as a health-repair shortcut. Review its saved login, ownership and traffic hold separately. Production resources are separate from disposable preview cleanup. See [recovery](../RESILIENCE_AND_DISASTER_RECOVERY.md) and [API reference](../RELAY_API_REFERENCE.md).
