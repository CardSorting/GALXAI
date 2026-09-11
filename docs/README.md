# GALX documentation

<!-- docs-scope: current-guide -->
> Private maintainer navigation. Public documentation describes capabilities and customer contracts under [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md).

The [federation contract](FEDERATION_STRATEGY.md) defines automatic worker lifecycle with explicit validated enrollment. Credential authority, serving workers and repair desktops have separate states. Read [the handover](../HANDOVER.md) and [dated verification](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) for implementation/deployment evidence.

## Find the next action

| Task | Guide |
| --- | --- |
| Understand architecture | [Architecture](ARCHITECTURE.md), [contract](FEDERATION_STRATEGY.md) |
| Enroll or refresh an account | [Enrollment and recovery](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) |
| Open a desktop and repair a shard | [Desktop operations](maintainers/RELAY_DESKTOPS.md) |
| Inspect activity and health | [Observability](TELEMETRY_AND_OBSERVABILITY.md), [fleet](maintainers/RELAY_QUOTA_AND_FLEET.md) |
| Recover an uncertain request | [API recovery](RELAY_API_REFERENCE.md#request-recovery), [troubleshooting](TROUBLESHOOTING.md) |
| Integrate a client | [Quickstart](QUICKSTART.md), [API boundaries](API_BASE_URL.md), [model catalog](MODEL_CATALOG.md) |
| Deploy or roll back | [Runbook](RELAY_VNEXT_RUNBOOK.md), [deployment boundaries](DEPLOYMENT.md) |
| Verify a change | [Hardening](maintainers/RELAY_HARDENING.md), [inference verification](INFERENCE_PIPELINE_VERIFICATION.md) |
| Review authority | [Security](SECURITY.md), [ADR catalog](adr/README.md) |
| Coordinate authorized agent work | [Execution guide](maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) |

## Sites strategy

[ADRs 0134–0136](adr/README.md) record fixed-price generation with opaque supplier quotas, durable text completion evidence and customer-owned delivery. Use [Sites operations](maintainers/SITES_OPERATIONS.md) for configuration, rollout, reconciliation and current verification. [Site content generation](SITES_CONTENT.md) is the customer-facing API contract. The new mode is implemented locally; historical precursor deployments do not establish its activation.

[ADR 0137](adr/0137-account-owned-sites-subdomains.md) extends delivery with account-owned subdomains. [Site addresses](SITE_ADDRESSES.md) describes the customer contract; [address operations](maintainers/SITES_DOMAINS.md) covers the private registry, native attachment, DNS and recovery.

## Reading scope

The [complete catalog](CATALOG.md) indexes all Markdown guides, references, decisions, research, commercial drafts and operational evidence. Domain specifications apply to their components, not every relay path. Research targets and historical benchmarks are not runtime guarantees.

ADRs state topic-specific precedence and retain dated evidence. Reconcile affected bodies in full when decisions change; do not leave obsolete setup commands beneath a disclaimer. Update scope/navigation and run `python3 scripts/verify-docs.py`. Keep repeated defaults in the runbook/source.

Repository operational documents are not public website content. Do not copy topology, credentials, execution mechanics or private diagnostics into customer documentation or browser bundles.
