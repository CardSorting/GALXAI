# Isolated account capacity and quota

<!-- docs-scope: current-guide -->

Private fleet operations for [central management](../reference/relay-account-management.md) and [fixed-pool execution](../FEDERATION_STRATEGY.md). The main account lease/budget ledger remains the sole account-capacity authority.

## Count the right state

Count retained accounts, active registrations, registered assignments, enabled accounts, confirmed engines and sign-in desktops separately. Removed records retain history but leave active counts. A running desktop is not execution capacity; a stopped registered-account desktop is not an account failure. Intended model catalogs do not prove account access.

## Add or restore capacity

Open the correct native monitor, create a named registration, manually sign in, Review access and Register account. Premium requires paid provider accounts, Standard free accounts. Registration saves paused. Execution activation and Enable are separate; wait for matching confirmation and qualify workloads. No account can be moved/borrowed between pools.

Expired sign-in requires manual repair in its bound desktop and explicit central save. Restore applies only to removed unfinished registrations and needs new review. Removing a registered account permanently revokes access; it is not a reversible pause. External ingestion, copied profiles and legacy refresh cannot create assigned capacity.

## Holds and quota

New pool Pause saves a new central revision and invalidates old authorization; the runtime stops the old engine. Legacy maintenance holds instead preserve an existing Docker worker while blocking admissions/replacement and apply only to the retained controller. Do not substitute one semantic for the other.

Provider cooldowns, local engine limits, central account leases and product entitlement/fair usage are different controls. Each execution database records identity/outcomes without a second account budget. Standard's idle capacity cannot satisfy Premium work, including during outage. Never clear counters or assert healthy status to bypass a denial.

Sites retains its configured [product fair-usage policy](SITES_FAIR_USAGE.md), separate from provider paid/free class. Preserve uncertain receipts and leases; enrollment, image replacement or billing renewal does not erase accepted work. No automatic image probe runs in isolated mode.

## Verification

Use [health interpretation](../TELEMETRY_AND_OBSERVABILITY.md), [registration](RELAY_CREDENTIAL_ENROLLMENT.md), `relay:local -- verify` and [current state](../../post-mortem/CURRENT_STATE.md). Local boundary checks do not generate content or prove supplier balance. The latest recorded setup had both pools empty with execution closed; manual sign-in and workload acceptance remain separate.
