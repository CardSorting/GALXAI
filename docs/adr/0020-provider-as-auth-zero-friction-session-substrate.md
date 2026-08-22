# ADR 0020: Provider-as-Auth Paradigm & Zero-Friction Shard Vaulting

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
