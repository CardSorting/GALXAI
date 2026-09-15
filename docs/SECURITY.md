# Security boundaries

<!-- docs-scope: current-guide -->

Private current guidance for the [federation contract](FEDERATION_STRATEGY.md) and [manual enrollment decision](adr/0152-manual-desktop-only-shard-authority.md). Vulnerability reporting remains in the [root security policy](../SECURITY.md). These controls are not compliance certification.

## Authority map

| Boundary | Required authority |
| --- | --- |
| User to application | Verified account/session, resource ownership and the operation's access rules |
| Application to controller | Configured inference credential and trusted tenant mapping |
| Operator to read-only monitor | Host-issued monitor browser session |
| Operator to Relay Desktops | Separate host-issued desktop session and exact local origin for mutations |
| Desktop to new registry authority | Explicit Enroll shard on a persisted running workspace with a validated saved login |
| Desktop to replacement credential | Matching durable desktop binding, account and current encrypted revision |
| Controller to worker | Scoped private inference/admin transport and one assigned eligible credential |
| Registry to admission | Confirmed desktop provenance plus current permissions, expiry, leases and quota |
| Agent to tools | Consuming runtime's explicit execution controls |

Ordinary authentication, preview approval, task IDs, prompts, model output and caller-provided tenant hints do not grant administrator authority. Job ownership remains enforced independently.

## Enrollment and credential custody

Manually create the workspace, complete provider sign-in inside it and choose **Enroll shard**. API/CLI/file ingestion and ambient host discovery are closed. Retired application provider routes return a fixed uncached 410 before processing credentials or starting authentication. The exact endpoint list is in [the connection boundary](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md).

The database requires paired enrollment fields and a unique desktop binding. Protected-field triggers and the private no-login writer role restrict credential, owner and binding changes. The service role has no shard insert or private enrollment/refresh authority. General repository saves update allowlisted policy metadata. Both controller projection and durable leases exclude unconfirmed legacy records. Existing records, revocations, counters and history are retained.

The host validates saved guest files, account identity, expiry and inventory before writing. Enrollment cannot revive revoked/dead/quarantined rows, choose an ambiguous account or steal another desktop's binding. Local links do not change database ownership. A database owner remains trusted and can alter schema/roles; these controls do not claim to contain a malicious owner.

## Renewal, retention and isolation

Expired provider sessions require manual sign-in in the owning desktop. Automatic saved-file sync validates and transfers a login already present there; it never renews the provider session. Its durable intent and revision-conditional write recover across failures without overwriting newer authority. Database mutation and local checkpoint are separate commits. A failed checkpoint cannot report success.

Each worker is an isolated non-root container with a read-only root, reduced capabilities, bounded resources and a private checkpoint volume. It receives one assigned provider credential, no database/vault root, host home, repository or Docker socket. The host controller holds registry decryption and Docker authority; this trusted host boundary differs from worker isolation and does not supply multi-host consensus.

Each desktop has its own guest home, profile and network. Safe reads reject inappropriate paths, ownership and files; keyrings are not exported. Homes, backups and worker checkpoints are sensitive. Keep the bound home for manual repair; deletion does not release or transfer the database binding. Container settings do not establish hardware isolation or a network egress firewall.

## Requests, visibility and recovery

Operator diagnostics remain behind server administrator or purpose-specific local session checks. Desktop sessions, monitor sessions and inference credentials are distinct. Ticket fragments are removed after exchange, and provider/admin credentials do not enter browser storage. Cross-origin and nonlocal requests are rejected.

Public responses use explicit field allowlists and re-encoded image artifacts. Keep topology, credential sources, internal identifiers and execution diagnostics out of public bodies, headers, streams, metadata and browser assets. Errors must not expose upstream payloads. Preserve tenant-bound operation identity after uncertain acknowledgement; a retry is not automatically safe.

Holds stop new work and replacement starts while allowing accepted work to finish. Revocation, expiry, removal and changed authority still control eligibility. Repair by restoring verified authority in the owning desktop, never by clearing rejection/quota, reviving records or reopening ingress. Vault rewrap is a separate [private administrator procedure](maintainers/MULTI_TENANT_SHARD_AND_KEY_ROTATION.md).

## Verification and limitations

Use [hardening](maintainers/RELAY_HARDENING.md) for anonymous, ordinary-key, monitor-session, origin, malformed-body, race, wrong-desktop, rollback and public-artifact tests. Mutating integration uses guarded disposable databases with synthetic credentials. Production builds and raw HTTP/browser-asset checks are separate from real provider login and generation acceptance.

[Current state](../post-mortem/CURRENT_STATE.md) links the deployed closure evidence and open acceptance work. A running desktop, successful inventory, historical image result or Ready application does not prove the requested capability is currently usable.
