# ADR 0003: AES-256-GCM Envelope Encryption with AAD Binding & Heap Scrubbing

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (Implemented and Verified)

## Context
Multi-tenant AI credential vaults face critical security risks:
1. **Ciphertext Transplantation Attacks**: An attacker who obtains an encrypted secret block might attempt to decrypt it in the context of another tenant or account ID.
2. **Memory Snooping & Heap Dumps**: Plaintext API keys remaining in Node.js V8 heap buffers could be exposed during core dumps, debugging sessions, or memory leaks.

## Decision
We implemented cryptographic envelope protection and strict heap scrubbing in `GalxCryptoVault`:

### 1. AES-256-GCM Envelope Encryption with AAD Binding
- All upstream API keys and OAuth tokens are encrypted with `aes-256-gcm` using a 96-bit cryptographically random IV.
- **Additional Authenticated Data (AAD)** binds the ciphertext to the unique tuple:
  $$\text{AAD} = \text{tenantUid} \mathbin{\Vert} \text{shardId} \mathbin{\Vert} \text{provider}$$
- The 128-bit authentication tag guarantees that if an attacker attempts to transplant ciphertext across tenants, shards, or providers, decryption immediately throws a `GalxVaultDecryptionError` without leaking plaintext.

### 2. Ephemeral RAM Scrubbing (Buffer Zeroization)
- Decrypted secrets exist in RAM only for the minimum duration required to construct upstream HTTP request headers.
- Inside the `finally` block of `routeChatCompletion` and `routeImageGeneration`, the raw plaintext buffer is immediately overwritten with zeros:
  ```typescript
  export function zeroizeBuffer(buf: Buffer): void {
    buf.fill(0);
  }
  ```

### 3. Masked Telemetry Strings
- API keys are never stored or displayed in plaintext.
- Strict masking rules preserve only prefix and suffix markers (e.g. `sk-proj-...klmn`).

## Consequences
- **Positive**: Cryptographically enforces tenant and shard boundary isolation.
- **Positive**: Eliminates in-memory persistence of sensitive credentials.
- **Positive**: Fully compliant with enterprise security standards.
