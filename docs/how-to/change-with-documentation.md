# Maintain knowledge with a change

<!-- docs-scope: current-guide -->

Use this procedure for a feature, fix, policy change or documentation repair. Finish with one reviewable diff that explains the resulting behavior and its practical limits.

1. Run `npm run docs:impact` against the working tree, or add `-- --base <base-commit>` for a branch comparison. Inspect unmapped files as well as mapped domains. Add a domain mapping when a new source boundary would otherwise go unnoticed.
2. Read the owning guide, related decision and dated current-state evidence. Confirm whether the trigger changes product access, ownership, persistence, retries, security or deployment. If so, write or extend the appropriate [ADR](../maintainers/ADR_AUTHORING_AND_LIFECYCLE_GUIDE.md); a routine correction can use the PR explanation.
3. Update affected guide bodies, examples, errors, recovery and rollback in full. Preserve dated facts in evidence records. Keep one canonical procedure and link to it from discovery pages. Change public capability documentation separately under the information boundary.
4. If a failure triggered the work, append an observation/action/result/next step to the [incident journal](../../post-mortem/README.md), link the known failure mode and assign remaining prevention work. Do not mark an incident closed while its required actions remain open.
5. Run checks appropriate to the changed boundary. Impact output suggests existing commands; it does not prove they are sufficient or safe to execute against production. Use isolated fixtures. Record command, result, revision or working-tree scope, environment and limitations.
6. Review changed source and canonical guides, then record the necessary [review attestation](../reference/knowledge-commands.md#record-an-explicit-review). Run `npm run docs:sync`, `npm run docs:check`, `npm run test:docs` and `git diff --check`. Fix failures before proposing the change.
7. In the PR, explain the problem, final behavior, relevant decision/runbook and actual validation. For deployment work, follow [release readiness](../runbooks/release-readiness.md). Keep implementation, deployment and acceptance separate.

If an old reference cannot be reconciled in this change, keep it explicitly unreviewed and record the remaining scope in the review queue or incident action. Do not relabel it current to silence a check.
