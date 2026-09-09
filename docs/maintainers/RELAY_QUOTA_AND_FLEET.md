# Federation fleet and quota

<!-- docs-scope: current-guide -->
> Private fleet operations. [The contract](../FEDERATION_STRATEGY.md) is authoritative.

Count registered authority, desired eligible shards, running workers and repair desktops separately. One registered row does not guarantee one serving container. A worker serves only its fresh eligible model capabilities; unrelated idle capacity cannot relieve an exhausted model pool.

Automatic worker reconciliation remains supported. Enrollment is explicit and validated; bulk cache population is retired. Cold-start inventory preflight occurs before Docker allocation. Revision-specific 401 rejection prevents repeated starts; transient failures back off.

Empty capability state retains a worker for rediscovery. Manual holds stop new admissions/replacement and preserve existing workers for intervention. Authority removal, revocation, expiry or rotation still retires old authority. Resume does not reset quota or health.

Provider cooldowns, local concurrency, model evidence and database-backed application lease limits are different controls. Do not clear counters or mark healthy to create capacity. Inspect active work and receipts before changing limits.

The September 9 fixture cleanup left one healthy worker at that observation, not a target fleet size. Use the [monitor](../TELEMETRY_AND_OBSERVABILITY.md), [enrollment guide](RELAY_CREDENTIAL_ENROLLMENT.md) and [dated evidence](RELAY_SESSION_VERIFICATION_20260909.md).
