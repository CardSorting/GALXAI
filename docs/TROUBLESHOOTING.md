# Troubleshooting

<!-- docs-scope: current-guide -->

Start production incidents with [triage](../post-mortem/runbooks/triage.md) and [current state](../post-mortem/CURRENT_STATE.md). Append observations, containment, results and next steps to the private incident journal. Identify the actual deployed component before applying a procedure.

## Diagnostic order

1. Identify the affected product route, owner, operation ID and original execution origin. For Images/Favorites start with [image recovery](../post-mortem/runbooks/image-generation.md); preserve uncertain requests.
2. For the new local services, open the owning fixed monitor through **GALX Monitors**. Inspect connection, execution gate, runtime freshness, account state and the specific health reason. Use `npm run relay:local -- status` and `npm run relay:local -- verify` when installation is in question.
3. Filter **Accounts → Needs attention**, then inspect the affected account and linked registration. Registration health and running account health are distinct. Search and filters never query the peer pool.
4. Check saved versus applied revision and the owning execution epoch. A saved command or listening monitor is not runtime or provider acceptance.
5. Follow [request recovery](RELAY_API_REFERENCE.md#request-recovery); never replay uncertain work or borrow the peer pool.

## Accounts, registration and monitors

| Symptom | Meaning and next action |
| --- | --- |
| Monitor asks to reconnect | Open its fixed native app for a new scoped ticket; do not paste a key |
| Launcher refuses changed identity/isolation | Inspect the owning VM, daemon, image and firewall; do not bypass the check |
| Connection unavailable / retained snapshot | Restore central/monitor access and Refresh; stale data disables management and is not account failure |
| Execution closed | Expected at latest local checkpoint; finish manual registration and qualification through [service gates](runbooks/relay-pool-services.md) |
| No accounts | Register manually in that monitor; inventory counts cannot infer enrolled capacity |
| Sign-in expired or rejected | Open the owning desktop, sign in again, then **Reconnect → Save new sign-in** |
| Access unavailable / cooldown / repeated failures | Inspect the stated reason and current provider access; do not clear policy or infer permission from chat alone |
| Change unconfirmed | Inspect fresh matching account/credential revision and runtime epoch; saved is not applied |
| `record_changed` | Another update won; keep input, close the dialog, refresh and explicitly retry after review |
| Action response lost | Reconcile the same intent/operation; there is no automatic mutation retry |
| Registration needs attention | Inspect sign-in and desktop state; use Connect account after repair |
| Multiple saved account records match this sign-in | Preserve the desktop/login and registration. Inspect active bindings. Use the owner-authorized legacy retirement procedure only for unused, unbound records; never bypass an assigned or removed account |
| Registered account's desktop is stopped | Normally acceptable; start it only for manual sign-in/repair |
| Removed registration still has a desktop running | Removal is saved; use **Removed → Stop desktop** to finish cleanup |
| Removed unfinished registration is needed again | **Removed → Manage → Restore registration**, followed by a fresh connection check |
| Removed registered account is needed again | It cannot be restored or enabled; do not bypass retained revocation/assignment |
| Standard rejects Sites/images/tool aliases | Intentional pre-provider boundary; submit only supported operations through the appropriate product path |
| Premium text works but images do not | Text does not certify image capability; qualify an explicit Premium request without background probes |
| External connection endpoint returns 410 | Intentional closure; use manual registration, not token imports or a direct database write |

Explicit legacy retirement purges only eligible obsolete credential material and leaves immutable tombstones; see [the retirement contract](reference/relay-account-management.md#retire-obsolete-legacy-credentials). Normal reconnect keeps the same account and its enabled/paused setting. A late rejection of an older credential cannot invalidate a fresh sign-in.

Account removal retains files, encrypted authority and audit/lease history; it is not data erasure or upstream session revocation. Pause stops new-pool account execution and renewal as its revision changes. The legacy hold that preserves a worker is a different operation.

## Execution and product recovery

Central outage or failed grant renewal stops authorization; cached projections cannot restore it. A runtime restart recovers old incomplete work as unknown, never redispatchable. Retained execution records may outlive the original engine's ability to serve artifacts. Resolve the original operation privately and use [resilience guidance](RESILIENCE_AND_DISASTER_RECOVERY.md).

| Product or retained deployment issue | Owning procedure |
| --- | --- |
| Images/Favorites session failure | [Identity failure modes](../post-mortem/failure-modes/identity.md) |
| Accepted image missing / lost acknowledgement | [Image recovery](../post-mortem/runbooks/image-generation.md) |
| Favorite missing after reload | [Image persistence](../post-mortem/failure-modes/images.md) |
| Unexpected model/dimensions | Inspect private execution evidence; public capability does not promise an unverified provider model |
| Existing controller lock, capability pool, held worker or signed job failure | [Legacy operations](maintainers/legacy-federation-operations.md), [legacy API recovery](reference/legacy-federation-api.md#request-recovery) |
| Deployment storage blocks release | [Storage containment](../post-mortem/runbooks/deployment-storage.md) |
| Database test rejects environment | Use a disposable initialized loopback fixture; never disable its production guard |

Database query errors are not global account cooldown evidence. Observation-only telemetry cannot grant admission. Preserve fences, leases, receipts and signing state. Verify actual affected customer behavior before claiming recovery; source, installation and provider acceptance are separate.

## Sites content

Use [Sites recovery](maintainers/SITES_FAIR_USAGE.md#admission-flow-and-recovery). Customer eligibility and fair usage remain separate from Premium provider assignment. Diagnose disabled policy, paid-plan mapping, stale readiness and unavailable authority privately. Customers receive finite plan/retry/unavailability guidance without topology.

A new `rate_limited` response does not consume a message or disable existing-operation recovery. Recover the original receipt; unknown execution is never proof of non-dispatch. Historical wallet receipts retain their accepted contract. Do not invent supplier quota or repeatedly regenerate content to fix readiness.
