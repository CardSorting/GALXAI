# GALXAI: Provider-as-Auth Technical Specification

## 1. Executive Overview

The **Provider-as-Auth** architecture in GALXAI eliminates the traditional dual-credential burden (creating platform passwords/accounts, then separately registering provider API keys). In GALXAI, the user's upstream AI provider account (OpenAI / xAI Grok) serves directly as their authoritative identity and cryptographic root of trust.

This document formalizes the internal mechanics, encryption envelopes, session token structures, token rotation lifecycles, and authorization scopes.

---

## 2. Core Cryptographic Envelope Architecture

```
                    +---------------------------------------------+
                    | Upstream Provider Credential (sk-... / xai) |
                    +----------------------+----------------------+
                                           |
                                           v
                       +---------------------------------------+
                       | Master Keyring Derivation (HKDF-SHA256)|
                       |   Salt: 'galx-vault-salt-2026'        |
                       |   Info: 'galx-shard-isolation-v1'     |
                       +-------------------+-------------------+
                                           |
                                           v
    +-----------------------------------------------------------------------------+
    | AES-256-GCM Envelope Encryption (96-bit Random IV, 128-bit Auth Tag)       |
    | AAD: `${tenantUid}:${shardId}:${provider}`                                  |
    +-----------------------------------------------------------------------------+
                                           |
                                           v
    +-----------------------------------------------------------------------------+
    | Vaulted Shard Record in Supabase PostgreSQL (`galx_shard_accounts`)         |
    | In-Memory Cache with Microsecond Lease Acquisition & Post-Request Zeroization|
    +-----------------------------------------------------------------------------+
```

### 2.1 Authenticated Associated Data (AAD) Binding
To prevent cross-tenant credential transplantation (e.g. an attacker moving an encrypted ciphertext from Tenant A's row to Tenant B's row), the AES-256-GCM cipher sets AAD:
$$\text{AAD} = \text{tenantUid} \parallel \text{":"} \parallel \text{shardId} \parallel \text{":"} \parallel \text{provider}$$
Any alteration of the database primary key, tenant ID, or provider causes GCM authentication verification to fail immediately with `GalxVaultDecryptionError`.

### 2.2 In-Memory Heap Zeroization
When an execution lease completes or an API call finishes, secret plaintext buffers in Node.js heap are actively wiped using `GalxCryptoVault.zeroizeBuffer(buf)` (overwriting memory with zeros), preventing memory forensics from recovering credentials.

---

## 3. Bearer Token Specification (JWE Compact Format)

Sessions use compact AES-256-GCM encrypted tokens to prevent any plaintext metadata (email, role, shard ID) from being leaked over the wire or captured in server logs:

```
galx_sess_v2.${ivHex}.${ciphertextHex}.${tagHex}.${keyVersion}
```

### 3.1 Token Claims Payload Schema
```json
{
  "sub": "openai_m4k1_9f3a",
  "email": "creator@enterprise.ai",
  "name": "Enterprise Creator",
  "provider": "openai",
  "shardId": "codex_openai_m4k1_1724345678",
  "shardMode": "pooled",
  "role": "developer",
  "workspaceId": "ws_default_1",
  "scopes": ["*"],
  "sudoUntilMs": 1724346578000,
  "iat": 1724345678000,
  "exp": 1726937678000,
  "jti": "jti_1724345678_8b31f08e4d2a",
  "iss": "galxai-auth-v2",
  "fpt": "a3f8902c114e9f7832...c1",
  "familyId": "fam_1724345678_77a9e2",
  "seq": 1,
  "version": "v2"
}
```

### 3.2 DPoP-Grade Client Environment Fingerprint (`fpt`)
$$\text{fpt} = \text{SHA-256}(\text{SubnetMask}(\text{IP}, /24) \parallel \text{":"} \parallel \text{Normalize}(\text{User-Agent}))$$

---

## 4. OAuth 2.0 Token Rotation & Anti-Replay Cascade (RFC 6819)

To ensure forward secrecy and detect token theft, sessions follow single-use token rotation:

```
                                 [Active Token: Token A (Seq 1)]
                                                |
                                    Refresh Session Request
                                                |
                                                v
                              [Atomic PostgreSQL Rotation RPC]
                        +---------------------------------------------+
                        |  Token A Hash -> previous_token_hash        |
                        |  Grace Window: now + 30,000ms               |
                        |  New Token B Hash -> token_hash (Seq 2)     |
                        +---------------------------------------------+
                                                |
                       +------------------------+------------------------+
                       |                                                 |
            Replay within 30s                                  Replay after 30s
       (In-flight packet retry)                             (Token Reuse Attack)
                       |                                                 |
                       v                                                 v
             [Succeeds Silently]                             [Automatic Family Killswitch]
             Returns Token B                                 • All sessions in `familyId` revoked
                                                             • Threat logged in `galx_token_revocation_log`
```

---

## 5. Step-Up SUDO Mode & Fine-Grained Authorization

### 5.1 Step-Up SUDO Mode (15-Minute Privileged Window)
- High-risk operations (viewing raw credentials, modifying wallet reload caps, re-encrypting KMS keys) require `isSudoElevated: true`.
- On fresh login, sessions receive a default 15-minute SUDO grant (`sudoUntilMs = now + 900,000`).
- Once expired, endpoints return HTTP 403:
  ```json
  {
    "error": "SUDO_MODE_REQUIRED: Elevated verification required for high-risk operations. Call POST /api/auth/sudo/elevate.",
    "elevationRequired": true
  }
  ```
- The user re-elevates via `POST /api/auth/sudo/elevate`.

### 5.2 Fine-Grained Scopes & Ephemeral Sub-Tokens
Applications can mint scoped, short-lived bearer tokens for downstream workers or AI sub-agents via `POST /api/auth/tokens/restricted`:

| Scope Pattern | Matches | Denies |
| :--- | :--- | :--- |
| `*` | All API and admin endpoints | None |
| `chat:*` | `chat:completions`, `chat:stream` | `images:generations`, `admin:sudo` |
| `embeddings:*` | `embeddings:create` | `chat:completions`, `images:generations` |
| `images:*` | `images:generations`, `images:edits` | `chat:completions`, `billing:read` |
| `shards:read` | `shards:read` | `shards:write`, `admin:sudo` |
| `admin:sudo` | Privileged administrative actions | Unprivileged scopes if restricted |

---

## 6. Zero-Downtime KMS Master Key Rotation

Master keys are versioned in `GalxCryptoVault` (`v1`, `v2`, ...). When rotating keys:
1. New key version is added to the keyring map.
2. `POST /api/auth/vault/re-wrap` (requiring SUDO elevation) triggers `reencryptVaultShards(targetKeyVersion)`.
3. In-flight requests decrypt using the version tag embedded in the ciphertext (`keyVersion`) and re-encrypt under the new target key with zero downtime or model interruption.

---

## 7. Multi-Device Session Governance

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/sessions` | `GET` | Lists all active device sessions with humanized OS, browser, IP, and `isCurrent` badges. |
| `/api/auth/sessions` | `DELETE` | Remote logout: revokes all other devices while preserving current session. |
| `/api/auth/sessions/[id]` | `DELETE` | Targeted revocation of a specific remote session. |
| `/api/auth/session/refresh` | `POST` | Executes atomic token rotation with 30s anti-replay grace buffer. |
| `/api/auth/security/posture` | `GET` | Returns composite security health grade (`A+` to `C`), risk score, and recommendations. |
| `/api/auth/audit/activity` | `GET` | Returns human-friendly security activity timeline. |
