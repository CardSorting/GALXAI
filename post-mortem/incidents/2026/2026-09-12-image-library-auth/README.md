# Image library session verification — September 12, 2026

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->

Private operational record; excluded from Vercel uploads by `.vercelignore`.

**Historical partial fix:** the subsequently requested [live frontend generation test](frontend-generation-test.md) failed. The request could not be retrieved, and the session-expired library message briefly recurred before clearing on reload. The smoke-check results below describe the earlier verification, not a successful end-to-end generation test.

The [September 13 recovery](../2026-09-13-image-generation/README.md) later verified generation, download and persisted Favorites. This record retains the earlier partial fix and its limits.

## Cause and correction

The signed-in Images page showed a session-expired error for both My images and Favorites. Both views call `/api/images/library`, with Favorites adding `isFavorite=true`. These routes were already exempt from developer-preview approval.

The shared bearer-token resolver called `getSupabaseAdmin().auth.getUser(token)`. Production has valid publishable Auth credentials, but its legacy `SUPABASE_SERVICE_ROLE_KEY` setting also contains a publishable credential, and no `SUPABASE_SECRET_KEY` is configured. The administrator client correctly rejects this configuration; the resolver swallowed that error and returned an unauthenticated identity. This incorrectly produced HTTP 401 for valid browser sessions.

The initial resolver correction called `getSupabaseClient().auth.getUser(token)`. The September 13 repair superseded it with a dedicated `getSupabaseAuthClient()` transport to isolate transient verification failures. Auth still verifies the supplied token with Supabase. It never authorizes decoded claims or a caller-supplied user ID. The administrator client continues to reject missing or publishable credentials, and token verification never creates administrator privileges. No credentials or database policies were changed.

## Verification

- New regression cases failed with HTTP 401 before the source fix and passed afterward for both missing administrator credentials and a publishable key in the legacy service-role setting.
- Library and favorite reads, favorite updates, forged owner fields, cross-user asset access, rejected tokens, and anonymous requests are covered. Public responses omit private record fields and diagnostic sentinels.
- `npm run test:image:security`: 22 passing checks, including raw HTTP image responses, artifact metadata removal, authorization, and public response allowlists.
- `npm run test:developer-preview`: 14 passing checks; private developer access remains gated.
- `npm run build`: passed, including TypeScript validation.
- `git diff --check`: passed.

## Production result

Deployment `dpl_JBAYZSHwjA49164sd498FLuDEBao` is READY and serves `galx.ai` and `www.galx.ai`. The existing signed-in browser tab was reloaded without signing out or signing in. My images now displays its normal empty-library state; Favorites displays its normal empty-favorites state. Neither view reports a session-expired or library-loading error. No image generation or favorite mutation was performed against the live account.

The live read-only HTTP audit checked Images and Sites HTML, 23 referenced browser scripts, and four anonymous/forged-token library requests. Rendered content and these assets contained none of the audit's private configuration or diagnostic markers. Unauthorized normal-library and favorites requests returned the expected generic HTTP 401 response. This is a focused check, not a claim about every page or asset on the site. See [public verification](public-verification.json).

The source changes were deployed directly from the working tree and remain uncommitted. No new git commit or push was performed for this request.

The configuration audit read credentials only in memory and emitted credential types and status codes. No credential values were printed or saved.
