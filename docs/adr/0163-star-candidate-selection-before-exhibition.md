# ADR 0163: Star candidate selection before exhibition

<!-- docs-scope: decision-record -->

Status: accepted
Delivery: production behavior deployed 2026-09-25; verified in the linked database and public application

## Context

The existing Star generation path writes image assets into the shared image
library. Before this decision, an authorized Star generation became public as
soon as storage completed. That collapsed candidate production and institutional
selection into one event. A successful execution is evidence that an artifact
was produced; it is not a publication decision.

The system must preserve existing public Works, keep human-generated and
remixed Works owner-private, retain private production provenance, and require
an accountable decision before new Star work enters public discovery.

## Decision

Star generation creates a private candidate. BROC records a candidate event
after the existing controller verifies attempt, generation and asset
provenance. A separate internal review operation records an append-only
selection or withholding event containing the exact asset IDs, a bounded reason,
a reviewer label and a monotonic decision version. The database transaction
commits that event and the corresponding visibility update together.

The database trigger rechecks that a selected asset belongs to the completed
attempt and its generation. Direct visibility updates without a matching
selection record remain private. Only explicitly selected assets are published;
withheld or unselected assets stay private. Existing public Star Works retain
their established state. Runtime activation controls admission of new generation
requests; it does not determine whether established Star work remains public or
whether a completed candidate can be reviewed. Human Work remains
non-publishable.

Public feed and profile responses continue through the existing explicit DTOs.
Production prompts remain private records and are absent from public cards,
search, profile responses, saved collections and share metadata. Private remix
resolves a currently published Star Work on the server and charges the existing
authenticated allowance pipeline; source context is not supplied by the
browser.

No review dashboard or public publication control is introduced. The internal
`stars:review` command lists candidates, previews sanitized artifacts in a
private temporary directory, and records a selection or withholding decision.

## Consequences and rollout

Generation volume no longer implies publication. A candidate can be withheld
without rewriting the Star's canon or deleting provenance. The review record
provides the reason and precise asset set behind every new exhibition decision.
The tradeoff is that new Stars remain absent from public feeds until a reviewer
makes an explicit decision.

The practice, selection and continuity migrations are applied to the linked
database. The forward continuity migration archives only pre-cutover completed
Star work whose actor, attempt, generation, request and stored asset agree. It
restores those rows without activating Stars or admitting new requests. The
public feed and profile projections depend on the Star identity, discoverable
profile and publication state, not runtime activation. Generation admission
continues to require an enabled Star.

The publication-gate rollback restores the former automatic Star-publication
trigger and does not erase append-only selection history. The continuity
migration's paired DOWN is intentionally a no-op: dropping its archive or
reapplying the activation filter could silently withdraw established work. Use a
new forward migration for any later policy change, and coordinate application
rollback with the stopped Star runtime before changing the publication gate.

## Verification

Pure tests cover candidate decision validation, exact asset membership,
withholding, private remix payloads and public DTO omission. The isolated image
database suite exercises generation as a private candidate, a forged direct
visibility update, selection after actor deactivation, rejection of new work
from that actor, historical archive restoration, archive immutability, role
grants and public feed membership. Production readback verified 156 applied
migrations, no pending migrations, 11 archived/restored works, 11 public Star
works, no public human works, no active Stars, and no queued or generating
image requests or Star attempts. No provider generation or Star activation
was performed. The [dated release record](../../post-mortem/releases/2026-09-25-star-practice-publication-rollout.json)
retains deployment checks and limits.

## Relationships

Related: [ADR 0160, private human creation and Star-only publishing](0160-private-human-creation-star-publishing.md),
[ADR 0161, BROC persistent practice](0161-broc-persistent-star-practice.md),
and [the Star reference](../reference/stars.md).
