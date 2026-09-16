# Session recovery blocks account entry

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260916-SESSION, SEV-2, identity; responder: Codex acting as security/access maintainer. On September 16 the user reported “We couldn’t check your session / Check your connection and try again.” The same view was reproduced in the existing Chrome browser at the production login route. User count, start time and initiating service/transport failure are unknown. Anonymous HTTP profile requests return private/no-store 401 as expected.

## Cause and contributing conditions

Source confirms the global session gate and the login server page both removed sign-in methods during verification failures. Browser checks sent captured SDK bearer tokens despite fresher cookies, duplicate verification could cancel earlier reads, startup awaited SDK state, and an active-session failure could drop already rotated cookies. These were confirmed recovery defects, not proof of the initiating live service failure. The later live grant diagnosis below establishes the persistent reconnect cause.

## Containment and recovery

Local changes keep exact login/signup entry routes available, retain normal sign-in methods with inline recovery, start cookie verification independently of SDK initialization, coalesce checks, add an explicit reauthentication path that cannot bounce back to the workspace, retry transient reads once under a total deadline, retain refreshed cookies on failure, and preserve mounted same-account editors with connection feedback. Server authority, revocation, owner checks and no-store responses remain required. No database, provider settings, user credentials or deployments changed during that initial local phase. Roll back the client presentation only with server authority and current-browser revocation retained.

## Verification and limits

[Local verification](local-verification.json) records 39 auth tests, one multi-scenario DOM lifecycle test, 42 boundary tests, six staff tests, 15 developer tests, TypeScript/lint, the production build, 139 compiled HTTP/asset checks and the 643-asset private scan. CUA Chrome verified desktop/mobile recovery and the explicit sign-in escape. A second pass found and fixed the valid-server-session redirect loop. The browser API-navigation attempt was blocked by the browser client; this is not attributed as the original outage cause. Those local tests did not establish production recovery, OAuth/email delivery, physical-device or screen-reader acceptance; later live evidence is recorded separately below.

## Follow-up lifecycle audit — local implementation

The follow-up pass reproduced the account-change timer gap with a failing DOM assertion. Credential changes now fence old reads and clear a different account synchronously; an obsolete 401 cannot erase a refreshed identity. Focus/visibility checks use the last attempt for their cooldown, including failure. Offline reconnection and persisted history require a fresh check; hidden restorations retain that requirement until visible. Restored tabs reconcile missed logout markers, and SDK sign-out notifications cannot dismiss failed-revocation recovery.

The account PKCE callback previously used the unrelated data-query circuit. It now has a request-scoped, uncached exchange under one ten-second deadline, writes cookies onto the returned redirect, preserves safe destinations and routes failures to explicit reauthentication. The compiled response check additionally caught the middleware overriding its referrer policy; both now agree, and signup/callback and explicit reauthentication bypass the old-account middleware refresh. Ordinary login retains cookie propagation before the server page. It does not replay a mutation or expose provider errors. [Follow-up verification](second-pass-verification.json) records this pass separately from the first build and browser observations. The [final entry-refresh verification](entry-refresh-verification.json) narrows that exception to preserve ordinary-login refresh cookie propagation and adds a raw expired-cookie regression. Earlier evidence retains its measured source/build identity. At the end of that local-only phase, production state and the unknown initiating failure remained unchanged.

## Persistent reconnect failure — live permission diagnosis

On September 16 at 16:10 UTC, the existing Chrome session reproduced the reconnect document at `/images` on deployment `dpl_351gC1moJY555kDfF9Lv9nhHgVqW` (`b7de387`). [Read-only diagnosis](permission-diagnosis.json) confirms public Auth configuration is working, all 115 prior migrations are applied, and the active-session wrapper raises 42501 because authenticated accounts lack `private` schema USAGE. The manual-desktop and central-foundation migrations revoked that dependency after the original liveness release. This establishes the current reconnect cause without retrospectively assigning every earlier transient failure to it.

The final-chain auth test reproduced the same failure after removing its setup replay of the historical liveness migration. That replay had restored the missing grant and masked the incompatibility. Migration `20260916161120_isolate_account_session_lookup.sql` moves the existing helper without changing its owner, body or predicates into a dedicated non-exposed schema, keeps its public invoker contract, and preserves all operational-schema denials. Local checks pass 45 auth database cases and 94 general database cases. No account/session rows are rewritten. Its rollback retains data but restores unavailable verification; reapply the repair for recovery. The [database release](permission-release.json) records application of only this migration, no error-level security findings, 116 applied migrations with none pending, and the original Chrome session returning to Image Studio and its library. The [live HTTP checks](permission-live-http.json) pass 63 checks including 34 linked assets, copied-token/cookie denial and independent-session refresh. The temporary owned test account was removed.

## Sites browser cookie mismatch

After the permission repair, the original browser could open Image Studio and its library, but Sites immediately displayed an expired-session prompt. The workspace API required a bearer header before calling the verifier, while the browser profile intentionally contains no bearer. The application correction accepts verified account cookies, enforces same-origin intent for mutations, retains explicit bearers, propagates refreshed cookies and keeps verification outages at 503. [Local preflight](sites-cookie-preflight.json) records 19 workspace, 15 conversation, 43 auth and 43 public-boundary tests with TypeScript/lint; the subsequent isolated production build and 643-asset private scan also pass. Publication and generation were not exercised. The [production recovery release](recovery-release.json) records the deployed correction, original-browser Images/library/Sites acceptance, cookie-only bootstrap, cross-origin denial, live refresh/revocation and rendered/asset scans. The owned canary was removed; no customer credentials were changed.

## Prevention and closure

The incident is recovered based on [live account acceptance](recovery-release.json). ACT-029 is complete for schema isolation, final-chain regression and cookie-capable Sites workspace authentication. ACT-028 remains open for the distinct real provider/email, account-switching, physical-history and failed-revocation browser acceptance. Recovery does not close that prevention work; generation availability remains separately tracked.
