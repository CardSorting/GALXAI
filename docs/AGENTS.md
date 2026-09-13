# Knowledge maintenance instructions

<!-- docs-scope: current-guide -->

This directory is private maintainer knowledge. Apply the root public information boundary to all outputs; never import this corpus into runtime pages, bundles or public documentation.

Start at `docs/README.md`, `docs/DOCUMENTATION_POLICY.md` and `post-mortem/CURRENT_STATE.md`. Use `npm run docs:impact` for each source change; inspect unmapped paths. Reconcile complete affected guide bodies, link the owning runbook and add a decision only when behavior or authority warrants one.

Keep scope markers, existing paths and ADR IDs stable. Preserve dated evidence and original decision rationale. Categorize new documents in the registry/domain map; default legacy entries are unreviewed, not certified. New operational procedures use the runbook template and register their contract. Curated ADR decision status and delivery evidence are separate.

Run `npm run docs:sync`, `npm run docs:check` and `npm run test:docs`. If a source review is stale, inspect the affected source and entire guide before using `docs:review`; never automate an attestation or treat passing navigation checks as a semantic review. Record local verification separately from deployments. Append incident observations and corrections rather than rewriting committed journal history.
