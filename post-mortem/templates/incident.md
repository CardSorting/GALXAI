# Incident title

<!-- docs-scope: operational-record -->

Template only. Replace all placeholders when creating a record.

## Impact and scope

Incident ID, severity, category, owner, detection time, affected product/accounts, observed duration and unknowns. No inferred user count or invented start time.

## Evidence and timeline

Link the journal event IDs and reviewed evidence. Distinguish facts from hypotheses and failed attempts from successful recovery. Record source revision/dirty-tree state, deployment IDs, migration versions and component process observations separately.

## Cause and contributing conditions

Explain the actual failing path and why existing checks did not detect it. Preserve uncertainty when evidence does not establish causation.

## Containment and recovery

Exact authorized resources and actions, retained state, rejected unsafe alternatives, rollback boundaries and observed results. Never include credentials, signed URLs or raw user data.

## Verification and limits

Relevant regression tests, actual-client acceptance, artifact and authorization checks, public response/asset scan scope, and untested scenarios. A green build does not establish deployment or user success.

## Prevention and closure

Link failure-mode IDs and follow-up action IDs from the register. Each action needs ownership, review date and measurable closure evidence. State whether service recovery is complete and what remains open.
