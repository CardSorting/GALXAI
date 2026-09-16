---
version: 1
slug: "src-relay-pool-monitor-html"
primary_target: "src/relay/pool-monitor.html"
related_targets: ["src/relay/pool-monitor.js", "src/relay/pool-monitor-model.js", "src/relay/pool-monitor.css", "src/relay/pool-monitor-login.html", "src/relay/pool-monitor-login.js", "src/relay/pool-monitor-access.css", "src/relay/pool-desktop.html", "src/relay/pool-desktop.js"]
---

# Fixed relay account monitors — private surface brief

The complete implemented lifecycle, health, retention and recovery contract is [account management](../../docs/reference/relay-account-management.md). [Current state](../../post-mortem/CURRENT_STATE.md) owns installed evidence; the prototype remains historical design input.

## Overview

Operate. An authorized operator reviews accounts in one fixed Premium or Standard destination, completes manual sign-in and registration, and checks whether a saved change has been applied. A viewer can inspect status and activity. This is private operator documentation; this brief and its captures must remain outside public documentation, deployment content and browser assets.

The direction is a precise sidebar console with a warm, restrained character: graphite surfaces, soft silver controls, muted supporting text and plain account rows. The [incumbent prototype](../../internal/dual-relay-design-2026-09-15/prototype/README.md) supplies the fixed-destination and saved-versus-applied interaction model; the [federation monitor brief](src-relay-federation-html.md) retains its own scope. [PRODUCT.md](../../PRODUCT.md) and [DESIGN.md](../../DESIGN.md) remain the global authorities. These measured local choices do not replace the global design system.

The first viewport puts destination and capability scope in the left column, Accounts and its registration action at the top of the main area, then connection, execution and registration status, followed by the account list. Accounts, Connections and Activity are separate hash-addressable views with persistent selected navigation. The defining interaction is seeing a requested account change saved while its relay confirmation remains explicitly pending.

## Colors

The actual scoped custom properties in `src/relay/pool-monitor.css` are the source of truth:

| Token | Value | Applied role |
| --- | --- | --- |
| `--bg` | `#101317` | Graphite page ground |
| `--panel` | `#171b21` | Fields, notices and desktop viewport |
| `--line` | `#343b46` | Dividers, quiet controls and badges |
| `--text` | `#f1f3f6` | Primary text |
| `--muted` | `#b0bac7` | Supporting copy, labels and timestamps |
| `--accent` | `#d4d4d8` | Silver primary controls, disclosures, focus and selection |
| `--good` | `#98d7ae` | Connected and Applied text |
| `--warn` | `#f4c786` | Awaiting confirmation, interrupted connection and notices |

**The Separate Confirmation Rule.** Requested state uses a neutral outlined badge; observed confirmation has its own text and color. Enabled is not visual proof of an applied change. Destination identity is written explicitly rather than communicated by different Premium and Standard palettes.

## Typography

The implementation uses the native `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` stack at 14px with 1.55 line height. Supporting labels, timestamps, badges and compact table controls are 12px. Registration names are 18px; the empty-state title is 22px; destination identity is 20px; section headings are 22px; Accounts is 30px, reducing to 24px on phones. Accounts uses 1.2 line height and −0.025em tracking. Table values and activity timestamps use tabular numerals. Paragraphs stop at 72ch.

This records the existing private operator typography, without making a new global display-font rule.

## Layout

The desktop shell uses a fixed-width 232px sidebar column and a flexible main column. The sidebar remains visible on desktop using sticky positioning. The main area has a 1600px maximum width and 44px by 48px padding. The sidebar holds destination, three selected view links and session controls. The account table aligns requested state, confirmation, health and actions in separate columns. Ruled rows and section spacing establish groups without enclosing every section in a card.

At 900px and below the sidebar narrows to 190px and main padding becomes 32px by 24px. At 760px and below the sidebar becomes a top block, its navigation becomes a horizontal row and main padding becomes 28px by 20px. Each account becomes a two-column record with explicit field labels; account identity and actions span its width. Account actions have at least 44px height. The registration name field occupies its own full-width line, actions wrap, registration rows stack and activity timestamps move beneath their descriptions. Long record text wraps. Between phone and desktop layouts, table overflow stays inside its labeled, keyboard-focusable region.

## Elevation & Depth

The surface is flat. One-pixel dividers and small changes in background tone establish hierarchy; there are no shadows, blur, gradients or entrance animations. Hover brightens buttons. Focus is a 2px silver outline with 4px offset. State changes appear immediately, without decorative movement.

## Shapes

Buttons and inputs use 6px corners, requested-state badges use 4px corners, and notices use 8px corners. Main content remains open and rectangular. Quiet actions have transparent backgrounds and outlined edges; primary registration actions have solid silver backgrounds and dark text.

## Components

- **Status strip:** Connection, Execution and Registration remain separate facts, with refresh and an update time. A failed refresh preserves the last snapshot, announces interruption and disables account actions. The script polls every ten seconds while the document is visible; manual Refresh remains available. An Applied label requires fresh relay evidence and matching account revision and epoch.
- **Account rows:** Show name, account class, reported text-model count, requested state, relay confirmation and a Health cell with icon, label, reason and sign-in expiry. Operators receive Enable or Pause, a matching registration link and a consistent Manage disclosure for Rename/Remove. Search, Status and Health combine with Issues first/Name A–Z sorting, visible counts and Clear filters recovery. Removed records have an explicit filter and stay out of active counts. Attention conditions distinguish sign-in, access, cooldown, failures and overdue confirmation from unknown connection health. Enable requires current sign-in, fresh relay, open execution and no attention condition. Viewers can filter without mutation controls.
- **Manual connection:** Search and filters separate unfinished, attention, connected and removed records. Connect account creates the named desktop; Sign in → Connect verifies and saves a paused account atomically. Healthy completed connections collapse under Connected accounts. Reconnect-required rows stay visible with same-account repair controls open; expiry or rejected credentials never create a replacement account. Errors appear once inline, stale success notices clear when a new action starts, and confirmed saved state reconciles uncertain Connect responses. Enable remains separate from connection and installation activation.
- **Refresh continuity:** Record/action identity restores focus after a render, and expanded model disclosures remain open. Selected text in the account or registration regions defers rerendering so it is not destroyed by polling. Pending actions are locked by stable record identity across renders. Failed refreshes disable mutations while preserving the last snapshot; first-load failures do not pretend a snapshot exists. Explicit same-intent retries retain IDs when session storage is available, and no uncertain mutation retries automatically. Announced notices distinguish a saved change from its later confirmation.
- **Empty state:** Operators receive a Connect your first account action with a paid/free reminder and the paused-state outcome. Empty filter results have a separate Clear filters action. Read-only viewers are told an operator can register accounts and that their access supports inspection. Empty registration and activity sections give factual empty messages.
- **Sign-in desktop:** A separate page shares the palette and control treatment. Back to registration stays visible. A valid one-use ticket connects automatically, then Open terminal and Open browser become available. Disconnection hides those launch actions. Start desktop and a confirmed Stop desktop action remain scoped through the saved central registration ID; they preserve the saved account and desktop files. The display is 72vh with a 320px minimum height. Disconnect and launch failures give recovery text. The desktop ticket is removed from the URL immediately. Streamed application pixels are separate from host-page semantic controls.
- **Access:** The fixed monitor uses independently authorized operator and viewer sessions. The server protects private assets and status, checks authorization for mutations and desktop access, and restricts account changes to monitor controls. UI visibility does not confer permission. Operational details stay behind this private boundary.

### Local access refinement — September 15, 2026

The signed-out shell is a narrow, quiet entry screen with explicit Premium or Standard identity, one **Open monitor** app link, a Spotlight hint, and a native help disclosure. It uses the global background, foreground, muted and silver tokens; 30px/24px headings and the existing system sans stack. The layout is centered on desktop and top-aligned on phones, with a full-width 48px action and visible keyboard focus. It contains no account data or keys. The access shell remains the baseline while the subsequent console refinement below focuses the authenticated account workflows.

A valid ticket connects immediately, is removed from the URL, and also works when the browser reuses the existing tab. Invalid or consumed links lead to a clear reconnect action; sign-out confirms the result. Changing from operator to viewer revokes operator authority. The app link is fixed to the owning monitor and is distinct from the single-use browser authorization ticket. Native app shortcuts and the menu-bar launcher are documented in the [service runbook](../../docs/runbooks/relay-pool-services.md).

The subsequent synthetic browser check in `.impeccable/review/relay-access/verification.json` covers both access and authenticated surfaces for both pools at desktop and phone widths, with zero Axe violations, overflow or browser errors. Interaction checks include automatic connection, existing-session reopening, same-document hash navigation, invalid/replayed links, role downgrade and sign-out. These checks do not attest native menu rendering, provider sign-in or generation.

## Do's and Don'ts

- **Do** keep fixed destination identity and capability scope visible, and separate requested state, confirmation and observed health.
- **Do** preserve readable rows, textual state, native disclosures, visible focus and role-specific next steps through refresh and narrow layouts.
- **Do** retain uncertainty after interrupted actions and direct the operator to refresh the saved outcome.
- **Don't** treat saved changes, connection status or registration availability as proof that execution succeeded.
- **Don't** expose private account topology, model inventories, sign-in mechanics or diagnostic evidence on customer-facing surfaces.
- **Don't** promote these local palette or typography choices into a replacement for DESIGN.md.

### Dated evidence and limits — September 15, 2026

The final finish-review disposition was **ship**, with all four requested fixes scored resolved. The private captures show [Premium desktop](../review/relay-pools/premium-desktop.png), [Premium phone](../review/relay-pools/premium-mobile.png), [Standard desktop](../review/relay-pools/standard-desktop.png) and [Standard phone](../review/relay-pools/standard-mobile.png). Premium captures show synthetic account rows, a reviewed registration, its expanded model disclosure and the focused name field. Standard captures show the read-only empty state.

[verification.json](../review/relay-pools/verification.json) records synthetic-only checks at 1440×1100 and 390×844 for both destinations, each with zero Axe violations and no document overflow. This design evidence does not establish production deployment, live provider sign-in, execution readiness, physical-phone behavior or accessibility inside the streamed desktop. No additional unresolved design finding was supplied by the final reviewer. No raster artwork ships in these surfaces; the PNGs are private review evidence only.

### Console refinement — September 15, 2026

The focused console uses GitHub Primer’s named search/filter, visible result count and no-result recovery patterns, plus Cloudscape’s task-oriented resource creation approach. Registration uses progressive disclosure and a current step for the saved operation, without adding a global pool switcher. Native disclosures retain model inspection and infrequent recovery actions. The existing graphite palette, system sans stack, flat row structure and 44px phone controls remain intact.

The console fixture captures Accounts, Registration and Activity for both pools at 1440, 900 and 390px, plus both access screens and the registration form. Synthetic interaction checks cover filters, paused account changes, closed execution, outage recovery, explicit prepare/review/register, start/stop recovery, rejection of a substituted desktop ID, viewer denial, ticket replay/downgrade and sign-out. See `.impeccable/review/relay-console/verification.json` and the [dated release record](../../post-mortem/releases/2026-09-15-relay-monitor-console.json) for observed results and local image installation. Older captures above remain historical. This pass does not qualify provider generation, physical phones or accessibility inside the streamed desktop.

### Account management refinement — September 15, 2026

The shared **Manage** disclosure gives Rename and Remove a consistent location. Native modal dialogs use existing panel/line colors, an 8px corner and a bounded 480px width. Rename focuses the existing name; removal names the item, explains retained history and initial focus lands on Cancel. Amber is the existing warning token and is paired with explicit removal wording. Input is preserved on failure; stale revisions require refresh before an explicit retry. Successful removal returns focus to the remaining record or page heading. No new palette value or hook ignore was added.

Unfinished registrations can be restored from Removed, requiring a new access review. Account removal revokes access permanently. Central removal precedes desktop stop; incomplete cleanup remains visible on the removed registration. Health uses small stroke icons plus text, never color alone. Registered accounts inherit account health even with a stopped desktop. Unknown service health remains distinct from an account issue. The no-issues label does not certify provider requests.

The final batched capture check records 28 responsive/accessibility variants in `.impeccable/review/relay-management/verification.json`, including rename/removal dialogs and the creation form. Desktop and phone captures were inspected for hierarchy, control wrapping and modal focus. There were zero Axe violations, document overflow or browser page errors in the synthetic fixture. Behavioral checks include malicious-looking name text, stale rename conflicts, failed desktop stop, explicit cleanup and restore. The [dated management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) separates synthetic coverage, central migration and actual local installation. Prior captures retain their dated scope. Physical phones, screen readers and streamed desktop accessibility remain unqualified.


### Connection lifecycle refinement — September 16, 2026

The [lifecycle audit](../../docs/knowledge/audits/2026-09-16-relay-connections.md) records the targeted workflow and recovery review. The two-step connection, same-account reconnect, retained-state reconciliation and explicit removal use the incumbent graphite/silver console. Primary row actions/disclosures have 44px minimum targets and names wrap. Synthetic checks include 320px reconnect errors, desktop/tablet/mobile surfaces, lost responses and replay; actual installed-monitor acceptance is recorded separately from provider generation. Earlier sections retain dated historical evidence.

### Automatic activation — September 16, 2026

The existing console now explains automatic onboarding in the empty state and connection form. Execution distinguishes Waiting for account, Waiting for relay, Reconnect required, Accounts paused, Activating and explicit Paused. A new verified connection enables automatically under the installed policy; reconnect and replay retain intentional pauses. The 34-variant browser pass includes both automatic empty states at desktop/mobile widths with no Axe violations, overflow or page errors. Installed policy and readiness evidence is separate in the [activation release](../../post-mortem/releases/2026-09-16-relay-automatic-activation.json). No palette or layout redesign.
