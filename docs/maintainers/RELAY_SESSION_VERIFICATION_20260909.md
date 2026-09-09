# Relay session verification — September 9, 2026

<!-- docs-scope: operational-record -->
> Private, dated evidence. This record is not current fleet inventory or a public status page. Use [the contract](../FEDERATION_STRATEGY.md) and [runbook](../RELAY_VNEXT_RUNBOOK.md) for ongoing operation.

## Scope and source revisions

| Revision | Implemented scope |
| --- | --- |
| `929e049` | Repair desktops and credential recovery |
| `00eb977` | Desktop sign-in/setup completion flow |
| `f06a582` | Credential sync and browser-session hardening |
| `4034a8e` | Recoverable sign-in, custom homes, account matching and credential handoff |
| `96ae392` | Isolated enrollment tests, retired bulk imports, preflight and exact fixture cleanup |

These are implementation revisions, not proof that every application, image or running container was replaced. Supporting raw evidence is in the ignored private `.relay/` directory and is not included in public assets or committed as credential-bearing logs.

## September 9 enrollment diagnosis and result

The controller initially reported 12 desired records, one healthy worker and 11 rejected revisions. All 11 rejected rows matched the integration suite's exact fake credential, fixed test tenant and timestamp ID pattern. The suite inherited production configuration and leaked fixtures. Bulk host-cache import had separate validation/overwrite defects; it was not the source of these exact rows.

The historical rejection journal does not retain original HTTP exchanges, so the exact handshake statuses cannot be reconstructed. New real-socket tests establish the current 401-versus-transient classification.

Dry-run identified 11 confirmed fixtures; apply revoked 11 and skipped zero. Encrypted payloads, rows, counters and history were preserved. No schema or RLS changes were made.

After reload the controller reported one desired shard, one healthy worker and zero active rejected records. Five model capabilities were eligible at observation time. A temporary maintenance hold, then explicit resume, preserved the serving container ID/generation and the existing desktop/link. These counts are not a permanent availability guarantee.

## Component deployment boundary

| Component | September 9 evidence |
| --- | --- |
| Host controller | Reloaded updated source under production launchd service on loopback port 3001 |
| Worker image | Updated `galxai-relay:image-frame-fix` image built for future allocations |
| Existing worker | Retained same container/generation; image build did not replace its running image instance |
| Desktop | Existing workspace/home/link preserved; guest helper update and display behavior verified in the session |
| GALX application | Production build passed locally; this enrollment pass did not establish a new application deployment |
| DreamBees | September 8 frame-fix deployment evidenced below; later receipt/client follow-up deployment is not established here |
| Provider account | Working authority retained; no new real account sign-in/import completed |
| Paid Hive | No billing/entitlement change or complete paid-entry verification |

## Regression and browser evidence

- 164 relay, desktop, authorization, adverse-response, public-boundary and real WebSocket tests passed.
- Three storage tests covered create-only enrollment collisions, exact fixture cleanup with busy/rotation protection, and mocked REST fallback conflict handling.
- Real Docker lifecycle canary verified later revocation, restart suppression and cold rejection without allocation. It removed its owned containers and checkpoint volumes.
- Live headless Chrome verified display/link preservation, healthy admissions, anonymous/monitor inability to mutate desktops, no keys in browser storage and renewal invalidating old cookies.
- TypeScript, targeted source lint, application production build, relay image build and static database integrity checks passed. Existing static database advisory warnings remained.
- Broad database tests under production configuration exited before the suite, as required. The full broad suite was not run against production.
- 628 built browser assets and prerendered pages were scanned for selected private markers with no matches. Live anonymous operator entrypoints returned generic connection content.

Evidence names: `enrollment-diagnosis.json`, `enrollment-cleanup-preview.json`, `enrollment-cleanup-applied.json`, `enrollment-deployment.json`, `enrollment-browser.json`, `enrollment-regression.log`, `enrollment-storage.log`, `enrollment-docker-canary.log`, `enrollment-public-scan.json`. Paths are relative to the private ignored `.relay/` directory. A scoped scan does not certify arbitrary future assets or every public origin.

## Desktop and credential-handoff acceptance

The preceding handoff pass exercised durable intent recovery, custom-home selection, rejection of unsafe paths, existing-account matching, device-code rendering/cancel/retry and synthetic successful sync. Seven isolated Python tests passed alongside 144 relay/recovery/security regressions for that revision; these are dated results, not additive requirements for every future change.

Real Docker/Chrome fixtures verified Unicode compose round-trip, cleared drafts, explicit link changes, native controls and response allowlists. Host Axe/overflow checks passed at 1600×1100 and 390×844. A separate disposable desktop initialized and cancelled a real official CLI device challenge without importing credentials.

Evidence: `limits-resolution.md`, `limits-regression-tests.log`, `limits-ux.json`, `limits-deployment.json`, `limits-live.json`, `limits-provider-initialization.json`, `limits-public-scan.json`. Preview cleanup used its isolated test manifest; normal production workspaces retained their manual lifecycle.

## September 8 image-frame evidence

The separate 32 MiB image frame bound repaired a synthetic response over the old 2 MiB limit. After that rollout, the actual DreamBees client returned HTTP 200 in 33,343 ms with a decoded, metadata-checked and visually inspected 2,106,942-byte, 1254×1254 PNG.

- Request ID: `f0c7302a-1d2e-432b-ac08-9784ec2c8848`.
- SHA-256: `59b9d411c0928732a267beefb23bdfea2f97ffe117d5de5ae1af28d477da14b4`.
- DreamBees Cloudflare version: `4de078a7-36bb-4024-8aee-b15a9ed11d8b`.
- Live public image catalog at that observation: `openai-gpt-image-latest`.
- Frame-fix validation at that revision: 73 relay tests, 19 public security tests, production build and isolated three-container canary.
- Retained rollback references at rollout: `galxai-relay:rollback-image-frame-20260908` and `.relay/federation-production/image-frame-before.plist`.

This was image delivery evidence, not full paid-game transaction verification or deployment evidence for the later [ADR 0130](../adr/0130-image-receipts-and-uncertain-outcomes.md) application follow-up. September 7 initial cutover evidence remains in [ADR 0127](../adr/0127-codex-image-tool-alias-production-cutover.md).

## Documentation reconciliation verification

The supporting guides and ADR bodies were reconciled after implementation, including enrollment retirement, desktop/worker separation, maintenance holds, credential synchronization, API access and component deployment status. ADRs 0131–0133 record the new decisions; earlier evidence remains explicitly dated.

Validation passed for 277 documentation files and 133 ADRs, including catalog coverage, scope, local links and current-guide anchors. Current-guide npm script references were checked against package.json. Public documentation checks and 46 authorization/public-response regressions passed, along with the application production build. A scoped scan of 628 rendered pages/browser assets found no selected private operational markers.

Evidence: `docs-sync-public-docs.log`, `docs-sync-boundary-tests.log`, `docs-sync-build.log` and `docs-sync-public-scan.json` under the private `.relay/` directory. The local HTTP regressions required loopback access outside the filesystem sandbox. This documentation pass did not deploy services, mutate registry authority or complete provider sign-in.

## Remaining acceptance boundaries

Actual provider identity approval/MFA remains an operator interaction. Keyring-only sources use file-backed reauthentication, not extraction. Custom homes are supported only inside the isolated guest home. Unrelated accounts require explicit linking to existing eligible authority or separate new-account enrollment.

Private journal and registry updates use recoverable conditional writes, not a distributed atomic transaction. Checkpoint failure remains explicit. Phone-sized automation does not verify physical iOS/Android input. Pixel streaming does not supply guest semantic accessibility. These need actual device and assistive-technology acceptance.

No new live image inference occurred in the September 9 enrollment pass. Process-local receipts do not provide cross-restart exactly-once execution or durable artifact reconciliation. Preserve these boundaries in handovers and release claims.
