# Migration to central accounts and isolated relays

<!-- docs-scope: current-guide -->

Private migration guide. [Current state](../post-mortem/CURRENT_STATE.md) records delivery; [ADR 0153](adr/0153-central-account-authority-isolated-relays.md) records the decision separately from acceptance. The full target contract is [account management](reference/relay-account-management.md).

## Application clients

Clients keep the entitled public model/API contracts and their application credentials. They never upload provider credentials, choose an internal account or enroll a relay. GALX customer plan and provider account class are separate. Retired connection endpoints return 410. Catalog presence does not establish availability; canonical image capability remains `openai-gpt-image-latest`, without an unverified provider-model promise.

Preserve operation identity and original recovery URLs. Default image responses are sanitized binary artifacts; explicit JSON uses allowlisted fields. Verify chat, images, streaming, persistence, ownership and billing independently. An uncertain response is not permission to repeat synthesis.

## Target authority and ownership

The main project `mazhcjisettrzbqhorvp` alone owns canonical accounts, encrypted credentials, exclusive pool assignment, lifecycle history and the existing account lease ledger. Premium's `prgjcyokylzcsqrjmkaa` holds only fixed execution identity and execution records. There is no copied registry or second account budget.

Premium contains verified paid provider accounts and supports text, Sites and images. Its VM, daemon, disk, monitor and scoped secrets are isolated from the central service; the local Mac administrator remains trusted. Legacy admission/writers reject assigned accounts. No automatic classification, transfer, borrowing or failover is supported.

## Schema and component sequencing

Follow [database operations](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md#central-relay-authorization-and-execution-projects). Central foundation, authorization, legacy-assignment guard and account-management migrations are applied centrally; each execution project has only its execution schema. The manual-desktop policy remains the base provenance boundary. Do not reapply dated migrations or restore broad credential writers to make an older tool work.

Use [service installation](runbooks/relay-pool-services.md) for exact image pins, component secret files, local verification and gates. The installed local layout uses Docker Desktop for central HTTPS and one Premium Colima profile for execution. No cloud deployment is needed for this selected layout. Preserve homes, assignments, journals, leases, execution rows and signing state across updates.

## Replace external enrollment

Remove token imports, ambient credential discovery, application connection calls and direct registry insert recipes. For the new services:

1. Configure verified automatic activation once through the [installation procedure](runbooks/relay-pool-services.md), before onboarding.
2. Open the fixed **GALX Premium** monitor, choose **Connect account**, prepare its desktop and manually sign in with a paid provider account.
3. Choose **Connect account** to verify and register. A new connection enables atomically and its own ready relay activates automatically; manual holds preserve paused state.
4. Wait for a fresh matching applied revision. Existing deliberately paused accounts still require Enable; new connections activate automatically. Verify actual requested capabilities separately.

No label, existing token or desktop file establishes assignment. A conflicting, removed or differently bound account cannot be revived or moved by registration. Use [manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) for the full procedure.

## Renew sessions manually

In the owning monitor open the account's desktop, complete fresh provider sign-in, then choose **Reconnect → Save new sign-in**. Review and commit are explicit; the new services do not use the legacy background saved-file bridge. A saved revision, a matching runtime acknowledgment and successful inference are separate observations. Monitor reconnection and GALX account-session renewal do not refresh provider credentials.

Rename, health filtering and removal use the central revision-aware management contract. Unfinished removed registrations can be restored with a new review. Removed registered accounts remain revoked and cannot be restored; files and historical authority are retained. See [account management](reference/relay-account-management.md).

## Application cutover and recovery

The latest local acceptance records registration open, execution closed and zero registered accounts. Real manual sign-ins, capability qualification, activation and public application cutover remain pending. The existing public deployment still uses its retained federation path; its [legacy enrollment procedure](maintainers/legacy-desktop-enrollment.md) applies only to eligible unassigned records.

After local qualification, configure the server-only isolated transport and Premium endpoint/key using the service runbook. Premium handles text, Sites and images. The isolated path bypasses application credential selection and duplicate account lease acquisition, while customer quota/fair usage remains independent. A cloud-hosted application cannot reach the Mac's loopback endpoint directly.

Keep original receipt origins/readers for accepted legacy work. Close the new gates before rollback; preserve central records and execution evidence. Management rollback does not undo revocation. Never reopen external ingestion, borrow an account or redispatch uncertain work to restore availability. Run the relevant [hardening checks](maintainers/RELAY_HARDENING.md), production build and public authorization/response checks for any runtime cutover; documentation changes alone are not deployment evidence.
