# Inference verification

<!-- docs-scope: current-guide -->
> Private verification procedure. [The runbook](RELAY_VNEXT_RUNBOOK.md) and [current state](../post-mortem/CURRENT_STATE.md) separate source, fixtures, deployed policy and actual inference. The [September 9 session record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) remains historical evidence.

## Preconditions

Identify the actual target before issuing work. The local Premium service is installed with registration open and execution closed at latest acceptance; real provider sign-in and public application cutover remain pending. Follow [service installation](runbooks/relay-pool-services.md) to register a paid account, review access, open the qualified execution gate and enable the intended account. Verify fresh matching account/credential revisions and runtime epoch. Neither inventory nor monitor availability proves inference.

Qualify Premium text/Sites/images through its scoped runtime key and mandatory operation identity. No failure can borrow another deployment or dispatch through the retained controller. Premium image qualification is an explicit request; no automatic paid probe establishes readiness.

For the retained public deployment, use [legacy enrollment](maintainers/legacy-desktop-enrollment.md) only for eligible unassigned accounts and its original worker capability contract. Assigned accounts cannot use that path. Manual session renewal uses the owning workflow: explicit **Update saved sign-in → Save new sign-in** for new pools, legacy **Check now** only under the retained bridge.

Run [targeted regressions](maintainers/RELAY_HARDENING.md) first. `npm run db:test` creates a disposable Docker database and strips inherited credentials before synthetic account creation. Explicit database overrides remain restricted to initialized loopback fixtures.

## Client verification

For chat, authenticate with the intended application key and observe completed output without SSE failure. A 202, connected socket or partial chunk is not completion.

For images, invoke the actual downstream client with its retry policy, require valid bytes, decode and visually inspect the artifact. Verify re-encoding and metadata removal plus allowlisted raw bodies, headers, errors and async retrieval. Canonical public capability is `openai-gpt-image-latest`; inspect execution evidence only through private admin diagnostics.

Verify application upload/persistence, user authorization and any billing transaction independently. Do not infer them from a relay image response. A lost acknowledgement requires recovery of the existing operation, not automatic new synthesis.

## Evidence to record

Record date, source revision, deployed component/image IDs, request ID, status, elapsed time, byte count, format and artifact digest privately. Never record credentials or raw provider payloads. Separate local build, synthetic test, real provider challenge, completed sign-in, actual inference and production deployment.

September 7 and 8 image observations are historical successes. September 9 verified enrollment cleanup/controller behavior and did not issue a new live image request. Use [ADR 0130](adr/0130-image-receipts-and-uncertain-outcomes.md) for uncertain-result boundaries.

## Sites generation and delivery

Use [Sites verification](maintainers/SITES_FAIR_USAGE.md#verification-and-rollout) for paid eligibility, T01–T26 shared admission, no new wallet charge, public DTOs and recovery. Historical fixed/metered receipt tests remain regressions for existing operations. Missing supplier usage remains unknown; do not estimate a token balance from message counts.

Separately verify the customer's artifact save and exact owner-private publication. A content completion, a native-host save and a deployed application are distinct results. Preserve the historical native-host evidence and distinguish local fixture runs from any authorized live billed test.
