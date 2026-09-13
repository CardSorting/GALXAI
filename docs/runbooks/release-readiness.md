# Prepare and verify a release

<!-- docs-scope: current-guide -->

## Purpose and trigger

Use before releasing a change that affects product behavior or an operational boundary. Owner: release operator with the owning maintainer. Outcome: the intended revision is deployed, its user-visible behavior is verified, and recovery remains possible.

## Authority and prerequisites

Identify the authorized target, component, migration dependencies and known-good recovery revision. Read [current state](../../post-mortem/CURRENT_STATE.md), [deployment boundaries](../DEPLOYMENT.md) and the [CI specification](../maintainers/CI_PIPELINE_AND_AUTOMATION_SPEC.md). A local build or approved ADR is not production authorization or a deploy receipt.

## Procedure

1. Run `npm run docs:impact` and inspect the affected guides and outstanding [prevention actions](../../post-mortem/OPEN_ITEMS.md). Establish acceptance criteria before changing the target.
2. Complete applicable source, authorization, adversarial response and isolated database checks. Run the production build and private asset check when application/public behavior changes. Resolve stale source reviews; run `npm run docs:sync` and `npm run docs:check`.
3. Inspect the component's deployment guide for sequencing. Application, gateway, controller/worker and database state are distinct. Apply only the migrations/configuration and deployment already authorized for the change.
4. Record each actual target/revision and deployment result. Exercise the changed experience using the intended authorization level. For public information claims, inspect live rendered pages, assets, raw responses and relevant artifacts.
5. Update dated current-state evidence with what passed and what was not exercised. Move decision delivery metadata only to the stage supported by evidence. Update incident recovery separately from prevention closure.

## Stop conditions

Stop when a required migration is absent, authority is unclear, a needed check fails, recovery is undefined, or acceptance exposes uncertain side effects. Do not repeatedly regenerate, settle, migrate or redeploy without identifying the original operation and applicable recovery contract.

## Recovery and rollback

Use the component runbook's compatible containment/rollback path. Preserve durable receipts, owned artifacts and unresolved reservations. An older application can reintroduce obsolete billing or permission behavior; confirm compatibility before selecting it. Record containment as such until recovery is verified.

## Verification and evidence

Link actual command results, environment, revision, deployment identifiers, dated acceptance and limitations. The [incident templates](../../post-mortem/templates/incident.md) capture operational evidence. Local checks do not establish live capacity, successful remote CI or continued availability.
