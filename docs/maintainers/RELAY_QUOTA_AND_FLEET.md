# Federation fleet and quota

<!-- docs-scope: current-guide -->

Private fleet operations under [the contract](../FEDERATION_STRATEGY.md) and [manual desktop authority](../adr/0152-manual-desktop-only-shard-authority.md).

## Count the right state

Count retained registry records, manually confirmed accounts, desired eligible shards, running workers and repair desktops separately. An unexpired legacy record remains unavailable until explicit desktop confirmation. A running desktop is not inference capacity. A worker serves only its fresh eligible capabilities; unrelated idle models cannot relieve an exhausted pool.

## Add or restore capacity

Manually create a Relay Desktop, complete provider sign-in and choose **Enroll shard**. Confirm an eligible existing account from its matching desktop through the same action. The database binding and enrollment timestamp are required before controller and lease admission. External APIs, CLI imports and credential files cannot add managed capacity.

Worker reconciliation remains automatic after enrollment. Cold inventory preflight precedes allocation. Revision-specific 401 rejection prevents repeated starts; transient inventory failures back off. An empty capability result retains the worker for rediscovery, but grants no requested-model eligibility.

Provider expiry requires manual sign-in in the bound desktop. Enabled saved-file sync or **Check now** validates and persists the replacement login. Neither sync nor worker restart renews provider sessions. Keep the owning desktop home available for repair.

## Holds and quota

Manual holds block admissions and replacement starts while preserving an existing worker for inspection. Revocation, removal, expiry or changed authority still retires the old credential. After a verified refresh, review the hold before explicitly permitting replacement. Resume does not clear quota, rejection or health state.

Provider cooldowns, local concurrency, model evidence and database lease limits are distinct controls. Inspect active work and receipts before changing policy. Never clear counters, manually mark healthy or reopen ingestion to manufacture capacity. Enrollment preserves an existing account's owner, limits, counters, holds and history.

Sites retains its [shared paid-plan policy](SITES_FAIR_USAGE.md). Its daily baseline transitions to continuation, and local outstanding/rolling-attempt limits are not inferred supplier quota. Preserve unresolved receipts and reservations; enrollment, deployment and billing renewal do not erase unknown work.

## Verification

Use [the monitor](../TELEMETRY_AND_OBSERVABILITY.md), [enrollment procedure](RELAY_CREDENTIAL_ENROLLMENT.md) and [current state](../../post-mortem/CURRENT_STATE.md). Historical cleanup counts are observations, not fleet targets. Confirm saved authority, worker application, requested capability and completed inference separately. The September 15 policy rollout did not perform a new manual provider enrollment or restore image generation.
