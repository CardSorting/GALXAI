# ADR 0143: Hybrid Sites memory and full-page review

<!-- docs-scope: decision-record -->

Status: Accepted. Date: 2026-09-12. Extends [ADR 0142](0142-continuous-sites-conversations.md). Private architecture record; the [public guide](../SITES_WORKSPACE.md) describes capabilities only.

## Problem

Saved conversation history outlives the generation window. A single rolling summary may omit an earlier decision, and independently truncating messages can retain an answer without its request. The workspace also needs useful editing beyond the opening preview, explicit version comparison, and reliable recovery when another tab or a failed connection changes state.

The older general-purpose [hybrid context decision](0069-hybrid-broccolidb-postgres-rolling-context-and-5-level-pyramid.md) offers useful layering, but its latency and compression claims are not Sites measurements. Its shared-workspace graphs, generic compaction and asynchronous persistence are not adopted as authority for private Sites.

## Decision

Use the existing BroccoliDB table primitive as a disposable server-side cache over authoritative PostgreSQL records. Every lookup starts with a fresh owner-scoped, locked workspace read. Cache keys hash account, Site, revision, turn count, restore epoch, pending operation, updated time and query purpose. Only committed reads enter the cache; mutations never acknowledge a memory-only write. Cache failure falls through to the database. Entries hold serialized payloads, so nested caller mutation cannot corrupt another read. Bound each process to 128 entries and 4 MiB, with sixty-second expiry and least-recently-used eviction. The cache is an optimization, never authorization, cross-process coordination, or disaster recovery.

For generation, combine the current document and latest request with pinned notes, the rolling summary, complete recent user/reply pairs, and a small selection of relevant earlier pairs. Search only completed pairs belonging to the verified owner and Site, newer than the restore epoch and older than the six-turn recent region. A private partial GIN expression index supports PostgreSQL lexical search. Normalize and bound query terms; parameterize SQL, limit candidates to eight pairs, and retain at most three recalled pairs within the existing input budget. The latest two pairs receive priority, then recalled evidence, then the rest of the six-pair recent window. Never split a pair to fit. Never include pending, failed or orphaned answers.

Earlier conversation is historical evidence. The latest request, pinned notes and saved document take precedence. This is lexical retrieval, not semantic search, exhaustive recall, or proof that a previously discussed plan was approved. There is no extra summarization invocation, embedding service, autonomous generation loop, or change to fair-use limits. A failed authoritative recall read stops before a turn is reserved; a cache miss alone does not stop work.

## Interaction strategy

Keep the established chat/preview layout and mobile Chat/Preview switch. Add a Page content view containing the whole document, native section navigation and Edit in chat actions. These actions prepare an editable request and never replace an existing unsent message. Discuss replies can continue into Build through the same reviewable composer. Copy and failed-message reuse are explicit actions.

Historical versions show a content comparison with the current draft before restore confirmation. Restoration still appends a version, preserves the published snapshot and resets the context epoch. Downloads follow the selected content. Preview anchors explicitly use `about:srcdoc` so they cannot resolve against the editor; standalone downloads/public pages use local fragments. Escaping, empty iframe sandbox, script prohibition and network restrictions remain intact.

Save unsent project-note edits per account/Site/tab with their original saved base. When another save arrives, preserve dirty local notes, show both states and require choosing saved notes or keeping local edits. A successful save clears only its submitted draft. BroadcastChannel carries invalidations only, never content; receiving tabs and returning windows re-read authorized data. Coalesce rapid changes with a trailing refresh so throttling does not discard the final invalidation. Offline status blocks sending while allowing drafting. After an uncertain response, re-read the saved turn and recognize its completed reply before offering a retry. Do not clear an uncertain generation identity on a server error. The existing original-operation replay/recovery protocol prevents a second dispatch.

## Evidence behind the familiar patterns

- [Lovable project knowledge](https://docs.lovable.dev/features/knowledge) separates lasting project guidance from individual chat turns.
- [Lovable Plan mode](https://docs.lovable.dev/features/plan-mode) makes discussion and execution distinct, with a reviewable handoff. GALX uses its existing Discuss/Build modes and does not claim a code-generation plan system.
- [v0 design mode](https://v0.app/docs/design-mode) connects a selected part of a page to an editing request. GALX adopts section-specific chat starters, not arbitrary visual or code editing.
- [v0 versions](https://v0.app/docs/versions) and [Bolt version history](https://support.bolt.new/building/using-bolt/rollback-backup) support reviewing prior work and restoring a recoverable version.
- [PostgreSQL text search](https://www.postgresql.org/docs/current/textsearch-controls.html) provides lexical parsing and ranking; [MDN iframe documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) documents explicit `about:srcdoc` fragment links.

These are pattern references, not claims of feature parity or measured superiority.

## Rollout, validation and limits

Migration `20260912071633_sites_hybrid_context_search.sql` adds only an index. Existing code remains compatible. Apply it after the disposable suites pass, with bounded lock/statement timeouts; a timeout requires investigating or rescheduling the index build rather than raising timeouts blindly. The paired rollback removes the index and retains all data and security grants. Types need no schema-field change. No admission pause or historical backfill is needed for this additive optimization.

Validate cache isolation, immutability, bounds, expiry and fallback; old-decision retrieval, restore invalidation and failed-turn exclusion; complete-pair input budgets; public allowlists and raw HTML; uncertain HTTP replay, note conflicts, cross-tab refresh, full-page mobile content and version review. Finish with a production build, served asset/DOM scan and read-only live authorization checks. Paid generation acceptance is separate and must not be inferred from fixtures.

No cache hit-rate, latency target, comprehensive multilingual recall, offline account synchronization, or WCAG certification is claimed by this decision. Local drafts depend on tab storage; durable records remain in PostgreSQL. Public capability remains bounded information pages.
