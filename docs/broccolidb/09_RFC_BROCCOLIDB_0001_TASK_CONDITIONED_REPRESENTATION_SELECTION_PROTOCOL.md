# RFC-BROCCOLIDB-0001: Task-Conditioned Representation Selection Protocol (TCRSP/1.0)
## Formal Protocol Specification, Invariant Wire Formats, and Fail-Closed Conformance

**Network Working Group**  
**Request for Comments: 0001**  
**Category**: Standards Track  
**Date**: August 2026  
**Authors**: Senior Engineering Convergence Group & Core Substrate Lab  

---

## Abstract

This document specifies the **Task-Conditioned Representation Selection Protocol version 1.0 (TCRSP/1.0)**, governing the deterministic negotiation, representation selection, invariant preservation, and wire transmission of prompt contexts between software environments and Large Language Model (LLM) inference gateways.

---

## 1. Key Words & Normative Terminology

The key words "**MUST**", "**MUST NOT**", "**REQUIRED**", "**SHALL**", "**SHALL NOT**", "**SHOULD**", "**SHOULD NOT**", "**RECOMMENDED**", "**MAY**", and "**OPTIONAL**" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) and [RFC 8174](https://datatracker.ietf.org/doc/html/rfc8174).

---

## 2. Protocol Overview & Architectural Roles

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TCRSP/1.0 ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ Client / Agent ] ──► [ BroccoliDB Representation Gateway ] ──► [ LLM Wire ]
│                              │                                         │
│                              ├── 1. Density Gate (ID(C) Bypass)        │
│                              ├── 2. AST Domain Pruner (180 Domains)    │
│                              ├── 3. Invariant Oracle Check             │
│                              └── 4. Fail-Closed Provenance Guard       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Client / Agent**: The originating software process emitting a context payload $C$ and operational task descriptor $\tau$.
2. **Representation Gateway (BroccoliDB)**: The deterministic intermediary executing TCRSP/1.0.
3. **Inference Gateway**: The downstream LLM endpoint receiving the selected representation $C'$.

---

## 3. Normative Protocol Requirements

### 3.1 Adaptive Density Gate Requirements
* **REQ-1.1**: The Gateway **MUST** evaluate the token length of the incoming context payload $|C|$.
* **REQ-1.2**: If $|C| \le \theta_{\text{dense}}$ (default $200$ tokens) and the payload contains no institutional noise headers, the Gateway **MUST** return the identity representation $\text{id}_{\mathcal{C}}(C) = C$ with zero modification.
* **REQ-1.3**: The Gateway **MUST NOT** introduce structural tokens or wrapper overhead when the identity bypass is active.

### 3.2 Invariant Preservation Requirements
* **REQ-2.1**: The Gateway **MUST** preserve all active syntactic invariants $\Phi(C, \tau)$ in the transformed output $C'$.
* **REQ-2.2**: The Gateway **MUST** evaluate the provenance of all numerical quantities, currencies, dates, identifiers, and unit measurements in $C'$ against $C$.
* **REQ-2.3**: If any factual invariant in $C'$ cannot be grounded in $C$, the Gateway **MUST** set fidelity status to `'fallback'` and immediately emit the raw context $\text{id}_{\mathcal{C}}(C)$.

### 3.3 Institutional Noise Elimination Requirements
* **REQ-3.1**: The Gateway **MUST** prune historical documents containing explicit deprecation markers (`"SUPERSEDED by ADR X"`, `"DEPRECATED"`).
* **REQ-3.2**: The Gateway **MUST** strip unreferenced governance ceremony checklists and RFC committee forms.

---

## 4. HTTP Wire Format & Header Specification

TCRSP/1.0 interactions over HTTP REST utilize the following canonical request and response headers:

### 4.1 Request Headers
```http
POST /api/broccolidb/compact HTTP/1.1
Host: api.galx.ai
Content-Type: application/json
X-Broccoli-Task-Type: architecture_invariants
X-Broccoli-Domain-Hint: swift_mt103
X-Broccoli-Token-Budget: 1024
X-Broccoli-Fail-Closed: true
```

### 4.2 Response Headers
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Broccoli-Decision: TRANSFORM_DOMAIN_AST
X-Broccoli-Fidelity-Status: verified
X-Broccoli-Original-Tokens: 1402
X-Broccoli-Compacted-Tokens: 111
X-Broccoli-Reduction-Ratio: 0.921
X-Broccoli-Latency-Ms: 1.82
X-Broccoli-Invariant-Hash: 4a7d3b8f9e1c2a0d
```

---

## 5. Security & Privacy Considerations (ZDR v10.0)

1. **Zero Data Retention (ZDR)**: The Gateway **SHALL NOT** persist context string payloads $C$ to unencrypted permanent storage.
2. **Cryptographic Memory Zeroization**: Any internal RAM buffer utilized during AST transformation **MUST** invoke `zeroizeBuffer()` in a guaranteed `finally` block upon completion.
3. **Write-Ahead Log Integrity**: All metadata frames recorded in the WAL **MUST** be chained using SHA-256 digests.

---

## 6. Conformance Testing Suite

A compliant implementation of TCRSP/1.0 **MUST** pass all test assertions in:
* `scripts/verify-broccolidb-mathematical-properties.ts`
* `scripts/bench-institutional-entropy-matrix.ts`
* `scripts/test-broccolidb-backend-invariants.ts`

$$\blacksquare \quad \textbf{Standards Track Document Approved}$$
