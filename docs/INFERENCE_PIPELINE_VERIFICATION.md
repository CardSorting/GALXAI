# Inference verification

<!-- docs-scope: current-guide -->
> Private verification procedure. [The runbook](RELAY_VNEXT_RUNBOOK.md) and [dated session record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) separate source, fixtures and deployment.

## Preconditions

Use explicitly enrolled authority; the inference verification script awaits registry initialization and no longer falls back to bulk seeding. Confirm intended environment, model entitlement and worker capability before live requests. Inventory acceptance is not a successful inference handshake.

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
