---
version: 1
slug: "src-app-admin-page-tsx"
primary_target: "src/app/admin/page.tsx"
related_targets: ["src/components/admin/PreviewAdminWorkspace.tsx", "src/components/admin/preview-admin.module.css", "route:/admin"]
---

# Preview administration

Mode: Operate. The user explicitly chose familiar patterns from established applications. Extend GALX's existing dark, Inter, restrained indigo interface; use a conventional review inbox, list/detail workspace and role management. No new visual identity or decorative artwork. The structure borrows Linear's triage queue and Vercel's owner-controlled team membership, with a chronological decision history.

Primary job: the founder reviews a known person's project and expected traffic, opens developer access for a chosen period, reads private feedback and pauses access when necessary. Images and Sites remain public. Waiting, approved, paused, expired and declined are separate filters. Request search uses email or account ID; pagination is bounded. The desktop workspace places a persistent staff navigation rail beside independently scrolling inbox and detail panes, with pagination anchored to the inbox bottom. At widths up to 1100px, selection replaces the inbox with the request and offers explicit Back to requests and Next request actions; the selected request uses normal document scrolling. At phone widths, staff navigation becomes a compact horizontal row. Public navigation, mobile product navigation and the public footer do not appear on `/admin`.

Staff roles: owner, reviewer, viewer. Only owners manage staff. Only owners/reviewers change participant permissions and feedback state. The first owner is provisioned privately; new staff sign in with a verified invited email, then bind to that account. Staff forms edit inline and explain each role before saving. Staff changes, reviews and feedback resolution have a durable activity history. The Activity view leads with a readable subject label, then the named event, staff actor, date and state change; request detail groups its own decision history. Read-only and lost-access states are explicit.

An inline decision form states the affected email and immediate effect before save. A required internal note stays staff-only. Approval defaults to 30 days, with 7, 90 and no-expiry options. Server conflicts preserve the user's draft while current records are refreshed for another review. There is no automatic approval, bulk admission, fabricated queue position or automatic email sending.

Activation refinement (2026-09-12): decision notes remain in component memory per request when navigating the inbox or using the workspace Refresh control. They are cleared after a successful decision or when the account changes or loses access. Browser reload/closing the workspace does not persist drafts. Mobile form controls use 16px text to avoid Safari focus zoom. The follow-up suite covers 16 captured states, including participant sign-in recovery, without automated accessibility findings, overflow or browser errors.

The built component language is recorded in [the scoped admin design system](../../src/components/admin/DESIGN.md). It inherits Inter, the dark GALX palette and Lucide icons; the surface uses flat bordered panels and native labeled inputs, selects, textareas and buttons. Visible focus, 44px actions, semantic headings, focus on the loaded request heading, live save/error feedback and reduced-motion fixtures preserve the task flow. Public navigation never imports the admin component. Only verified staff can load the page, page chunk or administration API.

Finish evidence (2026-09-12): [the independent finish review](../review/preview-admin/finish-review.md) records `disposition: ship` with no material fixes. It reviewed 14 production-build fixture captures: inbox, review, feedback, staff, staff editor and activity at 1440px and 390px, plus approved and conflict states at 1440px. The adjacent [checks](../review/preview-admin/checks.json) record no Axe violations, document overflow or browser errors for those captured states. Tests use a disposable PostgreSQL database and test-only identity responses; fixture data is never live data. This evidence does not establish live deployment, independently certify API authorization, or measure production performance. No surface design decision remains unresolved in that review.
