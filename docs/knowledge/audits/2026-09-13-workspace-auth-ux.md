# Workspace authentication: second-pass audit

<!-- docs-scope: operational-record -->

September 13, 2026. Scope: the local uncommitted Sites/Images entry correction, sign-in experience, supported return destinations and expired-session recovery. This audit follows the reported anonymous workspace access. It does not establish production recovery. The [incident](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/README.md) retains the live observation and deployment follow-up; [workspace authentication](../../operations/workspace-auth.md) is the current procedure.

## Implementation integrity

Pass for the reviewed surface: the form uses the existing GALX dark Operate identity, gives the intended product name, and separates current server authority from browser state. The design detector's seven initial palette findings were fixed without suppressions. Browser inspection found primary-button contrast below AA, a duplicate footer and narrow-screen overflow with enlarged text; these were corrected using the existing palette and a wrapping auth header. Initial unstyled screenshots came from the fixture's localhost/127.0.0.1 origin mismatch and were rejected as invalid evidence. No detector finding was dismissed as a design exemption.

## Bounded health score

| Dimension | Score | Evidence and limit |
| --- | --- | --- |
| Accessibility | 3/4 | Associated labels and errors, password-manager fields, focus on errors/confirmation/expiry and reduced motion. Automated browser checks supplement source review; full assistive-technology acceptance remains separate. |
| Performance | 3/4 | Existing dependencies; one in-flight form action, explicit retry, no generation replay or added background auth polling. No live latency, conversion or Core Web Vitals result. |
| Responsive design | 4/4 | Fluid form with 48px primary controls, 44px secondary targets and 16px inputs; narrow-screen/reflow acceptance is recorded in the linked verification. Physical devices remain untested. |
| Theming | 3/4 | Existing palette, scoped variables, visible focus and forced-color borders. Some incumbent palette values remain local CSS constants; alternate theme combinations were not exhaustively tested. |
| Implementation integrity | 4/4 | Server-verified entry, authored errors, finite destinations, owner-scoped expiry and retained incident evidence. No unverified certification badges. |
| Total | **17/20 — Good** | Scoped engineering judgment; not certification, a conversion benchmark or a whole-site score. |

## Findings and disposition

Ten findings across the original entry audit and this refinement: P0 × 1, P1 × 5, P2 × 3, P3 × 1. The listed code corrections are implemented locally. Hosted acceptance remains open.

| Severity | Finding / impact | Correction and owning source |
| --- | --- | --- |
| P0 | Anonymous workspace entry exposed authoring pages | Verified middleware entry before exemptions plus independent dynamic page guards; `workspace-session.ts`, Images/Sites pages. API ownership remains independent. |
| P1 | Sign-in treated browser-local identity as completed authentication | Sign-in is a server page; verified sessions continue directly, stale local users receive the form. |
| P1 | Sign-in return targets lacked the shared sanitizer and could recurse through auth | `redirects.ts` rejects external/protocol/encoded-control targets and recursive auth destinations. |
| P1 | Raw auth/query error messages could become public copy | `signin.ts` maps only finite public notices and errors, including rate limiting and connection failures. |
| P1 | Expiry/sign-out could leave workspace content mounted | `workspace-client.ts` and `WorkspaceSessionBoundary.tsx` remove the active owner's editor on 401/sign-out, ignore aborted/foreign-owner events and focus recovery. |
| P1 | Form association, focus, small input/control size and button contrast needed correction | `SignInForm.tsx` and scoped CSS provide labels, error associations, focus, autocomplete, password reveal, readable sizing and AA primary-button contrast. |
| P2 | Return context could lose a Site starter or selected Images library view | Allowlisted workspace return construction plus URL-backed Create/My images switching. No promise to preserve every filter. |
| P2 | Verification outage offered only a plain failure | Accessible document 503 with explicit retry, preserved destination and no script dependency; generic non-document response remains. |
| P2 | Signup/sign-in showed unverified trust claims | Removed the certification/privacy badge row; product copy states only the task and available methods. |
| P3 | Sign-in had its own legal footer plus the shared product footer | Shared footer omitted on sign-in; one focused auth shell remains. |

The systemic issue was treating a public-product exemption and client convenience state as substitutes for explicit access/lifecycle contracts. The correction keeps account entry, API ownership, paid access and administration independent. Retain the existing recovery identities, sanitized DTOs, bounded polling, password-manager support and native links.

## Familiar patterns applied

[Slack](https://slack.com/help/articles/212681477-Sign-in-to-Slack) documents workspace-oriented entry with provider/email methods; [Notion](https://www.notion.com/en-gb/help/log-in-and-out) documents provider and email sign-in. GALX adapts those familiar choices to a focused destination-aware form, adding an existing-account email-link alternative with confirmation and resend feedback. This is an interaction-pattern adaptation, not a claim about those apps' internal authentication design.

[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) informs generic authentication feedback and password-manager support. [W3C](https://www.w3.org/WAI/tutorials/forms/notifications/) informs linked validation and notifications. No account is created as an email-link fallback, and server rate limits remain authority; a browser cooldown is only an affordance.

## Acceptance and remaining work

Final local acceptance: seven regression commands passed with 135 test executions (shared cases occur in multiple suites); 88 compiled HTTP/asset checks passed, including 29 browser assets. Eleven desktop/mobile/reflow states had no scoped Axe A/AA findings or document overflow. Password success/failure, duplicate submission blocking, same-confirmation email-link errors, existing/stale identity, 401 unmount/draft retention, 403 handling, 503 recovery and cross-tab sign-out passed. The production build, TypeScript and lint passed (eight pre-existing warnings); 638 browser/rendered files and runtime traces passed the private-content scan. Documentation adversarial tests passed all 37 cases.

The [second-pass verification record](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/ux-verification.json) retains exact source/build hashes, completed test results, captures, fixture limitations and remaining acceptance. The first [local entry verification](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/local-verification.json) remains a separate dated record and is not rewritten as evidence for later source.

Deploy and verify the reviewed revision before calling the incident recovered. Real provider/email delivery, existing production-session refresh, deployed cross-tab behavior, physical-device input and full screen-reader acceptance remain separate. The localhost browser harness intercepts all account/API requests and bypasses CSP for its fake Auth host; raw HTTP tests and compiled scans retain their separate scopes. No generation, billing, publication or database mutation was exercised. Legacy browser-only identity fixtures require a server-session fixture before reuse.

No further visual polish was added after the correction batch. The next action is release acceptance under ACT-013, not another cosmetic redesign.
