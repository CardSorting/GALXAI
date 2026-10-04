# ADR 0166: Canonical origin at the private self-host listener

<!-- docs-scope: decision-record -->

Date: 2026-10-03. Decision: accepted within the owner's explicit narrow Mac topology correction. Delivery: new local candidate under whole-image acceptance; production activation remains separate. This refines deployment compatibility under [ADR 0165](0165-galx-connect-nova-boundaries.md), without replacing its permission or identity model.

## Context

Next 15.5.25 reconstructs the native request URL from its configured listener hostname and port. The private container therefore observes `0.0.0.0:3000` even when the original Host is the configured Nova hostname. Native-authority comparison denies a valid scoped credential before database admission. Trusting whichever forwarded header happens to pass would weaken the boundary.

## Decision

One server helper resolves canonical request URLs. Direct deployments retain the native Request authority, including exact IP-loopback ports. The Mac bootstrap alone selects `mac-loopback-v1` and the fixed internal authority. Runtime JSON and incoming headers cannot select that mode. The helper requires that internal authority and selects only exact HTTPS virtual hosts from the existing application, Connect and Nova configuration. Ports must match. Unconfigured hosts are rejected. Forwarded headers and browser Origin never select deployment identity; existing browser-origin, issuer, audience, client, current-grant and entitlement checks remain independent and mandatory.

Use the same helper for Connect/Nova checks, original authorization query parameters, account callback and workspace redirects, and cookie-mutation intent checks. Next's unanchored loopback normalization can otherwise change an embedded IP callback into localhost; the original registered callback must remain exact. A canonical hostname is neither an identity credential nor permission. Keep the Docker published port on host loopback. Any future ingress must select exact hostname routes and exclude private control surfaces; this decision does not establish a public proxy trust relationship or authorize exposure.

Serve harmless SSE comment keepalives after authorization with pull-based backpressure. Keep the 300-second deadline, registered terminal write and conservative no-replay policy. First-party complete-answer clients request SSE once, then assemble allowlisted output within independent content/frame/wire bounds. Require a valid finish reason and `[DONE]`; interruption or missing terminal evidence remains unconfirmed. This adds no retrieval, retry, polling or durable-resume protocol.

## Consequences and verification

This source change creates a new candidate. Preserve prior source/compiled/image identities as historical evidence; generate clean new ones. The [operator runbook](../runbooks/mac-self-hosting.md) owns packaging, immutable archive verification and whole-image acceptance. The [correction record](../../post-mortem/releases/2026-10-03-mac-origin-transport-correction.json) owns observed results and remaining limits. Configuration-only acceptance and a development server cannot substitute for the image test. Real-provider acceptance and public cutover require separate authorization.

The private listener supports the configured application/Connect/Nova identities only. An ordinary host-loopback connection without the canonical Host is rejected. Abrupt process loss still cannot guarantee a terminal database write; retained uncertainty cannot be rewritten or replayed. Mac power, sleep and network availability remain unchanged operational limitations.
