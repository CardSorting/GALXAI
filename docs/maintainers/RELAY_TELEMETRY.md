# Relay request telemetry

Open `/telemetry` on the local relay (normally http://127.0.0.1:3001/telemetry), or choose **Request telemetry** in the relay overview. The page uses a request table, filters and a selected-request waterfall. Its interaction references are Grafana Explore's trace drill-down and Langfuse's separation of trace duration from first-output timing:

- https://grafana.com/docs/grafana/latest/visualizations/explore/trace-integration/
- https://langfuse.com/docs/observability/data-model

## Investigating a failure

1. Filter by outcome, model/error text or time range. Select a request.
2. Compare the requested model with the routed model. The relay currently maps some model aliases; this view reports that behavior rather than hiding it.
3. Inspect connection, provider wait, output and retry phases. A recovered request preserves its earlier failed attempts.
4. Read the failure evidence. Explicit upstream errors indicate provider-side rejection; socket and timeout errors remain **Transport / uncertain**, because a relay cannot isolate network transit from provider compute. A local empty fleet, registry failure or drain is attributed to the relay.
5. Copy the trace ID or export the selected record as JSON. The job ID links asynchronous acceptance to terminal completion. HTTP 202 is acknowledgement, not successful task completion. Duplicate stream attachments have a separate **Attached** outcome, link to the original job and are excluded from execution percentiles. Their duration measures attachment, not the model task.

Send `X-Galx-Task-Id: task-123` on related requests and search for the ID. Clicking a task ID applies the search. The task summary shows the retained calls' observed elapsed span and summed request time; parallel calls can overlap. External tools and full agent task execution are outside this relay's measurement boundary. IDs allow 1–96 ASCII letters, digits, dots, underscores, colons and hyphens. Use opaque IDs, not task descriptions.

## Measurement and storage contract

- `X-Galx-Trace-Id` is returned on chat and image POST requests, including rejected requests. CORS exposes it and allows the task header.
- `GET /api/telemetry` returns the bounded trace snapshot and process RSS, uptime and event-loop p99 delay since process start. It requires relay administrator-key authorization and `Cache-Control: no-store`. It does not require registry availability.
- Duration uses a monotonic clock, from relay receipt to job completion/failure/cancellation. Wall timestamps only support ordering and retention. HTTP acknowledgement status is recorded separately.
- First output is the first output chunk accepted for forwarding by the relay. Reasoning and keepalives do not count. It is not a client-observed timestamp. Chunks are not tokenizer counts; image calls have no text-first-output measurement.
- Per-attempt output gaps exclude reconnect/retry delays. Provider phases include network time. REST image calls expose a combined provider/network phase rather than invented connection timings.
- Relay phases include body intake, registry/selection and retry waits. They are not a CPU-time measurement. Event-loop delay is a process-lifetime signal, not historical evidence for a specific request.
- The store retains at most 500 requests for one hour, at most 16 attempts and 64 phases per request. It is ephemeral and resets on restart. Oldest records can be evicted, including active records at capacity; eviction count is visible. Percentiles reflect only retained, filtered records. No historical backfill is fabricated.
- Telemetry stores no prompt, response content, authorization header or raw provider error message. It records safe model/task/shard identifiers and classified failure codes. Existing relay job storage is separate and unchanged.
- API keys entered on the telemetry page remain in page memory and are not persisted. Pause freezes the snapshot; manual refresh still works. Hidden tabs stop polling. Polls do not overlap and time out after eight seconds.

## Verification

`node --import tsx --test scripts/test-relay-telemetry.ts scripts/test-relay-adaptive-quota.ts`

Tests use local mock providers and cover monotonic timing, bounded retention, privacy, HTTP authorization, asynchronous completion and quota failover. Desktop/mobile browser checks cover filters, task summaries, selected request, empty/error states and overflow. They use synthetic data only in the test browser; the shipped page contains no demo data.
