# ADR 0142: Continuous Sites conversations

<!-- docs-scope: decision-record -->

- Status: Accepted
- Date: 2026-09-12
- Extends: [ADR 0139](0139-browser-sites-workspace-and-managed-publishing.md)
- Preserves: [paid fair usage](0140-paid-sites-and-shared-fair-usage.md), [Pro eligibility](0141-sites-pro-self-service-launch.md), explicit publication and automatic addresses

This is private architecture documentation. The public capability contract is [Sites workspace](../SITES_WORKSPACE.md).

## Problem

The initial workspace saved a conversation but sent only the current document and newest prompt to generation. Earlier decisions were unavailable to later turns. Its retained JSON array discarded messages after eighty entries, the composer shared a draft across Sites, and every refresh could replace newer state. Users could neither discuss a change separately nor recover an earlier document.

## Decision

Treat each Site as a continuing project with a durable conversation, pinned notes, rolling project memory, and immutable document checkpoints. Keep the incumbent chat-left/preview-right layout and explicit Chat/Preview mobile controls. Introduce Build and Discuss in the composer, Context for project guidance, and History for version inspection and restoration.

Each admitted user turn uses one existing included generation invocation. Its response contains a bounded document or null, a useful assistant reply, and an updated project summary. Discuss must return null; Build can ask a clarification without modifying the draft. No background inference, recursive improvement loop, second summarization call, new provider quota promise, or separate message price is introduced. “Automatic rolling” means context is updated as user-directed turns complete.

Persist the pending turn before dispatch. Parent-row locking, owner predicates, revision checks and a durable operation key prevent competing updates and duplicate dispatch. A repeated completed or pending operation with identical text and intent reads the current state; mismatched reuse fails. Uncertain outcomes reconcile the original receipt. Invalid envelopes preserve both prior content and prior memory.

Working context consists of the contract, current document, project notes, prior summary, recent completed turns and latest request. Preserve mandatory document/notes/request bytes; reject oversized input before reservation. Include memory and up to twelve recent messages within the existing 12,000-byte transport envelope. History is durable separately from this bounded working context. On restore, restart recent context at the restoration marker and recover that checkpoint’s summary; keep pinned notes and the full conversation. This prevents discarded later decisions from silently steering the restored draft.

Store turns and versions in private tables with forced RLS and no Data API grants. Expose narrow account-authorized DTOs for workspace, library, history and version access. The public page still reads only the explicitly published document. A restore creates a new version, leaves publication unchanged and never deletes historical checkpoints. A discussion or content-identical answer creates no document version.

Use lightweight library summaries and cursor pages: forty turns per history page, twenty versions per version page. The browser keeps a bounded older-history window and an explicit return to latest; it never implies that the visible window is the complete conversation. Per-account/per-Site drafts and mode survive a same-tab reload. Revision and timestamp ordering reject stale responses; selection checks prevent a late response opening another Site. Recovery polling is sequential and pauses in hidden tabs.

## Familiar patterns adopted

[Lovable project knowledge](https://docs.lovable.dev/features/knowledge) supports keeping persistent project guidance alongside an evolving conversation. [Lovable Plan mode](https://docs.lovable.dev/features/plan-mode) supports making discussion an explicit interaction before changing a project. [Bolt version history](https://support.bolt.new/building/using-bolt/rollback-backup) supports previewing and restoring prior versions from the working interface. These are interaction references; GALX retains its own supported page-content scope and publication contract.

## Consequences and limits

The migration imports only legacy messages still retained and the current/published snapshots. Previously discarded messages and older document versions cannot be reconstructed. Imported timestamps represent the last known workspace update, not recovered original turn times. Deploy with new admissions briefly paused and existing turns drained before migration, so an old application cannot write an untracked legacy turn during backfill. Resume the previously approved policy after the new application is ready; limits and paid eligibility do not change.

Memory is a model-produced summary, not an exhaustive transcript or a guarantee that every old detail stays active. Users can inspect it, correct it in chat, and pin important facts. Very large mandatory inputs receive an actionable length error instead of silent truncation. Version storage grows with actual changes; account/workspace limits and fair admission continue to bound creation and write rate. Historical reads remain bounded and owner-indexed.

This release continues to generate text-based information pages. It does not add arbitrary code execution, styling changes, visitor accounts, forms, checkout, external integrations, multiple conversational branches, or unattended agent execution.

## Verification and rollback

See [continuous conversation operations](../maintainers/SITES_CONVERSATIONS.md) for migration, rollout and rollback. Tests cover long conversations, imported pending work, idempotency, competing turns, restored context boundaries, UTF-8 limits, Discuss isolation, account authorization, all Data API roles, public response allowlists and unchanged publication. Browser checks cover independent drafts, typing during a pending reply, context editing, version inspection and restoration at desktop/mobile sizes. Production build and public asset scans are required; synthetic generation is not live customer acceptance.
