# Access and documentation failures

<!-- docs-scope: current-guide -->

## FM-ACCESS-001 — rollback or cached state grants unintended access

Images and Sites remain public products with account and ownership requirements. Other developer endpoints require an individually approved account at both the application and API gateway. A payment, API key, signup or user-editable field is not approval. Staff administration uses independent server-side membership. A prior successful deployment can still be an unsafe rollback if it predates these controls.

Preview snapshots and BroccoliDB batching reduce repeated payloads; current database status and expiry remain authorization authority. An outage cannot fall back to a cached grant. Test unapproved, revoked, expired, forged and cross-account access as well as public-product reachability. Follow [preview operations](../../docs/operations/developer-preview.md).

## FM-DOCS-001 — old operational advice regresses a repaired system

The September 13 audit found stale September 11 handovers, the retired no-image-studio product rule, process-local image guidance presented too broadly, incomplete catalog coverage, and a diagnostic recipe that exposed secrets and invoked a mutation script. These are operational hazards even when code is correct.

Current guides must be reconciled in full: replace obsolete commands, conditions, examples, rollout and rollback claims. Preserve original observations in dated incident records. Root handover/context files link to a single current-state record. Historical release observations do not certify current runtime behavior.

`npm run docs:check` enforces catalog coverage, local navigation, incident/action/event references, required evidence for resolved records, protected deployment boundaries and source-bound review fingerprints. `npm run docs:sync` updates generated indexes only; it does not certify a semantic review. Changes to monitored source require explicit review through the [documentation workflow](../runbooks/documentation.md).

The guard is deliberately bounded: it cannot infer every stale statement, prove a service healthy or stop someone bypassing CI. Preserve open issues and verification limits rather than falsely marking everything resolved.
