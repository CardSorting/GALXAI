# Unauthenticated workspace page access

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260913-WORKSPACE, SEV-1, recovered September 13 after production acceptance; prevention remains open. Active responder: Codex. On September 13, 2026, the user reported unauthenticated access to `/sites` and `/images`. Read-only live requests confirmed HTTP 200 from both pages. Start time, affected visitor count and unauthorized generation or data access are unknown; page exposure does not establish those further impacts.

## Evidence and cause

The working tree was clean at investigation start. Neither page performed a server-side session check. The preview allowlist exempted public products from approval, while session middleware only redirected cookie-free `/library` requests and ignored the result of `getUser`. Existing API handlers have separate authentication/ownership gates.

## Containment and verification

The local fix verifies account sessions in middleware before static exemptions and independently at each Images/Sites server page. Missing/invalid sessions redirect to sign-in; temporary verification failures are unavailable, and valid/refreshed sessions pass. All responses remain private and uncached.

[Local verification](local-verification.json) records 70 passing regressions, 83 compiled HTTP/asset checks (28 linked browser assets), a production build, TypeScript, lint (eight existing warnings), documentation guard tests and a 639-file compiled private-marker/runtime-trace scan. Anonymous, forged and synthetic valid-session requests were exercised against compiled Next.js output. Initial sandbox/font-download and unavailable Node 22 runtime failures are retained separately. No production deployment or recovery is claimed. Preserve published Sites and authorized image download capabilities, API ownership checks and developer-preview requirements.

## Second-pass sign-in and session recovery

The user's follow-up requested a deeper security/UX pass using familiar application patterns. The local refinement makes sign-in server-aware, sanitizes return paths and public errors, retains supported Site/library context, adds an existing-account email-link option, and unmounts the active workspace on 401/sign-out. Forms have associated labels, password-manager support, focus recovery, readable controls and corrected contrast/reflow. Unverified trust badges and the duplicate sign-in footer were removed.

[Second-pass verification](ux-verification.json) and the [dated audit](../../../../docs/knowledge/audits/2026-09-13-workspace-auth-ux.md) retain the current source/build checks and limitations. The earlier local-verification record remains unchanged historical evidence. The [runbook](../../../../docs/operations/workspace-auth.md) owns current verification, recovery and rollout. No production deployment or real email, generation, billing, publication or data mutation occurred in this refinement.

## Third-pass account and session audit

The September 13 source audit expanded to the shared Auth provider, profile/logout routes, native account provenance, provider connection registration/callbacks, session ownership, device grants and diagnostic authority. It found fabricated browser identities, unverified ID-based revocation/elevation and connection metadata mixed with account identity. Those paths are corrected locally; former native credentials without signed account provenance are rejected, and verified account email is required for staff/account actions. Current-browser logout clears private content immediately and provides persistent retry across reload/tabs when revocation fails.

[Session lifecycle verification](session-lifecycle-verification.json) and the [dated audit](../../../../docs/knowledge/audits/2026-09-13-session-lifecycle.md) retain source/build evidence and limits. Earlier records remain unchanged. The runtime does not promise immediate revocation of copied Supabase access JWTs, a complete Supabase device inventory or working legacy sudo elevation. No migration or deployment occurred. ACT-013 includes hosted rollout/compatibility acceptance; ACT-014 tracks future proof-bound sensitive actions and deployed device-grant verification.

## Fourth-pass replacement and revocation

The [follow-up verification](session-revocation-verification.json) closes the copied-JWT window locally with owner-bound active-session authority and a logout postcondition. Old native browser credentials recover through normal account sign-in with the original destination preserved. Team seats, native PostgreSQL persistence and the internal administrator guard were also corrected. The additive lookup migration must precede the application. See [the dated audit](../../../../docs/knowledge/audits/2026-09-13-session-revocation.md). Earlier records describe their own pass and are not current runtime instructions.

## Production recovery

The additive migration was [applied and tested](session-revocation-migration.json) before deployment `dpl_HRid6XFt1G4ZaHiRj7izmucgs9yZ`. [Production acceptance](session-revocation-release.json) verifies authenticated entry, normal replacement sign-in, current-browser logout, copied-token denial, independent-session refresh and the rendered/browser boundary. Temporary owned accounts and their sessions were removed; no real user's browser was used as a fixture.

The first hosted account test stopped when a Cloudflare four-hour browser TTL rewrote private headers on `/sites/nested.js`. The auth redirect itself was correct; this observation does not establish private content disclosure. Setting Browser Cache TTL to respect origin headers repaired the downstream policy. Subsequent canonical-host GET/HEAD/prefetch checks pass for normal and static-looking private paths; public versioned assets retain immutable caching. The failed attempt and limited Page Rules read permission are retained. Canonical redirects on `www.galx.ai` were separately verified.

## Prevention and closure

FM-ACCESS-002 and completed ACT-013 retain server-side gating, regression coverage and production acceptance. The incident is recovered, not closed: ACT-014 retains fresh-proof and device-grant database acceptance work. ACT-015 retains one refreshed-profile non-200 observation whose original status/timing was not captured; the full rerun and five focused refresh cycles passed, without proving a cause or resolution. Legacy elevation stays denied. Previous pass records retain their local-only status as historical observations.
