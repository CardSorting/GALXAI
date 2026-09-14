# Telemetry sources and interpretation

<!-- docs-scope: current-guide -->

Private maintainer reference, source-reviewed September 13, 2026. Begin an incident with the [telemetry overview](../TELEMETRY_AND_OBSERVABILITY.md) and [request investigation](RELAY_TELEMETRY.md). Liveness, eligibility, request acceptance, durable completion and customer-visible success are different observations.

## Implemented surfaces

| Surface | Owning source | Scope |
| --- | --- | --- |
| Controller aggregate telemetry and monitor state | [federation telemetry](../../src/relay/federation-telemetry.ts), [controller](../../src/relay/federation-server.ts) | Private server-side administration or delegated read-only monitor sessions, according to the route |
| Worker `/metrics` | [relay server](../../src/relay/relay-server.ts) | Administrator-authorized worker metrics; not a universal public application endpoint |
| Application internal telemetry | [internal telemetry route](../../src/app/api/internal/telemetry/route.ts), [telemetry engine](../../src/core/telemetry/BroccoliTelemetryEngine.ts) | Internal authorization, JSON snapshots or text exposition of retained in-process data |

Worker names include `galxai_relay_jobs_in_flight`, `galxai_relay_jobs_submitted_total` and `galxai_relay_jobs_completed_total`. Read the current exporter for the full set and actual units. Some labels refer to transport chunks as tokens; do not treat those as tokenizer usage or billing proof.

The application engine derives metric names from retained observations and emits summaries/buckets plus `galx_telemetry_retained_points_total`. An empty process buffer is not proof that fleet activity was zero. Source support for exposition does not establish that a production collector, dashboard or alert is configured.

The previous guide's fixed catalog of HTTP, savings, fidelity, vault and seat metrics was not supported by matching source implementations during this review. Its illustrative Grafana rules and claimed universal JSON schema have been removed. This page does not promise zero overhead, sub-millisecond timing or a deployed Prometheus/Grafana service.

## Diagnose with bounded evidence

Correlate an opaque operation ID, time window, component/revision, phase and safe outcome code. Check observation freshness and missing workers before interpreting counts. Keep prompts, generated output, credentials, authorization headers, raw provider errors and unnecessary user identifiers out of shared evidence. Administrator access is distinct from ordinary sign-in.

For images, reconcile the original durable receipt and owned asset before calling the request complete. For new Sites work, distinguish included admission, durable outcome, published snapshot and paid entitlement. Historical wallet settlement applies only to original fixed/metered operations. See [Sites operations](SITES_OPERATIONS.md).

## Alerts and verification

Define each new alert from a real source signal, measured units, ownership and an actionable runbook. The local guardian now emits redacted controller-availability events for blocked ownership, stalled progress, unproven termination, restart-budget exhaustion and missing required capabilities. Confirm launchd installation, exporter behavior and collector configuration in the intended environment before describing those alerts as active in production; the unperformed deployment drills remain [open prevention work](../../post-mortem/OPEN_ITEMS.md).

Record dated observations and missing coverage. Use the owning tests and private route authorization checks for source changes. Do not expose operational diagnostics to customers to make troubleshooting easier.
