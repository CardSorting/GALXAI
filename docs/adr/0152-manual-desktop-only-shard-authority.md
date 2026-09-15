# ADR 0152: Manual desktop-only shard authority

<!-- docs-scope: decision-record -->

Date: 2026-09-14. Decision status: accepted by explicit owner instruction. Delivery: deployed; policy closure verified, manual account sign-in acceptance pending.

## Context

The owner reports that outside enrollment is unstable and sessions expire without a reliable repair home. They require the workspace and schema to accept only shards created manually through the relay operator workspace. This changes the chosen operating policy; it does not rewrite the September 9 finding that eleven specific rejected rows were synthetic test fixtures.

## Decision

Only manually created Relay Desktops may enroll shards. The administrator signs in inside the desktop and explicitly chooses Enroll shard. Creation, polling, linking, host caches, external APIs, OAuth callbacks and CLI add/import cannot enroll. Provider sessions are renewed manually in their bound desktop; automated synchronization only validates and saves a login already present there. Automatic worker reconciliation, inventory, bounded retries and capability gating continue.

The schema adds a unique desktop binding and first-enrollment timestamp. A private no-login writer role owns SQL-only enrollment and compare-and-swap refresh functions. The service role loses insert and generic upsert authority; direct protected-field changes are rejected. General repository saves are policy updates. Lease admission and the controller projection reject unconfirmed records. Database owners remain trusted, and private admin SQL can deliberately assume the writer role for the existing transactional ciphertext rewrap procedure; it preserves plaintext and provenance.

Existing records retain ciphertext, original source labels, ownership, quotas, holds and history. They are not automatically grandfathered. Explicitly confirm a matching eligible account from its manually created desktop. Revoked/dead rows cannot be revived, another desktop cannot steal a binding, and duplicate account matches fail closed. Stopped desktops keep their binding and home; retain them for repair. Losing/deleting the bound home is an administrator recovery incident, not permission to import another login silently.

## Alternatives considered

Retaining CLI-only enrollment leaves credentials detached from their manual repair environment. Refreshing provider token families automatically continues the instability reported by the owner. Adding UI copy without schema enforcement leaves bypasses through generic persistence. The selected approach closes those routes while retaining useful worker recovery.

## Rollout, recovery and validation

Apply migration `20260914231914_manual_desktop_shard_enrollment.sql`, then load the compatible controller and application. Unconfirmed rows receive no new work until the administrator enrolls them. Retain signed receipts and owned state volumes; a lost response never authorizes replay of generation. A saved enrollment with failed local link persistence is recovered by retrying Enroll shard from the same desktop after storage is repaired.

The paired rollback restores previous grants/functions, retains provenance columns and intentionally reopens the older boundary. It requires a reviewed matching software rollback. Prefer repairing the restricted path.

Required checks: role and raw-write denial, anonymous/ordinary/monitor-session rejection, credential JSON rejection, stopped/changed desktop, concurrent enrollment, same-account legacy confirmation, wrong-desktop refresh, revocation, rollback/reapply, full DB suite, production build and rendered/browser artifact checks. Real provider sign-in remains manual; fixture success does not prove image capability or deployed acceptance.

## Dated activation

September 15 UTC: the [activation record](../../post-mortem/releases/2026-09-15-manual-desktop-enrollment-activation.json) verifies the migration, service-role denial, controller reload, preserved desktops/receipts and live closed routes on `galx.ai`. Existing records were not silently confirmed. Actual manual provider sign-in and serving readiness remain operator acceptance; this policy release does not restore image generation.

## Relationships

Partially supersedes [ADR 0133](0133-explicit-validated-enrollment-and-test-isolation.md): external explicit CLI enrollment and the rejection of manual-only credential provisioning no longer apply. Its test isolation, historic findings and automatic worker management remain. Extends [ADR 0132](0132-recoverable-desktop-credential-handoff.md) with an enforced owning-desktop binding and SQL-only write boundary. [Current state](../../post-mortem/CURRENT_STATE.md) and [dated evidence](../../post-mortem/releases/2026-09-14-manual-desktop-enrollment.json) record delivery separately.
