# Telemetry and observability

Reviewed 2026-09-07. The relay operator surface and the application pool telemetry are separate interfaces. Authenticate against the component being inspected; do not expose fleet-wide operator data to end users.

## Relay interfaces

- `/dashboard`: fleet, quota, request, and recovery controls.
- `/telemetry`: bounded request traces with filtering and phase inspection.
- `/api/dashboard/stats` and `/api/telemetry`: administrator-only JSON snapshots.
- `/metrics`: administrator-only Prometheus exposition.
- `/health`, `/health/live`, `/health/ready`: public aggregate process/admission signals.

Use an administrator key in the UI's memory-only access form. API consumers use a configured administrator credential; do not embed it in a scrape URL. Inference keys are insufficient for fleet telemetry. See [relay access](relay-security.md) for default role assignment and exact-origin policy.

## Measurement semantics

A chat's HTTP 202 acknowledgement and provider completion are separate events. Output counters are chunks, not tokenizer token counts. First-output time is measured at the relay, not at the end user's display. Reasoning and keepalives are not visible-answer output. Phase durations can include network, registry, scheduling, and retry waits; they do not isolate provider compute time.

Use opaque `X-Galx-Task-Id` values for correlation. External agent tools and complete task runtime are outside relay telemetry. Parallel calls overlap, so summing durations is not wall time. Explicit provider error frames are stronger evidence than transport timeouts; uncertain failures stay uncertain.

The dashboard avoids overlapping polls, backs off during connection failures, pauses background-tab polling, and stops automatic authorization retries. It identifies stale snapshots, timed recovery, full slots, registry pauses, and credentials requiring replacement. A green process or eligible account is not proof of successful future inference.

## Data scope

`src/relay/telemetry.ts` maintains bounded, sanitized trace records without prompt/response content or authorization headers. Relay job/checkpoint storage is separate and can contain unfinished request content. Do not describe the whole service as zero-data-retention because the telemetry view is sanitized.

The [maintainer telemetry guide](maintainers/RELAY_TELEMETRY.md) describes trace interpretation. The [relay API](RELAY_API_REFERENCE.md) defines status and recovery fields. Application pool, wallet, context, and edge metrics need their own source verification; their names and guarantees are not inferred from the relay's Prometheus endpoint.

## Verification

```sh
node --import tsx --test scripts/test-relay-telemetry.ts scripts/test-relay-hardening.ts scripts/test-relay-adaptive-quota.ts
```

These tests establish behavior under their fixtures. Production availability, provider quota, historical performance, and alert delivery require environment-specific observations.
