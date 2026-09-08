# Agent clients and the GALXAI relay

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Reviewed 2026-09-07. Earlier versions of this guide combined adjacent client projects, subscription claims, provider quotas, and relay deployment assumptions. Current GALXAI relay operation is owned by this repository and the [federation contract](FEDERATION_STRATEGY.md).

External agent clients may consume GALXAI inference and execute their own authorized tools in their own runtimes. Model output is not permission to execute tools on the relay host. The relay preserves its existing protocol handling and does not implement a complete remote agent workspace or every tool round trip.

Use the correct API boundary. The hosted product/SDK base URL is documented in [API_BASE_URL.md](API_BASE_URL.md). The standalone relay has a distinct HTTP 202 chat-job/SSE contract and uses relay inference keys; it is not a transparent replacement for every product API endpoint.

The application adapter uses `VM_RELAY_URL` and `VM_RELAY_API_KEY`. Provider credentials remain backend registry material. Operators use dedicated administrator keys for fleet controls and telemetry. The deployed container does not mount client credential directories or the host repository, and host discovery is disabled.

There is no documented fixed per-provider quota or model entitlement here. Read configured catalog/product policy for commercial access and actual provider feedback for quota. A pooled fleet can still become entirely unavailable. Retries, replay, and deadlines are bounded; see [relay API](RELAY_API_REFERENCE.md) and [deployment](RELAY_VNEXT_RUNBOOK.md).
