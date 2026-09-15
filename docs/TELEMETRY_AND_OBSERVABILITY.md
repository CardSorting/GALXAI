# Relay health and operational visibility

<!-- docs-scope: current-guide -->

Private operations for [the implemented account/runtime contract](reference/relay-account-management.md). Read [current state](../post-mortem/CURRENT_STATE.md) for actual acceptance rather than treating telemetry as deployment proof.

## Controller view

Open **GALX Monitors** or a fixed Premium/Standard app. Each console has Accounts, Registration and Activity under its own operator/viewer session. The authorized `/api/status` combines scoped central state and own desktop observations. Ordinary GALX sign-in does not grant this access.

Accounts show saved state, relay confirmation and Health separately. Search, Status and Health combine with issues-first/name sorting. Registration has separate progress/attention/unknown/removed filters. Default active views exclude removed records; history remains inspectable. The UI does not combine both pools or download peer accounts.

## Worker view

A pool runtime hosts account engines inside its container. Minimal liveness/ready endpoints reveal no operational inventory. Readiness requires recent reconciliation and running engines; it does not prove every requested model or image operation. Central grants, account class, model inventory, provider evidence and product entitlement remain separate.

The retained legacy controller has aggregated `/api/telemetry`, `/api/capabilities` and delegated `/api/monitor/state`; `relay:open` opens that older surface. Its per-worker metrics and reverse index are not endpoints provided by the new pool front door. See [legacy API](reference/legacy-federation-api.md).

## Activity and quick views

Health pairs icon, label and reason: sign-in expiry, unavailable access, cooldown, repeated failures, applying/unconfirmed changes or unknown connection. A stopped desktop is normal for a registered account. No issues detected means no issue in available metadata; it is not a background generation test.

Activity reports saved rename, pause/enable, removal and restore outcomes from central records. It does not prove runtime application or upstream success. Removal cleanup can remain incomplete after the central save; inspect Removed registrations for Stop desktop. Registration progress and available model inspection are separate from account health.

## Staleness and retention

Polling runs every ten seconds while visible, preserves filters/disclosures/focus and disables mutations after refresh failure. Applied requires matching revision/epoch and a non-future heartbeat under 45 seconds old. Unknown connectivity is not zero activity or a failed account. Overdue application becomes attention after 90 seconds when execution is allowed.

Telemetry is observation-only. It cannot clear cooldowns, revive removed accounts or grant execution. Retain only allowlisted diagnostic evidence; exclude credentials, prompts, output, raw provider errors and guest contents. Central management journals and execution outcomes have separate durable roles; browser views are not another account registry. See [source interpretation](maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md) and [activity UX](maintainers/RELAY_TELEMETRY_UX.md).
