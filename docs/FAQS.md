# Frequently asked questions

Reviewed 2026-09-07. See [architecture](ARCHITECTURE.md) for component ownership and [API base URLs](API_BASE_URL.md) before choosing an endpoint.

## Is the relay the product API?

No. The product has application/SDK routes and separate authorization. The standalone relay acknowledges chat with HTTP 202 and returns job status/stream URLs. Its endpoint and parameter coverage is narrower. The app adapter translates its transport for callers.

## Can users still run agents?

User applications can use inference and tool-call output in their own runtimes. The relay does not execute model-selected tools or create user workspaces on the operator's device. Its existing protocol handling is preserved; full tool-protocol compatibility is not implied.

## Which key belongs where?

Use a product API key for the product, a relay inference key for relay jobs, an administrator key for relay operations, and backend registry credentials for provider dispatch. The app uses `VM_RELAY_API_KEY`. Do not substitute a provider OAuth token for a relay key or expose administrator keys in public frontend configuration.

## Does no local cap mean unlimited inference?

No. The default three-hour usage window is observational. Provider quota can be unknown, depleted, or revoked independently. Local concurrency, admission, optional caps, and deadlines still apply.

## What happens when credentials expire or are revoked?

Expired/rejected credentials are excluded locally. Sign in or rotate through the registry and sync. Resetting history does not repair authentication. Local rejection checkpoints do not broadcast revocation to other processes.

## Are retries endless or seamless?

No. Attempts, retry credits, backoff, and wall time are bounded. A failed request stops. Mid-stream continuation can fail or alter output. Inspect partial output before explicitly submitting another request.

## Can a stream resume after restart?

Only retained in-memory output supports SSE replay. Checkpoints do not restore sockets or replay buffers; interrupted jobs recover as failed and are not automatically resent.

## Does cancellation refund the request?

The relay performs no wallet transaction. It reports cancellation separately and sets refund status to `not_managed_by_relay`. Application accounting has a separate owner.

## What was deployed?

A non-root/read-only Docker relay on loopback port 3001 with private checkpoint storage and no personal/source host mounts. The 2026-09-07 rollout verified local canary and production inference, authentication, registry, and isolation. It did not establish remote app deployment, public ingress availability, an egress firewall, or a service-level guarantee.

## Does BroccoliDB guarantee cheaper or lossless inference?

Representation selection and runtime projections have separate scopes and tests. Savings and task quality require measured workloads; they cannot be inferred from a compression feature, historical benchmark, or relay health. See [BroccoliDB documentation](broccolidb/README.md).

## Where are setup and incident procedures?

Use the [relay runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md), [troubleshooting](TROUBLESHOOTING.md), [security](relay-security.md), and [verification guide](INFERENCE_PIPELINE_VERIFICATION.md).
