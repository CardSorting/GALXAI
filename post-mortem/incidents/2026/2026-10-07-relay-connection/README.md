# Relay connection lost while its listener stayed alive

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20261007-RELAY, SEV-2, controller. Active responder: Codex. Detected October 7, 2026. Authenticated local and ingress model discovery returned 503; image availability returned false. Both listeners remained live. Affected execution capacity is confirmed; user count and original interruption cause are unknown.

## Evidence and timeline

The retained central heartbeat is October 4, 2026 at 12:02:26 UTC. At inspection both assigned accounts were enabled, connected and unexpired. Execution and registration gates were open. The runtime projection denied the existing epoch with 403. Observation event: EVT-20261007-RELAY-observation.

## Cause and contributing conditions

Central authority deliberately rejects runtime heartbeats and projection after its 45-second ownership freshness window. The launcher and supervisor checked listener liveness and image identity only; the runtime therefore stayed alive without being able to recover ownership. The initial missed-heartbeat trigger is not established.

## Containment and recovery

Added an administrator-only central heartbeat check to launcher/supervisor connection checks, preserving identity validation and the existing 61-second handoff wait. Recheck control state before service-scoped recovery. Do not restart for missing, malformed, foreign or inaccessible control evidence. No gate, account, credential, schema, routing or accepted application image change is required.

## Verification and limits

Seven access checks and six supervisor checks pass. The actual launcher was exercised with synthetic commands for fresh, stale, concurrently recovered, foreign and inaccessible control cases. The corrected `up` command restarted only the affected relay, preserving its existing image and volume; the local supervisor was reloaded. [Thirty live acceptance checks](acceptance.json) pass: advancing ownership heartbeat, current account acknowledgments, local readiness, authenticated local/ingress model discovery, image observation, invalid-key/browser-origin denial and actual backend discovery. Both saved accounts remain enabled; one is connected and one was correctly marked sign-in-required by the normal credential-verification path. Image capability is unknown after restart; no synthesis was submitted. The first acceptance harness incorrectly expected both saved tokens to remain valid, then queried a private readiness path through ingress. Those failed harness checks were corrected without changing credentials, routing or authority.

## Prevention and closure

ACT-048 is complete for the installed supervisor correction and live connection acceptance. ACT-049 was initially left open for fresh manual sign-in; the later acceptance below completes it. Host interruption and off-device recovery limits remain under ACT-018. Recovery does not certify provider generation or public release.

## Reconnect follow-up — October 7, 19:00–19:02 UTC

The owner reported that Reconnect required returned after reconnect. Central verified the saved credential at 18:49:56 UTC, then recorded rejection at 18:50:51. The selected desktop login changed at 18:50:48 and differed from the rejected runtime checkpoint. Its exact token passed read-only inventory verification. The sequence establishes an unapplied newer manual login; it does not establish why the earlier token became invalid.

Applied the latest manually saved sign-in once through the normal scoped operator ticket and registrar refresh, with the original account/desktop and a file-consistency recheck. The current runtime acknowledged revision 10 without restart. Private projection, selected login and active checkpoint match; a read-only inventory check from the actual runtime returned 200. The first diagnostic output compared the refresh result's account ID to the registration ID and printed `saved:false`; that comparison was wrong, while the returned updated revision and subsequent central status confirmed the successful save. No retry followed that output.

[Thirty-one acceptance checks](reconnect-acceptance.json) passed after the account remained connected for 160 seconds, covering subsequent inventory refreshes, both connected/acknowledged accounts, advancing unchanged ownership, local/ingress discovery, actual backend selection and raw body/header authorization boundaries. No generation, gate, schema, image or service restart occurred in this supplement. The earlier one-account acceptance remains historical evidence. ACT-049 is complete for this manual reconnect; continuous upstream availability and provider execution remain unclaimed.
