# System topology and maintainer onboarding

<!-- docs-scope: current-guide -->

Start with [current state](../post-mortem/CURRENT_STATE.md), [architecture](ARCHITECTURE.md), [central management](reference/relay-account-management.md) and [local service operations](runbooks/relay-pool-services.md). This guide is private. Installation, execution activation, real provider qualification and public application cutover are distinct checkpoints.

## Follow a request

Trace verified customer identity and entitlement to one server-selected destination. Text uses the configured pool; Sites/images use Premium. Each runtime receives only its assigned accounts and persists execution state in its own project. A central account lease is acquired and bound before provider I/O. No cross-pool or legacy failover occurs. Retain original operation identity during recovery; public output contains allowlisted fields and sanitized artifacts only.

## Follow an account

Accounts, credentials, assignments and lifecycle history live only in `mazhcjisettrzbqhorvp`. Open **GALX Monitors**, then the fixed Premium or Standard monitor. Premium requires a paid provider account; Standard requires a free one. Create a named registration, sign in manually in its desktop, then **Connect account**. The verified automatic policy enables the new connection and activates its own ready relay. Existing deliberate pauses and installation holds are preserved. Customer subscription is not provider classification.

Use **Manage** to rename or remove. Rename updates linked account/registration names together. Removing a registered account permanently revokes access and retains history; unfinished registrations can be restored from Removed with a new review. Stale revisions require refresh, and a lost response requires inspecting the saved outcome.

## Follow a repair

Use account Health and Registration filters to locate the issue. Sign-in expiry, cooldown, repeated failure, unconfirmed updates and unknown connectivity have different actions. Open the matching registration and owning desktop for manual sign-in, then explicitly review/save the new sign-in. A stopped desktop does not mean the registered account is unhealthy.

A removal that could not stop its desktop offers **Removed → Stop desktop**. Never delete homes, clear central records, reassign an account across pools or import credentials as a shortcut. Registry and retained request history survive recovery.

## Practice and evidence

The central authority is on Docker Desktop; each pool has its own Colima VM, Docker daemon and execution database. The two VMs share a trusted physical Mac. The runtime has no daemon socket or main database/vault authority. The owning monitor has the daemon access required for its desktops. Run `npm run relay:local -- verify` for actual local isolation checks; it does not generate content or activate execution.

Use disposable database and synthetic monitor tests for mutations. Ordinary GALX authentication, preview approval and inference keys do not authorize monitor administration. Existing legacy controller/desktops remain governed by [legacy operations](maintainers/legacy-federation-operations.md) and cannot administer assigned pool accounts.

Read the [registration guide](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [desktop guide](maintainers/RELAY_DESKTOPS.md), [request recovery](RELAY_API_REFERENCE.md#request-recovery) and [security](SECURITY.md) before changing their boundaries.
