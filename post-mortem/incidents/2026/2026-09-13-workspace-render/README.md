# Workspace server-render failure and navigation recovery

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260913-RENDER, SEV-2, workspace navigation, Codex active responder. The user reported production Server Component failure digest `2759966064` while working with Images/Sites. Exact request time, route, account scope and duration were not supplied. The error screen exposed the framework message and digest, offered diagnostic copying and automatically retried.

## Evidence and timeline

The clean starting revision was `24fd18f`. Read-only Vercel inspection during this task found Ready production deployment `dpl_vcR2NY1tHydyvA7jACT5aDSQcpRf` serving `galx.ai`; it differs from the older current-state acceptance record. This inspection establishes the serving target, not authenticated health or the cause of the reported digest. See append-only journal events for actions and results.

## Cause and contributing conditions

The exact production exception has not been correlated with private server logs. Source inspection established a reproducing failure mode: middleware can verify a session, then the independent page check can become unavailable. The old guard threw a generic Error, escalating the expected outage to the root boundary. That boundary displayed raw errors and called only client reset; it did not explicitly fetch a fresh Server Component response. Images and Sites lacked route-level loading/error files. Existing client auth hydration replaced the page with a different blank loading shape.

## Containment and recovery

Local source adds a typed expected-unavailability signal and a shared server gate. Only that signal becomes a sanitized recovery view; redirects and unexpected faults propagate normally. Workspace children remain withheld until verification succeeds. Route-level loading, local unexpected-error boundaries and explicit refresh/reset recovery preserve the shared header. Client hydration reuses the loading shell; finite opacity changes respect reduced motion. No automatic retries or workspace mutations are introduced. No database, account, generation, billing or publication changes were made.

## Verification and limits

The [local verification](local-verification.json) passed 39 image/security checks, 33 session checks, 16 Sites workspace checks, production build with type validation, 106 compiled HTTP/asset checks, desktop/mobile recovery/navigation/Axe checks and a 659-asset private-content scan. Lint has zero errors and eight existing warnings. Sandbox initially denied localhost HTTP test listeners and font downloads; those checks were rerun with the required permissions. Production recovery and exact digest diagnosis remain unverified. The first visual fixture omitted Tailwind and was replaced by a clean complete build; the final desktop/mobile captures passed. No deployment or authenticated live acceptance is implied by the local implementation.

## Prevention and closure

FM-AUTH-003 and ACT-016 track reproduction, local regression coverage and production acceptance. Keep the incident investigating until the affected real navigation passes. Preserve authorization and private cache headers in any rollback; never use cached identity as a fallback.

## Second UX pass — September 14, 2026 UTC

The user requested deeper review and familiar application patterns. A separate source-confirmed browser failure path still replaced the entire layout when initial profile verification failed. The correction keeps `AuthProvider` and the public shell mounted, withholds private page content through `AuthSessionContent`, and permits Home/exact public reading during profile unavailability. Pending logout still blocks page content on every route. Image 403 messages retain permission semantics; recovery includes guarded manual retry, offline/failure status and keyboard focus continuity. Structural loading follows workspace geometry and adds six-second wait feedback without automatic replay.

The [audit](../../../../docs/knowledge/audits/2026-09-14-workspace-recovery-ux.md) records eight addressed findings and documented Carbon, Slack, Atlassian and W3C patterns. [Second-pass verification](ux-second-pass-verification.json) retains source/build hashes, full authentication and expanded navigation fixtures, raw authorization/HTTP/asset checks and practical limits. A forced-color contrast failure was retained as a verification correction; explicit system colors passed confirmation. A single visual correction batch then adjusted retry spacing and loading geometry. The earlier `local-verification.json` remains unchanged as first-pass evidence. No source-confirmed failure path establishes the exact production exception; there was no deployment, real account operation or product mutation.

## Subsequent deployment observation — September 14, 2026 UTC

The separately authorized [complimentary Pro release](../../../../post-mortem/releases/2026-09-14-complimentary-pro-access.json) deployed the reviewed working tree based on `68162da`, including the recovery source above. Deployment `dpl_BNgo95mjZxGLnMXimHxAs5MrGLMG` is Ready at `galx.ai`. The requested owner account verified active Pro in Billing and normal Sites workspace entry. This permission change created no payment, generation or publication. That narrow acceptance does not correlate the original digest or replace the complete Images/Sites incident acceptance matrix. The incident remains investigating and ACT-016 remains open.
