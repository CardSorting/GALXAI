---
version: 1
slug: "src-relay-desktops-html"
primary_target: "src/relay/desktops.html"
related_targets: ["src/relay/desktops.js", "src/relay/desktop-login.html", "src/relay/desktop-login.js", "src/relay/desktop/shell.py", "src/relay/desktop/theme.py", "src/relay/desktop/welcome.html", "src/relay/desktop/galx-relay"]
---

# Relay desktops — private operator design brief

## Scope and mode

Operate. A local administrator creates and resumes independent setup workspaces with a real Terminal and Google Chrome. This is private operator documentation; neither this brief nor its review captures belong in public documentation or browser assets. PRODUCT.md and DESIGN.md retain their existing authority. This surface extends GALX's dark operator interface without changing the global design system or relay monitor.

## Chosen direction and hierarchy

The user pinned a macOS-like desktop on Linux, with Terminal and Chrome as its two launchable applications. The opening comment in `src/relay/desktops.html` records the code-led direction: a private library of real desktops, GALX controls outside remote input, and a create/connect/work/disconnect/resume sequence.

The browser shell uses the incumbent dark palette, compact Inter/system typography, restrained borders, readable status text and indigo primary actions. A persistent workspace sidebar contains search, selection and saved/running counts. The current workspace title and lifecycle actions sit above the viewer; app launchers, clipboard, keyboard and display controls remain outside the remote desktop. Notices explain unavailable or unconfirmed state without treating retained workspace names as proof that apps are running.

Inside the viewer, native X11 windows have left-aligned traffic-light controls and centered titles. A dark top menu, blue-violet code-authored desktop background and two-app Dock establish the familiar workspace. The memorable interaction is returning to an independently saved workspace and opening real Chrome or Terminal from its Dock. The guest remains Linux: shortcuts and help use Ctrl, Terminal copy/paste and Alt+Tab accordingly.

## Lifecycle and interactions

- Create names a workspace and optionally records a linked relay. Its home directory, workspace files and Chrome profile persist across Stop and Start. Existing serving credentials are never copied into the desktop. Verified same-account terminal sign-ins can refresh the linked shard through the administrator's automatic sync setting.
- Closing the page or Disconnect display leaves apps running. Reconnect returns to those apps. Interrupted displays retry a bounded number of times before presenting an explicit reconnect action.
- Stop opens a modal explaining that apps and any local relay close and unsaved work can be lost. Initial focus is on Keep working. Saved files and the Chrome profile remain available after Start; this is not a promise to restore unsaved application state.
- Delete identifies the workspace and permanently removes its files, profile and setup only after its exact name is typed. It does not delete a linked serving relay.
- Clipboard transfer is explicit in each direction. The host clipboard is never read automatically; the panel offers visible text as a fallback when browser clipboard writing is unavailable.
- Fit screen scales the fixed remote desktop; Actual size permits scrolling. Full screen retains viewer controls. The Keyboard panel forwards text input and supplies Ctrl, Tab, Esc, Backspace and Enter; closing it clears its temporary input buffer.
- Terminal includes manual `galx-relay setup`, `start`, `status`, `stop` and `logs` commands. A stopped desktop's local relay must be started again explicitly after resume.

## Responsive and accessible behavior

At desktop widths the library stays beside the viewer. Below 680px it becomes a Workspaces drawer, header actions wrap and the main content scrolls. Host buttons and inputs have a minimum height of 44px, visible focus and textual state labels. Escape closes the drawer. The desktop's pixels scale down on a phone; its application content does not reflow into a mobile layout.

The host shell provides labeled controls and status announcements. Guest application pixels do not expose semantic content to the host accessibility tree. Passing host Axe checks does not establish screen-reader accessibility inside Terminal or Chrome, nor does a simulated phone viewport establish physical phone keyboard behavior.

## Access and privacy

The host launcher establishes a separate local administrator desktop session. An ordinary API user or read-only monitor session cannot access the workspace HTML, application modules, state, mutations or display connection. Sign out revokes that session and its display access. Private setup explanations and operational details must remain behind this authorization boundary; the anonymous launcher contains only generic connection guidance. No administrator credential belongs in rendered markup, browser storage or application assets.

## Evidence and remaining limits

Real captures show the connected surface at [1600×1100](../review/desktop.png) and [390×844](../review/mobile.png), plus the phone [Stop confirmation](../review/mobile-stop.png) and [Keyboard panel](../review/mobile-keyboard.png). Host Axe checks reported zero violations and no full-page horizontal overflow at those two widths. Browser verification covered app input, explicit clipboard, full-screen controls, reconnect, reload, stop/cancel/resume and simulated phone text/special-key input. Terminal output and the Chrome address were verified; physical phone hardware remains untested.

The final reviewer disposition was **ship**, scoped to the two requested fixes: Stop confirmation and phone keyboard, both resolved. This is not a claim of complete device or assistive-technology coverage. The static detector returned an empty result in degraded regex mode; it did not complete the full detector scan. Private test and browser evidence is retained under `.relay/`, including `desktop-final-tests.log`, `desktop-ux-verification.json`, `desktop-review-fixes.json` and `desktop-isolation-verification.json`. Production build and authorization/public-boundary regression evidence accompany that record.

No raster artwork is shipped in the web surface. Dock icons come from the installed Chrome and terminal packages; window decorations are XPM images generated by `theme.py` from authored code. The PNGs above are private review evidence only, not product assets.

## Flow refinement — 2026-09-09

The searchable Commands menu provides workspace switching, app launch, lifecycle actions, separate-tab access and view controls. Cmd/Ctrl K opens it outside remote input; guest shortcuts retain their original behavior. The native dialog supplies keyboard selection and returns focus appropriately. Zen view removes secondary administrative chrome while keeping workspace identity, Commands and Exit Zen visible.

Desktop lifecycle work now runs through two concurrent slots with per-workspace exclusion and atomic running-capacity reservations. A pending request in another workspace does not disable the current one or steal its selection when it completes. A failed inventory refresh marks status delayed and blocks unsafe mutations while preserving an independently connected display. Workspace errors persist across polls and unhealthy desktops explain the recovery action.

Optional Activity shows one live entry per accepted operation, with stable identity through queued, running, completed and failed states. It retains 100 operations in memory since controller start and preserves in-progress operations during bursts. Current running/queued counts remain separate from historical results. Quiet 24-hour timestamps and keyed rows reduce visual and focus churn.

Final confirmation views: [desktop](../review/flow/desktop.png), [Zen](../review/flow/desktop-zen.png), [activity](../review/flow/desktop-activity.png), [commands](../review/flow/desktop-commands.png), [phone](../review/flow/mobile.png), [phone Zen](../review/flow/mobile-zen.png), [phone activity](../review/flow/mobile-activity.png), [phone commands](../review/flow/mobile-commands.png). Two bounded visual rounds were captured and inspected. Browser verification covered delayed completion, independent workspaces, failed status/launch requests, preserved guest shortcuts, menu navigation, activity and Zen. Host Axe and page-overflow checks passed at both sizes. All 123 regression tests and production build passed; the live local deployment preserved the existing desktop. This pass was reviewed locally and is outside the earlier finish reviewer's scoped disposition.

The private audit is `.relay/desktop-flow-audit.md`, with browser evidence in `.relay/desktop-flow-verification.json` and live evidence in `.relay/desktops-live-verification.json`. Physical phone and guest accessibility limits above still apply. The design detector ran once in degraded regex mode and returned no findings. No global design rule changed.

## Shard relationship and manual intervention — 2026-09-09

The current desktop has a compact linked-shard strip with health, admission state and sampled active work. Inspect shard opens separate repair-desktop, shard and serving-worker identities. It shows workload, observation time, recovery guidance and the latest five retained fleet event markers. Link editing sits below operational information in a disclosure; a new/unlinked workspace opens it directly. Running desktop status and paused shard status use separate text/color semantics. On phones traffic controls precede the relationship map. Zen retains a shard-status entry that returns to the inspector.

Pause new work excludes the linked shard from new controller assignments while preserving its current worker and accepted jobs. A cancel-first dialog explains impact on models with no alternative worker. The private journal persists holds across controller restarts; explicit Resume releases them subject to normal credential, cooldown and health eligibility. Rotation/removal can still retire an old worker. Stopping or deleting a desktop does not implicitly release a shard's hold. Linking is an administrative association between separate environments. The terminal sign-in handoff described below refreshes the linked account without providing access to the serving worker's terminal.

Monitor worker details link to associated desktops, or preselect the shard when creating a repair workspace. Both directions use private fragment navigation. Current registry ownership, generation and linked-shard checks fence traffic changes; stale samples show unknown load rather than idle. A failed status refresh preserves a connected guest display.

Verification: 114 relevant regression checks, production build, TypeScript and targeted lint passed. Fixture browser tests covered linking without restart, pause/cancel/resume, retained worker/display, stale status, rejected state, monitor round-trip and Zen. Two visual rounds at 1600×1100 and 390×844 were opened and inspected, with zero host Axe violations and no page overflow. The final batch promoted health/traffic above link settings and gave paused traffic its own color. Captures: [desktop inspector](../review/relationships/desktop-details.png), [compact view](../review/relationships/desktop-compact.png), [Zen](../review/relationships/desktop-zen.png), [resume confirmation](../review/relationships/desktop-resume.png), [phone inspector](../review/relationships/mobile-details.png), [phone compact](../review/relationships/mobile-compact.png), [phone Zen](../review/relationships/mobile-zen.png), [phone resume](../review/relationships/mobile-resume.png). Shard health in preview captures is synthetic; live production health was verified separately.

Private evidence and limitations are in `.relay/shard-desktop-audit.md`. The legacy live-host supervisor test still expects private telemetry in anonymous health and was excluded from the passing suite. This pass's degraded detector invocation yielded no usable report and is not a clean detector result. The existing production desktop was preserved and associated with the sole serving shard; traffic remained enabled. No independent finish reviewer was used for this pass, and no global design rule changed.


## Activity and quick views — 2026-09-09

The operator opens Activity when needed; it does not announce routine events through toasts. Search, status and workspace filters narrow the list. A nonmodal quick view shows the action, outcome, safe recovery guidance and explicit Open workspace action. Reference and timing sit behind a closed disclosure. Previous/Next and arrow keys inside Activity move through the held list; Escape closes the quick view and restores row focus. Remote desktop input retains its own shortcuts.

Reading or scrolling holds list membership and order. Existing operations still receive updated outcomes and health checks continue every three seconds. New arrivals accumulate behind Show N new. Resume list restores current filters and newest-first order. A held view can retain up to 100 rows after server eviction and explains when its selected record has left the retained history. Controller restart clears the in-memory journal and resets the browser's held view. Filters deliberately do not remove an operation that finishes while its list is held.

Export summaries includes only workspace name, action, status and timing. It excludes internal identifiers, reason codes, guest I/O, exception text and arbitrary runtime fields. Copy reference is a separate explicit action. The activity module itself requires the desktop administrator session, including when requested directly. Monitor read access does not grant access to this module.

Wide screens keep list and quick view together. At 1100px and below, the quick view uses the full activity pane; Close view returns to the list. The main workspace area can scroll when controls exceed available height, preserving a minimum usable display area. The incumbent dark operator theme and 44px host controls remain.

Two bounded visual rounds covered 1600×1100, 900×1000 and 390×844. The first found tablet overlap and cramped paired panes; the final confirmation resolved those findings. Host Axe WCAG A/AA checks reported zero violations and no horizontal page overflow at all three sizes. Browser tests verified a 12-arrival burst, stable DOM identity, live outcomes while held, keyboard navigation, empty filters, failure guidance, summary export and retained display after a failed state fetch. All 117 relay/public-boundary regressions, targeted ESLint and the production build passed. The built public-asset scan covered 628 files with no private activity markers. This is a scoped check, not a full public-site or guest accessibility certification.

The design detector ran once in degraded regex mode, reporting a 15px heading outside the documented type ramp; it was changed to 16px. Parser-based selector and contrast analysis were unavailable; browser Axe and visual inspection supplied the rendered checks. Evidence: `.relay/activity-audit.md`, `.relay/activity-ux-verification.json`, `.relay/activity-live-verification.json`, `.relay/activity-public-scan.json`, `.relay/activity-regression-tests.log`, and the private captures in `.impeccable/review/activity/`. No global design rule changed.

## Terminal sign-in handoff — 2026-09-09

Inspect shard now includes Terminal sign-in with an observed outcome, Check now and a persisted Automatic sync switch. Instructions remain in a disclosure. Codex file-backed login and the manual `galx-relay setup` helper are supported inside the desktop; the host never copies its own login into the guest. Keyring-only logins, custom homes, other applications and enrollment of a different account remain outside this bridge.

While a linked desktop runs, bounded host checks read only the two known credential files. The host verifies the matching account upstream and encrypts the replacement into the existing shard record. The conditional write checks ownership, permission and the old credential envelope, preserving concurrent quota changes, cooldowns and traffic policy. Normal reconciliation handles worker replacement; an explicit manual hold remains in effect. The display and applications remain connected during validation. Invalid, older, partial, unrelated and unverified logins cannot replace the serving credential.

No token is submitted by the page or returned in its state, activity or errors. Ordinary API users, anonymous callers and monitor-only sessions cannot invoke the handoff. Check now can be used with Automatic sync off. The compact panel reports whether the login is waiting, verified, already current or needs attention, without treating a saved credential as proof of serving health.

Verification passed: 127 regression checks, disposable PostgreSQL concurrency and isolation checks, targeted ESLint, the production build and desktop image build. One visual batch at 1600×1100 and 390×844 was opened and inspected; host Axe WCAG A/AA checks reported zero violations and no page overflow. Browser verification covered automatic file detection, recovered capacity, unchanged desktop/display identity, partial and rejected logins, manual holds across rotation, automatic-off and explicit checks. These provider responses were synthetic; no real account login was performed. The detector ran once in degraded regex mode and returned no findings.

The local controller reload preserved the existing desktop, its link and the healthy serving shard. Its terminal now includes Codex 0.150.1 and the updated manual helper; the page correctly waits for the operator to sign in. A scoped scan of 628 built public files found no private feature markers, and live anonymous/monitor authorization checks passed. Evidence is private under `.relay/credential-*`; captures are under `.impeccable/review/credentials/`. No production schema or RLS change was needed. Existing physical-device and guest-accessibility limitations still apply.
