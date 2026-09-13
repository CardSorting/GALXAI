# Subsystem responsibility and reviewers

<!-- docs-scope: current-guide -->

The [generated domain map](../knowledge/DOMAINS.md) is the source-to-guide responsibility catalog. [registry.json](../knowledge/registry.json) owns domain roles, source patterns, canonical guides and relevant checks. `npm run docs:impact` reports the affected domains and unmapped paths for a change.

A responsible role identifies who should investigate and maintain guidance. It is not a staffed on-call schedule, a production permission or a verified GitHub team. Record the actual incident owner in the incident register.

## Repository review declarations

[CODEOWNERS](../../.github/CODEOWNERS) declares repository review handles. It currently separates core architecture, security/auth, BroccoliDB, evaluation, routing/SRE, edge, API gateway, database, developer experience, UI and strategy paths. GitHub team membership, accessibility and branch protection require separate verification; this guide does not certify them.

Keep path changes in CODEOWNERS and source patterns in the knowledge registry in the same diff. The edge source is `src/workers/cloudflare/` and `workers/`; the obsolete `cloudflare-edge/` declaration has been replaced. More-specific CODEOWNERS entries follow the global default.

## Resolve an ownership gap

Inspect the nearest owning source and existing CODEOWNERS declaration. Assign a responsibility role in the registry without inventing a team or granting access. Select the canonical guide and known relevant checks, then run `npm run docs:impact -- --files <changed-path>` and `npm run docs:check`.

If several domains share a contract, link the same canonical guide in each domain. Avoid duplicating instructions to make a matrix appear complete. Unmapped files remain explicit in impact output; the tool does not silently claim coverage.
