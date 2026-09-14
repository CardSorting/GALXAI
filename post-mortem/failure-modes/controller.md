# Controller availability failures

<!-- docs-scope: current-guide -->

## FM-CTRL-001 — a stale ownership lock blocks restart

On September 13, the existing launch supervisor retried a stopped controller while its old `controller.lock` remained. Worker containers were healthy, but the application could not reach the controlling service. A new application deployment could not correct this host failure. The reproduction also found a separate live-controller failure: the Docker CLI timeout sent a signal but did not prove that the child and its output pipes had terminated, leaving `list()` awaiting a close event.

[The current launcher](../../scripts/run-relay-federation.ts) delegates ownership to a Python guardian, which holds a private kernel `flock` on `controller.guard` and passes the descriptor to the Node controller and Docker subprocesses. The permanent `controller.lock` marker prevents an old launcher from silently sharing the namespace. Normal shutdown closes the descriptor; a crash leaves the kernel lock held by any surviving inherited descriptor until the process group ends. Two simultaneous starts therefore have one owner, and a paused or ambiguous owner causes a bounded `ownership_wait_exceeded` alert instead of takeover.

Containment and recovery require [the guarded ownership procedure](../runbooks/controller-lock.md): inspect the exact supervisor, PID identity, listener and lock, preserve live workers, and archive only a proven stale lock after rechecking it. Missing permission to inspect a process is not proof it is dead. Do not delete `.relay`, restart all containers, rotate credentials, or start a second controller as diagnosis.

Recovery verification includes supervisor stability, one guardian/controller owner, reachability, fresh requested capability and a real application request. Green worker containers or `/health` alone are insufficient. The guardian distinguishes process liveness, controller progress and required capability readiness; missing provider capability logs an alert without triggering an endless controller restart. Docker commands have deadlines and verified child/pipeline cleanup, while uncertain daemon mutations stay in a private journal and block conflicting work until inventory reconciliation. Record the new process and deployment as dated evidence.

Federation workers are created with Docker restart policy `no`, so the lifecycle controller is the single restart authority. A stopped or missing worker is removed, retried with backoff and capped at five attempts in ten minutes; `worker_restart_budget_exhausted` pauses automatic replacement and identifies the private inspection action. An upstream capability outage therefore remains a readiness failure, while a repeatedly dying local worker becomes a bounded operator-visible outage.

The focused reproductions and actual-launcher worker drill are in [controller recovery evidence](../incidents/2026/2026-09-13-image-generation/controller-recovery-verification-20260914.json). Residual risk remains for host reboot, Docker-daemon restart or delayed daemon startup, read-only/full state storage during a live deployment, and rollout of the legacy marker migration. Those operational drills remain open; do not infer their result from the local fixtures or the isolated Docker canary.
