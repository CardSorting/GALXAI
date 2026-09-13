# Vercel storage cleanup — September 12, 2026

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->

Private operational record. Cleanup and retention changes were applied to the existing GALXAI project. The usage dashboard has **not yet shown either metric below its 10 GB allowance**.

## Follow-up cleanup: three deployments remain

On the user's further instruction to clear old deployments, another 18 superseded production releases were removed. The final active inventory is **three deployments**: current production, the immediately previous successful production release for rollback, and the preview with an active branch alias. Combined with the initial cleanup, 133 deployments have been removed from the original inventory of 136.

The 18 explicit IDs were removed with `vercel remove --safe`. A refreshed API inventory confirms every planned deletion, all three preserved deployments, unchanged project targets, and unchanged mappings for all six aliases. Retention and resource configuration remain unchanged. The homepage, `/sites`, and `/images` again returned HTTP 200. No storage quota reset has been verified.

Follow-up evidence: [before](follow-up/before.json), [plan](follow-up/cleanup-plan.json), [receipts](follow-up/cleanup-receipt.json), [after](follow-up/after.json), and [verification](follow-up/verification.json).

## Initial cleanup

- Removed 115 obsolete deployments: 75 superseded successful production releases, 39 canceled builds, and one unaliased failed preview.
- Reduced the active deployment inventory from 136 to 21: 20 successful production releases and one aliased preview.
- Preserved the current production deployment, every active alias, every project target, and all deployments less than 24 hours old. Each cleanup batch used explicit deployment IDs and Vercel CLI `remove --safe`; the production target was checked before each batch.
- Changed this project's retention from 30 days for every category to one day for production, canceled, and errored deployments, and seven days for previews. The saved configuration was verified through the API.

Vercel's [retention exceptions](https://vercel.com/docs/deployment-retention#exceptions-to-the-retention-policy) protect recent successful releases and active aliases. A one-day policy is an eligibility threshold, not a promise that every older deployment disappears after 24 hours.

## Verification

- All 115 planned removals are absent from the refreshed inventory; all 21 retained IDs remain.
- All six alias mappings and the production target are unchanged.
- The production deployment remains `dpl_DqEAMRCsAG6zxbPAcjeFcPeL6APP`, serving commit `022a37638ac01f1b021c93ca0e48ea7a1f20c7d7`.
- The live homepage, `/sites`, and `/images` each returned HTTP 200 after cleanup. These are availability checks, not a complete functional or security audit.
- No application code, function configuration, domains, or plan were changed. No new build or deployment was created for this task.

## Remaining accounting limitation

The post-cleanup Vercel dashboard still reports **11.1 GB Deployment Storage** and **10.06 GB Functions Storage** for its Last 30 Days view, labeled August 13, 9pm–September 12. These totals have not been verified below quota.

Vercel [measures storage over time using daily maximum stored amounts](https://vercel.com/docs/deployment-storage#pricing). Cleanup does not undo usage already recorded for the displayed period. Deployment deletion also has a recovery lifecycle. No exact number of reclaimed bytes or quota reset time is established by this audit.

Follow-up verification should compare both metrics over the same team and date range after Vercel processes the cleanup. The [storage optimization guide](https://vercel.com/docs/deployment-storage/optimize) recommends reviewing retention first, then investigating remaining per-project output. Escalate persistent quota restrictions with the evidence below; do not repeatedly remove protected rollback releases just because historical totals remain visible.

## Evidence

- [Before inventory](before.json)
- [Explicit cleanup plan and preserved deployments](cleanup-plan.json)
- [CLI deletion receipts](cleanup-receipt.json)
- [After inventory and saved retention configuration](after.json)

Snapshots contain allowlisted operational metadata. Credentials and environment-variable values are excluded. This record and its snapshots now live under `post-mortem/`, excluded from Vercel uploads and Docker build contexts.
