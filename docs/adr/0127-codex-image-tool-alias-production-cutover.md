# ADR 0127: Explicit Codex image-tool alias and production federation cutover

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Current explicit image-alias decision and dated production evidence. The successful DreamBees image observation does not itself enable paid Hive or guarantee present availability. Use the [current contract](../FEDERATION_STRATEGY.md) and [runbook](../RELAY_VNEXT_RUNBOOK.md) for operations.

Date: 2026-09-07. Status: deployed and verified.

> Reconciled September 9: [ADR 0129](0129-public-image-artifacts-and-verified-identity.md) requires private execution evidence and a capability-based public alias. The original September 7 deployment facts below remain dated history. [ADRs 0131–0133](README.md) extend access, maintenance and enrollment.

## September 14 transport correction

[ADR 0151](0151-codex-standalone-image-tool.md) proposes replacing the chat-tool transport and chat-model dependency with the standalone backend used by the Codex image tool. Its implementation and checks are local; HTTP 403 prevents live generation acceptance. The alias authorization, public-boundary rules and September 7 evidence below remain historical facts. Current source behavior and rollout instructions belong to the [federation contract](../FEDERATION_STRATEGY.md) and [runbook](../RELAY_VNEXT_RUNBOOK.md).

## Original September 7 decision

The operator explicitly authorized the existing generic Codex image-tool route as a documented compatibility alias. With `RELAY_CODEX_IMAGE_TOOL_ALIAS=true`, OAuth requests for relay model `gpt-image-2` (canonical public capability now `openai-gpt-image-latest`; `openai-gpt-image-2` is a legacy application alias) use `gpt-5.6-terra` with `image_generation`. The upstream selects the image model. This does not promise exact GPT-Image-2, nor does it apply to other requested models. Native API-key image requests remain exact.

The worker must first discover the execution model and obtain a valid image from a real probe. The alias then participates in the same capability index, health filters, capacity reservations, and generation fences as other capabilities. Removal or expiry of its execution-model capability also removes routing eligibility. No model substitution is attempted after a failed request.

Successful image evidence lasts one hour. Real image responses renew it; enabled idle workers probe again after 50 minutes. Probe failures back off 10, 20, then 40 minutes. Probes consume upstream image quota and spare local capacity. An image-model listing is not inferred from a chat-model listing. Internal transport and administrator capability records preserve the alias explicitly. Public gateway bodies, headers, streams and artifacts must exclude execution diagnostics.

The generic tool path preserves the legacy prompt-based image behavior. Image API `size` and `quality` are not exact guarantees on this route; the verified request asked for 1024×1024 and returned a 1254×1254 PNG. Applications requiring an exact image model or exact Image API rendering parameters should use an appropriately capable native API-key shard.

## Production changes — September 7, 2026

- Release commit: `102357770192c4cfdb565007ce786e139c409cf7`.
- Production gateway: `dpl_DYb6tUikKkPPVoh54uWHz5xb8nJW`, `https://galxai-r7klhbxtw-cardsortings-projects.vercel.app`, Ready and aliased to `galx.ai`.
- Supervised host controller: `com.galxai.federation.production`, loopback port 3001, namespace `production`, compatibility alias enabled.
- One usable shard, one healthy relay container. Eleven invalid credentials were rejected by upstream and their workers retired. An expired OAuth row is excluded. No registry rows were deleted or credential health manually rewritten.
- The existing `relay.galx.ai` Cloudflare Tunnel origin changed from `http://galxai-relay:3001` to `http://host.docker.internal:3001` (configuration version 2). Reachability was verified from the tunnel's Docker network and from the public hostname.
- Legacy container `galxai-relay` is stopped and retained. Its image is tagged `galxai-relay:rollback-20260907`; image ID `sha256:c46167f9c7240666094959fc763b5480fbf173c16fd10fc89c755b334f3637d5`.
- Running worker image ID: `sha256:acdc59a7d3d7dac1801c79ff7f8f2d68a5ed2e54c890abe5d2a96f3f825024fb`.
- Workers run Node 22. The controller uses the host's working Node 26 runtime, also used by the passing local tests. The separately installed Homebrew Node 22 binary could not load its `simdjson` library. No Homebrew packages were changed during cutover.

At this rollout the catalog disclosed compatibility execution. That public-copy choice was subsequently superseded by ADR 0129: customer documentation now describes the capability without internal execution mechanics. The registry projector also accepts both persisted `accessToken` and `apiKey` credential formats while continuing to reject unreadable active credentials.

## Verification — September 7, 2026

- 71 federation regressions and 20 cooldown/client regressions passed.
- TypeScript and production Next.js build passed. Lint: zero errors, six existing warnings.
- Three-container Docker canary `test-mtrvxpzv` passed: one shard per worker, capability loss/recovery without restart, and stale-health rejection across restart. Synthetic containers were cleaned up.
- Actual worker administrator probe: HTTP 200, `verified: true`, 1,455,041 image bytes, 18,451 ms.
- Public relay chat through the application transport: HTTP 200, expected output, 1,670 ms.
- DreamBees' key correctly rejected a separate chat model with HTTP 403 `tier_model_restricted`; no entitlement was changed.
- **DreamBees' actual `createGatewayClient` / `generateGatewayImage` image client**, with its own no-retry policy, called the promoted production gateway and returned HTTP 200 in **23,662 ms**.
- Request ID: `img_bf8b694c-1be9-48e9-9340-4d730d00a26f`.
- Output: **1,553,919 bytes**, PNG, **1254×1254**, decoded and visually inspected.
- SHA-256: `2c57ce1cdff57416e8b7bb35f17a6d27323221827349fd76c22d3d54de234ae9`.
- Historical returned metadata (public disclosure subsequently retired by ADR 0129): `requestedModel=openai-gpt-image-2`, `executionModel=gpt-5.6-terra`, `routingMode=codex_image_tool_alias`, `tool=image_generation`, `imageModelSelection=provider_managed`.
- After completion, the registry remained fresh, the worker healthy with zero active streams, and the image alias available with renewed evidence.

The generated artifact is local at `/tmp/galx-dreambees-vnext.png`; it is not committed. `scripts/verify-dreambees-image.ts` makes this client-level verification repeatable without logging credentials or image contents.

## Operational limits and rollback

At the September 7 observation, every observed model pool had one eligible shard and was reported **FRAGILE**, with no redundancy. The host controller remains a single-host service. Receipt deduplication remains process-local. Paid Hive was not enabled and no DreamBees billing or entitlement configuration was changed.

Use the [current runbook](../RELAY_VNEXT_RUNBOOK.md#production-cutover-checklist) for rollback. The saved shared-container/tunnel artifacts above are historical evidence, not an instruction to restore that topology. Review holds and accepted work, preserve signing/journal state, and stop competing ownership before any replacement.

On September 9 the 11 rejected rows were identified as exact leaked integration fixtures and conditionally revoked; the original September 7 no-registry-mutation statement remains true for that earlier rollout. The September 9 strategy retained automatic workers and retired bulk import; [ADR 0133](0133-explicit-validated-enrollment-and-test-isolation.md) and [the later verification record](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md) preserve that stage. [ADR 0152](0152-manual-desktop-only-shard-authority.md) subsequently closed all external enrollment, requiring explicit manual desktop enrollment and manual provider renewal. Neither earlier image acceptance nor a retained account bypasses that policy.
