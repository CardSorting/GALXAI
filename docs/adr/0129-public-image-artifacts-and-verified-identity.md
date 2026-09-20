# ADR 0129: Public image artifacts and verified identity

<!-- docs-scope: decision-record -->

Date: 2026-09-08. Component: application authentication, image delivery, public documentation.
Status: implemented and locally verified on September 8. The September 9 relay controller reload does not establish application deployment or origin remediation; see the [component evidence matrix](../maintainers/RELAY_SESSION_VERIFICATION_20260909.md#component-deployment-boundary).
Audience: internal maintainers. Do not publish this record as site content.

## Problem and precedence

Internal execution objects and stored image metadata can disclose implementation details when copied into customer responses. Accepting decoded JWT claims or caller-supplied user identifiers also lets an unverified caller establish an identity. Authentication alone does not establish administrator authority.

This decision supersedes ADR 0127's public execution-metadata disclosure and ADR 0128's treatment of the federation contract as sufficient authority for customer documentation. Their internal transport decisions and dated deployment evidence remain intact. [AGENTS.md](../../AGENTS.md) defines the public information boundary; the [federation contract](../FEDERATION_STRATEGY.md) continues to govern internal relay behavior.

## Decision

Public documentation describes capabilities, accepted inputs, output contracts, limits, and recovery. Keep topology, credentials, routing, execution-model selection, and diagnostics in private operational records. Preserve protocol identifiers internally. A public alias must not imply an unverified underlying model.

Image HTTP success defaults to a sanitized binary artifact. Decode and re-encode images before publication, including historical downloads. Explicit JSON uses allowlisted DTOs; never forward internal objects, arbitrary URLs, or upstream headers. Apply the same boundary to errors, async retrieval, streams, webhooks, SDK adapters, model descriptors, and browser assets. Private task records may retain operational evidence.

September 20 extension: publication is an explicit library state, not a billing
claim. Existing signed-in Image Studio creators may keep a generation `private`;
Explore and community projections admit only `public` rows, while an opaque
private artifact or thumbnail capability requires the current owning session
before cache lookup. `unlisted` remains link-addressable and feed-excluded. The
existing visibility column and owner-scoped mutation are reused; no new schema,
Stripe price, or entitlement is inferred by this control.

The identity resolver validates JWT bearer tokens with the authentication service. It rejects bare user IDs and developer/session identifiers. Verification errors fail closed. User-editable claims grant neither priority nor sudo authority. Existing gateway-key and signed-session validation paths remain in place. Reassemble split browser-session cookies before verification; headers, query strings, and cookies are credential transports, never proof of identity. Operational endpoints require separate server-side administrator authorization.

## Alternatives and consequences

Deleting only known sensitive fields fails when internal response shapes grow; explicit projection makes unknown fields private by default. Stripping metadata labels without decoding images cannot establish an artifact boundary. Accepting locally decoded claims avoids a network call but cannot authenticate the caller.

Verification adds an authentication-service dependency; outages deny affected sessions. Re-encoding consumes resources and does not preserve source metadata. Expiring download links must be saved before expiry. The image itself and observable timing can still support inferences; this is not a promise of hosting anonymity.

## Evidence and release scope

On September 8, the working tree based on `6be3078` passed 19 image/security checks, the Next.js production build including type validation, compiled loopback HTTP checks, and a scan of all 362 generated JS/CSS assets with no matches for the tested prohibited terms. The HTTP verifier checked 26 page-referenced assets. These are bounded local checks, not exhaustive proof or a live-site certification.

The session did not deploy these changes, generate a paid production image, or run the origin-remediation scripts. Earlier production observations in ADR 0127 remain dated history. See the [maintainer verification guide](../maintainers/image-public-boundary.md) for repeatable checks and operational-script limitations.

## Recovery

Keep the verified-identity and public-response boundary during rollback. Do not restore caller-ID authentication or direct internal-object serialization. Revert a faulty adapter or format change behind these boundaries, then repeat authorization, artifact, raw HTTP, and build checks. Review origin/cache access independently; previously downloaded files cannot be recalled.
