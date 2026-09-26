# ADR 0164: Independent Star patronage and private creation

<!-- docs-scope: decision-record -->

Status: proposed
Delivery: local application and paired migration prepared; live legacy prices archived and replacement products prepared inactive on September 26, 2026. No application deployment, shared database migration or live paid launch. Product direction is explicitly approved; ADR acceptance is a separate review.

## Context

GALX needs direct recurring support for a particular Star without confusing it with production access or the retired Sites subscription. Public names must not collide with internal operational identities. Historical actor, practice and financial records must survive commercial changes.

## Decision

Use an additive public alias for the existing Veyra Sol actor: VANTA. Preserve its internal identity and lineage, normalize public attribution and redirect the old profile URL. Do not rename the remaining eleven Stars without review.

Create Orbit as an independent account/Star subscription for $10 USD/month. Reuse existing completed Star assets and artifact delivery with an explicit private designation and fresh paid entitlement check. Keep human private creation inaccessible to patrons. Foundry is the sole new $200 USD/month private-creation offer using the existing bounded allowance contract; it grants no Sites or Orbit access.

Archive obsolete purchase offers without deleting their records. Keep live recurring checkout disabled until payment release acceptance. The owner's September 26 follow-up defers the original tax-readiness prerequisite; this does not establish tax compliance or authorize invented registrations. Retain simple period-end cancellation and provider billing management, with account ownership checked on the server.

## Alternatives and consequences

Renaming Pro to Orbit was rejected because Pro includes Sites semantics. A universal membership ladder was rejected because it collapses independent relationships. Recreating Stars was rejected because it loses lineage. New content, messaging and commissioning systems are unnecessary and outside scope.

Fresh provider verification favors fail-closed revocation over serving cached entitlements during a payment-provider outage; it adds payment API latency to protected reads. Future caching requires separately reviewed revocation semantics. A local checkout lease and provider idempotency do not replace reconciliation of uncertain attempts. The down migration refuses to destroy populated commercial history.

## Delivery and confirmation

See the [maintainer guide](../maintainers/ORBIT_FOUNDRY.md) for implementation, rollout, tax findings and validation limits. Test-provider end-to-end checkout, webhook replay, renewal, cancellation and portal testing remain required before launch. Existing public discovery and private creation admission tests remain mandatory. No BROC, federation, runtime or unrelated practice change is authorized.
