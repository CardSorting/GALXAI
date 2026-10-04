# Relay request evidence and operational visibility

<!-- docs-scope: current-guide -->

Private operations for [the implemented account/runtime contract](reference/relay-account-management.md). Read [current state](../post-mortem/CURRENT_STATE.md) for actual acceptance rather than treating telemetry as deployment proof.

## Controller view

Open **GALX Monitors** or the fixed Premium app. It has Accounts, Connections and Activity under its own operator/viewer session. The authorized `/api/status` combines scoped central state and own desktop observations. Ordinary GALX sign-in does not grant this access.

Accounts show saved state, relay confirmation and Request status separately. Search, Status and Request status combine with issues-first/name sorting. Registration has separate progress/attention/unknown/removed filters. Default active views exclude removed records; history remains inspectable. The UI does not expose unrelated account records or download provider credentials.

## Worker view

A pool runtime hosts account engines inside its container. Minimal liveness/ready endpoints reveal no operational inventory. Readiness requires recent reconciliation and running engines; it does not prove every requested model or image operation. Central grants, account class, model inventory, provider evidence and product entitlement remain separate.

The retained legacy controller has aggregated `/api/telemetry`, `/api/capabilities` and delegated `/api/monitor/state`; `relay:open` opens that older surface. Its per-worker metrics and reverse index are not endpoints provided by the new pool front door. See [legacy API](reference/legacy-federation-api.md).

## Activity and quick views

Request status pairs icon, label and reason: sign-in expiry, explicit unavailable access, current cooldown, retained failures, applying/unconfirmed changes or unknown availability. Unknown is neutral and expected when no current result establishes availability. A stopped desktop is normal for a registered account. Current credentials do not imply healthy upstream service; each request supplies its own result. Retained warnings do not veto reconnect or independently authorized Enable.

Activity reports saved rename, pause/enable, removal and restore outcomes from central records. It does not prove runtime application or upstream success. Removal cleanup can remain incomplete after the central save; inspect Removed registrations for Stop desktop. Registration progress and available model inspection are separate from account health.

## Staleness and retention

Polling runs every ten seconds while visible, preserves filters/disclosures/focus and disables mutations after refresh failure. Applied requires matching revision/epoch and a non-future heartbeat under 45 seconds old. Unknown connectivity is not zero activity or a failed account. Overdue application becomes attention after 90 seconds when execution is allowed.

Cancellation, deadlines, transport loss and local failures settle with null provider evidence: neither success nor failure counters change. A concrete provider availability error remains negative evidence; confirmed completion remains positive evidence. Terminal unknown records cannot be replayed or rewritten.

Telemetry is observation-only. It cannot clear cooldowns, revive removed accounts or grant execution. Retain only allowlisted diagnostic evidence; exclude credentials, prompts, output, raw provider errors and guest contents. Central management journals and execution outcomes have separate durable roles; browser views are not another account registry. See [source interpretation](maintainers/TELEMETRY_AND_METRICS_OBSERVABILITY.md) and [activity UX](maintainers/RELAY_TELEMETRY_UX.md).
