# ADR 0091: Developer Gateway Key Governance & Enterprise Rotation Ergonomics

## Status
Accepted

## Context
API key lifecycle operations (minting, key rotation, label renames, revocations, and exports) are high-friction touchpoints for developer productivity and platform security. In standard platforms, rotating an API key is either a hard breaking change (immediate invalidation causing client downtime) or requires multi-step manual coordination. Furthermore, secrets revealed in the UI are easily lost if dismissed before copying, leading to developer frustration and abandoned workflows.

## Decision
1. **Zero-Downtime Key Rotation with Migration Grace Periods**:
   - Implemented in `/api/keys/[id]/roll` and `ApiKeyRepository`.
   - When a developer rolls an API key, a new cryptographically secure key (`galx_live_...`) is minted with identical rate limits, environments, and capability scopes.
   - Developers configure a grace period window (0h for immediate revocation, up to 72h for enterprise multi-service rollouts).
   - During the grace period, both the legacy key and the new key remain valid and functional.
   - When the grace window expires, the legacy key is automatically expired by timestamp comparisons (`expiresAtMs <= Date.now()`).
2. **One-Click `.env.galx` Secret Export**:
   - Added direct file download mechanisms in the one-time reveal modals of both `/keys` and `/keys/new`.
   - Generates and downloads a `.env.galx` credential bundle directly to disk with standard environment variables:
     ```bash
     GALX_API_KEY="galx_live_..."
     GALX_BASE_URL="https://galx.ai/v1"
     OPENAI_BASE_URL="https://galx.ai/v1"
     OPENAI_API_KEY="galx_live_..."
     ```
   - Prevents unrecoverable credential loss if developers close modals without copying.
3. **Zero-Flicker Optimistic UI Mutations**:
   - Integrated client-side `SafeStorage` L2 cache hydration with immediate optimistic state mutations across `/keys`, `/keys/permissions`, and `/keys/rate-limits`.
   - Renaming a key updates the table in 0ms without waiting for HTTP `PATCH` confirmation.
   - Key rolling places the new key at the top of the table optimistically while rendering the reveal banner.
4. **Contextual Integration Snippet Adaptation**:
   - The Quickstart integration code snippet tabs (`cursor`, `vercel`, `python`, `node`, `curl`) dynamically inspect active user keys and populate real key prefixes (e.g. `galx_live_4a19b...`) instead of generic placeholders.

## Consequences
- **Positive**: Zero downtime when rotating keys in production microservices and CI/CD pipelines.
- **Positive**: Eradicates credential loss with direct file download ergonomics.
- **Positive**: Sub-second perceived latency across all key management workflows via optimistic updates.
- **Positive**: Complete alignment with Stripe, GitHub, and OpenAI enterprise key lifecycle conventions.
