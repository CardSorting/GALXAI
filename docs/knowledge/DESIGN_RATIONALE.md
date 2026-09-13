# Knowledge system audit and design rationale

<!-- docs-scope: operational-record -->

Review date: September 13, 2026 UTC. Audience: private GALX maintainers. Scope: repository documentation, discovery, decision lifecycle and maintenance tooling. This record describes a local implementation; it is not a hosted workflow, deployment or production recovery receipt. Actual checks are recorded in [verification evidence](audits/2026-09-13-verification.json).

## Finding and recommendation

GALX needs a reliable path from a maintainer's question to the owning source, current procedure and dated evidence. The corpus already contains extensive technical material and a private incident system. The remaining problem is authority and maintenance: navigation can make an old guide easy to find without making its instructions safe to follow.

Adopt a small docs-as-code knowledge layer over the existing Markdown. Organize discovery by reader task, retain stable paths, connect source domains to canonical guides, separate decisions from delivery claims and make review drift visible. Keep incident runbooks and observations in their established home. This recommendation adapts established documentation patterns to this repository; it does not claim that copying another organization's tooling guarantees a better product.

## Local audit findings

| Finding | Operational consequence | Change |
| --- | --- | --- |
| The architecture page described earlier fixed-price Sites generation as the current path | A maintainer could reason from the wrong billing/admission contract | Reconciled the full Sites section with included generation, account-owned workspace and historical-only settlement |
| The CI specification promised a universal five-stage pipeline, paid inference benchmark and automatic merge | Reviewers could assume unexecuted checks and deployment behavior | Rewrote the specification from the actual workflow files and package scripts |
| Observability documentation named metrics absent from matching source and presented illustrative alert rules as active | An operator could investigate a nonexistent signal or assume detection was installed | Replaced the catalog with actual controller, worker and application telemetry sources; retained alert installation as separate evidence |
| The ownership matrix used different handles from CODEOWNERS and an obsolete edge directory | Review responsibility and source ownership were ambiguous | Linked a generated domain responsibility map, corrected the declared edge paths and explicitly separated roles from verified teams/access |
| Onboarding prescribed fixed test counts, calendar certification and broad benchmark activity | Completion could be confused with competence or authorization | Replaced it with bounded local exercises and evidence-based readiness |
| ADR status prose mixed acceptance, implementation and deployment | An accepted proposal could be read as live behavior | Added independent decision/delivery fields, evidence requirements and reciprocal full-supersession validation |
| A complete catalog existed, but no task-oriented search or change-impact view | Maintainers needed to know filenames and could overlook adjacent guides | Added offline search, domain mapping and explicit unmapped-path output |
| Older subsystem/research material had not all been re-certified | A large index could falsely imply semantic correctness | Preserved reading scopes, defaulted discovery to active guidance and exposed unreviewed domain coverage |

These are source/document comparisons, not production availability measurements. The review did not repeat paid Sites generation, alter developer approvals, inspect private customer feedback or clear deployment storage. Existing unresolved prevention items remain in the incident register.

## Patterns investigated

### Task-oriented documentation: Diátaxis

Diátaxis distinguishes tutorials, how-to guides, reference and explanation according to the reader's need. Its how-to guidance emphasizes a concrete goal and acknowledges that real tasks may branch. GALX uses that separation in navigation while allowing existing component files to keep their paths. Operational runbooks receive an explicit trigger, stop conditions and recovery section within the task-oriented family. This is a local adaptation, not a claim that Diátaxis prescribes our registry or automation. Sources: [Diátaxis overview](https://diataxis.fr/), [how-to guidance](https://diataxis.fr/how-to-guides/).

### Plain conceptual content: GitHub Docs

GitHub's content guidance treats conceptual material as an overview of a topic and its usefulness. It recommends keeping introductory context in task articles brief, with longer explanations separated when useful. GALX follows this by making entry pages answer a task, keeping procedures focused on actions and linking architecture/rationale separately. The goal is less scanning and fewer competing instructions, rather than adding a page for every paragraph. Source: [GitHub concepts content type](https://docs.github.com/en/contributing/style-guide-and-content-model/concepts-content-type).

### Documentation alongside code: Spotify and Backstage

Backstage's official TechDocs announcement describes Markdown documentation close to source and contextual metadata such as ownership. GALX borrows those maintenance and discovery principles through a repository registry and generated domain map. A hosted Backstage installation would add catalog, access and publishing work that this task does not require. The source is an announcement from 2020, used as evidence of the pattern's provenance, not as a current installation guide or feature comparison. Source: [Backstage TechDocs announcement](https://backstage.io/blog/2020/09/08/announcing-tech-docs/).

### Iterative design with ownership: GitLab

GitLab's architecture workflow uses version-controlled design documents, a responsible owner and iterative review. It distinguishes evolving design work from durable decisions and recommends proportional use rather than applying the workflow to every small change. GALX adopts a lightweight owner/decision/runbook link in the PR workflow. It does not copy GitLab's organizational roles, review timelines or communication requirements. A small repair can explain its rationale in the PR; a consequential authority or recovery change needs a decision record. Source: [GitLab architecture workflow](https://handbook.gitlab.com/handbook/engineering/architecture/workflow/).

### Decisions with rationale: MADR

MADR provides a compact Markdown structure for a significant choice: context, alternatives, outcome, consequences and confirmation. Its status field and related-decision links support a decision history. GALX retains existing four-digit ADR IDs and adds machine-checked metadata for new curated records. Separating delivery evidence from decision status, and refusing to infer legacy acceptance, are GALX-specific controls motivated by the local audit. Source: [Markdown Architectural Decision Records](https://adr.github.io/madr/).

### Incident learning: Google SRE

Google's postmortem guidance emphasizes learning from incidents, recording impact and contributing causes, reviewing the record and following through on preventive actions without blaming individuals. GALX's existing private incident system already follows this direction. The knowledge layer links incidents to runbooks, source changes and decisions so that a recovery does not end as an isolated narrative. Sensitive captures remain outside shared records. Source: [Google SRE postmortem culture](https://sre.google/sre-book/postmortem-culture/).

## Information architecture and authority

A reader can start with a task table, browse by content type, search a phrase or inspect a domain. These are views over the same documents. A separate scope marker identifies whether a document is active guidance, a domain reference, a decision, dated evidence, research or a commercial draft. Reader need and authority are independent: a well-written reference can still be unreviewed for current operations.

Existing paths and decision numbers remain stable. Large folder moves would create churn and break historical links without resolving contradictions. New navigation directories supply clear entry points; existing component procedures remain canonical. The generated complete catalog preserves discoverability for the whole corpus. Search omits navigation pages to avoid returning dozens of repeated catalog mentions and excludes historical/research material by default.

The domain registry names responsible roles, source patterns, canonical guides and existing checks. It does not create GitHub teams, production permissions or an on-call roster. Multiple domains can share a guide when they share a contract. Unmapped changed files are reported so that partial coverage is visible. The registry is deliberately small enough to inspect in a code review.

## Rolling development and review

The development loop is discover, map, decide, implement, verify and observe. A source change is linked to the guide explaining its current behavior, the decision explaining a consequential choice and evidence establishing what was exercised. An incident adds a known failure mode, containment/recovery record and owned prevention work. Not every source change requires an incident or new ADR.

Automatic synchronization regenerates indexes and inventories. Explicit review records source/guide fingerprints and a next review date. These operations are separate: a machine can detect changed bytes or a passed date, but it cannot certify that a procedure is true. The guard detects added and removed files matching the configured patterns as well as changed files. Unreviewed domains remain a visible adoption queue, while reviewed domains fail when their recorded coverage drifts.

The earlier critical incident/source review is preserved. Domain review extends coverage without silently claiming that every older reference has been audited. The two scopes are documented in command help and the maintenance runbook. Weekly CI checks reviewed domains for due dates and retains status; it does not rewrite prose, attest reviews, approve a decision or operate production. The local workflow still needs to be pushed and observed before claiming hosted execution.

## Decision and runbook contracts

An ADR answers why a significant choice was made. A current guide answers what to do now. Dated evidence answers what actually happened in an identified environment. Full supersession requires reciprocal links and rejects cycles. Partial supersession stays topic-specific, preserving unaffected decisions. Original reasoning and observations survive corrections; obsolete executable guidance is removed from active procedures.

Standardized runbooks name the trigger, authority, prerequisites, ordered procedure, stop conditions, compatible rollback and acceptance evidence. The initial contract applies to the new registered knowledge and release runbooks. Existing domain/incident runbooks retain their established structure and remain linked; they are not falsely labeled migrated merely because they appear in the catalog. Future maintenance can adopt the template as each procedure is reviewed.

## Validation and residual limits

Adversarial fixture tests must reject false delivery claims without evidence, broken/cyclic supersession, unsafe repository references and stale source reviews. They must show that synchronization preserves review records, that default search excludes old material, and that impact discovery reports unknown paths. Existing incident guards continue to protect append-only history, lifecycle evidence and private publication boundaries. A second audit found that a HEAD-only journal comparison could miss edits already committed in a PR; event-baseline comparison and fetched history now cover that case in CI. A local production build and selected-marker scan exercise the compiled boundary separately.

Structural validation is necessary but incomplete. A file can exist and contain weak evidence; a matching fingerprint can preserve a factual error; a changed dependency can invalidate a claim without touching local source. Scheduled review addresses some of that temporal risk but cannot eliminate it. No SLO, cost saving, performance score, automatic repair or continuous availability guarantee is introduced by this work.

The remaining adoption work is visible in `docs:status`: review additional source domains and reconcile legacy references when those domains change. Follow-up audits should record new findings and evidence rather than editing this dated audit to imply they were known today. The acceptance criterion is a coherent, testable maintenance workflow with honest limits, not a declaration that every historical sentence is now authoritative.
