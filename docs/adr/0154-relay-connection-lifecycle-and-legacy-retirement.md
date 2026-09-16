# ADR 0154: Stable relay connections and irreversible legacy credential retirement

<!-- docs-scope: decision-record -->

Date: 2026-09-16. Status: proposed. Owner: Relay operator. Implementation and actual acceptance are tracked independently in the private incident evidence.

## Context and decision drivers

A valid manually saved provider login failed registration because thirty retracted historical records and one unbound active record matched its identity. The monitor collapsed the conflict into an unhelpful error and exposed a three-stage flow that did not distinguish saved login, usable connection and execution activation. The owner requested legacy cleanup and a reliable reconnect strategy. Investigation also found that the management migration had inadvertently routed assigned-account refresh through a legacy guard that forbids assigned accounts.

## Options considered

- Ignoring revoked matches or selecting the newest record would hide ambiguity and could restore explicitly withdrawn authority.
- Deleting account rows would destroy operational references or cascade into lease history; creating a new record on every expiry would multiply identities.
- Retire only unused legacy credential material, preserve immutable operational tombstones, then use stable manually verified connections with same-account reconnect. This keeps deletion, connection health and desired execution state distinct.

## Decision

Implement the third approach within the existing fixed-pool and manual-desktop authority. Connect validates identity, account class and model access and atomically saves a paused account. Explicit replay resolves the same saved operation. Reconnect verifies the original account in its owning desktop and replaces its credential revision, preserving account identity and enabled/paused intent. Runtime credential rejection sets a separate reconnect-required state using exact revision and ownership fences; old reports cannot invalidate newer credentials. Explicit account revocation/removal remains terminal.

Legacy retirement is an owner-only, dependency-checked transaction for an explicit ID set, never a browser action or recurring token-cleanup job. It erases encrypted credential material only from unbound, unassigned, idle records with no active lease. Tombstones cannot regain credential authority and do not participate in matching. New canonical IDs use a stable connection namespace. Keep all operational evidence private.

The interaction follows familiar [Zapier app-connection management](https://help.zapier.com/hc/en-us/articles/8496290788109-Manage-your-app-connections): reconnect in place with distinct removal. [GitHub's OAuth guidance](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) supports reverifying identity after each grant. [Slack's token lifecycle](https://api.slack.com/authentication/rotation) distinguishes credential changes from installation removal. These inform the pattern; GALX retains its manual-only sign-in policy and does not adopt automatic provider refresh.

## Consequences and recovery

One account persists across credential expiry/rejection. Enabled connections can resume after verified reconnect; paused ones stay paused. Status reflects observed checks, not continuous generation capability. Temporary outages and quotas remain separate from rejected credentials. The old review/register protocol stays compatible while the UI uses Sign in → Connect.

Retirement is irreversible for credential material. Database backups and provider-side sessions are outside this cleanup. Preserve records and recover through manual sign-in, never by restoring retired ciphertext. The paired rollback closes registration/execution and protocol access while retaining tombstones and rejection evidence. Older runtimes require closed execution until compatible behavior is restored. The [canonical contract](../reference/relay-account-management.md) and [service runbook](../runbooks/relay-pool-services.md) own current procedures.

## Confirmation and delivery

Confirm atomic rollback, stale-report denial, same-token rejection, fresh same-account replacement, terminal removal, role/pool denial, immutable retirement and preservation of operational IDs in a real disposable database. Exercise lost-response reconciliation, reconnect recovery and responsive/keyboard behavior through the real monitor server. Verify actual local images and the owner's existing manual sign-in separately from fixtures. Link dated delivery evidence without auto-accepting this decision.

## Relationships

Extends [ADR 0153](0153-central-account-authority-isolated-relays.md) and preserves [ADR 0152](0152-manual-desktop-only-shard-authority.md)'s manual-only authority. Partially replaces the earlier separate review/register interaction and obsolete legacy material retention; account removal/history rules remain in force. No ADR is fully superseded.
