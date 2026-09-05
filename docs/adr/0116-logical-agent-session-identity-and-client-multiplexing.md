# ADR 0116: Logical Agent Session Identity and Client Multiplexing

## Metadata

* **Status**: Accepted
* **Date**: 2026-09-04
* **Subsystem**: chat API, agent SDK, browser chat synchronization
* **Impact**: context isolation, idempotency, persistence, developer ergonomics
* **Migrations**: None; existing owner-scoped `chat_conversations` and `chat_messages` remain authoritative

ADR 0119 later retired the hosted browser chat UI. The session identity, persistence, synchronization, and SDK isolation contracts in this ADR remain accepted infrastructure for explicit durable inference sessions.

## 1. Context

GALXAI correctly reused a single authenticated API client, connection pool, and model gateway for many requests. Some call paths then treated that shared client or the currently selected browser state as if it were a conversation. This confused transport reuse with logical continuity.

The most severe manifestation was the browser write-behind coalescer: it retained one pending session record but message snapshots for many sessions, flattened all messages, and submitted them under whichever session was written last. A delayed cloud response could also replace the messages displayed after a user had switched sessions. The SDK provided stateful thread objects, but did not send a stable identity, and the agent runtime lacked a first-class way to create or resume multiple sessions on one client.

A client is a transport and authentication facility. It is not a conversation.

## 2. Decision

Every request resolves four independent identities:

| Identity | Meaning | Authority |
| :--- | :--- | :--- |
| authenticated `userId` | principal allowed to access state | authentication and PostgreSQL RLS/repository predicates |
| `conversation_id` | durable logical context across turns | owner-scoped `chat_conversations` row |
| `turn_id` | one user-visible action and idempotency boundary | request/queue admission and response correlation |
| request/trace ID | one delivery/attempt and observability boundary | gateway and tracing substrate |

Provider credentials, WebSockets, HTTP keep-alive connections, SDK client instances, and browser tabs are deliberately absent from this table. They may be shared, replaced, or failed over without changing conversation identity.

The origin API is the durable session authority. A direct-to-provider edge path may validate and propagate identity for client-supplied context and governance, but returns `X-Galx-Session-Authority: client-context` and does not claim PostgreSQL persistence. GALX-only identifiers are stripped before provider dispatch.

The API accepts an explicit `session_mode`:

* `new`: create an owner-scoped conversation, accepting an opaque caller ID or returning a cryptographically random one;
* `continue`: require an existing, accessible conversation before inference;
* `stateless`: forbid a conversation ID and retain the zero-retention behavior of ordinary developer API calls.

Body and header identities must agree. Invalid, conflicting, oversized, or non-URL-safe identifiers fail before routing. Response headers and non-streaming envelopes return the resolved conversation and turn identities. Async jobs carry the same fields into their bounded work intent and use the turn as the default idempotency key.

```text
one authenticated client
        │
        ├── session A ── turn A1 ── request/attempt(s)
        │             └─ turn A2 ── request/attempt(s)
        │
        ├── session B ── turn B1 ── request/attempt(s)
        │
        └── stateless request C
```

### 2.1 SDK ergonomics

`AgentRuntime.startSession()` and `resumeSession(exportedState)` return isolated `AgentSession` objects. `GalxAI.thread()` follows the same lifecycle. Each object owns its history and rejects overlapping mutations within the same logical session, while unrelated sessions can run concurrently through one shared client. Resume requires an exported history snapshot because a durable identifier is authority and correlation—not an instruction to trust hidden provider-local context.

Bare `AgentRuntime.run()` remains stateless unless identity is explicitly supplied. This prevents a convenience API from silently converting zero-retention calls into durable chat storage. Responses disclose `owner-scoped-durable-conversation` when an API caller explicitly opts into persistence; they must not claim zero retention. Clearing a thread/session rotates its identifier, because deleting only local history while retaining the durable identity could allow server-side memory to reappear.

This matches the familiar client/thread split in the OpenAI Codex SDK: an application reuses a client, starts independent threads, and resumes a thread by ID. GALXAI keeps its own conversation ID authoritative so provider failover cannot merge or discard application context.

### 2.2 Browser synchronization

The BroccoliDB projection maintains pending session records and message snapshots keyed by `sessionId`. A flush emits one atomic bundle per logical session. Failed bundles are requeued independently; a successful session cannot acknowledge another session's data. Deletes supersede queued upserts for the same ID.

ETags are scoped by projection query, since `/api/chat/sync?activeSessionId=A` and `...=B` have different representations. Async hydration results include their resolved `activeSessionId` and are applied only if that session is still active and the load generation is current. Switching sessions aborts the old stream.

Before a downstream browser client sends `session_mode=continue`, it flushes the owning session so the server never observes a continuation before its authoritative parent exists. ADR 0119 retires GALXAI's hosted chat UI without changing this integration contract.

## 3. Invariants

1. A shared client MUST NOT imply shared conversation state.
2. A durable request MUST name exactly one owner-scoped conversation; a stateless request MUST name none.
3. `new`, `continue`, and `stateless` are explicit lifecycle semantics, not guesses made from a socket.
4. Messages from different sessions MUST NOT share a persistence bundle.
5. A response for session A MUST NOT mutate the active projection for session B.
6. At most one mutating turn may be active within an SDK session object; separate session objects remain independent.
7. Queue retry identity (`turn_id`) MUST remain distinct from conversation identity and transport attempt identity.
8. Conversation identifiers are opaque correlation values and MUST NOT contain secrets or personal data.

## 4. Industry pattern mapping

| Established pattern | GALXAI application |
| :--- | :--- |
| OpenAI Codex client plus `startThread` / `resumeThread` | one reusable `GalxAI` client, many `ConversationThread` or `AgentSession` objects |
| HTTP/2 connection multiplexing | connection reuse does not define application-level session affinity |
| Temporal workflow identity versus individual runs/tasks | stable conversation identity remains separate from turns and delivery attempts |
| Stripe-style idempotency | `turn_id` scopes safe request/queue retries without collapsing an entire conversation |
| W3C Trace Context | correlation/attempt identity is propagated separately and contains no PII or authority |

## 5. Rollout and compatibility

Existing OpenAI-compatible requests without the new fields remain stateless. Requests that historically supplied only `conversation_id` continue to mean `continue`, while first-party web and SDK clients now send an explicit mode. Old exported thread snapshots without an ID import as a new session; new snapshots preserve their ID for resumption.

No schema migration is required. The existing PostgreSQL ownership model is sufficient, and avoiding a second “agent sessions” table prevents competing context authorities. Future execution-supervisor identifiers from ADR 0114 may reference a conversation, but neither is allowed to impersonate the other.

## 6. Verification

* Request normalization tests cover lifecycle defaults, conflicts, and missing identities.
* SDK tests prove two sessions on one runtime/client do not exchange history.
* Sync tests prove dirty messages are emitted in owner-matching per-session bundles and ETags do not cross active-session projections.
* TypeScript compilation covers API, queue contract, web client, and public SDK types.

## 7. References

* [OpenAI Codex SDK threads](https://developers.openai.com/codex/sdk)
* [OpenAI conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
* [W3C Trace Context](https://www.w3.org/TR/trace-context/)
* [ADR 0072: Exact-owner chat persistence](0072-exact-owner-chat-persistence-and-delta-sync-mesh.md)
* [ADR 0114: Uncertain execution authority kernel](0114-uncertain-execution-authority-kernel-and-transactional-journal.md)
