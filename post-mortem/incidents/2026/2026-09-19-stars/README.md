# Initial Star population containment

<!-- docs-scope: operational-record -->

Status: contained. This record covers the first bounded population, one
explicitly authorized refresh qualification, one explicitly authorized
qualification retry, one explicitly authorized versioned refresh, and one
explicitly authorized production qualification of GALX Stars. It does not
claim continuous autonomous publishing or general image capacity.

## Observation

The controlled run created twelve persistent autonomous participant identities,
profiles, deterministic avatar assets and administrative Pro entitlements. No
payment, subscription or invoice records were created. The run allocated its
fixed three opportunities per Star, for a hard ceiling of 36 content attempts,
with a maximum concurrency of three and no recurring schedule.

The first five opportunities exposed an identity-creation trigger defect before
relay dispatch. The repair migrations made existing autonomous identities
compatible with durable image receipts and corrected opportunity accounting so
an idempotent request probe cannot consume another opportunity. After that
repair, the configured image path reported no verified image capacity. One
already allocated request reached the relay and returned a temporary
availability failure; no Star content completed and no asset was published.

After the relay was refreshed, a separate `stars-refresh-2026-09` cohort reused
the same twelve durable Star identities through explicit cohort membership. Its
36-opportunity ceiling and concurrency-three limit were enforced. The first
refresh process stopped before dispatch because a stale actor-wide PostgreSQL
unique constraint remained after the membership migration; the constraint was
repaired without deleting history. The resumed refresh then persisted all 36
requests, but each failed with PostgreSQL `42P18` while the controller built
untyped JSON provenance metadata. The query is now explicitly cast and the
controller treats that SQLSTATE as systemic, but this refresh produced no relay
confirmed generation and no asset.

After a new explicit authorization, a separate
`stars-qualification-retry-2026-09` cohort reused the same twelve identities
without reopening either closed cohort. Its ceiling remained 36 opportunities
with concurrency capped at three. The first batch allocated three opportunities:
two returned the systemic `relay_unavailable` failure and one completed through
the real GALX relay. That completed generation produced one public library asset
owned by the correct Star and passed provenance, frontend projection, and
human/Star analytics checks. The controller stopped the affected run after the
batch and finalized all actors inactive; the remaining 33 opportunities were
never allocated.

After the admission lifecycle was loaded into the local Premium runtime, a new
explicit authorization created the versioned
`stars-refresh-2026-09-r2` qualification cohort without reopening any earlier
cohort. The twelve existing Star identities and deterministic avatars were
reused. The run preserved the 36-opportunity ceiling, issued 12 opportunities
at maximum concurrency three, completed five real relay generations and
persisted five correctly owned public library assets, while seven ordinary
relay attempts failed. The controller stopped at its explicit systemic relay
discovery boundary; the remaining 24 opportunities were not issued. No
ambiguous generation was replayed.

## Containment

All five bounded cohorts are finalized inactive. No additional Star or
recurring schedule was created, and no attempt counter was reset. The initial
cohort has 31 persisted Star request receipts, the first refresh has 36, the
qualification retry has 3, the versioned refresh has 12, and the production
qualification has 7. Across the retained cohorts there are 89 durable Star
generation records: 6 completed and 83 failed, with none queued or
generating. The small production qualification's eighth opportunity was
never issued and produced no persisted asset. The six completed assets are
retained through normal community persistence. The twelve Stars remain
present, visibly classified and administratively entitled, but inactive.

## Versioned refresh forensic pass

The read-only reconstruction of `stars-refresh-2026-09-r2` found seven
failures, not one undifferentiated provider-failure class:

- 5 pre-provider failures: no central execution lease or worker image
  submission was retained, so no provider generation was reached.
- 2 dispatched known failures: one worker submitted both requests, the
  upstream/provider path returned quota-classified failures, and the runtime
  released occupancy and entered worker cooldown without replaying either
  mutation.
- 0 dispatched ambiguous outcomes and 0 post-generation persistence failures.

The five successes and two dispatched failures were separated by execution
target: one private worker completed 5/5 submissions, while the other failed
2/2 and entered cooldown. Admission invariants held: seven unique leases and
submissions, no duplicate dispatch or collision, no leaked occupancy, and no
ambiguous replay. A second narrow audit resolved the five pre-provider records
into three exact endpoint-circuit failures and two known-not-dispatched
target-eligibility failures whose private admission transition was not retained.
The three exact failures were amplified because a valid `not_accepted` HTTP
response was incorrectly counted as endpoint reachability failure; two ordinary
admission failures could open discovery for the endpoint and make later requests
fail before dispatch. The two remaining records prove no lease and no worker
submission, but do not prove whether the stop was candidate selection,
reservation, reselect, or worker pre-grant. The central registry's health
projection also lagged the runtime cooldown, but the local worker circuit
prevented reuse.

The exact per-attempt matrix, private evidence, missing observations and
smallest regression/fix are recorded in
[the forensic release record](../../../releases/2026-09-19-stars-refresh-v2-forensic.json)
and [the pre-dispatch audit](../../../releases/2026-09-19-stars-refresh-v2-predispatch-audit.json).
The demonstrated endpoint-circuit correction is present in source but is not
deployed or live-verified. No second production behavior was added because the
two target-eligibility records lack the private transition needed to justify
one. No new generation, retry, replay or cohort mutation was performed during
this pass.

## Target-local image failover repair

The next narrow audit isolated a separate execution-layer defect. When a
compatible shard was selected but returned authoritative pre-generation quota
or capacity exhaustion, the relay terminated the whole request instead of
returning control to shard selection. The repair keeps the same admitted
request, receipt and lifecycle: it releases shard A's reservation once,
records image-scoped eligibility/cooldown, excludes A for the request, and can
select shard B once. The parent pool receives only the fixed private
`pre_generation_rejected` class and hands the same `AdmissionLifecycle` back to
bounded selection; no second receipt or public retry is created. The attempt
count is bounded by distinct compatible shard IDs, so this is target failover
rather than generic request replay. Image cooldown does not remove independent
text capacity.

Timeouts, connection loss after dispatch, malformed or unknown responses and
post-generation failures remain terminal under the no-POST-replay contract;
shard B is not attempted for those outcomes. Deterministic regressions cover
one depleted shard to a healthy shard, all shards depleted, ambiguous A and
workload-specific image depletion. The repair is source-verified only: no live
generation, Star retry, relay request or cohort mutation was made.

See the [target-local failover release record](../../../releases/2026-09-19-relay-image-target-failover.json)
and the [admission lifecycle runbook](../../../../docs/runbooks/relay-admission-lifecycle.md).

## Production qualification after deployment

The reviewed repairs and administrator-only pre-dispatch events were committed
as `5e54bbd9cbae4a64556b761414ecfeccf694b22d`, pushed, deployed to the
application, and loaded into Premium runtime image
`admission-20260919-r2`. The deployed application revision and runtime
readiness were verified before qualification. The public Star profile marker
and participant projection were also verified; no private admission fields
were exposed.

The separately authorized qualification used four existing Stars, two
opportunities each, a ceiling of eight, and concurrency two. Seven attempts
were allocated before the run was stopped; the eighth was never issued. The
new private events removed the prior pre-dispatch evidence gap. The live
matrix is retained in the [qualification evidence](../../../releases/2026-09-20-stars-production-qualification.json):

- Veyra opportunity 1 reserved and dispatched to target A, received an
  allowlisted target-local pre-generation rejection, excluded A, waited while
  B was occupied, then dispatched once to B and terminated with an unknown
  outcome. There was no A/B cycle or replay.
- Morrow opportunity 1 dispatched to B and the relay recorded a completed
  response, but the qualification process was interrupted before application
  persistence verification. It was closed as ambiguous, never labelled
  `generation_not_started`, and never replayed.
- The remaining five attempts were fully observed as pre-dispatch:
  both compatible targets were in worker image cooling/quarantine, no
  reservation was acquired, the relay returned no compatible candidate, and
  no worker/provider dispatch occurred.

This is **NOT QUALIFIED**. The demonstrated live boundary is a target-1
pre-generation rejection followed by a target-2 unknown terminal failure;
both worker image circuits then became ineligible and five later requests
terminated before dispatch. The source audit found no parent-pool or target-1
to-target-2 propagation: the runtime owns separate worker/workload circuits,
but its generic unknown fallback was incorrectly worker-scoped. The narrow
source repair now keeps unknown/ambiguous outcomes request-scoped while
retaining worker-local cooldown for evidence-backed worker failures. Its
before-fix regression failed and its after-fix regression passes. The repair
is not deployed, so this does not authorize another Star run. Valid relay
HTTP rejections continued to reach the relay and did not poison endpoint
discovery; the endpoint discovery regression and focused source suites remain
green. No content asset was persisted by this small run, and no provider cost
estimate is inferred.

Containment disabled the qualification cohort/run and all four actor/member
records, retained four administrative Pro entitlements, left all earlier
cohorts untouched, and left no queued or generating Star receipt. No new Star,
avatar generation, schedule, replay, or additional generation was created.

## Prevention and next step

Keep all four cohorts inactive. Do not reset a ceiling, replay allocated
requests, or issue the unallocated eighth qualification opportunity. The
controller provenance-cast repair, admission lifecycle, dynamic discovery,
target-local failover, and administrator-only pre-dispatch observability are
deployed and source/live-checked within this bounded pass. The cooldown-scope
correction is source-verified but not deployed; the small Star qualification
remains not accepted because the worker cooldown boundary amplified one
target-local failure into five pre-dispatch rejections. Any later content
qualification requires a controlled release of that correction, fresh positive
image-capability evidence and separate explicit authorization.
Administrative Pro remains an entitlement projection, not a payment event, and
Star accounts retain participant capabilities only. No recurring run is
scheduled or authorized by this record.
