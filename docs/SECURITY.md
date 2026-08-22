# 🔒 GALXAI Cryptographic Security & Threat Model

GALXAI is designed from first principles with zero-trust envelope cryptography, memory lifecycle protection, and strict tenant isolation.

---

## 1. Cryptographic Threat Model

```
                    ┌──────────────────────────────────────────────┐
                    │            GALXAI Vault Boundary             │
                    │                                              │
  Plaintext Secret  │  ┌──────────────┐         ┌──────────────┐  │   Encrypted Envelope
 (sk-proj-...1234) ─┼─►│ HKDF-SHA-256 │────────►│  AES-256-GCM │──┼─► (Ciphertext + IV + Tag)
                    │  └──────┬───────┘         └──────┬───────┘  │
                    │         ▲                        ▲          │
                    │         │ Master Key             │ AAD      │
                    │  ┌──────┴───────┐         ┌──────┴───────┐  │
                    │  │ GALX_MASTER_ │         │ tenantUid    │  │
                    │  │ SECRET_KEY   │         │ shardId      │  │
                    │  └──────────────┘         │ provider     │  │
                    │                           └──────────────┘  │
                    └──────────────────────────────────────────────┘
```

### Threats Mitigated

| Threat Vector | Mitigation Strategy | Cryptographic Guarantee |
| :--- | :--- | :--- |
| **Ciphertext Transplantation** | Additional Authenticated Data (AAD) binding | Ciphertext encrypted under Tenant A cannot be decrypted by Tenant B, even if the attacker gains access to encrypted storage. |
| **Heap Memory Snooping** | Ephemeral RAM Zeroization (`zeroizeBuffer`) | Plaintext keys are overwritten with zeros (`buf.fill(0)`) in `finally` blocks immediately after upstream dispatch. |
| **Gateway Key Impersonation** | SHA-256 Prefix Hashing | Gateway keys (`galx_live_...`) are hashed using SHA-256; only the prefix is indexed for $O(1)$ lookup. |
| **Stale Worker Race Conditions** | Monotonic Fencing Tokens | Each lease increments a monotonic counter (`fencingToken`); late arriving responses from timed-out workers are rejected. |
| **Credential Revocation Delay** | Synchronous 1-Click Retraction | Revoking an account invalidates all in-flight leases and purges cache entries in $< 40\text{ms}$. |

---

## 2. Key Derivation & Encryption Mechanics

### Key Derivation via HKDF-SHA-256
A master secret key is expanded using RFC 5869 HMAC-based Extract-and-Expand Key Derivation Function (HKDF) with SHA-256:

$$\text{PRK} = \text{HMAC-SHA256}(\text{salt}, \text{MasterKey})$$
$$\text{EncryptionKey} = \text{HKDF-Expand}(\text{PRK}, \text{"galxai-v1-vault-encryption"}, 32)$$

### Authenticated Encryption with Associated Data (AEAD)
All secrets are encrypted with standard AES-256 in Galois/Counter Mode (GCM):
- **Key Length**: 256 bits (32 bytes).
- **Initialization Vector (IV)**: 96 bits (12 bytes) cryptographically random per encryption event.
- **Authentication Tag**: 128 bits (16 bytes).
- **AAD Buffer**: `Buffer.from(`${tenantUid}:${shardId}:${provider}`)`.

If any byte of the ciphertext, IV, tag, or AAD tuple is altered or transplanted, decryption fails with `GalxVaultDecryptionError`.

---

## 3. Ephemeral RAM Scrubbing Protocol

Node.js Garbage Collection does not guarantee immediate memory cleanup of deallocated strings or buffers. GALXAI prevents heap persistence of sensitive API tokens by explicitly zeroing memory:

```typescript
// Memory zeroization implementation
export function zeroizeBuffer(buf: Buffer): void {
  buf.fill(0);
}
```

This ensures that in the event of memory dumps, core crash dumps, or side-channel inspection, plaintext API tokens are non-recoverable.

---

## 4. Gateway Key Hashing Architecture

Developer Gateway Keys follow the format:
```text
galx_live_a1b2c3d4e5f6... (48 characters total)
```
- **Prefix**: `galx_live_a1b2c3d4` (18 characters) used as an index key in storage.
- **Hash**: `SHA-256(rawKey)` stored in database state.
- **Verification**: `GalxCryptoVault.verifyGatewayApiKey(rawKey, storedHash)` verifies incoming keys with constant-time equality checks.

---

## 5. Zero Prompt & Content Logging Policy

GALXAI enforces strict privacy standards:
- **No Prompt Retention**: User prompts, system messages, and model completions are streamed directly between the client and upstream provider without being written to persistent storage or disk.
- **Zero Content Telemetry**: Only numeric metrics (latency in ms, token usage counts, status codes) are stored in the in-memory circular ring buffer.
