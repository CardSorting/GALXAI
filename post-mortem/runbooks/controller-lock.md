# Controller ownership and stale-lock recovery

<!-- docs-scope: current-guide -->

Applies to the single-host supervised federation launcher in [source](../../scripts/run-relay-federation.ts) and its [local guardian](../../scripts/relay-controller-supervisor.py). `controller.guard` is the kernel-held ownership boundary. `controller.lock` is a permanent compatibility marker for old launchers, not a lease and not a file to delete. Historical incident PIDs and ports are evidence, never constants to copy into a repair.

## Inspect before changing anything

Identify the configured namespace, supervisor job, controller port and private state directory from the current host configuration. Inspect only allowlisted fields; printing a whole environment or supervisor definition can expose credentials.

Establish all of the following:

- The supervisor is failing before it starts the listener and its private logs identify the lock conflict.
- The PID in the lock is absent. Check process identity/start time if a PID exists; PID reuse, permission errors, inaccessible hosts and malformed locks are ambiguous, not proof of staleness.
- There is no listener on the configured controller port and no other controller owning that namespace.
- Existing worker/desktop resources and durable signing/journal state are inventoried and will be preserved.
- The lock's path, contents and filesystem identity have been captured for a final recheck.
- The guardian's private events identify whether the block is `ownership_wait_exceeded`, `legacy_ownership_requires_review`, `restart_budget_exhausted`, `event_loop_stalled`, `controller_progress_stalled` or `termination_unproven`. Inspect the blocked stage before changing anything.

If a controller is live, reconnect to it or diagnose it; do not remove its guard or marker. If ownership cannot be established, stop the lock-recovery procedure and resolve the ambiguity with the host operator.

## Automatic recovery for the new launcher

The launcher starts one Python guardian. The guardian opens `controller.guard` and takes an exclusive `flock` before it starts the Node controller. The descriptor is inherited by the controller and its Docker subprocesses, so a crashed guardian or delayed child cleanup continues to block a contender until the old process group is gone. The guardian kills the group with bounded escalation, verifies the child and group have ended, then closes its descriptor. launchd is the only restart authority for the controller; the guardian never starts a second controller.

On a controller crash, let launchd retry. A replacement may acquire the guard only after the old authority has ended. The `supervisor-attempts.json` budget stops a repeated failure storm. `event_loop_stalled` and `controller_progress_stalled` are distinct alerts; a quiet long-running request remains healthy because progress heartbeats are independent of request output. `termination_unproven` is a bounded failure: the guardian retains the guard and requires operator inspection.

## Legacy marker or ambiguous ownership

The first new-launcher start creates `controller.lock` with the exact marker `{"format":"galx-local-flock-v1"}`. If an old PID marker, malformed metadata, an inaccessible process or an unsupported filesystem is present, the guardian emits `legacy_ownership_requires_review` or `guardian_failed_closed` and exits without takeover. Do not archive or delete that marker until the old controller, process group, listener and state have been checked. After a one-time, reviewed migration archive, start only the new supervised launcher and verify `authority_established`. Never run old and new launchers against the same namespace.

## Recovery when the new guard is proven unowned

The new launcher should recover without manual lock deletion. If the guardian reports an ownership or filesystem failure and a manual migration is explicitly authorized, choose a unique private archive path under the active incident's ignored `evidence/raw/`. Immediately before moving only a reviewed legacy marker, repeat process/listener checks and verify the file is still the same file with the same contents. Archive that exact file; do not use broad removal, `rm -rf`, wildcard process kills or delete the state directory.

Allow the existing supervisor to restart. Do not concurrently launch a second controller. A startup race or changed file invalidates the recovery decision; re-inspect instead of forcing it. The September 13 repair used the older marker procedure and preserved running worker containers; the new guardian drills now cover crash recovery without marker deletion.

## Verify and record

Verify one current guardian/controller owner, a stable listener, healthy authenticated discovery and fresh evidence for the requested image capability. Confirm workers remain correctly owned and adopted when their authority remains eligible. Under [manual enrollment](../../docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), zero confirmed accounts legitimately means zero admitted workers; a retained legacy row or valid token does not justify deleting locks, importing credentials or restarting repeatedly. Explicitly enroll from the owning desktop and verify capability separately. Then test the product path from the deployed application; localhost health does not establish remote connectivity or generation.

Record the evidence, any archived legacy marker, actual process identity, untouched resources, blocked stage and acceptance result. The isolated guardian and actual-launcher drills are retained in [controller recovery evidence](../incidents/2026/2026-09-13-image-generation/controller-recovery-verification-20260914.json); the [acceptance audit](../incidents/2026/2026-09-13-image-generation/recovery-acceptance-audit-20260914.json) records the pre-rollout reconciliation; the [historical ACT-019 rollout record](../incidents/2026/2026-09-13-image-generation/act019-rollout-verification-20260914.json) records the intermediate cutover; and the [deployed ACT-019 acceptance](../incidents/2026/2026-09-13-image-generation/act019-deployment-acceptance-20260914.json) retains dated artifact, ownership and canary observations. [Current state](../CURRENT_STATE.md) identifies later policy deployment and outstanding acceptance; the September 14 canary does not prove current image readiness. A listener or live PID is not required-capability readiness: if registry discovery is unavailable, keep admission blocked and report the bounded dependency refusal. Docker-daemon restart, host reboot, delayed daemon startup and retained-state restoration remain open operational drills; a passing local process fixture does not certify those environments.
