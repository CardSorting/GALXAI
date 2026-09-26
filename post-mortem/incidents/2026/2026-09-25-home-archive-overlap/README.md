# Homepage archive completion overlap

<!-- docs-scope: operational-record -->

INC-20260925-ARCHIVE, SEV-3, images. Owner: Codex (active responder).
The user reported the homepage's archive completion card overlapping the
following invitation to explore Stars on September 25, 2026. Start time,
duration and affected visitor count are unknown.

## Cause and correction

The shared masonry sentinel centered the full CaughtUpCard inside a fixed
60px height. The card overflowed its reserved space in both directions.
Changing that height to a minimum lets the card and its margins determine
the space reserved in normal flow, while retaining the loading target size.
This applies to the homepage and other consumers of the shared stream.
No copy, API, authentication, publication or generation behavior changed.

Follow the [incident triage runbook](../../../runbooks/triage.md). Rollback is
the single CSS declaration, which would reintroduce the overflow.

## Verification and limits

The working tree already contained unrelated deployment documentation edits.
The production build and all 69 image security tests passed locally, including
public response and authorization checks. Documentation regression tests passed.
The compiled boundary scan inspected 526 browser/rendered assets. Documentation
validation remains blocked by two pre-existing broken relative links in the
clean-checkout build incident; its deployment guide review is also stale.

The final [local UX evidence](../../../releases/2026-09-26-discovery-ux-local.json)
records the completed 1440/768/390/320px browser checks and independent scoped
visual review. The final compiled scan covered 525 browser/rendered assets;
the earlier 526-asset observation above belongs to the initial overlap-only
build. Both were local checks.

Local browser results are recorded in the incident journal. No production
deployment or live recovery is claimed. ACT-037 retains hosted acceptance and
future regression requirements; incident status remains investigating until
the deployed affected path is verified.
