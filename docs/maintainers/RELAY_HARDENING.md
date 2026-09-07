# Relay resilience and isolation

This pass applies timeout/backoff guidance from [Amazon Builders' Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) and retry amplification controls from [Google SRE](https://sre.google/sre-book/addressing-cascading-failures/). It extends the existing per-shard cooldown and bounded failover policy; it does not add a provider call quota.

## Request and job boundaries

- When API keys are configured, the verified key's SHA-256 identity owns requests, deduplication and job routes. `X-Tenant-Id` cannot override that identity or evade the caller's rate bucket. Separate keys no longer share matching chat jobs or read, stream or cancel each other's jobs. Requests using the same key share a principal. In unauthenticated local mode, the socket address is the principal; this mode is not multi-tenant isolation.
- Management and telemetry endpoints retain their existing operator-key authorization. They are not tenant-scoped dashboards. Do not distribute operator keys as a full multi-tenant public hosting solution.
- Chat deduplication includes the principal, routed model, messages, reasoning effort and output-token budget. Existing jobs written under older principal identities may not be accessible after upgrade; new requests use the new identity.
- Image idempotency is principal-scoped. Concurrent reuse returns `409 image_request_in_progress` with `Retry-After: 2`; successful reuse returns cached output. Reusing a completed key with different image parameters returns `409 idempotency_conflict`. Failed attempts are not cached. Idempotency is retained only for the configured TTL.
- JSON bodies are byte-bounded, decoded after buffering so split UTF-8 characters survive, timed out, and rejected if interrupted or not objects. Model/message/effort/token fields are validated before dispatch. The relay supports system, developer, user and assistant messages; it rejects unsupported tool-role messages rather than silently converting them to user input. This does not implement external tool execution.

## Failure containment

- Invalid request/context/model/unsupported-parameter provider errors and deterministic HTTP 400/404/405/413/422 responses terminate without cycling through or penalizing healthy shards. Quota, authentication and transient transport errors still use the fleet's bounded failover rules.
- A process-wide retry budget starts with 20 credits, capped at 20. Each scheduled replacement attempt spends one credit; success returns one credit; elapsed time restores one credit per 10 seconds. Normal first attempts do not spend credits. This limits outage amplification without pretending to know the provider quota.
- Chat and image retry waits use exponential full jitter. Existing explicit provider cooldown deadlines still take precedence when selecting eligible shards.
- Image requests have one absolute `jobMaxWallTimeMs` deadline across registry refreshes, transports and retries. REST fetches receive the abort signal; WebSockets close when it aborts. Client disconnect aborts image work. Shutdown allows a bounded grace period, then aborts any unfinished work. Cancellation returns the shard's capacity without treating the credential as faulty.
- Finished chat sessions clear their timers and leave the session map. Terminal job records expire after `jobTokenRetentionMs`. Each job's token replay buffer respects `maxBufferedTokensPerJob`; the chat WebSocket also limits individual incoming payload size.
- An invalid replay cursor returns `400 invalid_replay_cursor`. A cursor older than retained output returns `409 replay_window_expired` instead of silently returning an incomplete replay. Start a fresh request when earlier output is required. Job records unavailable after retention return 404.

## Operator recovery

The telemetry footer reports available retry credits and process event-loop delay. Failure evidence identifies retry-budget and image-deadline exhaustion as relay-side limits. Provider/network ambiguity remains explicit.

The page backs off failed refreshes, honors `Retry-After`, suspends automatic retries after HTTP 401, and preserves the previous snapshot with an error notice. API-key submission or manual refresh can recover access. Offline and online transitions are explicit; returning to a visible tab or a back-forward cached page resumes updates. Pausing aborts an active refresh. Long task IDs wrap, and mobile input text is 16px to avoid focus zoom.

## Regression coverage

```sh
node --test --import tsx scripts/test-relay-hardening.ts scripts/test-relay-telemetry.ts scripts/test-relay-adaptive-quota.ts
```

The suite uses isolated local mock providers: principal isolation, malformed inputs, permanent errors, session retention, image deadline cancellation, retry credits, split UTF-8, payload/read limits, replay gaps, concurrent image idempotency, telemetry privacy and existing quota behavior. Browser checks cover desktop/mobile, 95-character task IDs, authentication retry suppression, server Retry-After, offline recovery and placeholder/input usability. These checks do not certify external-provider availability or whole-system multi-tenant security.


## Admission, draining and restart safety

- Admission follows [Google SRE's load-shedding guidance](https://sre.google/sre-book/addressing-cascading-failures/): inference POSTs are bounded by `RELAY_MAX_CONCURRENT_REQUESTS` (default 64 active HTTP requests) and `RELAY_MAX_RSS_MB` (default 384 MB). These are server resource thresholds, not provider quotas. Asynchronous chat HTTP slots release after their 202 response; accepted jobs retain the separate shard concurrency limit. Adjust the memory threshold to the host/container budget.
- Overload or memory pressure returns 503 with a two-second Retry-After before starting provider work. Telemetry and health endpoints remain available. Admission state and thresholds appear in telemetry. Retry-After is exposed to browser clients through CORS.
- `/health/live` and the compatible `/health` stay HTTP 200 while the process handles requests. `/health/ready` returns 503 while draining or resource-limited. Readiness describes server admission, not guaranteed provider quota availability.
- Draining follows the [Envoy separation of graceful and forced closure](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining): reject new inference, let accepted chat/image work finish, then abort remaining jobs and destroy HTTP sockets at `drainTimeoutMs`. Partial uploads and slow connections cannot hold shutdown open indefinitely. Concurrent stop calls share one shutdown operation.
- Shard capacity belongs to the current attempt. Failure clears ownership before retry backoff; cancellation cannot release another job's slot. Cancelling a recovery probe does not reset its error history—only successful provider completion does. Retry timers are cleared with terminal sessions.
- A rejected replay cursor or subscriber admission does not count as a successful reconnect or disarm the prior disconnect grace timer.
- Checkpoints do not contain live sockets or output replay buffers. Recent interrupted jobs therefore recover as failed with `relay_restarted_start_new_request`; they are not falsely advertised as resumable and are not automatically resent. Stale checkpoint jobs outside the retention window are ignored.

Additional regressions cover shared-shard cancellation races, cancelled recovery probes, request/memory admission, readiness versus liveness, shutdown with a partial upload, successful image completion during grace, failed reconnects and crash recovery. Local browser fixtures exercise the admission notice at desktop and phone widths.


## Async operation and cancellation contract

Following the [Azure asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply), chat acceptance now supplies `Operation-Location`, `statusUrl`, `pollAfterMs: 2000`, `Retry-After: 2` and the request trace ID. The existing `Location` stream URL is preserved for compatible streaming clients. `Location`, `Operation-Location` and `Retry-After` are exposed through CORS.

The job status endpoint uses `Cache-Control: no-store`, reports `terminal`, and provides polling guidance only while work is active. Its trace ID identifies the original job request. Terminal status does not suggest continued polling.

Compatibility changes are intentional: fabricated ETA and queue headers are removed; legacy `estimatedWaitSec` and `queuePosition` fields are null. `tokensGenerated` and `tokensStreamed` are null because the relay counts output chunks, not tokenizer tokens; use `outputChunks`. Cancellation adds `cancellationApplied`, sets `refunded` to null, and reports `refundStatus: not_managed_by_relay`. The relay performs no refund transaction. Repeated cancellation is safe and reports that no new cancellation was applied.

The overview labels completed requests and output chunks accurately, separates active from recent counts, and orders jobs newest first without mutating the database result. Cancel controls disable during an action and for terminal jobs, check HTTP outcomes, and explain uncertain failures. Job fields and toast error text are escaped; event handlers receive job IDs through data attributes rather than interpolated JavaScript.

Regression coverage includes active/terminal polling, absence of fabricated ETA, trace correlation, chunk counts, repeat cancellation and refund semantics. Browser checks cover pending/terminal controls, failure feedback and hostile error text without HTML execution.
