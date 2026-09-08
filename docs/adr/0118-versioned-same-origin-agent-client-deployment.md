# ADR 0118: Versioned Same-Origin Agent Client Deployment

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Metadata

* **Status**: Superseded in part by ADR 0119
* **Date**: 2026-09-04
* **Subsystem**: browser agent client, Next.js deployment, release verification
* **Impact**: session isolation, streaming reliability, credential custody, rollout safety
* **Migrations**: None

## 1. Context

> **Current scope:** ADR 0119 retired the GALXAI-hosted chat application. The versioned same-origin browser-agent client remains an integration SDK for downstream applications; it is not a first-party product destination.

The web client is a live projection of an evolving execution, not the execution authority. It must survive a shared authenticated client carrying multiple conversations, streamed responses lasting minutes, interrupted transports, and a browser bundle that can remain open while a new server deployment is promoted.

The previous implementation embedded request construction and a partial SSE parser inside one React component. It also allowed upstream keys to be persisted in browser settings, treated network failure as permission to display a simulated completion, and duplicated response policy between `vercel.json`, Next.js config, middleware, and individual routes. Those behaviors are unsafe deployment ergonomics:

* a browser secret is exposed to extensions, injected script, support captures, and local profile theft;
* a simulated fallback makes the observation plane report work that never happened;
* line-oriented parsing loses valid multiline or fragmented SSE events;
* custom browser `fetch()` calls are not automatically protected from Vercel client/server version skew;
* a wildcard credentialed CORS policy conflates same-origin user sessions with public API-key access.

## 2. Decision

GALXAI deploys the agent client as a thin Next.js application on Vercel with a same-origin backend-for-frontend boundary.

```text
Browser bundle (Vercel CDN)
  ├─ GET /api/client/bootstrap ── protocol + deployment projection
  ├─ POST /v1/chat/completions ── explicit session + turn + idempotency
  └─ SSE response projection ──── typed events; transport interruption only
                 │
                 ▼
      server-side auth / routing / vault
                 │
        Supabase PostgreSQL authority
                 │
       relay / queues / event journal
```

### 2.1 Client contract

`GalxBrowserAgentClient` is the single browser transport adapter. One instance may create many `GalxBrowserAgentSession` handles. Each turn carries separate identifiers for session, turn, request idempotency, and deployment protocol. A session rejects concurrent mutation while unrelated sessions remain independent.

The client defaults to a relative same-origin endpoint, `credentials: same-origin`, and a server-provided user access token callback. Persistent `Authorization`, `x-api-key`, and `x-galx-key` headers are rejected. Cross-origin agent endpoints require an explicit opt-in because they need an independently reviewed CORS and token boundary.

`interruptTransport()` aborts only the browser request. It does not claim `execution.cancelled`; authoritative cancellation remains a separate control-plane command.

### 2.2 Streaming

Interactive turns use `fetch()` plus SSE because the request has a JSON body and the response is one-way streamed output. The parser implements event blocks, CRLF normalization, comments, names, IDs, multiline data, fragmented chunks, OpenAI chat deltas, and Responses-style text delta events.

The Vercel function duration is capped at 300 seconds. This covers the current two-to-three-minute interactive workload on all Fluid compute plans without selecting a beta-only 30-minute ceiling. Work that may exceed the cap must use the durable relay contract (`202 Accepted` plus a resumable journal-backed stream); increasing a request timeout is not a substitute for durable execution ownership.

### 2.3 Deployment skew

`GET /api/client/bootstrap` returns the protocol version, deployment ID, supported session modes, duration envelope, and the fact that provider keys are not accepted in the browser. When Vercel Skew Protection is active, the browser attaches the returned deployment ID to custom fetches. A protocol mismatch fails closed and asks for a reload instead of sending a new bundle to an incompatible server.

The bootstrap is a projection, not authority. It contains no secret and is `private, no-store`.

### 2.4 Credential and origin policy

Provider credentials live only behind the server boundary in the encrypted shard vault. Legacy custom-key values are removed when settings are normalized and rewritten. The UI links to server-managed key operations rather than rendering a provider-key field.

First-party `/api` routes are same-origin unless a route deliberately declares otherwise. Public `/v1` API-key routes retain non-credentialed wildcard CORS. Global `Access-Control-Allow-Credentials: true` plus `Access-Control-Allow-Origin: *` is removed.

### 2.5 Release shape

Response headers are single-sourced in Next.js configuration and routes; `vercel.json` contains only platform placement. Releases use:

1. preview deployment and automated client/session contract tests;
2. production candidate with Vercel Skew Protection;
3. 5% → 25% → 50% → 100% rolling promotion where the plan supports it;
4. smoke verification of bootstrap protocol, CSP, health, and public API behavior;
5. instant application rollback without rolling back additive database migrations.

## 3. Invariants

1. A browser client is transport, never conversation or execution authority.
2. Every durable turn names one session; stateless turns name none.
3. Provider credentials are never persisted in browser state or storage.
4. The UI never fabricates a successful model response after a transport failure.
5. A server response acknowledging the wrong session fails closed.
6. Custom agent fetches are version-pinned when deployment skew protection is enabled.
7. Transport abort, cancellation request, attempt interruption, and terminal cancellation remain distinct states.
8. Long-running work outlives an HTTP connection only through a durable execution/journal contract.

## 4. Verification

* `npm run test:browser-agent` validates multiplexed sessions, mode advancement, idempotency, deployment pinning, SSE framing, session mismatch rejection, stateless turns, and browser-secret rejection.
* `npm run test:sessions` validates SDK/runtime session isolation.
* `npx tsc --noEmit` validates the public client contract and application integration.
* `npm run vercel:smoke -- --url=<preview>` validates the deployed bootstrap and security envelope.

## 5. Operational follow-up

The next durable-client increment is not another browser retry loop. It is a PostgreSQL-authoritative execution submission endpoint plus a journal-backed `Last-Event-ID` projection from the relay. Until that endpoint is wired end-to-end, the bootstrap must not advertise durable resume or authoritative cancellation.

## 6. References

* [ADR 0114: Uncertain execution authority](0114-uncertain-execution-authority-kernel-and-transactional-journal.md)
* [ADR 0116: Logical agent sessions](0116-logical-agent-session-identity-and-client-multiplexing.md)
* [Vercel Skew Protection](https://vercel.com/docs/skew-protection)
* [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
* [OpenAI Responses streaming](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)
