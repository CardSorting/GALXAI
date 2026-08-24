# 51. Enterprise OAuth 2.0 / 2.1, FAPI Standards, Token Lifecycle & Identity Mesh

Date: 2026-08-24
Status: Accepted

## Context

In high-throughput AI gateway environments where upstream providers (OpenAI Codex, xAI Grok, Anthropic) utilize OAuth access tokens with short TTLs (typically 1 hour), naïve authentication architectures suffer from severe systemic vulnerabilities:
1. **Synthetic Key Fallback Fallacy**: Generating synthetic mock API keys (`sk-proj-...`) when provider credentials are missing fails upstream execution, pollutes the shard substrate, and misleads downstream callers.
2. **Race-to-Refresh (RTR) Collisions**: In parallel swarm environments, when a token approaches expiration, multiple concurrent requests simultaneously trigger token refresh endpoints, invalidating refresh tokens due to upstream single-use token rotation policies.
3. **Replay & State Nonce Forgery**: URL-based authorization redirects with static or unverified state parameters expose sessions to CSRF state hijacking and replay attacks.
4. **URL Query Leakage**: Traditional OAuth authorization redirects with sensitive scopes and client parameters leak in browser history, proxy access logs, and referrer headers.
5. **Headless & Workstation Inflexibility**: CLI tools, autonomous agents, and remote SSH servers lack standard browser redirect capabilities.

## Decision

We designed and implemented an enterprise-grade, zero-trust **OAuth 2.0 / 2.1, OpenID Connect 1.0, and FAPI-Compliant Token Lifecycle Architecture** backed by **BroccoliDB (L1 Hot Reactive In-Memory Table & WAL)** and **Supabase (L2 Authoritative PostgreSQL with Row Level Security)**.

### Core Architectural Pillars

1. **Forensic Purge of Synthetic Fallback Keys**:
   - Strictly requires real provider authentication via RFC 7636 PKCE OAuth or validated developer keys.
   - Rejects unauthenticated requests with structured `MISSING_PROVIDER_CREDENTIALS` error payloads.
   - Isolates unauthenticated playground traffic into transient, zero-persistence `guest` sandboxes without polluting the credential pool.

2. **RFC 7636 PKCE & Anti-Replay State Nonce Engine**:
   - Generates high-entropy S256 code challenge pairs (`code_verifier` with 32-byte cryptographically secure random bytes).
   - HMAC-SHA256 signs state tokens with 15-minute expiration.
   - `OAuthRepository.consumeAuthorizationRequest(state, provider)` enforces single-use semantics via atomic Compare-And-Swap (CAS) in BroccoliDB and Supabase.

3. **Single-Flight Refresh Mutex & Proactive Sweeper Daemon**:
   - `GalxOAuthManager.refreshAccessToken` coalesces parallel in-flight refresh calls into a single deduplicated network promise (`refreshPromises` map).
   - Background sweeper daemon scans BroccoliDB's sorted index on `expiresAtMs` every 60 seconds to refresh tokens expiring within 5 minutes.
   - Reactive self-healing automatically catches upstream `HTTP 401 Unauthorized` responses in `GalxModelRouter`, refreshes credentials, updates encrypted secrets, and replays the original inference request seamlessly.

4. **Multi-Account Pinning & Adaptive Hydraulic Headroom (AHT)**:
   - Evaluates token expiration freshness in the AHT scoring algorithm (`expiryMultiplier`: boosting shards with > 15m TTL by `1.05`, downweighting shards with < 5m TTL by `0.85`).
   - Supports targeted shard/account pinning via `x-galx-account-id`, `chatgpt-account-id`, `openai-account`, and `x-galx-shard-id` headers.

5. **RFC 8628 OAuth 2.0 Device Authorization Grant (Device Flow)**:
   - Dedicated endpoints (`POST /api/auth/oauth/device/code` & `POST /api/auth/oauth/device/token`) for headless terminals, remote containers, and SSH workflows.
   - Generates human-friendly 8-character Base32 user codes (e.g. `WDJB-MJHT`) and verification URIs (`https://galx.ai/device`).
   - SDK helper: `galx.auth.deviceLogin({ provider, onPrompt })`.

6. **RFC 9126 Pushed Authorization Requests (PAR)**:
   - Endpoint: `POST /api/auth/oauth/par`
   - Ingests authorization parameters via direct POST, returning an ephemeral 90-second `request_uri`.
   - Eliminates URL parameter leakage in proxies and browser histories.

7. **RFC 9449 Demonstrating Proof-of-Possession (DPoP)**:
   - Validates cryptographic proof headers (`typ: 'dpop+jwt'`), HTTP method match (`htm`), URI target match (`htu`), timestamp freshness (`iat` within 5m), anti-replay uniqueness (`jti` in BroccoliDB table), and access token hash verification (`ath`).

8. **Standards Compliance & Enterprise Key Distribution**:
   - **OpenID Connect Discovery 1.0**: Standard `GET /.well-known/openid-configuration` compliant with RFC 8414.
   - **RFC 7009 Token Revocation**: Standard `POST /api/auth/oauth/revoke` returning `HTTP 200 OK` without disclosing token existence.
   - **RFC 7662 Token Introspection**: Standard `POST /api/auth/oauth/introspect` for sub-millisecond downstream service token validation.
   - **RFC 7517 JWKS**: Standard `GET /api/auth/vault/jwks` for public KMS key distribution.
   - **Tamper-Evident SHA-256 Audit Trail**: Chained Merkle audit logging across all auth events in `AuditRepository`.

## Consequences

### Positive
- **Zero Token Collisions**: Elimination of race-to-refresh invalidations across parallel swarm workers.
- **Flawless Zero-Hesitation DX**: Developers can authenticate via browser redirects, local ephemeral CLI callbacks (`galx.auth.interactiveLogin`), or headless device codes (`galx.auth.deviceLogin`).
- **Cryptographic Zero-Trust Defense**: Anti-replay state nonces, single-flight mutexes, DPoP proof validation, and PAR eliminate session hijacking vectors.
- **Enterprise Standards Parity**: Complete compliance with RFC 6749, RFC 7009, RFC 7517, RFC 7636, RFC 7662, RFC 8628, RFC 9126, RFC 9449, and OpenID Connect Discovery 1.0.

### Considerations
- Background proactive sweeper daemon maintains an active interval timer that must be cleanly unref'd or destroyed during process shutdown.
- Upstream OAuth token lifetimes require clock synchronization (NTP) within 300 seconds for DPoP and state nonce validation.
