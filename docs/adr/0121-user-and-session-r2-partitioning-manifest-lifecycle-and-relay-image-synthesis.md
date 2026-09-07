# ADR 0121: Provider image synthesis and user/session asset persistence

- Status: Accepted; implementation scope clarified 2026-09-07
- Original decision date: 2026-09-05
- Sources: `src/relay/relay-server.ts`, `src/core/router/GalxModelRouter.ts`, `src/workers/cloudflare/GalxR2AssetAdapter.ts`, `src/core/storage/GalxUnifiedR2StorageManager.ts`

## Context

Provider image generation and product asset persistence are different operations. The transport returns generation output; the authenticated application decides where to persist it and who may list or delete it. Storage paths do not themselves enforce authorization.

## Decision

The standalone relay provides image-generation POST routes. It selects an eligible registry account, uses the provider image-generation tool for OAuth-backed synthesis or image REST for platform keys, and returns base64 JSON. Requests have bounded retry, cancellation, and deadline handling. Provider redirects are disabled. The relay does not implement session galleries, R2 upload, or local user workspaces.

The application adapter authenticates to the relay using its inference key. Its direct-provider fallback code remains a separate application path. `GalxModelRouter` can pass generated data to `GalxR2AssetAdapter` for application-owned persistence.

The R2 adapter requires an authenticated, non-anonymous user ID and constructs keys under:

```text
users/{userId}/sessions/{sessionId}/images/{imageId}.{extension}
users/{userId}/sessions/{sessionId}/manifest.json
```

Image IDs include a timestamp and random suffix; supported stored extensions follow detected image type. The adapter sanitizes metadata header values, supplies an SVG placeholder, and records image metadata. A placeholder alone does not guarantee layout stability; the consuming UI must reserve dimensions.

The session manifest is a bounded summary containing the latest 100 image entries. Its update is a read-modify-write sequence, not a cross-request transaction. Upload can succeed even if manifest update fails, and concurrent writers need separate coordination to guarantee a complete summary. Listing and deletion use the storage manager; prefix deletion may span multiple requests and report errors. It is not an atomic cascade across storage, the manifest, and a database.

Asset URLs and cache policy depend on the configured storage/application path. This decision does not guarantee permanent public URLs, a specific image resolution, fixed generation size, global delivery cost, or a single-request purge. Authorization and public/private delivery must be verified in the actual deployment.

## Validation boundary

Use the image-generation and storage tests for the configured environment. Live image generation spends provider capacity and storage operations may mutate assets; they are distinct from the minimal chat smoke test used for the 2026-09-07 relay rollout. Historical sample artifacts and one-time assertion counts are not current deployment evidence.

[ADR 0122](0122-isolated-authenticated-relay-and-bounded-recovery.md) · [Relay API](../RELAY_API_REFERENCE.md) · [Application API](../API_REFERENCE.md)
