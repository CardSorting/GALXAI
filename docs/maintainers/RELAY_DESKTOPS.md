# Pool sign-in desktops and account repair

<!-- docs-scope: current-guide -->

Private operator guide for the installed Premium monitor. [Service operations](../runbooks/relay-pool-services.md) owns installation; [account management](../reference/relay-account-management.md) owns lifecycle. The older custom workspace organizer and single-controller inspector are retained in [legacy desktop operations](legacy-desktop-operations.md), not implemented as pool monitor controls.

## Open a workspace

Open the **GALX Premium Monitor**, or use its fixed Spotlight/Dock app. The launcher starts the local services when needed and requests a one-use scoped session. The signed-out page offers the corresponding app link. Visiting a plain URL does not automatically grant access; do not paste long-lived keys.

In Connections, choose **Open desktop** for the saved registration. The valid desktop ticket connects automatically. **Back to registration** returns to the fixed monitor. Monitor and desktop sessions are separate from customer authentication and inference keys. Expiry or restart requires reconnecting.

## Organize workspaces

Accounts and Connections are separate views with name/status filters. Accounts adds Health and Issues first/Name A–Z sorting; Connections adds in-progress, ready, registered, attention, unknown and removed views. Healthy completed connections collapse in the default list. Reconnect-required connections remain visible with repair controls open. Clear filters recovers an empty search.

Use **Manage → Rename** for recognizable labels and **Remove** for retained lifecycle removal. A registered account's name stays synchronized with its registration. The monitor does not provide legacy custom groups, drag/drop ordering, generic desktop deletion or arbitrary destination selection.

## Understand the three objects

| Object | Meaning |
| --- | --- |
| Central account | Canonical encrypted identity, unique assignment and desired state |
| Account engine | In-process execution engine inside its owning pool runtime container |
| Sign-in desktop | Manually created Linux browser/terminal container and retained home on the owning daemon |

The desktop is not a macOS VM. It has its own home/profile and does not receive the Mac home, source checkout, database, vault root or Docker socket. The monitor has its owning daemon socket. The relay VM provides the execution boundary; the Mac remains a shared trusted host.

A running desktop does not establish account health or execution readiness. A stopped desktop is normal after successful registration, but an unfinished registration needs a running desktop for sign-in/review. Names are labels, not identity or permission.

## Enroll a new or unconfirmed account

For the active Premium service, the action is **Connect account**: create a named connection, manually sign in, then connect to verify and save centrally in paused state. Premium verifies paid class. Enable is separate after execution activation. The old **Enroll shard** inspector belongs only to legacy unassigned accounts and cannot assign them to the Premium service.

Use the full [manual registration procedure](RELAY_CREDENTIAL_ENROLLMENT.md). Existing pool accounts must reuse their bound registration and home. Neither matching a label nor copying a browser profile transfers ownership.

## Repair flow

1. Filter Accounts or Connections by attention and read the health reason.
2. For expired or rejected sign-in, choose Reconnect for the matching account; start the desktop if needed.
3. Complete manual provider sign-in inside it, then choose Reconnect → Save new sign-in through the monitor.
4. Inspect central saved state and matching relay confirmation. Current metadata is not a successful generation test.
5. For cooldown/failures, respect the reported state and inspect the owning account; do not clear policy/counters or borrow another deployment.
6. For unknown connectivity, restore the owning service and refresh rather than labeling the account failed.

Pause on a new pool account changes central desired state and invalidates old authorization; it is not the legacy maintenance hold that keeps a worker alive for inspection. Preserve original requests and leases during repair. Removed registered accounts cannot be repaired by re-enabling them.

## Terminal and sign-in

The desktop page exposes allowlisted Terminal and Browser launch actions after connection. Complete the provider's interactive flow manually. Saved-file evidence is read only by the owning monitor/registrar; no browser token upload is supported. An expired or cancelled sign-in offers an explicit new sign-in action.

The guest helper commands and custom saved-home selection remain documented in [legacy terminal reference](legacy-desktop-operations.md#terminal-and-sign-in) where that guest image supports them. Starting a separate guest relay never registers central capacity or bypasses the Premium service's restrictions.

## Mouse, keyboard and accessibility

The host page provides labeled controls, visible focus and explicit connection recovery. Manage dialogs trap focus natively, retain input on errors and initially focus Cancel for removal. Layout checks cover desktop/tablet/phone widths, icon-plus-text health and overflow.

Keep guest screenshots and clipboard contents private. Browser emulation does not qualify physical phones, screen readers or semantic accessibility inside streamed pixels. The display does not expose the guest accessibility tree.

## Stop, disconnect and delete

| Action | Result |
| --- | --- |
| Close/disconnect viewer | End that display session; keep desktop processes and home |
| Stop desktop | Stop processes and preserve home, registration and account history |
| Start desktop | Resume an active registration's own desktop; does not enable or renew the account |
| Remove unfinished registration | Save removal centrally, cancel review/tickets, disconnect sessions and attempt stop; restorable with new review |
| Remove registered account | Permanently revoke central access, remove linked registration from active results, disconnect sessions and attempt stop |

No monitor action deletes desktop files or transfers the account binding. Removal is saved before stop, so a stop failure appears as incomplete cleanup. Filter Connections by Removed and choose **Stop desktop**. Old direct controls and new display connections reject removed registrations. Restore is offered only for unfinished registrations while registration is open.

A missing bound home needs administrator recovery; preserve central records and original operations instead of importing credentials elsewhere. The destructive legacy Delete desktop action remains scoped to [legacy operations](legacy-desktop-operations.md#stop-disconnect-and-delete), never a pool health-repair recipe.
