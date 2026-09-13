# Knowledge commands and metadata

<!-- docs-scope: current-guide -->

Commands run from the repository root using Python 3.11+, Git and npm. The knowledge tooling uses the Python standard library and local files; it makes no network, model or database requests.

| Command | Behavior |
| --- | --- |
| `npm run docs:find -- "image"` | Ranked title/keyword/body search; every query term must match; up to ten results |
| `npm run docs:find -- "image" --history --json` | Include unreviewed references, dated evidence, research and drafts; emit structured results |
| `npm run docs:impact` | Compare working tree with HEAD, including staged changes and untracked files; report mapped domains and unmapped paths |
| `npm run docs:impact -- --base main` | Compare the named commit with the working tree, plus untracked paths; this is not a merge-base comparison |
| `npm run docs:impact -- --files src/lib/images/request-service.ts` | Map explicit paths without inspecting a Git diff |
| `npm run docs:status` | Report reviewed, unreviewed, stale and due domains with owner role and next review date |
| `npm run docs:status -- --fail-on-due --fail-on-unreviewed` | Nonzero exit for missing, stale or due domain reviews; use `docs:audit` to validate evidence too |
| `npm run docs:status -- --markdown` | Render domain state, owner and deadline as a GitHub job summary |
| `npm run docs:sync` | Regenerate knowledge views, incident navigation and full inventory; does not change reviews |
| `npm run docs:check` | Validate scopes, links, coverage, ADR IDs, metadata, registered runbook sections, evidence, incident lifecycle, generated views and source fingerprints |
| `npm run docs:audit` | Run `docs:check` plus the complete/current review gate; matches the weekly audit policy |
| `npm run test:docs` | Exercise guards in disposable fixtures, including invalid lifecycle and private content cases |
| `npm run docs:check:build` | Inspect an existing production build for selected private markers and private directory traces |

## Record an explicit review

After reconciling the complete canonical guides with the relevant source contracts, retain a dated evidence record naming inspected paths, actual checks, corrections and remaining limits. Then record a bounded review:

```sh
npm run docs:review -- --domain knowledge --reviewer "maintainer-role" --note "Describe sources and complete guides inspected" --review-by 2026-09-20 --evidence docs/knowledge/audits/2026-09-13-domain-reviews.json
```

Choose a future review date appropriate to the risk; the example date and evidence path are illustrative, not permission to reuse old evidence for a new review. `--evidence` can be repeated. The command fingerprints matched source files and guides, including additions/deletions on later checks, and hashes the retained evidence. Evidence edits invalidate the attestation; preserve dated records and create a later one. The broad inventory detects changes but does not establish an exhaustive module audit. The command does not regenerate navigation or approve deployment. Other stale domains stay stale.

The critical incident/source guard has its own fixed watch set in `scripts/verify-post-mortem.py`. After reviewing that complete affected set, use:

```sh
npm run docs:review -- --reviewer "maintainer-role" --note "Describe the critical source and guide review"
```

This preserves the existing incident review contract. It does not stamp all knowledge domains reviewed. Neither `docs:sync` nor CI invokes either attestation command.

## Registry schema

[registry.json](../knowledge/registry.json) version 1 owns domain IDs, responsible roles, source glob patterns, canonical guide paths and existing npm check names. `require_domain_reviews` and `require_review_evidence` enforce complete attestations and retained evidence. Patterns use repository-relative paths; use `**/*.ts` for recursive TypeScript ownership. Multiple domains may share a guide. Unmatched changed paths are shown explicitly.

Document overrides assign content kind and search keywords. Scope markers still govern reading authority. All docs Markdown is cataloged; uncategorized legacy content is labeled unreviewed. Navigation pages are omitted from search to avoid repeated catalog hits. Default search includes current guides and explicitly accepted curated decisions; an accepted decision still has separate delivery status.

Curated decision metadata contains `status`, `delivery`, `domain`, `owner`, `date`, `evidence`, and optional `supersedes`/`superseded_by`. Deployment/verification additionally requires `target`, `revision` and `observed_at`. The validator checks existence and structure, not the truth of an evidence claim. Legacy decision status is not inferred from file numbering or optimistic prose.

Registered standardized runbooks require purpose/trigger, authority/prerequisites, procedure, stop conditions, recovery/rollback and verification/evidence sections. Templates are illustrative and not registered executable runbooks.

## Failure interpretation

A stale generated view needs regeneration. A stale review needs semantic inspection before attestation. A due review needs renewed inspection even without source changes. A registered domain without a review fails the audit; retain evidence and perform the review. Missing or changed evidence requires investigation and a new attestation supported by actual review. Broken references must be corrected at the owner. Unmapped paths and unreviewed historical references still require judgment; passing checks cannot certify the entire corpus.
