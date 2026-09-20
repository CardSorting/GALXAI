# GALX product surface strategy

<!-- docs-scope: current-guide -->

Private product authority, reconciled September 18, 2026. [PRODUCT.md](../PRODUCT.md)
summarizes the experience; [current state](../post-mortem/CURRENT_STATE.md)
records deployment evidence.

## Product and access boundaries

| Surface | Current scope |
| --- | --- |
| Homepage | Image-first creation, prompt inspiration, community discovery and Nova attribution |
| Public guidance | `/pricing`, `/faq` and `/knowledge-base` explain supported capabilities and consumer terms |
| Images | Consumer creation, remixing, downloads, owned library and public sharing controls |
| GALX Nova | Managed intelligence used by GALX experiences and selected private integrations |
| Private developer access | Explicit, bounded, metered, administered and revocable; not a public subscription |
| Staff administration | Authenticated owner/reviewer/viewer membership with private cohort, credential and audit controls |

GALX is retiring public inference distribution, not inference infrastructure. A
normal user must not be able to purchase API access, enroll, receive a key
automatically, create additional credentials, upgrade into API access or
discover a public inference price sheet. No public waitlist replaces the
retired workflow.

## Positioning and communication

Describe what users can do and what outcomes they can expect: create images,
explore and remix ideas, use supported GALX experiences, and—when GALX chooses
to authorize it—use a bounded private integration. Do not describe providers,
routing or selection logic, capacity acquisition, scheduling, failover,
internal economics or implementation diagnostics in public content, metadata,
social previews, browser bundles, response bodies or headers.

GALX Pro remains the public consumer plan at the currently verified
$10/month price. The public pricing surface pairs it with the one-time
five-image welcome allowance so visitors can try the real Image Studio before
subscribing. Its supported ratios, Standard/HD detail, 1–4 output batches,
library, Favorites, remix and download behavior are the active contract.
Private access has no public checkout or public usage-pricing contract.
Historical billing identities and records remain available to server-side
reconciliation where required. Do not publish additional consumer tiers until
their Stripe prices, webhook reconciliation, usage policy and user-facing
capabilities all exist together.

## Infrastructure and administration

Keep the existing API endpoints, key authentication and authorization, usage
metering, consumption and traffic accounting, quota and allocation controls,
scheduling, worker/pool boundaries, recovery, request diagnostics, audit
records, security boundaries and revocation mechanisms. Internal GALX products
continue consuming the same machinery.

Administrators use the private workspace to approve or disable a bounded
cohort, generate credentials, assign rate and usage allocations, inspect
metered consumption, modify allocations and revoke access. Credential secrets
are revealed once and public users never receive the admin DTOs. Ordinary
authenticated users are not administrators.

Metering remains first-class even without public billing. It supports allocation
enforcement, private cohort management, internal cost analysis, abnormal-use
detection, capacity planning, experiments and future products. Removing a
public price does not remove the measurement path.

## Evidence and release

Use explicit public response DTOs and capability-oriented documentation. Keep
operational topology, credential sources, routing mechanics, internal economics
and diagnostics private under [AGENTS.md](../AGENTS.md). Distinguish source
implementation, local tests, deployment evidence and real-user acceptance.

Every release should test both sides of the boundary: existing inference and
metering consumers continue to function, while public users cannot purchase,
enroll, provision, subscribe to or automatically obtain general-purpose API
access. Scan rendered pages and browser assets before claiming the public site
is clean.
