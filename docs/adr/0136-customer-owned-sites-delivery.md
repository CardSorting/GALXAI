# ADR 0136: Customer-owned Sites delivery

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Component: private customer-local Sites companion.
Status: durable workflow implemented and locally verified; a native-host private save/update is recorded historically. Direct CLI archive upload and a live paid end-to-end workflow remain unqualified.
Audience: private maintainers. This decision complements [fixed pricing](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) and [durable receipts](0135-durable-sites-receipts-and-local-admission.md).

## Context and decision

The existing relay can supply bounded text for a static draft. It does not implement the complete Responses/tool round trip required to power a native Codex building session. Use a deterministic customer-local workflow: obtain content through the authenticated GALX API, validate a small schema, render a fixed template, package the exact files, save through the customer's Sites connection, and privately publish the exact saved version.

The model supplies text only. It cannot select tools, commands, paths, credentials, account IDs, publishing targets or audiences. The local runner controls the sequence. Its Sites tool host performs scoped authenticated operations without starting another model turn. This strategy uses the existing relay as the sole model supplier and does not require adding a second provider.

The companion receives the customer's GALX account session and their own Sites connection. Database, relay inference and administrator credentials stay server-side. A GALX key does not establish Sites account access. The production application must never import the private companion directory or send its operational records to browsers.

## Durable delivery sequence

Persist the local job, attempt IDs, generation settlement, target ownership, packaging state and immutable publication intent. Fenced leases coordinate processes using the same protected local state. Validate and canonicalize the artifact, retaining its local hash independently from Sites' normalized remote archive hash. Source uploads contain only the dedicated static page and Sites manifest, never the GALX checkout.

Use a native-host handoff for the historically verified delivery path. `request-hosted-save` records a one-use upload intent; the authenticated host uploads that exact artifact; `accept-hosted-save` validates the original reply and independently checks remote account, source and saved-version metadata. A lost acknowledgement stays pending. Do not invent a saved version, repeat an uncertain upload or switch transports to force progress.

Before publication, recheck server-authoritative billing receipts, current Site ownership and the exact source/version/archive acknowledgement. The intent binds connection, project, commit, version, artifact and owner-only audience. Persist an observed deployment ID and verify its terminal result. Repeating completed publication returns its existing result; reconciliation observes the original deployment or saved version instead of initiating a new deployment.

Existing authorization governs permitted actions. Runtime approval requests remain authoritative; the scoped CLI adapter stops when an approval request cannot be resolved rather than granting it silently. There is no arbitrary MCP executor, public-audience fallback, hidden publish-on-push setting or cross-account authority supplied by generated content.

[ADR 0137](0137-account-owned-sites-subdomains.md) extends delivery with a stable `APP.USERNAME.galx.ai` address. Binding initiates address setup; publication recovery retains the original deployment while DNS/TLS validation proceeds independently. Customer output includes the GALX URL only when the publication is confirmed and the address is active. Original hosting URLs remain private operational records.

[ADR 0138](0138-automatic-sites-domain-provisioning.md) adds a customer discovery companion and scheduled server worker. After enrollment, new Sites automatically enter address setup without a per-Site bind. Existing publication commands retain their explicit artifact and audience authority; discovery never republishes content.

## Independent gates

Fixed-price content admission needs the configured account cohort and fresh local receipt/limit readiness, not an upload attestation or supplier cost proof. Delivery still needs the customer's working connection, a valid artifact, confirmed save and verified owner-private publication. Selecting a delivery mode is not evidence that the upload mechanism works.

The installed direct CLI archive-save path remains unqualified. Keep its command for separately scoped diagnostics and future qualification; use the recorded native-host handoff for current delivery. Failure of direct CLI upload does not block content generation or imply that native-host publication is unavailable. Neither path implies general autonomous application development, public hosting for arbitrary audiences or unattended multi-customer publishing.

## Evidence and operational limits

The [native-host record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/NATIVE_HOST_DELIVERY.md) and [saved-version evidence](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/hosted-save-verification.json) describe the historical private update. It used synthetic content and no production wallet charge. The fixed-price pass reran 68 companion checks and billing/relay tests; it made no new Site publication or live supplier request.

The companion's tested local runtime is Node 26.8.1 with SQLite 3.53.4. Its WAL database has separate compatibility requirements from the Node 22 relay's rollback journal. A local store lock cannot coordinate other workstations or external publishers. Keep uncertain publication locks and artifacts until the original effect is reconciled. Preserve customer access and state when pausing generation or changing versions.

Commands and current status are in the [delivery runbook](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/LIVE_ADAPTERS.md). Source: [entry point](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live.ts), [Sites adapter](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/live-sites.ts), [runner](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/runner.ts).
