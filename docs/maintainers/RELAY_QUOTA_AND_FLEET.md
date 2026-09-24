# Isolated account capacity and quota

<!-- docs-scope: current-guide -->

Private fleet operations for [central management](../reference/relay-account-management.md) and [fixed-pool execution](../FEDERATION_STRATEGY.md). The main account lease/budget ledger remains the sole account-capacity authority.

## Count the right state

Count retained accounts, active registrations, registered assignments, enabled accounts, confirmed engines and sign-in desktops separately. Removed records retain history but leave active counts. A running desktop is not execution capacity; a stopped registered-account desktop is not an account failure. Intended model catalogs do not prove account access.

## Add or restore capacity

Open the Premium monitor, create a named registration, manually sign in, Connect. Premium requires a verified paid provider account. With the verified automatic policy configured, a new connection enables atomically and its relay activates when ready. Manual installation holds and existing account pauses remain deliberate; wait for matching confirmation and qualify workloads.

Expired sign-in requires manual repair in its bound desktop and explicit central save. Restore applies only to removed unfinished registrations and needs a new Connect check. Removing a registered account permanently revokes access; it is not a reversible pause. External ingestion, copied profiles and legacy refresh cannot create assigned capacity.

## Holds and quota

New pool Pause saves a new central revision and invalidates old authorization; the runtime stops the old engine. Legacy maintenance holds instead preserve an existing Docker worker while blocking admissions/replacement and apply only to the retained controller. Do not substitute one semantic for the other.

Provider cooldowns, local engine limits, central account leases and product entitlement/fair usage are different controls. The execution database records identity/outcomes without a second account budget. Never clear counters or assert healthy status to bypass a denial.

Premium rotates across eligible accounts, retaining each account's bounded slots through completion. It skips live provider cooldowns, rejected/expired credentials and stale model evidence. Repeated central denials back off for 60 seconds up to 30 minutes; an elapsed provider cooldown permits a bounded recovery request subject to the runtime's recovery interval. A busy response is backpressure, not a reason to remove or re-register an account. The monitor displays central health observations, not a live inventory of local idle slots or denial timers. Preserve original request identity and wait before retrying a proven pre-dispatch busy response.

Recovery is gradual: new recovery selections start at least five seconds apart, even if many cooldowns expire together. Healthy accounts keep serving. Repeated quota notices within one job count as one escalation; fresh notices can extend the deadline. Only a successful post-cooldown request clears and checkpoints the failure state when no newer cooldown remains. An older sibling finishing after the wait cannot reopen full capacity; transient-failure cooldowns also survive the local checkpoint. Do not treat the recovery budget as a provider quota, manually reset it or restart to skip waiting.

Premium retains four healthy slots per account and uses exclusion, admission backoff and paced recovery controls. It checkpoints exclusions and confirmed recovery. User continuation follows the [bounded checkpoint contract](../reference/shared-quota-recovery.md), retaining completed tools, original budgets and an explicit capacity-wait deadline. Repeated Continue clicks before that deadline create no model attempts. Submission/observation/subscription work, callback batches and settlement retries have separate bounded admission described in the same guide.

Sites retains its configured [product fair-usage policy](SITES_FAIR_USAGE.md), separate from provider paid/free class. Preserve uncertain receipts and leases; enrollment, image replacement or billing renewal does not erase accepted work. No automatic image probe runs in isolated mode.

## Verification

Use [health interpretation](../TELEMETRY_AND_OBSERVABILITY.md), [registration](RELAY_CREDENTIAL_ENROLLMENT.md), `relay:local -- verify` and [current state](../../post-mortem/CURRENT_STATE.md). Local boundary checks do not generate content or prove supplier balance. The dated current-state record owns account inventory and gates; do not reuse old empty-pool snapshots as live inventory. Provider workload acceptance remains separate.
