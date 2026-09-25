<!-- docs-scope: decision-record -->

# ADR 0162: Local durable ingress queue for the Premium relay

## Context and decision drivers

The existing Premium runtime needs bounded, persistent admission in front of provider execution. It already owns the runtime process, in-process account engines, durable execution records and a persistent `/state` volume. The queue must survive container replacement without becoming a second account authority, cross-pool scheduler or deployment service.

The owner directed that `BROCCOLIQUEUE` and `BroccoliDB` be used together, with queue workers running locally inside the existing Docker image.

## Options considered

1. Keep process-local admission only. A runtime replacement would lose unforwarded requests.
2. Add a remote broker or a separate queue container. This would create another service and recovery boundary.
3. Embed BroccoliQueue in the Premium runtime, persist its tables with BroccoliDB in the existing `/state` volume, and retain the current execution store as authority after dispatch.

Choose option 3. It fits the existing service and avoids duplicating persistence, runtime or account authority.

## Decision

The Premium `PoolRuntime` validates authentication, request shape and idempotency before admitting non-stream chat and image generation requests to two local BroccoliQueue queues. The existing relay worker path performs execution. Eight text/Sites workers and four image workers run in-process. Total active/waiting/delayed admission is capped at 128 jobs, per-owner admission at eight, and waiting/delayed images at 32. Those limits cover both new work and explicit reactivation of retained terminal requests. Streaming chat remains on the existing direct path.

BroccoliDB stores queue state under the existing runtime state directory at `/state/request-queue/.broccolidb`. The Docker build bundles source from the two existing package directories into the existing Premium runtime image. No new app, database project, container, port, authentication scheme or deployment target is introduced.

The queue contains no inference bearer key. It persists the validated request body, opaque delegated tenant identity, idempotency identity and queue result until response acknowledgement. Its workspace and files are restricted to the runtime owner, symlinks/non-regular entries are rejected, and the runtime uses a restrictive process umask. This is local UID isolation, not at-rest encryption against host administrators or disk access. The public response boundary revalidates queue output and applies the existing chat/image sanitizers and header allowlist before sending it. Waiting-only cancellation is an atomic queue operation: disconnects and the 120-second admission deadline cannot abort work after claim. A deadline response is marked `not_accepted` only when the queue proves the job was still unclaimed. Acknowledged terminal jobs are removed; full compaction is coalesced after eight acknowledgements, 128 queue mutations, or 30 seconds, and failed snapshot rotation is retried while the WAL remains replayable. Disconnected terminal jobs are retained for up to one hour, with a four-job cap.

The queue admits work; it does not authorize replay. Runtime ownership and execution recovery precede queue-store opening, and the HTTP listener is not exposed until both worker handles report running and queue persistence is healthy. Active queue claims renew a 90-second lease every 30 seconds so an unclean restart can reconcile abandoned claims within a bounded interval while long live requests continue. Graceful shutdown closes admission while existing workers continue processing accepted work as the listener drains. The queue then stops new claims and drains active handlers; unclaimed work left on `/state` resumes with its original deadline after replacement. Before invoking the relay handler, a recovering worker compares its recorded claim timestamp with that deadline; a claim at or after expiry completes as `not_accepted` without dispatch, while an earlier claim owns the race and may complete normally. Existing central leases and durable execution records remain the authority after dispatch. Uncertain or restarted execution is not forwarded to another account or provider. A waiting queue job may resume from the retained local volume; interrupted active work is checked against the original execution record and can return an uncertain result.

## Consequences and recovery

The runtime can restart with waiting jobs intact when the existing `/state` volume is preserved. Queue saturation and wait expiry produce bounded backpressure before provider I/O. Disconnecting callers do not cancel a job once a worker has claimed it. WAL compaction avoids rewriting the complete database after each response; coalescing bounds rewrite frequency while retention, the four-row terminal cap and the result-size cap bound retained results. Compaction may defer rotation when writes cross its snapshot boundary; the existing WAL remains replayable and a later attempt retries the rotation.

The queue is local to one Premium runtime and has no cross-pool migration. Existing execution recovery controls the result of work that reached provider execution. Runtime replacement follows the private [relay pool services runbook](../runbooks/relay-pool-services.md): hold new serving traffic when needed, confirm drain, stop only Premium runtime, preserve `/state`, then update the Premium runtime image pin. Roll back to the prior pinned runtime only after the same drain and ownership handoff. Shutdown waits for the runtime drain before closing the execution database pool, keeping queue completion and ledger settlement alive for the full grace period.

## Confirmation and delivery

Source, test and deployment evidence are recorded separately. Focused checks cover public response allowlists, authentication before enqueue, idempotency conflict/replay behavior, sanitized image artifacts, private queue storage, wait/dequeue races, retry capacity, BroccoliDB compaction/restart recovery and BroccoliQueue terminal retention. The runtime drain timeout remains below Docker's eight-minute grace period; this permits a 120-second maximum queue wait plus the 310-second bounded relay request and shutdown margin. A local container deployment does not certify every provider, model, workload or a public application cutover.

## Relationships

This decision extends the local operation boundary in [ADR 0159](0159-local-mac-relay-operation.md) and the execution authority in [ADR 0153](0153-central-account-authority-isolated-relays.md). It supplements the [application queue contract](../QUEUE_SPECIFICATION.md) and [local Premium runbook](../runbooks/relay-pool-services.md) without replacing their account admission or execution recovery rules.
