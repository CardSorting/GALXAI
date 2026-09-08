# Image public boundary verification

Public documentation describes capability, not implementation. The public API
defaults to a binary image. JSON compatibility uses explicit field projection.
This document is an internal maintainer record, not public site content.

The normalization path is internal result -> decoded/re-encoded artifact -> public
DTO -> HTTP response. Formatting helpers receive only normalized bytes or public
image fields. The native and relay adapters request base64 so normalization never
fetches an arbitrary provider URL. Downloads resolve an authenticated, expiring
opaque capability and re-encode stored images again, including historical assets.

Public errors use stable categories and opaque request IDs. Middleware no longer
adds execution timing or route-classification headers. Operational endpoints require
a separate administrator credential. Ordinary user authentication is insufficient.
Private task records retain execution details; customer snapshots and webhooks use
public projection. Logs omit arbitrary provider message payloads, which may quote
user secrets, while keeping categories, status and call sites. Existing operational
metrics retain capacity, model, attempt and timing information privately.

## Verification

Run `npm run test:image:security`, `npx tsc --noEmit`, and `npm run build`.
The HTTP suite opens a loopback server around the actual route handlers and merges
middleware headers. It tests binary success, explicit JSON, format conversions,
metadata removal, malformed input, auth failures, rate limits, unavailable models,
capacity errors, exhausted dispatch errors, timeouts, async polling, terminal SSE,
downloads, expired/tampered capabilities, unknown fields, and alternate gateway errors.
The OpenAPI test closes JSON object schemas. Documentation and catalog checks
prevent reintroduction of known private vocabulary in published contracts.

Repository review included routes, serializers, middleware, model descriptors,
SDK adapters, static documents, search suggestions, social images, metadata,
README and product API documentation. Operational histories and runbooks remain
private repository material; they must never be copied into site content.

## Adversarial review and operational limits

Customer outputs should reveal only images, public request state, public model
aliases, user-owned library fields and generic error categories. Public download
URLs reveal neither storage paths nor tenant identifiers in plaintext. Unknown
internal result fields are not serialized. Images are decoded and freshly encoded,
so EXIF, XMP, software labels and embedded generation metadata are discarded.

Image content itself, response duration, normal HTTP behavior, public product
branding and hosting-platform headers can still support general inferences. This
change does not promise anonymity of the hosting network. Platform-added headers
must be assessed on the deployed edge; application code cannot override every
platform response. Previously published URLs or downloaded files cannot be recalled
by changing serializers. Old asset origins and caches require a separate access and
retention review before asserting historical disclosure has been eliminated.

## Verified changeset

- Security suite: 18 checks passed.
- Existing admission/transport suite: 9 checks passed.
- Production build: passed, including TypeScript validation and 275 static pages.
- Browser asset scan: 358 JavaScript files, zero matches for tested private
  execution identifiers, credential configuration names, or removed branding.
- Four rendered model pages passed the same identifier checks.
- `scripts/verify-image-public-http.ts` passed against `next start`: unauthenticated
  image error schema, middleware/preflight headers, denied operational routes,
  rendered model pages, machine-readable documentation and OpenAPI response.
- Raw success and failure HTTP tests use controlled adapter/auth fixtures; no paid
  production image generation was triggered for this verification.
