# Continuous Sites conversation operations

<!-- docs-scope: current-guide -->

Private maintainer documentation. [ADR 0142](../adr/0142-continuous-sites-conversations.md) owns the decision; [public Sites guide](../SITES_WORKSPACE.md) describes supported behavior. Do not expose this document in application routes, browser assets or public errors.

## Data and request flow

`20260912060747_sites_conversation_sessions.sql` adds project notes, summary, context epoch, turn/version counters, published version, and pending intent to `private.galx_site_workspaces`. `private.galx_site_turns` retains user text, answer, intent, operation identity, state and sequence. `private.galx_site_versions` retains immutable content and the summary at a document checkpoint. Both new tables use a composite workspace/owner foreign key, forced RLS, and denied PUBLIC/anon/authenticated/service_role privileges. Only the server’s database identity accesses them, always with an owner predicate.

Begin locks the parent, checks the revision and absence of another operation, writes a pending turn and records its intent. Generation happens outside the transaction. Finish locks the parent, verifies the original operation, persists the reply and summary, creates a version only for changed content, and clears the operation. A late completion cannot overwrite another turn. A completed duplicate bypasses admission and reads current state, while different content under an old identity returns conflict. Existing fair-use accounting and original-operation recovery remain authoritative.

The response contract is `{conversation_version:1,document,message,memory}`. Strict field and size validation applies to the entire envelope; Discuss rejects a non-null document. Legacy document-only receipts are accepted for Build across migration. Current document, pinned notes and the latest request are mandatory in the bounded generation input. Summary and up to twelve recent completed messages fit within the existing transport budget; failed and pending requests are excluded. A successful turn rolls memory within the same invocation. No summarization job or background dispatch is introduced.

Restore checks ownership, current revision and no pending turn. It appends a new checkpoint plus a restoration message, restores the selected summary and resets the recent-context epoch. It preserves notes, all history, the old versions and the public snapshot. Rename, archive, notes and restore remain local saved-work operations; creation, generation and publication retain paid eligibility and fair admission.

## Narrow API contracts

All requests require verified bearer account sessions. IDs and positive cursors are validated, and extra mutation fields are rejected.

| Request | Allowlisted result / effect |
| --- | --- |
| `GET ?view=library` | Summary fields only; no documents, notes or messages |
| `GET ?id=…` | Current workspace, last forty turns, context and earlier cursor |
| `GET ?id=…&view=history&before=N` | Up to forty earlier turns as message DTOs; next cursor or null |
| `GET ?id=…&view=versions&before=N` | Up to twenty version numbers, labels, timestamps; next cursor or null |
| `GET ?id=…&version=N` | Version number and validated document only |
| `POST generate` | Exact existing fields plus optional `intent: build/discuss`; omitted intent remains Build |
| `POST context` | `id`, `revision`, `notes`; no caller-written summary |
| `POST restore` | `id`, `revision`, `version`; no caller-written document |

The legacy default list remains compatible. New UI uses the library summary endpoint and fetches the selected Site freshly. Public DTOs include only user-facing content, versions and statuses, never receipt IDs, operation fields, database records, budgets, provider details or operational failure text.

## Browser continuity

Draft text and message mode use a sessionStorage key scoped to account and Site. New-Site guest text transfers once after sign-in. Interrupted creation retains its UUID; interrupted turn delivery retains its operation identity. A successful reply clears only the text actually submitted, preserving text typed while waiting. Unsent drafts survive reload in that browser tab; they are not account-synced and do not survive browser storage removal.

Library and workspace reads merge by revision and updated time. Selection checks ignore stale responses from another Site. Polling waits for its previous request, pauses when hidden and resumes on visibility. Returning to an in-progress Site reads/reconciles the original turn. It never repeats generation merely because the network response was lost.

The chat follows new messages only near the bottom. Reading earlier entries preserves the scroll anchor; Latest message returns to the end. Earlier messages load in forty-turn pages; a bounded older window offers Return to latest when it replaces the current window. Context notes are explicitly saved. The automatic summary can be corrected through chat or overridden by pinned notes. History inspection is read-only; restoration has inline confirmation and keeps publishing explicit.

## Deployment and recovery

1. Verify the isolated database suites, boundary regressions, production build, typecheck, lint and documentation integrity. Check current migration status and the exact approved fair policy.
2. Briefly disable new admission through a compare-and-set policy revision. Preserve its previous mode, eligible prices and limits in a private release record. Keep existing recovery/readers available. Wait for old application generations to complete; do not erase or fabricate uncertain outcomes.
3. With no pending workspace operation, apply the additive migration using `supabase db push --linked --skip-vault --yes` after its dry-run lists only the intended migration. The repository migration manager provides inventory only. It backfills retained legacy turns, imports current/public snapshots, and is idempotent. Previously discarded history is unrecoverable.
4. Deploy the real application checkout, verify readiness and then restore the previously approved mode with a fresh policy revision. Do not deploy the synthetic validation checkout or fixture route. Do not use this release to alter plan IDs, limits, hosting credentials, CNAMEs or worker admission.
5. Verify live anonymous/forged authorization failures, the rendered workspace and served browser assets. Record paid end-to-end acceptance separately if performed.

On rollback, first pause new generation. The paired DOWN migration retains columns, history, versions, publication and denial grants; it disables fair admission. Keep the new recovery-capable application available for pending new-envelope operations. Reverting to the old generator requires an explicit compatibility migration because it cannot produce or interpret rolling conversation envelopes. Never drop history or revive an uncertain operation to restore availability. Resume the known working application and prior approved policy when checks pass.

## Validation

```sh
node --import tsx --test scripts/test-sites-workspace.ts scripts/test-sites-conversation.ts scripts/test-sites-fair.ts
npm run test:sites:workspace:db
npm run db:test
npm run db:verify
npx tsc --noEmit
npm run lint -- --quiet
python3 scripts/verify-docs.py
python3 internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/verify-application.py sessions-application-verification.json
```

The extended workspace fixture exercises 105 turns, all pages, original-operation reuse beyond the old window, checkpoint comparison, restore without republishing, saved notes, context epochs, pending migration, idempotent reapplication, rollback preservation, concurrent starts and denied Data API access. `scripts/fixtures/sites-conversation-ui-route.ts` is a synthetic route copied only into an isolated local review app. It has no production authorization or real inference and must never be deployed.

Release evidence and scoped audit: [conversation audit and qualification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/SITES_SESSIONS_20260912.md).
