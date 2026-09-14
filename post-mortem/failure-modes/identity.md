# Identity failures

<!-- docs-scope: current-guide -->

## FM-AUTH-001 — valid session rejected by administrator configuration

The September 12 resolver constructed an administrator client to verify a bearer token. A publishable credential in the legacy service-role setting correctly failed the administrator check, but the resolver collapsed the error into unauthenticated status. Both library views use the same account boundary; developer approval was not the cause.

Current source: [Auth client](../../src/lib/supabase/client.ts), [identity resolution](../../src/core/auth/GalxAuthEngine.ts). `getSupabaseAuthClient().auth.getUser(token)` verifies the token with the service. It cannot grant administration. A user ID, decoded JWT or editable account metadata is never substitute proof.

## FM-AUTH-002 — availability misreported as an expired session

The initial public-client fix still shared database transport throttling. Auth now has a dedicated bounded transport. Transient failures produce `AUTH_UNAVAILABLE` internally and generic HTTP 503 on the affected image routes. Rejected credentials still produce 401; cross-owner records remain inaccessible.

Containment: preserve the existing browser session and inspect private error classification. Do not mass-sign-out users, weaken token verification, elevate publishable keys, or disable RLS. Separate valid-session failure from an actually rejected token before changing credentials.

Verification: `npm run test:image:security` covers missing/misconfigured admin credentials, transient Auth errors, governor bypass, anonymous/forged credentials and owner boundaries. Test My images and Favorites using the existing authenticated frontend after deploying. A reload that merely clears an error is not proof of its cause.

Evidence: [initial failure and partial fix](../incidents/2026/2026-09-12-image-library-auth/README.md), [completed recovery](../incidents/2026/2026-09-13-image-generation/README.md). Supabase documents server-verified user retrieval in [getUser](https://supabase.com/docs/reference/javascript/auth-getuser).

## FM-AUTH-003 — a page verification outage replaces the workspace with a root error

Middleware and the server page check independently; success at the first check does not guarantee the second service read is available. `WorkspacePageGate` catches only `WorkspaceSessionUnavailableError` and renders authored recovery copy without workspace children. Invalid sessions still redirect, and unexpected faults reach the local route error boundary. Retry explicitly refreshes the Server Component response and resets a failed boundary within one transition. There is no timer or mutation replay. Preserve the header, existing credentials and private/no-store policy.

Use `scripts/verify-workspace-navigation.mjs` with the isolated compiled Auth fixture to force middleware success followed by a failed page check, then restore the synthetic session and click Try again. Test both products, direct/nested entry, back/forward, reduced motion and slow navigation. Inspect HTML, RSC, headers and browser scripts for diagnostic disclosure. The [reported production incident](../incidents/2026/2026-09-13-workspace-render/README.md) retains the uncorrelated digest and release limits.

Also inject initial browser profile unavailability after successful server admission. `AuthSessionContent` must withhold private page content without replacing the public product shell. Home and exact public reading routes remain available during profile failure; pending sign-out still hides page content everywhere. Verify failed retry feedback, duplicate activation, focus, offline behavior and same-account draft restoration. A library 403 must retain its access meaning rather than claim an expired session. These are separate source-confirmed failure paths, not a correlation of the original production digest.
