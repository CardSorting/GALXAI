# Account and session audit — September 13, 2026

<!-- docs-scope: operational-record -->

Scope: the user-requested third pass through shared account hydration, sign-in/out, workspace entry, native sessions, connection authorization, device grants and operational diagnostics. Findings are source observations; no unauthorized production data access was established. This is local implementation and verification, not deployment or an exhaustive security certification. The [runbook](../../operations/workspace-auth.md) owns current operations; [ADR 0147](../../adr/0147-verified-account-and-session-authority.md) remains proposed with local implementation recorded separately.

## Findings and corrections

| Severity | Finding | Local correction |
| --- | --- | --- |
| P0 | Session DELETE accepted an unverified bearer value; engine treated arbitrary IDs as revocation targets | Verified credential, active owner match, strict bearer syntax, separate owner-checked ID revocation and cross-site mutation denial |
| P0 | Native repository accepted cached sessions after database failure and acknowledged failed writes | Authoritative reads and committed creation/rotation/revocation; no memory grant or success fallback; previous-token grace enforced |
| P0 | Sudo endpoint accepted duration without new proof; provider connection received automatic elevation | Elevation stays closed with 403; no implicit grant; operational diagnostics/vault actions independently require administrator authority |
| P1 | Failed key login/SSO and browser mirrors could manufacture client users/roles | Server-verified profile, real SDK operations, no key/domain identity fallback, no credential/role mirrors |
| P1 | Connection input, unverified provider email and environment credentials were mixed with account authority | Existing confirmed-email account required; owner-bound identifiers and signed native provenance; no environment fallback, identity/workspace claim grant or implicit priority |
| P1 | Raw connection ID could select another account's refresh target | Resolve only the verified account's owned provider identity |
| P1 | Browser logout did not complete native revocation or distinguish local/global scope and failure | This-browser logout, immediate content removal, cross-tab pending/completed state, persistent retry, cookie clearing and fresh navigation |
| P1 | Obsolete auth verification/bootstrap could restore earlier identity | Revision/abort fencing, auth-event-aware initialization, previous-owner clearing, coalesced resume checks |
| P1 | Refresh rotation before failed revocation could strand the retry | Preserve the verified replacement cookies in the unavailable response |
| P1 | Devices/diagnostics/introspection returned broad internal objects | Explicit public profile/device/token fields, same-owner introspection, administrator-only operational data and finite failures |
| P1 | Child lifetime could exceed parent; device approval acknowledged uncommitted memory and copied the current credential | Parent-bound scope/expiry, separate bounded device credential, awaited owner-bound RPC approval and no memory fallback after durable denial |
| P2 | Repeated account gates presented conflicting choices and unverified security badges | Shared focused sign-in entry, destination-aware copy and standard links; clear status and retry with keyboard focus |
| P2 | Synthetic symmetric “public key” implied unsupported external verification | Empty public JWKS set; native verification remains server-side |

Account proof, developer approval, paid access, resource ownership and staff administration remain separate. The existing image artifact, published Site and owner-checked API boundaries are preserved. This pass makes no model identity, standards-certification, conversion-rate or universal data-erasure claim.

## Familiar patterns and evidence

[GitHub session management](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/viewing-and-managing-your-sessions) makes device-specific revocation explicit. GALX adopts clear “this browser” semantics and separates native remote-device APIs; it does not claim a new full Supabase device-management UI. [GitHub sudo mode](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/sudo-mode) requires additional authentication for sensitive operations. That pattern supports closing the former self-grant endpoint until genuine fresh proof exists.

[Slack sign-in](https://slack.com/help/articles/212681477-Sign-in-to-Slack) and [Notion sign-in/out](https://www.notion.com/en-gb/help/log-in-and-out) inform consistent account entry and provider/email choices from the previous pass. These are documented interaction patterns, not evidence about those products' private architecture.

[Supabase sign-out scopes](https://supabase.com/docs/guides/auth/signout) define current-session revocation; [session guidance](https://supabase.com/docs/guides/auth/sessions) explains remaining access-JWT validity. [Auth-state callback guidance](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) informs deferring SDK work out of the callback. [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) informs server authority, credential handling and session lifecycle controls. Official Supabase changelog review found no applicable hosted breaking change requiring a version migration in this pass.

## Verification and practical limits

The [retained verification record](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/session-lifecycle-verification.json) contains exact source/build hashes, completed checks, failures and environment limits. Earlier [entry](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/local-verification.json) and [UX](../../../post-mortem/incidents/2026/2026-09-13-workspace-auth/ux-verification.json) records remain immutable historical evidence.

Tests exercise forged/anonymous credentials, ID revocation, owner mismatch, native provenance/scope, CSRF, account-only connection access, local revocation, unavailable/rotated-cookie recovery, DTO projection, lifetime bounds, durable grant acknowledgements and separate device credentials. Browser checks cover desktop/phone sign-in, password/email-link success/error/deduplication, stale local identity, 401 removal/drafts, 403, 503, reflow, sign-out across tabs/reload, cookie clearing and a late verification response after logout. Capture inspection is bounded to the existing auth design; no further cosmetic redesign is required.

No real account, email, generation, checkout, publication, database migration or deployment was performed. Browser Auth/product operations use synthetic fixtures; raw compiled HTTP checks and browser-asset scans are separately scoped. Native storage and device approval/poll behavior are mocked, so deployed RPC ownership and one-time/cross-process behavior need acceptance. Access JWTs can remain usable until expiry after Supabase refresh revocation. Legacy native credentials without account provenance must be replaced; connection clients must authenticate an account first; credential query parameters and unverified elevation are retired. ACT-013 retains release/compatibility acceptance, and ACT-014 retains sensitive-action proof/revocation policy and deployed device-grant verification.
