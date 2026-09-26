# Hosted build omitted sibling package source

<!-- docs-scope: operational-record -->

Private operational record. Follow current state and the [deployment failure guide](../../../failure-modes/deployment.md); this record is evidence, not a reusable release procedure.

## Impact and scope

Incident INC-20260925-CHECKOUT, SEV-3 deployment failure. Vercel production builds from the root Git repository failed because relay source imported files from independent sibling repositories that are present in the local workspace but absent from a clean GALXAI checkout. The previous Ready production deployment remained active. No interruption was observed. A precise user count or failed-request count is unavailable.

## Evidence and timeline

- At 2026-09-25 22:51 UTC, the production deployment list showed two recent errored builds and the earlier Ready deployment still serving. The inspected build error was a missing BroccoliDB source module.
- Local repair pinned both package repositories to immutable HTTPS archives and changed application imports to package entry points. The Docker service build retains local sibling source copies and explicit aliases.
- Root commit 63b54f8 was pushed to main. Vercel deployment dpl_93E4W7Jxofbo8dPSG9JULhCn6s9w built from that clean Git checkout and reached Ready, with galx.ai and www.galx.ai aliases.
- Live acceptance passed 38 cache checks and the public HTTP boundary check covering preflight, protected diagnostics, public schema, rendered pages, and 38 browser assets.
- A read-only Docker check found the Premium R4 queue image still running and ready. No runtime restart or queue mutation occurred.

The [local verification record](../../../releases/2026-09-25-clean-checkout-package-boundary-local.json) retains package checks and local bundle evidence. The [production recovery record](../../../releases/2026-09-25-clean-checkout-package-boundary-production.json) retains the deployment and live acceptance details.

## Cause and contributing conditions

The application source used relative imports into sibling repository source. Local TypeScript and production builds could resolve those paths because both repositories existed beside GALXAI. The Vercel Git build only cloned GALXAI, so it could not resolve the BroccoliDB path. The build workflow did not exercise a hosted Git checkout before the initial push.

## Containment and recovery

The prior Ready deployment continued serving while the package boundary was corrected. BroccoliDB and BROCCOLIQUEUE remain separate repositories. Their exact revisions are pinned as immutable HTTPS archives in GALXAI's root package manifest and lockfile. Relay application code uses package entry points; the existing local Docker bundle uses explicit aliases to preserve source-based image builds.

Recovery completed through the Git-triggered Vercel deployment at commit 63b54f8. No production database, storage, account policy, Star activation, generation request, or queue state was changed.

## Verification and limits

Local checks passed for BroccoliDB (42 tests plus package and documentation checks), BROCCOLIQUEUE (24 tests plus documentation checks), root TypeScript, the 155-page production build, the 13-test relay queue integration, and a 701.8 KB Docker source bundle with both aliases resolved.

The hosted clean-checkout build installed both pinned packages, compiled and typechecked successfully, generated 155 static pages, and reached Ready. Live checks passed 38 cache checks and the public HTTP boundary check for protected diagnostics, public schema, rendered pages, and 38 browser assets. Premium R4 image identity and readiness were read without restarting the service.

No provider generation or destructive recovery drill was run. This incident does not establish future provider capacity, and the queue's separate failure modes remain governed by its current runbook.

## Prevention and closure

FM-DEPLOY-003 documents the clean-checkout failure pattern. ACT-036 is complete: package entry points and immutable root pins now match the hosted build boundary, local Docker source aliases are explicit, and the Git-triggered production build and live acceptance passed. Repeat these checks whenever either package revision changes.
