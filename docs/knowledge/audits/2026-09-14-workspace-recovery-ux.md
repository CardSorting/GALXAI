# Workspace recovery and navigation — second audit

<!-- docs-scope: operational-record -->

Reviewed September 14, 2026 UTC, by Codex. Scope: the existing dirty working tree based on `24fd18f`, Images/Sites loading, server and browser session recovery, shared navigation and their regression fixtures. The user explicitly requested both a deeper audit and implementation. This record is private maintainer evidence. The [incident](../../../post-mortem/incidents/2026/2026-09-13-workspace-render/README.md) owns the production failure; [verification](../../../post-mortem/incidents/2026/2026-09-13-workspace-render/ux-second-pass-verification.json) retains exact source/build hashes, commands, results and limits.

## Integrity verdict and health score

Pass within this scope: recovery now follows the existing product shell, workspace dimensions, theme tokens and account authority. It contains authored user actions rather than operational diagnostics or invented progress. The deterministic detector reported seven advisory design-system findings before the token/type/radius reconciliation and zero afterward. Those advisory counts are separate from the eight findings below. No new detector exceptions were added.

Scores are bounded reviewer judgments, not measured usability gains, a complete site audit or WCAG certification. The first column assesses the start of this second pass; the forced-color finding was discovered during implementation verification.

| Dimension | Before | After | Evidence and practical limit |
| --- | ---: | ---: | --- |
| Accessibility | 2 | 3 | Retry focus/keyboard, status placement, reduced motion and scoped Axe checks; physical screen-reader acceptance remains outstanding |
| Performance | 3 | 3 | Finite opacity, one cancellable wait timer, guarded retries, zero workspace mutation requests; no field latency or Core Web Vitals measurement |
| Theming | 1 | 3 | Recovery derives colors from existing theme values and uses explicit forced-color system colors; other product surfaces were not rethemed |
| Responsive design | 3 | 3 | Desktop/phone, two 320px themes, doubled recovery text, 44px primary recovery controls; not every device or locale |
| Implementation integrity | 2 | 4 | Separate expected outages, authorization failures and unexpected errors; persistent shell, no new identity or storage authority |
| Total | 11/20 | 16/20 | Acceptable → Good within the stated review scope |

## Findings and implemented corrections

Eight findings addressed locally: four P1, three P2, one P3. The production acceptance dependency below remains open and is not counted as a completed fix.

| Severity | Location and category | User impact / relevant guidance | Correction and follow-up command |
| --- | --- | --- | --- |
| P1 | `AuthContext.tsx`, root layout; integrity | Initial browser verification failure replaced the whole provider subtree, removing familiar navigation even when the server page had been admitted | Keep the provider mounted and use `AuthSessionContent` to withhold page content. Home/exact public reading remain available during profile failure; pending logout remains gated everywhere. `$impeccable harden` |
| P1 | `studio-contract.ts`; integrity/copy | 403 access denial incorrectly told a valid account its session had expired | Distinguish 401 from 403; permission failures retain an authored account-access message. `$impeccable clarify` |
| P1 | `WorkspaceLoading.tsx`, `RouteRecovery.tsx`; accessibility | Live status inside a busy region can defer the announcement users need to understand the wait; W3C status-message guidance | Put the single status region outside busy decorative content. `$impeccable harden` |
| P1 | `workspace-route.module.css`; accessibility/theming | The initial expanded forced-color fixture reported action/link contrast failures, including at doubled text | Explicit Canvas/CanvasText, ButtonFace/ButtonText and LinkText preserve system palette semantics; confirmation passed. Relevant WCAG 1.4.3. `$impeccable colorize` |
| P2 | `RouteRecovery.tsx`; accessibility/integrity | Failed retry gave no fresh outcome, offline action appeared usable, and context/focus could be lost | Announce pending/failure/offline state, synchronously guard activation, preserve retry focus using aria-disabled, and focus a new recovery heading only when document focus has no active control. W3C status/focus guidance. `$impeccable harden` |
| P2 | `WorkspaceLoading.tsx`; integrity | A long unchanged skeleton gave no useful next action | Explain a longer-than-usual wait after six seconds and expose Home; no fabricated percentage, completion estimate or retry timer. Carbon loading guidance. `$impeccable clarify` |
| P2 | `workspace-route.module.css`; responsive/theming | Approximate split/header geometry and nonexistent token fallbacks weakened continuity | Match product toolbar/composer breakpoints; derive neutral colors from actual root theme values; retain forced colors and reduced motion. `$impeccable adapt` |
| P3 | `workspace-route.module.css`; visual detail | Failed-retry status was crowded against the focused action | Add a stable 16px status gap and reserve desktop loading-header space for the delayed Home action. `$impeccable polish` |

## Familiar patterns and their limits

- [IBM Carbon loading patterns](https://carbondesignsystem.com/patterns/loading-pattern/) inform structural placeholders where the arriving layout is known. [Inline loading](https://carbondesignsystem.com/components/inline-loading/usage/) informs feedback beside the action and protection against repeat activation. GALX uses finite state copy, not a fabricated progress percentage.
- [Slack's message guidance](https://slack.com/intl/en-gb/help/articles/201457107-Send-and-read-messages-in-Slack) documents keeping unsent drafts. GALX already has local account-scoped draft storage; this pass verifies continuity across navigation and recovery instead of creating a second persistence mechanism. It does not add cloud or cross-device synchronization.
- [Atlassian empty states](https://atlassian.design/components/empty-state/) emphasize explaining what someone can do next. The adaptation is a short recovery message with Try again and Home. It is not a claim that Atlassian uses this specific error architecture.
- [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) and [keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) distinguish status announcement from moving focus during a context change. They inform the live-region and focus rules, without certifying the entire application.

These are documented pattern adaptations. No endorsement, imitation of internal architecture, measured conversion improvement or equivalence to those products is claimed.

## Verification and systemic lessons

The expanded compiled fixture separates middleware success/page failure from server success/browser profile failure. Both need coverage: a test that always returns a healthy browser profile missed the disappearing shell. It exercises repeated failed and successful server recovery, duplicate manual profile activation, keyboard focus, offline gating, safe Home, both drafts, 403, slow feedback, history, reduced motion, themes and text reflow. The existing complete authentication browser suite checks cross-tab expiry, failed logout/reload/retry, cookie clearing and late verification. Product mutation requests remain zero in the navigation fixture.

Production build, authorization/adversarial HTTP, image contracts, Sites regressions, lint and compiled private-content checks are recorded separately. Axe excludes the intentionally sandboxed Site iframe and does not replace physical assistive-technology testing. Browser tooling bypasses CSP only for its intercepted synthetic Auth host; raw HTTP checks retain application headers. Capture review compared desktop and phone recovery, loading, ready Sites/Images, permission failure and forced-color doubled text. One visual correction batch added spacing and matched loading geometry, followed by confirmation.

Preserve the positive existing boundaries: independent server admission, owner-scoped API checks, finite public errors, durable generation operation identity, local draft isolation, native links, guarded intent prefetch, and no mutation replay. Source review did not change database schema, generation, billing, publication or revocation authority. Prior dated evidence remains unchanged.

## Remaining actions

1. P1 release acceptance: ACT-016 retains private correlation of digest `2759966064`, deployment of reviewed source when authorized, and real authenticated Images/Sites/nested-route navigation. A Ready deployment or passing synthetic build does not close the incident.
2. `$impeccable audit`: after release, check real account transitions and physical screen-reader/mobile behavior against the deployed revision; capture runtime response and linked-asset evidence.
3. `$impeccable polish`: address only concrete remaining observations from that acceptance. Avoid adding motion or UI promises without evidence.
