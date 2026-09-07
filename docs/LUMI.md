# Agent clients and the GALXAI relay

Reviewed 2026-09-07. Earlier versions of this guide combined adjacent client projects, subscription claims, provider quotas, and relay deployment assumptions. Current GALXAI relay operation is owned by this repository and [ADR 0122](adr/0122-isolated-authenticated-relay-and-bounded-recovery.md).

External agent clients may consume GALXAI inference and execute their own authorized tools in their own runtimes. Model output is not permission to execute tools on the relay host. The relay preserves its existing protocol handling and does not implement a complete remote agent workspace or every tool round trip.

Use the correct API boundary. The hosted product/SDK base URL is documented in [API_BASE_URL.md](API_BASE_URL.md). The standalone relay has a distinct HTTP 202 chat-job/SSE contract and uses relay inference keys; it is not a transparent replacement for every product API endpoint.

The application adapter uses `VM_RELAY_URL` and `VM_RELAY_API_KEY`. Provider credentials remain backend registry material. Operators use dedicated administrator keys for fleet controls and telemetry. The deployed container does not mount client credential directories or the host repository, and host discovery is disabled.

There is no documented fixed per-provider quota or model entitlement here. Read configured catalog/product policy for commercial access and actual provider feedback for quota. A pooled fleet can still become entirely unavailable. Retries, replay, and deadlines are bounded; see [relay API](RELAY_API_REFERENCE.md) and [deployment](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md).
