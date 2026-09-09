# ADR 0130: Image receipts and uncertain outcomes

<!-- docs-scope: decision-record -->

Date: 2026-09-08. Audience: internal maintainers; do not publish as site content.
Status: implemented and locally verified on September 8; deployment evidence reconciled September 9 by component below.

## Decision

Treat image synthesis as a non-idempotent operation. Dispatch once; neither the relay nor the application task queue automatically repeats image synthesis after an error. A lost response cannot establish that generation did not happen. Keep health observations independent from permission to replay work.

Tenant-scoped image idempotency receipts fingerprint the request, reject conflicting reuse even while pending, replay retained successful responses, and preserve uncertain outcomes. Use the existing bounded admission receipt implementation: ten-minute process-local window, 1,000 keys, 32 MiB aggregate response storage and 8 MiB per retained response. Do not evict a live key to admit a new write. These are bounded retry protections, not durable exactly-once execution across restarts.

DreamBees sends its durable generation UUID as the idempotency key, requests the canonical public image capability with explicit PNG/base64 output, and disables SDK retries. Customer receipt responses use a field allowlist; reads explicitly filter by the verified user. Unknown results remain unknown even if recording the error fails. The client separates status checks from creation, retains the pending attempt in memory if browser storage fails, blocks offline submission, and exposes accessible status and a copyable request identifier.

Image response frames have a separate bounded 32 MiB limit from the 2 MiB request limit. The frame-limit repair was deployed and a real PNG was verified before this hardening pass. That evidence does not verify deployment of the changes in this decision or the paid Hive flow.

## Evidence and limits

September 8 local verification: 75 relay tests; 19 public-boundary tests plus the image queue no-retry harness; 52 DreamBees desktop/mobile browser tests; nine studio unit tests; GALX production build and compiled HTTP authorization/public-surface verification. See the DreamBees build result and workspace audit record for its production build status.

Status polling does not itself reconcile lost upstream results. Durable cross-restart deduplication, artifact recovery and a complete paid-entry transaction remain separate work. Browser memory cannot survive a reload when persistent storage is unavailable. Do not enable paid entry based on a mocked browser test.

## Deployment reconciliation — September 9

The production controller was reloaded with later source and the worker image was rebuilt. The existing worker container/generation was retained, so an image build does not establish replacement of that instance. No new GALX application or DreamBees deployment was established by the enrollment pass. The earlier frame-fix actual-client result remains evidence for that earlier release only. See [the component matrix](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md#component-deployment-boundary).

## Pattern references

The follow-up DreamBees audit also coalesces overlapping status reads and prevents periodic refresh from cancelling slower reads. Receipt writes invalidate older reads. Account and balance response bodies use byte limits and full-body deadlines; customer errors do not expose parsing diagnostics. This is browser resilience, not a substitute for server authorization or durable reconciliation. See DreamBees `docs/studio-data-model.md` for the implementation record.

The request-token contract follows [AWS guidance on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/). Separating creation from status retrieval follows the [asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply); this implementation does not claim a fully asynchronous worker lifecycle. Status announcements follow [WCAG status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
