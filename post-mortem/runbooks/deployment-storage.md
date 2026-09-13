# Deployment storage containment

<!-- docs-scope: current-guide -->

Use for Vercel Deployment Storage or Functions Storage pressure. Capture the team, project, displayed time range, both values and the deployment inventory before acting. A historical accounting total and current stored deployment count answer different questions.

## Plan a bounded cleanup

Inventory all pages of deployments, current project targets and aliases. Identify current production, the immediately usable compatible rollback, active previews and any release required for investigation. Preserve those explicit IDs. A release predating developer gating or durable image retrieval is not automatically a usable rollback.

List only obsolete candidates by exact deployment ID. Recheck the target and aliases before each batch. Use the installed CLI's documented safe removal behavior after inspecting `vercel remove --help`; do not infer safety from age or a broad project-name match. Preserve receipts for every attempted deletion and any failure.

Review retention settings as a separate change. The September 12 settings were one day for production/canceled/errored and seven days for preview, subject to provider exceptions. Those are dated applied settings, not an instruction to reset every project to those values. Avoid unnecessary production redeployments while investigating capacity.

## Verify independently

After cleanup, refresh the full inventory and compare each candidate/preserved ID, serving alias and target. Verify the homepage, Images and Sites are reachable; functional generation is a separate acceptance check when authorized.

Revisit both storage metrics using the same team/date range after provider processing. Record actual values and time. If still blocked, retain the rollback and evidence and investigate the remaining artifact footprint or provider accounting. Do not promise exact reclaimed bytes, immediate reset or a future time without evidence.

The [September 12 incident](../incidents/2026/2026-09-12-vercel-storage/README.md) remains contained with accounting follow-up open. Its old three-deployment inventory must not be copied into current state after newer deployments.
