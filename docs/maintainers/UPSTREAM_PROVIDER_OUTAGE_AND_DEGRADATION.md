# Upstream outage response

<!-- docs-scope: current-guide -->

Private incident procedure. Start with [current state](../../post-mortem/CURRENT_STATE.md), [triage](../../post-mortem/runbooks/triage.md) and the actual owning deployment.

Determine whether the failure concerns the product, central authority, own runtime, account credential, capability or provider. Generic 403/404, timeout and 5xx are not sufficient evidence of permanent account failure. Standard Sites/image/tool denial is intentional and occurs before provider I/O.

Open the fixed monitor and inspect health reason, expiry/cooldown, execution gate, saved/applied revision and epoch. Lost connection means unknown health. Central outage denies grants and renewal; cached projections cannot restore authorization. Preserve peer isolation and model intent. There is no cross-pool or legacy dispatch fallback.

Renew provider sessions manually in the owning desktop and explicitly save the new sign-in. Pause/remove changes central authority and stops the engine/renewal; it does not guarantee upstream session invalidation. Do not clear quota, revive revoked records or force a healthy state from telemetry.

Reconcile accepted/uncertain work by original identity before any new request. Restarted incomplete executions become unknown and cannot redispatch. Artifact access may be lost with the original engine/epoch even when records remain. Use [recovery](../RELAY_API_REFERENCE.md#request-recovery) and [account management](../reference/relay-account-management.md).

For the retained single controller only, [legacy operations](legacy-federation-operations.md) defines revision rejection, maintenance holds, worker lifecycle and signed receipt recovery. Those semantics do not apply to the new runtime. Verify the actual affected client and record remaining prevention work before closing an incident.
