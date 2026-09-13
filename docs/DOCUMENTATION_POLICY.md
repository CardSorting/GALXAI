# Documentation authority and maintenance

<!-- docs-scope: current-guide -->

Private maintainer policy, reconciled September 13, 2026. Public documentation describes capability and customer contracts under [AGENTS.md](../AGENTS.md); it must not expose operational topology, credential sources, routing or diagnostics.

## One source for each kind of truth

| Question | Authority |
| --- | --- |
| What is the intended product/access scope? | [PRODUCT.md](../PRODUCT.md), [product strategy](PRODUCT_SURFACE_STRATEGY.md), current user instructions |
| What does code do? | Owning source and tests, with topic-specific ADR precedence |
| What was deployed and actually verified? | [Current state](../post-mortem/CURRENT_STATE.md) and linked dated component evidence |
| How do we investigate or contain a failure? | [Post-mortem runbooks](../post-mortem/runbooks/triage.md) and the owning component guide |
| What happened and what remains unfinished? | [Incident register](../post-mortem/INCIDENTS.md), [rolling log](../post-mortem/ROLLING_LOG.md), [follow-ups](../post-mortem/OPEN_ITEMS.md) |
| Where is every guide? | [Complete docs catalog](CATALOG.md) and [workspace inventory](../post-mortem/documentation-inventory.json) |

Source presence is not deployment. A deployment ID is not acceptance. An old successful test is not continuous availability. Current state includes the observation date, target and limitations; root handover/context files link to it rather than maintaining competing summaries.

## Scope categories

`current-guide` contains active instructions within its stated component. `domain-reference` describes a subsystem and needs source review before reuse outside that domain. `decision-record` retains rationale and topic-specific supersession. `operational-record` is dated evidence. `research-reference` and `commercial-draft` do not establish runtime guarantees, pricing commitments or live product behavior.

Every Markdown file under `docs/` and `post-mortem/` has exactly one scope marker. The generated workspace inventory also classifies root guides, private research, source design notes, simulations and test outputs. Entries labeled unreviewed are discovery aids, not newly certified guidance. Installed skills, dependency trees, generated builds and tool caches are excluded from the authored-document inventory.

## Reconcile whole documents

When behavior changes, update affected status, body instructions, examples, error/recovery guidance, rollout, rollback and navigation together. Remove obsolete actionable recipes. Adding a successor banner above contradictory commands is insufficient.

Preserve original measurements, incidents and release facts as dated evidence. Old links can remain concise redirects to the canonical record. Do not rename observations as current, erase failed tests, invent timing/blast radius, or replace historical limits with later results. Topic-specific ADR updates must explain which previous decision they supersede.

Private incident captures belong in `post-mortem`. Allowlist evidence fields and omit credentials and unnecessary user data. Raw captures remain ignored local evidence; public pages and application imports cannot read the incident directory. Deployment exclusions are defense in depth, not permission to put secrets into Git.

## Enforcement and review

`npm run docs:sync` regenerates navigation and inventories without certifying a review. `npm run docs:check` validates complete docs coverage, scopes, local links, ADR numbering, incident references, recovery/closure evidence, generated-view freshness and private deployment boundaries. It also checks the source/guide fingerprints named by the incident review policy.

After semantic review of a monitored change, record an explicit dated attestation with `npm run docs:review -- --reviewer "name-or-role" --note "What was reviewed"`. This refreshes fingerprints, not evidence of runtime success. The guard detects changed monitored files and additions matching the monitored patterns; it cannot infer all stale prose or prevent a deliberate bypass. Review broader component references as part of their changes.

Update incidents at each meaningful action and acceptance result. Review open prevention work weekly and before relevant releases. Overdue domain reviews fail `npm run docs:audit` and documentation CI, never silently become complete. Record local validation separately from hosted execution using the [weekly audit runbook](runbooks/weekly-knowledge-audit.md).

## Knowledge lifecycle

Use [task-based navigation](README.md), [domain ownership](knowledge/DOMAINS.md) and the [change workflow](how-to/change-with-documentation.md). Content type describes a reader need; scope describes authority. These are separate axes. A tutorial teaches, a how-to accomplishes a task, a runbook handles an operational trigger, reference supports lookup, and explanation gives context. Decisions and evidence retain their own lifecycle.

The knowledge registry adds explicit source-to-guide mappings and domain review fingerprints to the existing critical incident review. All registered domains require reviews backed by retained, hashed evidence; missing reviews, evidence drift and source drift fail validation. Due reviews also fail every documentation CI event. Evidence must distinguish canonical-guide/source-contract inspection from the broader fingerprint inventory and state test coverage and remaining limits. Search excludes historical/research material by default. See [knowledge operations](knowledge/README.md) and [command reference](reference/knowledge-commands.md) for exact scope and limitations.

For new decisions, separate accepted intent from local implementation, deployment and verified acceptance. Preserve original rationale; use a successor for a changed choice, with topic-specific partial replacement when needed. Machine metadata does not retrospectively certify legacy ADRs. Current guides are rewritten coherently when behavior changes; historical evidence is never presented as a fresh observation.
