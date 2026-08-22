# 🔒 GALXAI Cryptographic Security & Threat Model

GALXAI is designed from first principles with zero-trust envelope cryptography, Zero Data Retention (ZDR v10.0) memory zeroization, Safe Harbor 18 PHI/PII de-identification, continuous SOC 2 Type II compliance evaluation, and strict tenant isolation.

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
| **Ciphertext Transplantation** | Additional Authenticated Data (AAD) binding | Ciphertext encrypted under Tenant A cannot be decrypted by Tenant B, even if an attacker accesses raw storage. |
| **Heap Memory Snooping** | Ephemeral RAM Zeroization (`ScopedMemorySanitizer`) | Plaintext keys and token buffers are overwritten with 2-pass deterministic wiping (`0xAA` -> `0x00`) in `finally` blocks. |
| **Gateway Key Impersonation** | SHA-256 Prefix Hashing | Gateway keys (`galx_live_...`) are hashed with SHA-256; only the prefix is indexed in BroccoliDB for $O(1)$ lookup. |
| **Stale Worker Race Conditions** | Monotonic Fencing Tokens | Each lease increments a monotonic counter (`fencingToken`); late arriving responses from timed-out workers are rejected. |
| **Credential Revocation Delay** | Synchronous 1-Click Retraction | Revoking an account invalidates in-flight leases and purges cache tables in $< 40\text{ms}$. |
| **PII / PHI Exfiltration** | Safe Harbor 18 & GDPR Redaction | Replaces sensitive entities with reversible ephemeral tokens before upstream transmission. |
| **Audit Log Tampering** | Merkle Tree SHA-256 Hash Chaining | Every audit micro-batch is sealed with Merkle root hash verification, ensuring tamper-evident custody. |

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

## 3. Zero Data Retention (ZDR v10.0) & Memory Slab Pools

Node.js Garbage Collection does not guarantee immediate memory cleanup of deallocated strings or buffers. GALXAI guarantees complete zero data retention through dedicated memory management:

1. **Pre-Allocated Memory Slab Pool (`galxSlabPool`)**: Pre-allocates high-speed memory slabs leased and returned in sub-microsecond intervals.
2. **2-Pass Cryptographic Overwrite**: Memory is actively scrubbed with `0xAA` (alternating bit pattern) followed by `0x00` (zeroization).
3. **HKDF Forward Secrecy Key Ratchet**: Ephemeral session keys ratchet every 1000 streaming tokens.
4. **Scoped Memory Sanitizer (`ScopedMemorySanitizer`)**: Automatic RAII cleanup tracking guarantees wiping buffers on stream abort or completion.

```typescript
// Memory zeroization implementation
export function zeroizeBuffer(buf: Buffer): void {
  buf.fill(0xAA);
  buf.fill(0x00);
}
```

---

## 4. Safe Harbor 18 PHI & International Privacy De-Identification

GALXAI implements comprehensive de-identification covering:
- **HIPAA Safe Harbor 18**: Names, 3-digit ZIP restrictions ($< 20,000$ pop zeroization), All dates, Phone/Fax, SSN, MRN, Health Plan Beneficiary numbers, DEA numbers, NPI (Luhn checksum), Vehicle VIN (ISO 3779 checksum), Device MAC/IMEI, URLs, IP addresses, Biometric identifiers, and Geriatric ages $> 89$.
- **European & Global Privacy Standards**: GDPR (Articles 15, 17, 20, 30), Brazil LGPD (CPF/CNPJ Mod-11), Canada PIPEDA (SIN/OHIP), Australia Medicare/TFN, India DPDP (Aadhaar Verhoeff D5 / PAN), South Korea PIPA (RRN Mod-11), Japan APPI (My Number), Swiss AHV/AVS, Singapore NRIC.

---

## 5. AICPA SOC 2 Type II 5-Pillar Controls & Merkle Audit Ledger

The platform continuously evaluates 28 technical controls mapped across all 5 Trust Services Criteria:
1. **Security**: JWE encrypted sessions, DPoP client fingerprinting, Step-Up SUDO mode, envelope encryption.
2. **Availability**: 4-state circuit breakers, multi-region failover, token-bucket rate governors.
3. **Confidentiality**: ZDR v10.0 memory zeroization, Zero-Knowledge Attestation Tickets (ZKAT).
4. **Processing Integrity**: JSON schema validations, Stripe-grade idempotency keys.
5. **Privacy**: DSAR export/purge automation, Article 30 RoPA records, C2PA provenance headers.

Audit records are streamed into Merkle Tree micro-batches with SHA-256 custody chains (`GalxHighThroughputAuditStreamer`).

---

## 6. Formal Architectural Decision Records

For deep technical specifications, consult the official ADRs:
- **[ADR 0020: Provider-as-Auth Paradigm](adr/0020-provider-as-auth-zero-friction-session-substrate.md)**
- **[ADR 0021: JWE Compact Session Encryption & DPoP Fingerprinting](adr/0021-jwe-compact-session-encryption-and-dpop-fingerprinting.md)**
- **[ADR 0022: OAuth 2.0 Token Rotation with Reuse Attack Detection](adr/0022-oauth-token-rotation-with-reuse-attack-detection-cascades.md)**
- **[ADR 0023: Step-Up SUDO Elevation & Fine-Grained Token Scoping](adr/0023-step-up-sudo-elevation-and-fine-grained-token-scoping.md)**
- **[ADR 0024: Adaptive Behavioral Risk Scoring & Zero-Downtime KMS Re-Wrapping](adr/0024-adaptive-behavioral-risk-scoring-and-zero-downtime-kms-rewrapping.md)**
- **[ADR 0025: BroccoliDB L1 Reactive In-Memory Tables](adr/0025-broccolidb-l1-reactive-in-memory-table-and-secondary-indexing.md)**
- **[ADR 0026: BroccoliDB Natural Query Parser & WAL Persistence](adr/0026-broccolidb-natural-language-query-ast-parser-and-wal-persistence.md)**
- **[ADR 0027: Enterprise Privacy Substrate & ZDR v10.0 Memory Zeroization](adr/0027-enterprise-privacy-safe-harbor-18-gdpr-and-zdr-v10-memory-zeroization.md)**
- **[ADR 0028: SOC 2 Type II Compliance Engine & Merkle Audit Ledger](adr/0028-soc2-type-ii-compliance-engine-drift-detector-and-merkle-audit-ledger.md)**
