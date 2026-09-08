# ADR 0020: Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted & Implemented**

## Context
Traditional AI proxy architectures require users to create dedicated platform accounts, verify emails, set passwords, and then paste third-party API keys into separate dashboard forms. This multi-step onboarding creates high cognitive friction and security risks. We required a zero-friction authentication model where the user's upstream provider credentials (OpenAI / xAI Grok) *act directly* as their identity and cryptographic trust anchor ("Provider IS Auth").

## Decision
1. **1-Click Zero-Friction Provider Ingestion**:
   - The user signs in directly with their provider API key or OAuth session token.
   - The backend instantaneously resolves identity, executes preflight upstream connectivity checks, and provisions an isolated Substrate shard.
2. **Hardware-Grade AES-256-GCM Envelope Encryption**:
   - Provider API keys are never stored in plaintext in the database or logs.
   - Credentials are vaulted using AES-256-GCM with Authenticated Associated Data (AAD) binding tenant UID, shard ID, and provider type to prevent cross-tenant secret transplantation attacks.
3. **Dual Identity Resolution**:
   - `GalxAuthEngine.resolveAuthIdentity` uniformly authenticates both developer gateway keys (`galx_live_...`) and session bearer tokens (`galx_sess_...`) across Next.js API routes, WebSocket connections, and Cloudflare Workers.

## Consequences
### Positive
- **Instant Time-to-Value**: Developers start streaming LLM completions and generating images in < 10 seconds.
- **Zero-Knowledge Security**: Platform operators cannot inspect user upstream API keys without authorized cryptographic vault decryption.
- **Unified Identity Plane**: No passwords or separate credential databases required.

### Negative / Trade-Offs
- Upstream provider revocation or key expiration directly affects platform login; mitigated by clear error diagnostics and instant key re-connection endpoints.
