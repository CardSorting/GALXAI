# Incident triage and containment

<!-- docs-scope: current-guide -->

## Start an incident

Use [the template](../templates/incident.md) under `post-mortem/incidents/YYYY/YYYY-MM-DD-short-name/README.md`. Add its ID, category, owner role, severity and status to `register.json`, then append an event to `events.jsonl`. Assign a named responder during an active incident; role labels in historical records do not assert staffing that did not exist.

| Severity | Working definition |
| --- | --- |
| SEV-1 | Core public creation unavailable, unsafe repeated side effects, or confirmed authorization/data-boundary failure |
| SEV-2 | Significant partial failure or capacity/configuration risk requiring containment |
| SEV-3 | Limited impact, documentation defect or prevention work without a current service failure |

These are internal triage labels, not contractual response SLAs. Record unknown blast radius honestly. Incident states are `investigating`, `contained`, `recovered` and `closed`. Recovered means the stated customer path passed; closed additionally requires every follow-up to be completed or explicitly accepted with rationale.

## Diagnostic order

1. Capture customer-visible symptom and UTC observation time. Identify route, deployment, account scope and existing operation ID without recording credentials or unnecessary personal content.
2. Check the actual customer's identity and access boundary. Distinguish invalid credentials, temporary identity unavailability, preview approval and independent staff access.
3. Determine whether work was accepted, claimed, completed, persisted or uncertain. Preserve the same logical operation; do not generate again to “check status.”
4. Inspect only the affected component's private diagnostics: target configuration, durable records, storage, controller reachability and requested capability. No public diagnostics or wholesale object serialization.
5. Apply the narrow containment supported by that evidence. Record the exact resources, intended effect, rollback and result. Keep unaffected products and existing-operation recovery available.
6. Verify the real affected path, then update current state and follow-ups. Record unsuccessful attempts too.

## Containment limits

Never clear all caches/locks, bulk-restart workers, lower authorization requirements, delete receipt/history tables, rerun migrations blindly, or rotate vault roots as generic repair. A maintenance hold is scoped and blocks new admissions/replacements; it does not override revoked authority. Inspect current supervisor shutdown behavior before stopping it, because graceful stop can remove unheld workers.

No blanket image admission kill switch is asserted by this runbook. If preventing new acceptance becomes necessary, choose and review an existing scoped control or prepare a compatible application change; retain authenticated reads/downloads and record that intervention. Do not invent a configuration flag.

## Evidence and communication

Each journal event records observation, action, result and next step plus evidence links. Use precise time when known; preserve date-only source evidence as date-only. Append a correction with `supersedes` for mistakes. Keep user-facing updates about impact and recovery only. Sending external messages requires the existing task's authorization.

For SEV-1, agree an update interval with the incident owner and keep it explicit. The record is updated at each meaningful decision, containment, deployment and acceptance result; no background logger is installed by these docs.
