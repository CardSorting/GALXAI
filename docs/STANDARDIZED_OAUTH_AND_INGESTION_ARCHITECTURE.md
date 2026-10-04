# Authentication and credential registration boundaries

<!-- docs-scope: domain-reference -->

Private reference. [Workspace authentication](operations/workspace-auth.md) owns GALX identity; [central account management](reference/relay-account-management.md) owns provider authority. [ADR 0152](adr/0152-manual-desktop-only-shard-authority.md) closed external ingestion; [ADR 0153](adr/0153-central-account-authority-isolated-relays.md) records isolated execution with central accounts.

## Separate authorities

GALX signup, verified login, session renewal, developer approval, customer plan and staff authorization do not enroll provider credentials. Pool monitor operator/viewer sessions and registrar/runtime principals are separately scoped to one fixed installation. An inference key, ordinary authenticated account or browser-selected ID cannot grant management or peer-pool access.

## GALX Connect application permission

[Connect](operations/galx-connect.md) uses the existing verified GALX identity to approve a narrowly scoped application grant. Its registered public clients use authorization code with S256 PKCE and Nova-specific opaque credentials. Token exchange does not expose account tokens or provider credentials. Consent, entitlement and capacity are distinct; account/Star/publishing privileges never follow from inference permission. Current grant checks and rotating refresh-token reuse detection enforce revocation without a cached-grant window after disconnect acknowledgement.

The new `/oauth/authorize`, `/oauth/token`, `/oauth/revoke` and OAuth discovery endpoints are a different contract from the retired `/api/auth/oauth/*` provider-ingestion endpoints. Exact middleware exemptions dispatch to handlers that enforce their own authority; no prefix reopens legacy routes. Connect is disabled by default and has only local acceptance evidence. It requires no new identity system or deployment split.

## Manual registration path

Use **GALX Premium** for verified paid provider accounts. **Register account → prepare desktop → manual sign-in → Review access → register** commits authority only in `mazhcjisettrzbqhorvp`, with an exclusive immutable assignment and the current activation policy. The monitor's scoped registrar validates saved login; the browser never uploads a token. Creation, polling, labels and desktop files alone cannot register or enable an account.

Renew in the owning desktop and explicitly choose **Update saved sign-in → Save new sign-in**. The new services do not synchronize saved files in the background. A revoked/removed or differently assigned account cannot be revived or transferred. Actual model/image capability requires separate qualification. [Manual registration](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) owns recovery and operator steps.

## Closed application and CLI paths

These exact provider-connection routes retain terminal denial:

| Method | Path |
| --- | --- |
| POST | `/api/auth/openai` |
| POST | `/api/auth/ingest` |
| POST | `/api/ingest` |
| POST | `/api/auth/oauth/par` |
| POST | `/api/auth/oauth/refresh` |
| GET | `/api/auth/oauth/url` |
| GET, POST | `/api/auth/oauth/callback` |

They return HTTP 410 with allowlisted `{"error":"Provider connections are unavailable."}` and private/no-store caching. They do not parse or forward credentials, contact a provider, change cookies or establish GALX sessions. Middleware sends these finite retired routes to their denial handlers without preview/account work. CLI add/import and ambient discovery fail before enrollment. GALX account APIs and device grants retain their separate verified-user contract.

Generic repository saves change only allowlisted policy metadata. Database protected-writer rules and unique desktop provenance remain enforced; service roles cannot create account authority through the retired upsert path. Central management operations check scope, expected revision and immutable operation identity. Execution-only projects have neither account tables nor credential writers.

## Retained deployment

The existing single controller's **Enroll shard** and saved-file synchronization apply only to eligible unassigned accounts; see [legacy enrollment](maintainers/legacy-desktop-enrollment.md). Legacy writers and lease interfaces reject centrally assigned accounts. The deliberate administrator [vault rewrap](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md) preserves identity, plaintext, assignment and provenance; it is not another registration path.

## Privacy, verification and limits

Keep credentials, pool/desktop identifiers and implementation diagnostics private. Public responses use explicit DTOs and finite errors. Tests cover anonymous/ordinary/viewer/peer-role denial, replay/revision races, removed desktop control, account-binding conflicts, privileged-table denial and rollback. Run production-build and public-boundary checks for runtime changes. [Current state](../post-mortem/CURRENT_STATE.md) records source, schema, installation and actual provider acceptance separately.
