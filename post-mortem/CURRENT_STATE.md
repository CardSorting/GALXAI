# Latest verified operating state

<!-- docs-scope: current-guide -->

Reconciled 2026-09-13 UTC. These are the latest recorded observations, not a live status feed. Before an intervention, inspect the current target, process and migration history again. [Open items](OPEN_ITEMS.md) remain part of this handover.

| Component | Latest evidence | Qualification |
| --- | --- | --- |
| Public product policy | Images and Sites are public products; other developer APIs require individual preview approval | Existing authentication, billing and ownership requirements still apply. Staff authorization is separate from participant approval. |
| Site application | Deployment `dpl_GvvnzykiKbuJa3EPt8RU8yg3xsfN` was Ready and served `galx.ai` and `www.galx.ai` on September 13 | Deployed from the working tree. Source was uncommitted/unpushed at recovery; inspect Git before any later release. |
| Image generation | One real frontend generation submitted at `2026-09-13T03:25:20.204Z` succeeded | Existing signed-in session; My images, download and Favorites after reload verified. No load or billing-settlement test is implied. |
| Image receipts | `20260913025900_durable_image_requests.sql` applied before the site deployment | Owner-scoped PostgreSQL receipt committed before async acknowledgement. Single claim, no automatic retry after ambiguous dispatch. |
| Auth and Favorites | Dedicated Auth verification transport; temporary verification failure is distinct from invalid credentials; Favorites commits before acknowledgement | Regression suites and the existing-session frontend test passed. This does not repair unrelated administrator credentials. |
| Image storage | Four existing server-only R2 settings installed in production, then deployed | Temporary object write/read/delete verified; real image download decoded with no EXIF/XMP/IPTC/ICC/comments. |
| Generation controller | Supervisor recovered after a proven stale lock was archived; PID `79601` and healthy capabilities were observed | No automatic stale-lock reclamation was added. Never reuse this dated PID as an action target. |
| Developer preview gateway and owner | September 12 activation and first-owner records confirm deployment and setup | See [activation](../docs/operations/preview-activation.md). The owner ID is private evidence, not a grant mechanism. No new gateway deployment occurred during image recovery. |
| Hybrid preview reads | September 12 local sync checks passed; later site deployment contains the source | [Sync record](../docs/operations/preview-hybrid-sync.md). The image recovery test did not exercise every staff workflow or measure production egress savings. |
| Sites | Public workspace, managed publication and paid-plan policy are implemented with separate gates | Follow [Sites operations](../docs/maintainers/SITES_OPERATIONS.md) and its dated release evidence. September 13 image verification did not retest Sites generation, checkout or publication. |
| Vercel storage | September 12 cleanup removed 133 of 136 deployments, preserving the serving release, rollback and aliased preview at that time | Subsequent deployments changed inventory. Storage totals falling below quota remain unverified; never present the old three-deployment count as current inventory. |
| Private knowledge system | All eight domains reviewed against canonical guides, source contracts and tests; [September 13 domain review](../docs/knowledge/audits/2026-09-13-domain-reviews.md) records scope and corrections | Complete/current reviews with hashed evidence are required. Hosted activation is pending this push and observed run; the broader fingerprint inventory does not certify every module or replace production monitoring. |

## Regression boundaries

- Keep public image routes independent from developer approval storage; keep developer routes gated on both entry points.
- Verify sessions with the Auth service and preserve owner filters. Database errors and missing admin credentials must not become invalid-session responses.
- Async image status must read durable owner-scoped records, not a process-local queue. Receipt completion requires committed owned assets.
- Preserve original operation identity after a timeout or lost acknowledgement. A failed derived status does not prove no upstream side effect occurred.
- Preserve one controller owner, live worker resources, signing state and authoritative registry data during recovery.
- Keep public artifacts re-encoded and public response fields allowlisted. Diagnostics belong in private authorized records.

The full [generation incident](incidents/2026/2026-09-13-image-generation/README.md) records the tests, deployment and live result. Historical September 11 handovers are retained in [the archive](archive/2026-09-11/README.md); they no longer define current activation state.
