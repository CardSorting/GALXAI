# Troubleshooting

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Start with the component and execution state. Product gateway keys, controller keys, worker administration, database authority, and provider credentials are separate. See [API boundaries](API_BASE_URL.md).

## Diagnostic order

1. Check controller `/health` for reachability.
2. Open `npm run relay:open` on the controller host, or use server admin authorization for `/api/capabilities`, and inspect the requested model's eligible pool, evidence freshness, cooldown, and worker generation.
3. Distinguish unavailable capability from saturated capacity. Idle unrelated models do not resolve either condition.
4. Find the request ID, execution state, receipt scope, and any signed job URLs.
5. Follow the [request recovery table](RELAY_API_REFERENCE.md#request-recovery) before submitting more inference.

| Symptom | Interpretation and action |
| --- | --- |
| `model_temporarily_unavailable` | Inspect that operation's capability evidence, credential state, and refresh failures |
| `model_capacity_exhausted` | Honor retry guidance for the eligible pool; inspect active streams/reservations |
| `route`, generic 403/404, or timeout | Insufficient evidence of model permission loss; inspect sanitized upstream classification |
| Image unavailable while chat works | Chat inventory does not verify image tools; inspect image evidence and alias dependency |
| Unexpected image dimensions/model | Inspect private administrator evidence; the public capability does not promise exact provider model/dimensions |
| `relay_admission_unknown` | Work may have executed; reconcile instead of blindly replaying |
| `job_transport_unavailable` | Retry the original job URL, not inference admission |
| `relay_generation_gone` | Stream/cancel generation is gone; use the original durable text receipt if present, never reattach execution |
| Stale dashboard | Retained snapshot is not routing authority; restore authenticated refresh |
| Controller admin 401 | Use the controller administrator credential; worker admin errors are separate |
| Browser origin rejected | Operator pages require the host launcher and local origin; product clients use their application backend |
| Monitor asks to reconnect | Relaunch from the host; do not paste an admin key into the page |
| Many rejected records but few workers | Inspect source/revision evidence; registry count is not serving capacity; only exact known fixtures qualify for targeted cleanup |
| Cold start repeatedly fails | Inspect preflight classification/backoff; 401 suppresses a revision, while 403/5xx/timeouts are transient |
| Login saved but old credential still used | Review link, safe file source, validation, checkpoint and worker-applied state separately |
| Wrong account or updated elsewhere | Preserve current authority; review matching/link or complete the intended account sign-in |
| Credential checkpoint error | Keep the recoverable intent; retry after storage recovery without overwriting a newer revision |
| Healthy desktop, unavailable shard | Desktop connection is independent; inspect hold, credential and model evidence |
| Paused shard will not replace worker | Hold intentionally blocks replacements; review authority and explicitly resume when appropriate |
| `db:test` rejects environment | Supply a dedicated loopback test database, never disable the production guard |

## Recovery boundaries

Use the [linked desktop](maintainers/RELAY_DESKTOPS.md) for existing-account repair, or [validated enrollment](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) for a new account. A maintenance hold preserves an existing worker while blocking new admissions and replacements; registry removal, revocation, expiry or rotation still wins. Changing task IDs, clearing rejection/quota state or manually setting healthy is not recovery. Empty capabilities alone do not require a container restart. A newer credential revision and authoritative discovery restore normal eligibility.

Database checkout saturation and query-specific errors must not become global cooldown evidence. Observation-only telemetry cannot clear or extend authoritative cooldowns. Preserve current lease and generation fences during diagnosis.

`docker-compose.relay.yml` and old shared-relay CLI commands are not the federation launcher. Use the supervised controller and [vNext runbook](RELAY_VNEXT_RUNBOOK.md). Confirm image and process generation after deployment; code on disk does not prove the running image changed.

The September 7 DreamBees image verification succeeded as recorded in ADR 0127. Reproduce through the actual current client before claiming a new incident resolved. Billing, asset persistence, and tool execution require their own checks.

## Sites content

Use the [Sites recovery runbook](maintainers/SITES_OPERATIONS.md#pause-recovery-and-rollback). A generic `content_unavailable` can mean disabled generation, cohort denial, invalid server configuration, an incompatible worker, missing administrator authority or unavailable storage. Diagnose privately; do not return the internal cause to the account.

`generation_limit_reached` pauses new work; it does not prevent existing-operation GET recovery. `operation_pending` or null cost requires the original operation's receipt. Missing usage alone does not block a fixed-price completed receipt, but it still blocks legacy metered settlement. A confirmed unused operation closes at zero; a missing receipt is not proof of non-dispatch.

Do not resolve a fixed-mode readiness failure by inventing supplier evidence or enabling unsupported ceiling forwarding. Verify the local profile and compatible deployed components. Direct CLI archive-upload failure is a separate delivery issue; use the recorded native-host workflow without repeating an uncertain save.
