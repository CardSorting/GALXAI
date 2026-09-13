# Public information boundary

Public content explains what GALX does, how to call it, and what users can expect.
Keep topology, shard configuration, credential sources, authentication to upstreams,
routing mechanics, internal constraints, execution-model selection, and implementation
diagnostics private. Do not publish these in UI copy, metadata, social previews,
browser bundles, response bodies, headers, errors, streams, or public documentation.

Use explicit public response field allowlists. Do not forward internal objects or
upstream headers wholesale. Keep operational diagnostics behind server-side
administrator authorization; an ordinary authenticated user is not an administrator.
Public model names and aliases must not promise an unverified underlying model.
Preserve internal protocol identifiers and operational records without presenting them.
Verify changes with adversarial response tests, authorization tests, and a production
build. Scan rendered pages and browser assets before claiming the live site is clean.

PUBLIC DOCUMENTATION DESCRIBES CAPABILITY, NOT IMPLEMENTATION.
Image HTTP responses default to sanitized binary artifacts. Explicit JSON contracts
use allowlisted DTOs. Re-encode images before publication; never trust upstream
metadata. Test raw HTTP bodies, headers, errors, async retrieval, and artifacts.

# Incident records and documentation authority

For production failures, start with `post-mortem/CURRENT_STATE.md` and the relevant
failure mode/runbook. Keep observations, containment actions, results and next
steps in the append-only `post-mortem/events.jsonl` journal. Update incident status
and prevention actions in `post-mortem/register.json`; recovery does not imply all
prevention work is complete. Never store secrets or unnecessary user data there.

Reconcile affected guide bodies in full when behavior changes. Preserve historical
evidence as dated records, not current instructions. Root handover/context files
link to the single current-state record. Read `docs/DOCUMENTATION_POLICY.md` and
run `npm run docs:sync` then `npm run docs:check`. Monitored source/guide changes
require an explicit semantic review before refreshing review fingerprints.
Keep `post-mortem/` private and excluded from deployment and browser content.

For ongoing development, run `npm run docs:impact` to identify affected knowledge
domains and inspect unmapped paths. Follow `docs/how-to/change-with-documentation.md`.
Keep ADR decision status separate from delivery evidence; never auto-accept a
decision or refresh review fingerprints during generated-index synchronization.
