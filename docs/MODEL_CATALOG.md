# Model catalog and live availability

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

A catalog describes public model IDs and product metadata. It does not prove that any current shard can execute them. The federation represents the union of live shard capabilities; each request still requires fresh eligible capacity and application entitlement.

| View | Answers |
| --- | --- |
| Application `/v1/models` | Which public models the product catalog describes |
| Controller `/v1/models` | Which chat models currently have eligible shard evidence |
| Administrator `/api/capabilities` | Which chat/image pools are eligible, fragile, unavailable, stale, or saturated |
| Private administrator execution evidence | Which internal model/route handled the operation; not a customer response contract |

## Image compatibility

Canonical public capability `openai-gpt-image-latest` corresponds to internal relay `gpt-image-2`; older application image aliases resolve to the same capability. Native API-key shards request the exact image model. OAuth shards can serve the explicitly enabled, verified Codex image-tool alias using `gpt-5.6-terra` and `image_generation`. The provider selects the image model; exact GPT-Image-2, dimensions, and quality are not guaranteed.

Inspect execution identifiers only in private administrator records. Public responses must strip them and use sanitized binary images or allowlisted JSON. Fresh chat inventory alone cannot make this image route available. See the [full alias contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

Other image IDs are not automatically mapped to this alias. Names such as Midjourney, Flux, and DALL-E must not be presented as equivalent upstream execution. Familiar application aliases, where supported, are an input compatibility feature; they cannot authorize federation substitution.

## Availability and economics

Zero eligible shards means unavailable, one means fragile, and two or more means redundant capacity. These counts change as evidence expires, permissions change, or credentials are replaced. A model may exist in the catalog while unavailable for the caller's requested operation.

Use current product pricing and authenticated entitlement responses for commercial decisions. Historical price tables, output resolutions, and percentage discounts are not a live API guarantee. The September 7 deployment evidence in ADR 0127 observed one usable shard; the [September 9 record](maintainers/RELAY_SESSION_VERIFICATION_20260909.md) records later fixture cleanup and retained worker state. Do not hard-code dated counts into routing or an SLA.
