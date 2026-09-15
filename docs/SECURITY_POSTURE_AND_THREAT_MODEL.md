# Authentication security posture and threat model

<!-- docs-scope: domain-reference -->

Private source reference reconciled September 13, 2026. The [workspace auth runbook](operations/workspace-auth.md) owns current session operations. [Current state](../post-mortem/CURRENT_STATE.md) owns deployment facts. This local source audit is not a production security certification.

## Reviewed threats and controls

| Threat | Current source control | Verification limit |
| --- | --- | --- |
| Anonymous workspace entry | Middleware and independent server-page verification, including descendants and RSC requests | Compiled local fixtures; deployment acceptance remains open |
| Forged browser identity or metadata role | Server-verified profile; no local-storage/key/SSO fabrication; verified email and staff membership required separately | Real identity-provider configuration was not changed |
| Session ID used as a logout credential | Verified credential and owner-bound revocation; strict header syntax; cross-site cookie mutations denied | Active-session check rejects copied JWTs after completed sign-out; in-flight authorized requests are outside this guarantee |
| Stale requests restore a previous owner | Abort/revision fencing and account clearing before switch; cross-tab pending/completed sign-out | Previously delivered data cannot be recalled |
| Connection credentials acquire account privileges | External provider ingestion/callback/refresh is closed before credential processing; desktop enrollment is independently authorized | Manual provider login and capability still need real acceptance |
| Session grants unverified elevation | Legacy elevation returns 403; operational diagnostics/vault calls require administrator authorization | A genuine fresh-proof ceremony is not implemented |
| Sub-token scope/lifetime escalation | Requested scopes are bounded by parent and expiry; sub-tokens cannot manage account sessions | Native credentials are a separate contract from Supabase browser sessions |
| Auth or database outage becomes authorization | Generic unavailable response; authoritative native creation/lookup/rotation/revocation and device-grant results; no cache grant after denial/outage | Active-session and native persistence have isolated database tests; device-grant RPC routes still use mocks |
| Internal data enters a customer response | Explicit profile/device/token DTOs; finite failures; no fake public JWKS key | Scoped tests and compiled scans do not certify every module |

## Authority and custody

Auth-service verification plus a live owner-bound session check proves current application account authority. Developer approval, resource ownership, subscription entitlement and staff membership are independent checks. A public API key or editable user metadata cannot confer staff rights. Browser cookies and in-memory SDK sessions remain credentials/candidates to verify; they are not trusted merely because they exist. Native credential verification checks cryptography, signed account provenance, expiry, revocation and database ownership.

Provider credentials can only be enrolled explicitly from a manually created administrator desktop. Application provider ingestion and automatic provider-session renewal are closed under [the ingestion reference](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md). Stored operational records retain their protocol identifiers privately. No user-facing security grade, certification badge, universal deletion guarantee, hardware isolation guarantee or verified model identity is inferred from internal class names.

## Residual risks and acceptance

Default browser sign-out targets the current session and confirms that the session record is no longer active before success. Account entry, profile, team seats and shared API identity all require the same uncached check. A copied JWT is denied on subsequent GALX account requests even while its signature/expiry remain valid. Other sessions stay active; no lifetime setting or global revocation is changed. A future sensitive-action ceremony still needs account-bound fresh proof, expiry and replay rejection. Old native credentials require regular account sign-in for browser recovery and cannot create provider connections; no silent email-based ownership transfer is allowed. Remote native-session APIs do not represent all Supabase devices. Internal administration uses only the explicit configured server credential; built-in defaults and user metadata no longer grant it.

Device grants now require durable RPC acknowledgement and cannot use memory after denial. Deployed database function semantics and cross-process acceptance remain separate from mocked route/repository tests. Provider callbacks are closed. Real GALX account session refresh, cross-tab sign-out and sign-out failure recovery need hosted acceptance after a reviewed release. Read the incident before operational changes; do not use old process IDs or deployment receipts as current authority.

The [historical posture reference](knowledge/audits/2026-09-13-security-posture-legacy.md) preserves the former unverified matrix, timing, certification and diagnostic-grade claims as dated history. They are not current guarantees. Follow the [public information boundary](SECURITY.md); public documentation describes capability, not implementation.
