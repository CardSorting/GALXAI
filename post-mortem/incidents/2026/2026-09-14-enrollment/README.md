# Manual desktop enrollment policy change

<!-- docs-scope: operational-record -->

Date: September 14, 2026. Owner: relay maintainer. Status: contained after September 15 UTC activation; first manual account acceptance remains open.

The owner reports unstable externally enrolled provider sessions and requests closure of outside enrollment. Read-only registry inspection found 56 retained rows, three non-revoked and one unexpired. This count does not prove current capability. Existing manual desktops remain available for repair.

[ADR 0152](../../../../docs/adr/0152-manual-desktop-only-shard-authority.md) accepts manual desktop-only enrollment. Code closes application API/CLI ingestion, requires explicit enrollment from a running saved desktop, gates admission by a unique database binding, and confines credential changes to private SQL functions. Existing rows are retained for explicit confirmation; source labels are not proof.

[Dated verification](../../../releases/2026-09-14-manual-desktop-enrollment.json) distinguishes local tests, production migration, controller/application activation and manual sign-in acceptance. The [enrollment runbook](../../../../docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) owns recovery. Image capability remains a separate incident and is not restored by this change.

## September 15 activation

The [deployed record](../../../releases/2026-09-15-manual-desktop-enrollment-activation.json) verifies database privileges and retained records, the single supervised controller reload, both preserved desktops and six unchanged unknown receipts, live administrator boundaries, and closed external routes on the Ready production application. No account was automatically enrolled. ACT-021 is complete for policy activation; ACT-022 requires manual same-desktop sign-in/enrollment and a fresh serving check. Expired provider sessions still require manual renewal.

## September 15 documentation follow-through

The [workspace-wide documentation review](../../../releases/2026-09-15-manual-enrollment-documentation-review.json) replaces stale external-enrollment and provider-renewal instructions throughout the affected current guides, private API/schema references, deployment/recovery procedures and example configuration. Historical measurements and earlier decisions remain dated. The guide changes do not enroll an account or establish image capability; ACT-022 and ACT-020 remain open.
