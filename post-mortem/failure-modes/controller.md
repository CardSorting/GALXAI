# Controller availability failures

<!-- docs-scope: current-guide -->

## FM-CTRL-001 — a stale ownership lock blocks restart

On September 13, the existing launch supervisor retried a stopped controller while its old `controller.lock` remained. Worker containers were healthy, but the application could not reach the controlling service. A new application deployment could not correct this host failure.

[The launcher](../../scripts/run-relay-federation.ts) opens the lock exclusively. Normal shutdown removes it; a crash can leave it behind. The exclusive lock prevents concurrent controllers from claiming the same resources. Removing a live or ambiguous lock is unsafe.

Containment and recovery require [the guarded ownership procedure](../runbooks/controller-lock.md): inspect the exact supervisor, PID identity, listener and lock, preserve live workers, and archive only a proven stale lock after rechecking it. Missing permission to inspect a process is not proof it is dead. Do not delete `.relay`, restart all containers, rotate credentials, or start a second controller as diagnosis.

Recovery verification includes supervisor stability, one controller owner, reachability, fresh requested capability and a real application request. Green worker containers or `/health` alone are insufficient. Record the new process and deployment as dated evidence.

Residual risk: no automatic stale-lock recovery or continuous alert was added in the incident repair. [Open items](../OPEN_ITEMS.md) track a bounded alert and a crash/restart rehearsal that must preserve single ownership, workers and uncertain operations.
