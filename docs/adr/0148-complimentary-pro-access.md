# ADR 0148: Explicit complimentary Pro access

<!-- docs-scope: decision-record -->

Date: 2026-09-14. Status: accepted. Owner: Product/API maintainer.

## Context and decision

The owner explicitly requested Pro permissions for an existing administrator account. Paid subscriptions were the only Sites eligibility source. Creating a charge, fabricating payment records or granting every administrator Pro would exceed that request.

Use an explicit boolean `galx_pro` in server-managed Auth application metadata. Read the current database value for the verified account on each membership check; never authorize from JWT claims, editable user metadata or staff role. Require a confirmed, non-deleted account without an active ban. The existing paid-subscription evidence remains the other eligibility source. No account ID is embedded in source or browser assets.

This partially extends the paid-only eligibility decision in [ADR 0140](0140-paid-sites-and-shared-fair-usage.md) and [ADR 0141](0141-sites-pro-self-service-launch.md). Their payment verification, public terms, ownership, admission and recovery rules remain authoritative. This explicit user request is the acceptance basis for complimentary account provisioning; delivery is recorded independently.

## Consequences and recovery

The existing protected Auth metadata avoids a new table or schema migration. The trusted operator command in [Sites fair usage](../maintainers/SITES_FAIR_USAGE.md) grants or revokes only this flag and verifies its read-back. Revocation applies to the next membership check; a previously issued internal proof can remain valid for at most fifteen seconds. Already admitted work follows normal recovery. Database failures fail closed. Staff and developer-preview permissions, wallet balances and Stripe subscriptions are independent.

Billing describes active Pro access without claiming a payment occurred. Public DTOs retain their current allowlists and omit grant provenance. Remove the flag to revoke the complimentary entitlement; reverting this application change restores paid-only eligibility without altering payment records or saved work.

## Confirmation and delivery

Verify current grant lookup, forged metadata, strict boolean type, account isolation, bans, deletion, confirmation, revocation and database failure. Run the existing Sites, billing, authorization and database suites, an isolated production build and browser-asset scan. Retain local and deployed observations separately in the knowledge review and private release evidence. No generation, publication or payment is required to verify this permission change.
