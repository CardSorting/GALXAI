# Technical diligence: implementation and evidence

Reviewed 2026-09-07. This document identifies inspectable implementation and its limits. It is not a certification, patent opinion, uptime guarantee, or universal performance benchmark.

## Architecture

GALXAI provides an inference platform and governance control plane. The application, Cloudflare Worker, standalone Node relay, credential registry, and downstream agent runtime have distinct responsibilities. See [Architecture](../ARCHITECTURE.md) for the source map and [ADR catalog](../adr/README.md) for decisions.

The registry owns durable credential state. The platform pool's database-backed path acquires leases; the standalone relay currently uses process-local shard slots and retry state. The relay opens provider sockets per attempt and performs bounded recovery. It does not promise warm pooled sockets, uninterrupted output, or exactly-once provider work.

## Security and retention

The deployed relay runs as a non-root user in a read-only container with restricted capabilities, resource limits, and a dedicated checkpoint volume. It does not mount the operator's home, repository, personal credential files, or Docker socket. Users obtain inference; their tools run in their own runtimes. This isolation does not extend automatically to application adapter fallbacks or external agents.

Inference and administrator keys have separate roles. Registry credential encryption does not establish that every in-memory copy is erasable. Telemetry excludes prompt and response content, but unfinished job checkpoints can contain request content. Accordingly, the implementation does not establish universal zero data retention, hardware enclaves, regulatory certification, or an upstream training policy.

## Reliability evidence

The local 2026-09-07 rollout included regression checks, container isolation/authentication checks, canary deployment, and a short live chat/SSE request after cutover. The [deployment runbook](../VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) records scope and rollback. Remote application connectivity, public ingress, and live image lifecycle were not verified in that rollout.

Health/readiness measures process/admission state, not credential validity or provider capacity. Authentication rejection disables a credential locally; unknown provider quota stays unknown. Restarted unfinished jobs fail rather than resending automatically. These are bounded failure controls, not zero-downtime guarantees.

## Performance and commercial claims

Use dated, reproducible benchmarks with workload, environment, model, sample count, quality criteria, and billing receipts. Local scheduling time is not client-observed first-token latency. Simulation throughput, compaction ratios, and historical suite results cannot establish universal cost savings or live fleet capacity.

Remove unverified latency, return-on-investment, compliance, and recovery guarantees from customer-facing materials. Review [inference verification](../INFERENCE_PIPELINE_VERIFICATION.md), [security](../SECURITY.md), and [product strategy](../PRODUCT_SURFACE_STRATEGY.md) before publishing technical claims.
