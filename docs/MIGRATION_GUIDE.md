# Migrating to capability-aware GALX

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Keep your application's preferred SDK shape while making model, identity, and retry behavior explicit. Start with the [quickstart](QUICKSTART.md) and [API boundaries](API_BASE_URL.md).

## Application clients

1. Set the product base URL to `https://galx.ai/v1` and keep its credential server-side.
2. Choose an explicit public model ID and verify the key's entitlement. A catalog entry is not live shard availability.
3. Review automatic SDK retries. For uncertain admission or accepted jobs, preserve original operation identity and use existing job URLs rather than repeating inference.
4. Treat multi-model cascades and races as deliberate application policy. Do not assume a failed request was unexecuted or that a different model is equivalent.
5. Verify chat, images, streaming, tools, and application asset persistence independently through the actual client.

## Existing generic Codex image clients

The supported compatibility ID is public `openai-gpt-image-2` / relay `gpt-image-2`. Enabled OAuth workers execute `gpt-5.6-terra` with `image_generation` after real image verification. Read the response execution metadata. Provider-managed image selection and output dimensions are not exact Image API guarantees.

Native API-key image requests remain exact. Other IDs such as Flux, Midjourney, or DALL-E are not guaranteed equivalent models. See the [image compatibility contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

## Operators moving from the shared relay

Use the [vNext runbook](RELAY_VNEXT_RUNBOOK.md). Drain and stop the legacy shared relay before assigning its credentials to one-container-per-shard workers. `docker-compose.relay.yml` is not a federation launcher. Move ingress to the supervised controller only after ownership and capabilities are verified.

Empty or changed capability sets do not require container replacement. Credential or alias-configuration changes follow the normal worker lifecycle. Multi-host ownership requires a distributed lease beyond the current single-host implementation.

## Verification and rollback

Run capability/cooldown regressions and the isolated Docker canary for runtime changes. Record deployed revisions and actual downstream results. Preserve rollback images, checkpoint volumes, and signing state. Never run both topologies with the same credentials. Successful verification does not itself authorize billing or entitlement changes.
