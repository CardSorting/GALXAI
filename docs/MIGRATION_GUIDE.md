# Migrating to manual desktop authority and capability-aware GALX

<!-- docs-scope: current-guide -->

Private integration and operations guide. [Current state](../post-mortem/CURRENT_STATE.md) records which components are deployed; [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md) defines the current enrollment policy.

## Application clients

Use `https://galx.ai/v1` with the intended application credentials and an entitled public model ID. Developer approval, account identity and plan access retain their own contracts. Clients do not upload provider credentials or enroll shards. Retired connection endpoints return 410; changing authentication or retrying them cannot enable enrollment.

Catalog presence does not prove availability. Preserve operation identity and recovery URLs across uncertain outcomes. Canonical image capability is `openai-gpt-image-latest`; legacy aliases are not independent fallback providers. Default successful image responses are sanitized binary artifacts; explicit JSON uses its allowlisted contract. Verify chat, images, streaming, storage and billing separately, and never automatically repeat uncertain image synthesis.

## Replace external enrollment

Remove API connection calls, CLI add/import recipes, token environment injection and ambient credential discovery from onboarding scripts. Do not replace them with direct inserts or private function calls from general application code.

1. Use the host's **GALX Relay Monitor** desktop shortcut or `npm run relay:desktops`.
2. Manually create a workspace for a new account, or open the existing account's owning desktop.
3. Complete provider sign-in inside that desktop and explicitly choose **Enroll shard**.
4. Review successful authority persistence, the worker-applied revision and fresh requested-capability evidence before sending work.

For an existing eligible record, the same action confirms its account and binding without resetting owner, quota, counters, holds or history. No source label, unexpired token, saved link or workspace name is a grandfathering rule. A record remains excluded until confirmed. Revoked, dead, quarantined, ambiguous and differently bound accounts fail closed.

## Schema and component sequencing

For a target that has not received the policy, follow [the database runbook](maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md) and [enrollment rollout](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md#existing-records-and-schema-rollout). Validate migration `20260914231914` and its rollback on a disposable database, inspect the exact target, then apply only the reviewed version. It preserves records, adds paired enrollment fields and a unique binding, closes external credential writes and gates durable lease admission.

Load compatible controller and application source after the schema. Preserve desktop homes, signing state, holds and admission receipts; establish one supervised controller owner and reconnect browser sessions through the launcher. Application deployment does not upgrade worker or guest images. The [September 15 activation](../post-mortem/releases/2026-09-15-manual-desktop-enrollment-activation.json) is dated evidence for the existing target, not an instruction to reapply it.

## Renew sessions manually

After enrollment, expired provider sessions require fresh sign-in in the same bound desktop. **Check now** and enabled automatic sync validate and persist the saved login; they do not independently renew provider sessions. Changing a local link cannot transfer database ownership. A hold may prevent replacement after credential rotation; review authority before explicitly resuming. Keep the bound desktop home for later repair.

GALX account-session refresh and local administrator browser-session renewal remain independent. Reopening a monitor after controller restart does not refresh the provider credential.

## Migrate a historical shared relay

Drain and stop shared ownership before using the supervised federation launcher. Preserve accepted work and private state; do not run two topologies with the same account. `docker-compose.relay.yml` and arbitrary credential-file workers are not managed enrollment paths. Multi-host ownership requires its own fencing design.

## Verification and recovery

Run [hardening checks](maintainers/RELAY_HARDENING.md), including manual enrollment role/race/rollback and administrator boundary tests, then the production build and applicable raw HTTP/asset checks. Use isolated fixtures for synthetic mutations. Real provider sign-in and completed inference need separate acceptance.

Prefer fixing the restricted path. The manual enrollment DOWN migration restores old grants/functions while retaining provenance columns; it intentionally reopens the earlier boundary and requires a reviewed matching software rollback. Preserve receipts and revocations through any rollback. Do not restore external ingestion merely to make old CLI tools or a historical verifier pass.
