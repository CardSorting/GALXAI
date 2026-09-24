# Frequently asked questions

<!-- docs-scope: domain-reference -->

Private maintainer answers, reconciled September 15, 2026. [Architecture](ARCHITECTURE.md), [account management](reference/relay-account-management.md) and [current state](../post-mortem/CURRENT_STATE.md) own the complete contracts and latest evidence.

## Is the relay the product API?

No. Product APIs have their own identity, entitlement, ownership and response contracts. Relay administration and transport are private. Use [API base URLs](API_BASE_URL.md) before choosing an endpoint; never forward internal status objects or upstream headers to customers.

## What does the Premium relay handle?

Premium hosts verified paid provider accounts and handles text, Sites and images subject to observed access. GALX customer plans are separate from provider account class. The relay never borrows credentials or falls back to the retained controller.

## Where are accounts managed?

Only main project `mazhcjisettrzbqhorvp` stores canonical account authority, credentials, assignments, lifecycle history and account leases. The Premium execution project stores fixed execution identity/reservations/outcomes only. Open **GALX Monitors → Open Premium** for its fixed management view.

## How do registration and repair work?

Manually sign in inside the owning monitor's desktop, review access and register paused. Later renewal uses explicit **Update saved sign-in → Save new sign-in**. Search, status/health filters and issue ordering identify records that need attention. Rename/remove are central revision-aware commands. Removed unfinished registrations can be restored with new review; removed registered accounts cannot. Files, assignments and history remain retained. See [the operator procedure](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).

## Which key belongs where?

Product keys, own-pool inference keys, operator/viewer/registrar/runtime principals and main-project database/vault authority have distinct scopes. The native launcher uses a one-use ticket; browsers do not receive long-lived service keys. Only central services hold main-project credential authority. Use the [service configuration](runbooks/relay-pool-services.md), not a copied broad controller environment.

## Do healthy status and enabled state mean generation works?

No. Saved state, fresh matching runtime acknowledgment, observed account health and completed provider work are different. Connection loss is unknown health. No issues detected describes available metadata. Latest local acceptance records registration open, execution closed and no registered accounts; real sign-ins and capability qualification remain pending.

## Can work retry or move after failure?

An isolated runtime persists execution identity and binds the central lease before provider I/O. Incomplete work recovered after restart becomes unknown and never redispatches. Receipt/artifact access can be lost with the original engine/epoch even when records remain. Preserve the original operation; no peer or legacy dispatch fallback is permitted. Customer quota/settlement follows its own contract. See [recovery](RELAY_API_REFERENCE.md#request-recovery).

## What happens to the previous controller?

The existing public deployment and original jobs retain their separately documented [legacy operations](maintainers/legacy-federation-operations.md). Its per-account worker containers, maintenance holds, background saved-file bridge and retained-volume receipt exception apply only there. Assigned accounts are excluded from its writers and leases. Local service installation does not claim public application cutover.

## Can users still run agents?

User applications may orchestrate inference and tool-call output under their own authority. The relay does not grant arbitrary model-selected tool execution or create customer workspaces on the operator's device. Preserve public model intent and original operation identity; inspect actual supported client contracts.

## Does BroccoliDB guarantee cheaper or lossless inference?

Representation selection and projections have their own scope and tests. Savings and quality require measured workloads; relay health or a historical benchmark cannot establish them. See [BroccoliDB guidance](broccolidb/README.md).

## Where are incident procedures?

Use [troubleshooting](TROUBLESHOOTING.md), [security](relay-security.md), [inference verification](INFERENCE_PIPELINE_VERIFICATION.md) and the private [incident system](../post-mortem/README.md). Keep dated observations separate from current instructions.
