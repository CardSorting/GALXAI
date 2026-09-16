# Session recovery blocks account entry

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20260916-SESSION, SEV-2, identity; responder: Codex acting as security/access maintainer. On September 16 the user reported “We couldn’t check your session / Check your connection and try again.” The same view was reproduced in the existing Chrome browser at the production login route. User count, start time and initiating service/transport failure are unknown. Anonymous HTTP profile requests return private/no-store 401 as expected.

## Cause and contributing conditions

Source confirms the global session gate and the login server page both removed sign-in methods during verification failures. Browser checks sent captured SDK bearer tokens despite fresher cookies, duplicate verification could cancel earlier reads, startup awaited SDK state, and an active-session failure could drop already rotated cookies. These are confirmed recovery defects, not proof of the initiating live service failure.

## Containment and recovery

Local changes keep exact login/signup entry routes available, retain normal sign-in methods with inline recovery, start cookie verification independently of SDK initialization, coalesce checks, add an explicit reauthentication path that cannot bounce back to the workspace, retry transient reads once under a total deadline, retain refreshed cookies on failure, and preserve mounted same-account editors with connection feedback. Server authority, revocation, owner checks and no-store responses remain required. No database, provider settings, user credentials or deployments changed. Roll back the client presentation only with server authority and current-browser revocation retained.

## Verification and limits

[Local verification](local-verification.json) records 39 auth tests, one multi-scenario DOM lifecycle test, 42 boundary tests, six staff tests, 15 developer tests, TypeScript/lint, the production build, 139 compiled HTTP/asset checks and the 643-asset private scan. CUA Chrome verified desktop/mobile recovery and the explicit sign-in escape. A second pass found and fixed the valid-server-session redirect loop. The browser API-navigation attempt was blocked by the browser client; this is not attributed as the original outage cause. Production recovery, OAuth/email delivery, physical-device and screen-reader acceptance are not established by local tests.

## Follow-up lifecycle audit — local implementation

The follow-up pass reproduced the account-change timer gap with a failing DOM assertion. Credential changes now fence old reads and clear a different account synchronously; an obsolete 401 cannot erase a refreshed identity. Focus/visibility checks use the last attempt for their cooldown, including failure. Offline reconnection and persisted history require a fresh check; hidden restorations retain that requirement until visible. Restored tabs reconcile missed logout markers, and SDK sign-out notifications cannot dismiss failed-revocation recovery.

The account PKCE callback previously used the unrelated data-query circuit. It now has a request-scoped, uncached exchange under one ten-second deadline, writes cookies onto the returned redirect, preserves safe destinations and routes failures to explicit reauthentication. The compiled response check additionally caught the middleware overriding its referrer policy; both now agree, and signup/callback and explicit reauthentication bypass the old-account middleware refresh. Ordinary login retains cookie propagation before the server page. It does not replay a mutation or expose provider errors. [Follow-up verification](second-pass-verification.json) records this pass separately from the first build and browser observations. The [final entry-refresh verification](entry-refresh-verification.json) narrows that exception to preserve ordinary-login refresh cookie propagation and adds a raw expired-cookie regression. Earlier evidence retains its measured source/build identity. Production state and the unknown initiating failure remain unchanged.

## Prevention and closure

FM-AUTH-004 and ACT-028 own deployment and actual-account recovery acceptance. Keep the incident investigating until the affected deployed account path passes; do not mark recovery from source or fixture success alone.
