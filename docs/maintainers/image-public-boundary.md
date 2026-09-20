# Image public boundary verification

<!-- docs-scope: current-guide -->

Authority: [ADR 0129](../adr/0129-public-image-artifacts-and-verified-identity.md).

Public documentation describes capability, not implementation. The public API
defaults to a binary image. JSON compatibility uses explicit field projection.
This document is an internal maintainer record, not public site content.

Community discovery is part of the public image boundary. Star profiles use the
canonical `/profile/<handle>` route and `/api/community/participants/<handle>`
endpoint. Both expose explicit identity and creation DTOs only; the gallery is
creator-scoped, newest-first and continuable. Ordinary account profile data
remains private and is never projected through the Star profile endpoint.
Missing, invalid or temporarily unavailable Star profiles
return authored public categories without database fields, execution context or
diagnostics. Keep the profile and feed projections aligned when adding a new
public field. Explore moderation is a discovery-surface decision: hiding a
creation removes it from the community stream but does not make a still-public
Star creation disappear from that Star's profile gallery. Handles are
normalized before they become links, avatars accept only site-relative or
HTTPS image URLs, and malformed gallery cursors are rejected with a generic 400
response.

Public profile image inspection is a viewport-owned dialog. It renders above the
application shell, prevents background scrolling while open, returns focus on
close, and keeps the media and details in independently bounded grid tracks. The
sanitized artifact's intrinsic dimensions control visual containment; requested
ratio metadata remains descriptive and must not enlarge or crop the modal surface.
On narrow viewports the media controls remain within the visible media layer and
details scroll independently. Browser acceptance must cover a direct `?image=`
deep link at desktop and phone breakpoints, including persistent navigation,
previous/next controls, close, zoom and a portrait or metadata-mismatched asset.

The normalization path is internal result -> decoded/re-encoded artifact -> public
DTO -> HTTP response. Formatting helpers receive only normalized bytes or public
image fields. The native and relay adapters request base64 so normalization never
fetches an arbitrary provider URL. Downloads resolve an authenticated, expiring
opaque capability and re-encode stored images again, including historical assets. The exact thumbnail child is included in the public-product route policy; it requires no developer-preview grant and arbitrary child routes are not exempted. The thumbnail child route uses the same capability, checks the current owner-scoped row before every cache hit, and emits a fresh WebP preview inside 512×512. Storage/processing work has explicit admission, byte and time bounds. [Large-library guidance](image-library-scale.md) owns the precise limits and concurrent-read semantics.

Public errors use stable categories and opaque request IDs. Proven capacity rejection before dispatch (local admission, or a typed relay 503 with `not_accepted` and an allowlisted capacity/readiness code) persists only the allowlisted `generation_not_started` category and returns 503 with a short Retry-After. The same category appears in failed snapshots; arbitrary receipt diagnostics are never projected. Older/generic failed receipts remain uncertain. Middleware no longer
adds execution timing or route-classification headers. Operational endpoints require
a separate administrator credential. Ordinary user authentication is insufficient.
Private task records retain execution details; customer snapshots and webhooks use
public projection. Logs omit arbitrary provider message payloads, which may quote
user secrets, while keeping categories, status and call sites. Existing operational
metrics retain capacity, model, attempt and timing information privately.

Free sync/async creation passes the aggregate admission gate in [quota operations](FREE_GENERATION_QUOTA.md). It returns only `free_generation_paused` or `free_generation_busy` with 429 and the existing retry veto; private policy reasons and counters never appear. Receipt claim rechecks a pause; paid requests do not wait on that free-policy lock. Cancellation/non-start refunds customer quota but never replenishes the aggregate attempt budget.


## Capability availability

`GET /api/images/availability` requires a verified active account and returns only `status: available | unavailable | unknown` with private, no-store headers. The server reads the configured controller using its inference credential (only Premium when full isolated mode or the independent Premium image switch is enabled), accepts at most 1 KiB, refuses redirects and times out after five seconds. No upstream objects, diagnostics, model inventory or headers reach the browser. A missing/older endpoint or failed read is unknown, never proof of readiness. The exact route is exempt from developer approval, not account verification.

The controller’s authenticated `GET /v1/images/availability?model=...` projects one boolean from fresh image capability. It performs no paid probe, reservation, generation or quota mutation. Availability is advisory; authoritative admission still runs for every generation. The isolated Premium runtime reads its own in-process account engines directly, without an internal HTTP availability endpoint or provider probe. It reports true for fresh successful image evidence, false for unavailable execution or fresh negative evidence, and null when evidence is absent or expired. The application maps null to unknown. Chat inventory cannot establish image permission. A new explicit generation still needs central admission; an unknown status never creates a background probe. Standard reports unavailable without consulting any worker. See [isolated service operations](../runbooks/relay-pool-services.md) for configuration and separate first-image qualification.

Premium image results use the same owned storage, manifest and durable library flush as the legacy image path before receipt completion. Transport success alone is insufficient; completion validates the stored asset owner. The image-only switch changes neither account entry nor free admission nor text/Sites routing. The routing regression verifies that image dispatch skips legacy account selection while preserving sanitized storage and library persistence.

## Free generation admission

[Quota operations](FREE_GENERATION_QUOTA.md) owns the one-time five-image account allowance. New free requests, synchronous and asynchronous, reserve requested quantity atomically with durable receipt creation. Saved retries reuse their original state without another deduction, including cancellation and plan changes. Pro retains existing image usage/admission rules. Confirmed capacity non-start and queued cancellation release deductions atomically; ambiguous generation and storage failures retain them. Grant reads expire never-claimed queued work safely. Public 402 quota errors stay allowlisted and generic. The shared header/composer provider obtains only current plan, remaining customer counts and allowlisted availability; no grant/payment/execution records reach the browser.

## Workspace entry

`/images` requires a verified account session before the studio is rendered. Middleware checks workspace paths before asset exemptions; the server page repeats verification and is dynamically rendered. `/library` also remains session protected. Missing, malformed, forged or expired-without-refresh sessions cannot render the workspace. Anonymous Supabase users are denied. Refresh uses the Auth service and retains response cookies; temporary middleware verification failures return a generic 503. The independent server page gate withholds studio content and renders authored recovery on an expected outage, including when streaming has already committed HTTP 200. Manual retry fetches fresh server state; unexpected failures stay within the Images route boundary. No raw diagnostics or automatic retry timers appear in these recovery views. Pages and denials use private, no-store headers and noindex. This account gate is independent from developer-preview approval, API ownership and expiring artifact capabilities; published artifacts and the three studio example images keep their existing delivery contracts.

## Verification

Run `npm run test:image:security`, `npx tsc --noEmit`, and `npm run build`.
The [workspace authentication runbook](../operations/workspace-auth.md) owns the sign-in flow and server-backed browser fixture. A current-owner API 401 unmounts the studio and focuses recovery; 403, rate limits and outages do not become sign-in loops. Create/My images switches preserve the supported library view in the URL; same-tab drafts remain account scoped and no generation is replayed.

Initial browser profile failures withhold the studio inside the shared shell, preserving public navigation and Home. Manual session recovery retains same-tab drafts; its pending, unsuccessful and offline states use authored messages. A 403 image error says the action is unavailable for the account and never claims that the session expired. The shared loading shell announces a longer wait after six seconds, outside its decorative busy region. The compiled navigation fixture additionally verifies draft continuity, keyboard recovery, themes and reflow; no new storage or mutation-retry contract is introduced.

The workspace entry suite tests middleware variants, independent server-page denial, Auth outages, valid and revoked native sessions, and expired-session refresh. Existing browser-only account fixtures must provide a verified server session before opening the studio; do not bypass the gate. The compiled HTTP verifier expects sign-in redirects from Images and Sites, scans the public sign-in/home pages and their assets, and preserves capability/JSON/binary checks.
The HTTP suite opens a loopback server around the actual route handlers and merges
middleware headers. It tests binary success, explicit JSON, format conversions,
metadata removal, malformed input, auth failures, rate limits, unavailable models,
capacity errors, exhausted dispatch errors, timeouts, async polling, terminal SSE,
downloads, expired/tampered capabilities, unknown fields, and alternate gateway errors. Compact library tests add explicit prompt-preview DTOs, full owner-authorized details, thumbnail sizing/metadata removal, coalesced reads, expired/foreign/deleted capability denial and safe failures with Retry-After. The compact endpoint rejects unknown/duplicate query parameters and never accepts an input user ID as authority.
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

## Verified workspace state — September 8, 2026

The working tree based on `6be3078` passed 19 security checks, a production build
including TypeScript validation, and compiled HTTP verification against local
`next start`. The HTTP verifier scanned 26 assets referenced by rendered pages;
a separate scan covered all 362 generated JS/CSS assets with no matches for the
tested prohibited terms. Counts describe this build only. No paid production image
generation, deployment, or origin-access mutation ran in this session.

The resolver rejects forged JWTs, raw UUIDs, and user/developer/session identifiers
across headers, query strings, and cookies. JWT verification failures deny access;
user-editable elevation claims are ignored. Split browser cookies are reassembled
before verification, including when chunks arrive out of order. Existing signed
session and gateway-key validation remains in place. Administrator authorization
is separate from ordinary user authentication.

Run the compiled HTTP check after the build completes, with the same build served
throughout the check:

```sh
npm run test:image:security
npm run build
npm run start -- --hostname 127.0.0.1 --port 3419
# In a separate terminal:
node --import tsx scripts/verify-image-public-http.ts
python3 scripts/verify-docs.py
```

`GALX_VERIFY_ORIGIN` selects the HTTP verification target. The verifier checks
unauthorized requests, preflight, protected diagnostics, rendered pages, public
schema, and linked JS/CSS. Its term scan excludes substring false positives such
as the CodeXml icon and built-in stack-trace helpers. It is a regression check,
not a proof that every possible disclosure is absent. Recheck the deployed revision,
raw bodies, headers, async results, artifacts, rendered pages, and browser assets
before claiming the live site is clean.

## Operational scripts and remaining release evidence

These scripts are internal operator tools, not application endpoints or build hooks.
Their presence does not prove that they have been executed:

| Script | Effect and limits |
| --- | --- |
| `scripts/review-image-origin.ts` | Lists stored objects and probes one historical origin URL; writes private review files under `/tmp`. A sample cannot certify every object or cache. |
| `scripts/harden-image-origin-access.mjs` | Mutates edge response rules and bucket-origin access, blocks legacy asset hosts, and saves configuration backups under `/tmp`. It affects shared infrastructure; review the target and backups before execution. It is not transactional and does not recall downloaded files. |
| `scripts/verify-historical-image-delivery.ts` | Reads one completed historical record and verifies its signed download, headers, and metadata removal. Requires operator credentials; does not prove coverage of all historical assets. |
| `scripts/verify-image-production.ts` | Uses configured credentials, optionally samples a library image, and creates a production image. Consumes usage and stores a verification artifact under `/tmp`. An empty or failed library lookup is not historical-delivery evidence. |

Confirm origin and cache access separately from application serialization. Preserve
objects and internal records; do not delete history to make a boundary check pass.
Record revision, environment, date, failures, and sample coverage for any release
verification. Never publish credential values, signed download URLs, or private
operational reports.
