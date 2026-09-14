# ADR 0130: Image receipts and uncertain outcomes

<!-- docs-scope: decision-record -->

Date: 2026-09-08. Audience: internal maintainers; do not publish as site content.
Status: single-dispatch and uncertain-outcome rules remain current. September 8–9 evidence is retained below. [ADR 0144](0144-durable-images-and-incident-documentation.md) supersedes process-local application receipt storage for public async images; the relay now persists a bounded private admission identity tombstone while retaining response bodies in process memory.

## Decision

Treat image synthesis as a non-idempotent operation. Dispatch once; neither the relay nor the application image service automatically repeats image synthesis after an error. A lost response cannot establish that generation did not happen. Keep health observations independent from permission to replay work.

The relay’s tenant-scoped image admission receipts fingerprint the request, reject conflicting reuse even while pending, replay retained successful responses, and preserve uncertain outcomes. A private journal persists the identity hash, expiry and state; completed response bodies remain in the bounded process-local cache for a ten-minute window, after which the identity is converted to a permanent unknown tombstone. Pending state also becomes unknown after controller loss. The cache holds at most 1,000 keys, 32 MiB aggregate and 8 MiB per retained response. Do not evict a live or uncertain key to admit a new write; capacity exhaustion fails closed pending reconciliation. These are bounded retry protections, not durable exactly-once execution across restarts.

The public application now separately commits owner-scoped PostgreSQL image receipts before 202, claims dispatch atomically and ties completion to committed owned assets. Do not return public async status reads to a process-local task table. This does not make upstream execution exactly once. Follow [image recovery](../../post-mortem/runbooks/image-generation.md).

DreamBees sends its durable generation UUID as the idempotency key, requests the canonical public image capability with explicit PNG/base64 output, and disables SDK retries. Customer receipt responses use a field allowlist; reads explicitly filter by the verified user. Unknown results remain unknown even if recording the error fails. The client separates status checks from creation, retains the pending attempt in memory if browser storage fails, blocks offline submission, and exposes accessible status and a copyable request identifier.

Image response frames have a separate bounded 32 MiB limit from the 2 MiB request limit. The frame-limit repair was deployed and a real PNG was verified before this hardening pass. That evidence does not verify deployment of the changes in this decision or the paid Hive flow.

## Evidence and limits

September 8 local verification: 75 relay tests; 19 public-boundary tests plus the image queue no-retry harness; 52 DreamBees desktop/mobile browser tests; nine studio unit tests; GALX production build and compiled HTTP authorization/public-surface verification. See the DreamBees build result and workspace audit record for its production build status.

Status polling does not itself reconcile lost upstream results. The September 8 pass did not establish durable cross-restart application receipts, artifact recovery or a complete paid-entry transaction. ADR 0144 later added durable application receipt retrieval; it does not reconstruct lost upstream results or qualify paid entry. Browser memory cannot survive a reload when persistent storage is unavailable. Do not enable paid entry based on a mocked browser test.

## Deployment reconciliation — September 9

The production controller was reloaded with later source and the worker image was rebuilt. The existing worker container/generation was retained, so an image build does not establish replacement of that instance. No new GALX application or DreamBees deployment was established by the enrollment pass. The earlier frame-fix actual-client result remains evidence for that earlier release only. See [the component matrix](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md#component-deployment-boundary).

## Pattern references

The follow-up DreamBees audit also coalesces overlapping status reads and prevents periodic refresh from cancelling slower reads. Receipt writes invalidate older reads. Account and balance response bodies use byte limits and full-body deadlines; customer errors do not expose parsing diagnostics. This is browser resilience, not a substitute for server authorization or durable reconciliation. See DreamBees `docs/studio-data-model.md` for the implementation record.

The request-token contract follows [AWS guidance on safe retries](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/). Separating creation from status retrieval follows the [asynchronous request-reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply); this implementation does not claim a fully asynchronous worker lifecycle. Status announcements follow [WCAG status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## Related text workflow

[ADR 0135](0135-durable-sites-receipts-and-local-admission.md) introduces separate durable receipts for opted-in Sites text jobs. It does not change the relay's bounded tombstone contract, recover image artifacts after restart, or establish paid Hive completion. Historical fixed-price Sites receipts retain [ADR 0134](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md); new included Sites admission follows ADR 0140. Application image persistence follows ADR 0144 independently.
