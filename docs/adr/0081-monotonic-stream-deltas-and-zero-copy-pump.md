# ADR 0081: Monotonic Stream Deltas and Zero-Copy Stream Pump

## Status
Accepted (Supabase Migration 61, Applied & Cemented)

## Context
High-concurrency Server-Sent Events (SSE) streaming suffered from connection drops, missing delta chunks upon client reconnection, and heavy memory churn caused by repeated string allocations during chunk forwarding.

## Decision
1. **Monotonic Sequence Delta Ledger (`galx_chat_stream_deltas`)**:
   - Each streamed chunk is tagged with an incremental integer sequence number (`seq_id`).
   - Reconnecting clients supply `since_seq` to retrieve missed delta slices without re-requesting the entire stream.
2. **Zero-Copy SSE Stream Pump (`GalxZeroCopyStreamPump.ts`)**:
   - Pipes raw `Uint8Array` chunks directly between upstream inference provider sockets and downstream client responses with immediate flushing headers (`x-accel-buffering: no`, `transfer-encoding: chunked`).

## Consequences
- Guaranteed lossless stream resumption across mobile/unstable networks.
- Zero string decoding/re-encoding CPU overhead on edge proxy nodes.
