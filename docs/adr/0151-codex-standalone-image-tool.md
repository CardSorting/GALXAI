# ADR 0151: Standalone Codex image tool transport

<!-- docs-scope: decision-record -->

Date: 2026-09-14. Decision status: proposed. Delivery: local, pending live image acceptance.

## Context and decision drivers

The owner requested image generation through the Codex image tool. The existing relay issued a chat Responses request with an `image_generation` tool; the upstream rejected that tool. Codex's image-generation extension instead uses its standalone Images client. An isolated app-server experiment did not expose the extension, so spawning a chat runtime alone is not a repair.

## Options considered

- Continue the chat-tool request: retains the reproduced unsupported route.
- Launch a general Codex runtime per image: adds process/tool authority and still lacked the extension in the observed app-server session.
- Match the standalone backend used by Codex's image tool: a bounded, single HTTP dispatch with the assigned account, no general agent or new credential discovery.

## Proposed decision

Use the third option for the explicitly enabled compatibility alias. Keep the internal `gpt-image-2` ID and public capability alias. Match the tool's model and auto rendering fields without promising an exact underlying public model. API-key execution remains separate. The transport is implemented in [codex-image-tool.ts](../../src/relay/codex-image-tool.ts).

A successful image must decode and be re-encoded before capability publication. Capability requires fresh authenticated inventory, worker health, credential authority and unexpired standalone image proof; it does not depend on a chat-model entry. Old chat-era proof is rejected for the new backend. Response bytes are bounded, redirects are rejected, and failures never fall back or retry synthesis. Only image pixels are returned from the transport; private execution metadata is explicitly projected separately.

## Consequences and recovery

The pinned Sharp decoder is included in the worker image. The controller must understand the changed capability evidence before worker replacement. Preserve receipt/signing/worker state and uncertain requests. Roll back through the [existing procedure](../RELAY_VNEXT_RUNBOOK.md#production-cutover-checklist), with admissions unavailable until compatible image proof exists. Do not import host credentials or change permission records to make the probe pass.

## Confirmation and delivery

[Local evidence](../../post-mortem/releases/2026-09-14-codex-image-tool-local.json) separates fixtures/builds from the live rejection. The existing connection returned HTTP 403 with a generic Forbidden category; its root authorization cause is not established. No artifact, frontend generation or production rollout is claimed. ACT-020 stays open for an approved working connection, controlled worker rollout and signed-in generation/library/download acceptance.

The request shape was checked against the official Codex source: `codex-rs/ext/image-generation/src/tool.rs`, `backend.rs`, `codex-rs/codex-api/src/endpoint/images.rs`, and `codex-rs/model-provider-info/src/lib.rs`. This code implements that transport; it does not expose this conversation's tool invocation to a running server.

## Relationships

Partially replaces the transport and chat-model dependency in [ADR 0127](0127-codex-image-tool-alias-production-cutover.md). Retains [ADR 0129](0129-public-image-artifacts-and-verified-identity.md) public projection and [ADR 0130](0130-image-receipts-and-uncertain-outcomes.md) uncertain-outcome handling. The remaining historical cutover decision is not superseded.
