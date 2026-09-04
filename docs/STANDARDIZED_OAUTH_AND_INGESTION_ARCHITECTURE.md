# Standardized OAuth & Ingestion Architecture Specification

## Overview

GALXAI implements a strict two-tier authentication and ingestion topology:
1. **Frontend Platform Authentication (Supabase OAuth)**: Pure, standardized developer login (GitHub, Google, Email Magic Link) managing user identity, billing, API keys, and workspace sessions via `@supabase/ssr`.
2. **Backend Autonomous Substrate Sharding (Ingestion Gateway)**: Isolated, hardened infrastructure service ingesting upstream provider credentials (OpenAI, xAI Grok, Anthropic), executing AES-256-GCM envelope encryption, and maintaining Hybrid BroccoliDB routing tables.

---

## 1. Frontend Platform Authentication

### Standard Next.js SSR Integration
- **SDK**: `@supabase/ssr` / `@supabase/supabase-js`
- **Client Factory**: `src/utils/supabase/client.ts` (`createBrowserClient`)
- **Server Factory**: `src/utils/supabase/server.ts` (`createServerClient`)
- **Callback Route**: `src/app/auth/callback/route.ts`
- **Context**: `src/contexts/AuthContext.tsx`

```typescript
// Standard 1-Click OAuth Trigger
const { signInWithOAuth } = useAuth();
await signInWithOAuth('github'); // Or 'google'
```

### Route Handler (`/auth/callback`)
```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/playground';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/connect?error=auth_failed`);
}
```

---

## 2. Backend Autonomous Ingestion Gateway

The backend ingestion endpoint (`POST /api/auth/ingest` and `/api/ingest`) provides high-security transport protocols for external CLI agents (e.g. `LUMI-NEW`) and automated backend runners.

### Transport Security Specification

| Header | Specification | Purpose |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Enforces JSON payload (rejection: 415) |
| `Digest` | `sha-256=<base64-hash>` | RFC 9530 / RFC 3230 Wire Payload Integrity |
| `Idempotency-Key` | `<uuid-or-hash>` | IETF Idempotent Retry Deduplication (24h Cache) |
| `X-Request-Timestamp` | `<unix-timestamp-ms>` | Replay Prevention Skew Window (±300s) |
| `X-Request-Nonce` | `<random-hex>` | Single-Use Nonce Cache (10-min TTL, 409 on replay) |
| `X-Correlation-Id` | `<uuid>` | Distributed Request Tracing |
| `CF-Threat-Score` | `<integer>` | Cloudflare Edge Bot & Threat Mitigation |

### Response Headers
- `Server-Timing`: High-resolution microsecond compute timing (`total;dur=...`).
- `X-Correlation-Id`: Propagated request trace identifier.
- `Idempotent-Replay`: Emitted as `true` on duplicate request replay.
- `Cache-Control`: `no-store, no-cache, must-revalidate, private, no-transform`.

---

## 3. CLI Agent Synchronization & Edge Fleet Sync (`LUMI-GALX`)

```mermaid
sequenceDiagram
    autonumber
    actor CLI as LUMI CLI Agent
    participant IngestGateway as GALXAI Gateway (/api/auth/ingest)
    participant PostgreSQL as Supabase PostgreSQL Authority
    participant Journal as Secret-Free Registry Journal
    participant BroccoliDB as BroccoliDB Routing Projection

    CLI->>CLI: 1. Exchange OAuth Code (127.0.0.1:1455)
    CLI->>CLI: 2. Calculate Content-Digest & Idempotency Key
    CLI->>IngestGateway: 3. POST /api/auth/ingest (Digest, Nonce, Timestamp)
    IngestGateway->>IngestGateway: 4. Constant-Time Digest Verification
    IngestGateway->>PostgreSQL: 5. Encrypt + upsert authoritative shard
    PostgreSQL->>Journal: 6. Append secret-free fact in same transaction
    PostgreSQL-->>BroccoliDB: 7. Refresh replaceable routing projection
    IngestGateway-->>CLI: 8. HTTP 200 after durable commit
```

### Credential Authority and Edge Access

Provider credentials are not synchronized to edge KV. Authentication and refresh paths await the encrypted PostgreSQL registry commit before publishing the new revision to the local routing projection. Edge and relay transports receive only the credential material required for an active server-side dispatch; a future broker may issue short-lived audience-bound leases, but long-lived refresh credentials remain in the authority store.

---

## 4. Verification & Testing

Both environments maintain comprehensive test suites:
- **`GALXAI` Real Inference Pipeline (100% Wire Execution)**: `npm run test:inference`
- **`GALXAI` (217 Distributed Tests)**: `npm run test:router`
- **`LUMI-GALX` Edge Multi-Token Pool Verification**: `npm run check` in `/Users/bozoegg/Desktop/LUMI-NEW`
