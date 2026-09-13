# Preview admin implementation audit

<!-- docs-scope: operational-record -->

Scope: the private admin workspace, its HTTP handlers, staff authorization, waitlist decisions, access expiry, feedback management and the affected public entry points. Browser workflow evidence uses synthetic identities and a disposable database. Deployment evidence is recorded separately in the activation receipt; neither is a blanket live-site certification.

## Results

| Area | Evidence |
| --- | --- |
| Staff authorization | Verified account sessions plus live database membership. Tests reject anonymous callers, forged roles, ordinary approved customers, API credentials and viewer/reviewer escalation. |
| Concurrent changes | Real database tests permit one decision per revision, roll back permission changes if audit persistence fails, and preserve one active owner during competing staff changes. |
| Expiry and revocation | Private requests query effective approval on every call. Database tests cover expired approval, feedback denial after expiry, immediate staff removal and participant pause/re-review. |
| Privacy | Forced RLS; browser database roles have no table access. Explicit response DTOs, bounded bodies, no credential-bearing CORS and no-store responses. Public pages and associated scripts are scanned for admin records and UI payloads. |
| UX and accessibility | Desktop and phone fixtures cover inbox, review, approval, conflict, feedback, staff editor and activity. Native controls, visible focus, live errors, bounded pagination and an explicit mobile back action. |
| Existing products | The 19-test image HTTP/security suite and 94-test database integration suite passed. The original waitlist persistence and CLI review tests also passed. |

An independent finish reviewer returned **ship**, with no material visual or interaction findings across the 14 final captures and reviewed interface code. The review is recorded in `.impeccable/review/preview-admin/finish-review.md`.

The static interface detector reported no findings after alignment with the existing palette. Browser Axe A/AA checks reported no violations or horizontal document overflow in the captured states. No global design-rule exceptions were added.

## Audit health score

| Dimension | Score | Scope and limit |
| --- | --- | --- |
| Accessibility | 3/4 | All 16 activation-pass captures passed automated WCAG A/AA checks; this is not a full assistive-technology certification. |
| Performance | 3/4 | Bounded database pages and request bodies, no decorative motion or new runtime dependencies; production latency was not benchmarked. |
| Responsive design | 4/4 | Desktop and phone workflows are exercised; list/detail navigation changes structurally on small screens. |
| Theming | 3/4 | Consistent existing dark palette and control states; the surface does not provide a separate light theme. |
| Implementation integrity | 4/4 | Real records, explicit permissions, coherent workflow and no fabricated metrics or delivery promises. |
| Total | **17/20** | Good within the tested scope. |

## Findings resolved during implementation

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | Approval had no staff UI, live staff role boundary or transactional decision history. | Added a separate staff membership store, three roles, route/page guards and atomic audit writes. |
| P1 | Simultaneous reviews could overwrite each other. | Revision checks reject stale writes and preserve the reviewer's note in the browser until explicit reload. |
| P1 | A valid local approval was rejected because NextURL normalized the browser's target hostname. | Compare exact Origin scheme, target Host and port; continue rejecting sibling origins, missing admin origins and cross-site requests. |
| P1 | The public mobile bottom navigation overlaid admin controls. | Exclude admin routes from the public mobile navigation and footer; the admin navigation handles its own workspace. |
| P2 | Every 25-row inbox expanded the desktop page and displaced the review context. | Bound the desktop inbox and detail panes independently; retain normal page scrolling on phones. |
| P2 | Activity subjects appeared as opaque account IDs. | Display the associated participant email while retaining original IDs in the private audit record. Show before/after access states. |
| P2 | Next-request navigation could alternate between the first two rows. | Advance from the current queue index; after approval removes a row from the filter, continue with the first remaining request. |
| P3 | A long staff email wrapped its final character onto another line. | Use a single-line truncation with the complete address available in its title. |

## Activation pass: 2026-09-12

The follow-up pass retained the familiar triage inbox and explicit owner-managed permissions. It fixed concrete recovery and data-loss cases without changing the visual identity or widening access.

| Severity | Finding | Resolution and evidence |
| --- | --- | --- |
| P1 | Refreshing a record or resolving feedback could erase an unfinished decision note. | Notes stay in component memory per request during inbox navigation and workspace refresh. Successful decisions clear their note; account changes and lost access clear all private drafts. Browser checks cover refresh and moving away/back. Nothing is saved to localStorage. |
| P2 | An expired participant session produced a generic retry loop. | A 401 presents a verified-account sign-in action with a return to `/developers`. Desktop and mobile recovery captures are included. |
| P2 | Mobile staff fields inherited 14px text, which can trigger Safari focus zoom. | Phone input, select and textarea text is 16px; the updated phone form passed layout and accessibility checks. |
| P1 | A crawler-denial response named internal implementation concepts. | The response now contains only an allowlisted generic error. A raw middleware test verifies its exact body. |

Validation: production build and targeted lint passed; 14 authorization tests, 19 image security tests, the admin database suite and all 94 existing database tests passed. The 101 migration/rollback pairs passed integrity verification. The 16 browser captures have no automated Axe A/AA findings, document overflow or browser exceptions. The earlier independent 14-capture finish verdict remains scoped to its original pass; it is not relabeled as a new independent review.

The recovery choices follow [NN/g's user control and freedom guidance](https://www.nngroup.com/articles/user-control-and-freedom/). Familiar product references remain [Linear Triage](https://linear.app/docs/triage) and [Vercel team management](https://vercel.com/docs/rbac/managing-team-members).

## Operational limits

- Both migrations, the site and API gateway are deployed. First-owner provisioning is complete and the account binding and audit event were verified in production. Owner browser sign-in and real-participant acceptance remain untested; see the [activation receipt](preview-activation.md).
- Admission is individual. Expected traffic helps review; it does not override the existing per-key quota, billing or scope checks.
- Staff additions and access decisions do not automatically send emails. The founder shares the staff sign-in link; participants check `/developers` for their status.
- Revocation denies new requests; already-running work is not cancelled. Data retention and account-deletion workflows remain operator responsibilities.
- This pass does not certify every legacy private developer page or measure production latency. The new workspace uses the established dark theme; a separate light theme was not introduced.

The product references and setup instructions are in [the admin operator guide](preview-admin.md). CSRF choices follow the exact-origin and target-origin principles in the [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
