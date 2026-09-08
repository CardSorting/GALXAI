# Troubleshooting

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Start with the component and execution state. Product gateway keys, controller keys, worker administration, database authority, and provider credentials are separate. See [API boundaries](API_BASE_URL.md).

## Diagnostic order

1. Check controller `/health` for reachability.
2. Authenticate to `/federation` or `/api/capabilities` and inspect the requested model's eligible pool, evidence freshness, cooldown, and worker generation.
3. Distinguish unavailable capability from saturated capacity. Idle unrelated models do not resolve either condition.
4. Find the request ID, execution state, receipt scope, and any signed job URLs.
5. Follow the [request recovery table](RELAY_API_REFERENCE.md#request-recovery) before submitting more inference.

| Symptom | Interpretation and action |
| --- | --- |
| `model_temporarily_unavailable` | Inspect that operation's capability evidence, credential state, and refresh failures |
| `model_capacity_exhausted` | Honor retry guidance for the eligible pool; inspect active streams/reservations |
| `route`, generic 403/404, or timeout | Insufficient evidence of model permission loss; inspect sanitized upstream classification |
| Image unavailable while chat works | Chat inventory does not verify image tools; inspect image evidence and alias dependency |
| Unexpected image dimensions/model | Inspect disclosed compatibility execution; OAuth tool selection is provider-managed |
| `relay_admission_unknown` | Work may have executed; reconcile instead of blindly replaying |
| `job_transport_unavailable` | Retry the original job URL, not inference admission |
| `relay_generation_gone` | Original worker is gone; never attach old work to a replacement |
| Stale dashboard | Retained snapshot is not routing authority; restore authenticated refresh |
| Controller admin 401 | Use the controller administrator credential; worker admin errors are separate |
| Browser origin rejected | Use the application backend; do not expose server credentials |

## Recovery boundaries

Invalid credentials require authorized replacement through the registry; changing task IDs, clearing quota counters, or manually setting healthy is not recovery. Empty capabilities alone do not require a container restart. A newer credential revision and authoritative discovery restore normal eligibility.

Database checkout saturation and query-specific errors must not become global cooldown evidence. Observation-only telemetry cannot clear or extend authoritative cooldowns. Preserve current lease and generation fences during diagnosis.

`docker-compose.relay.yml` and old shared-relay CLI commands are not the federation launcher. Use the supervised controller and [vNext runbook](RELAY_VNEXT_RUNBOOK.md). Confirm image and process generation after deployment; code on disk does not prove the running image changed.

The September 7 DreamBees image verification succeeded as recorded in ADR 0127. Reproduce through the actual current client before claiming a new incident resolved. Billing, asset persistence, and tool execution require their own checks.
