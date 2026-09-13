# Controller ownership and stale-lock recovery

<!-- docs-scope: current-guide -->

Applies to the single-host supervised federation launcher in [source](../../scripts/run-relay-federation.ts). A lock is an ownership boundary, not a disposable cache. Historical incident PIDs and ports are evidence, never constants to copy into a repair.

## Inspect before changing anything

Identify the configured namespace, supervisor job, controller port and private state directory from the current host configuration. Inspect only allowlisted fields; printing a whole environment or supervisor definition can expose credentials.

Establish all of the following:

- The supervisor is failing before it starts the listener and its private logs identify the lock conflict.
- The PID in the lock is absent. Check process identity/start time if a PID exists; PID reuse, permission errors, inaccessible hosts and malformed locks are ambiguous, not proof of staleness.
- There is no listener on the configured controller port and no other controller owning that namespace.
- Existing worker/desktop resources and durable signing/journal state are inventoried and will be preserved.
- The lock's path, contents and filesystem identity have been captured for a final recheck.

If a controller is live, reconnect to it or diagnose it; do not remove its lock. If ownership cannot be established, stop the lock-recovery procedure and resolve the ambiguity with the host operator.

## Recover a proven stale lock

Choose a unique private archive path under the active incident's ignored `evidence/raw/`. Immediately before moving the lock, repeat process/listener checks and verify the file is still the same file with the same contents. Archive that exact file; do not use broad removal, `rm -rf`, wildcard process kills or delete the state directory.

Allow the existing supervisor to restart. Do not concurrently launch a second controller. A startup race or changed file invalidates the recovery decision; re-inspect instead of forcing it. The September 13 repair used this guarded procedure and preserved running worker containers.

## Verify and record

Verify one current controller PID/lock owner, a stable listener, healthy authenticated discovery and fresh evidence for the requested image capability. Confirm workers remain correctly owned. Then test the product path from the deployed application; localhost health does not establish remote connectivity or generation.

Record the evidence, archived-lock location, actual process identity, untouched resources and acceptance result. A manual recovery is not an automatic crash-recovery feature. Alerting and a supervised crash/restart rehearsal remain tracked follow-ups until implemented and tested.
