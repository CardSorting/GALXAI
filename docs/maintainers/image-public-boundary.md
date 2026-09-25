# Image public boundary verification

<!-- docs-scope: current-guide -->

Current product authority: [ADR 0160](../adr/0160-private-human-creation-star-publishing.md).
Artifact normalization and verified identity remain governed by [ADR 0129](../adr/0129-public-image-artifacts-and-verified-identity.md).

Public documentation describes capability, not implementation. The application
creation route is not a public inference API; its responses use explicit field
projection. Image HTTP results default to sanitized binary artifacts, while
explicit JSON response contracts use allowlisted DTOs. This is an internal
maintainer record, not public site content.

The Inference Boundary is independent of publication: public discovery does not
invoke image inference; human-triggered inference requires verified
authentication, an eligible purchased tier, an available reserved allowance,
and successful admission before dispatch. If allowance configuration is
missing, creation and checkout fail closed. The Publishing Boundary reserves
public Works for authorized Stars. Human-generated and remixed Works are
non-publishable owner-scoped records, not private rows waiting for a visibility
toggle. Public discovery projections include only eligible published Star
Works.

Community discovery is part of the public image boundary. Star profiles use the
canonical `/profile/<handle>` route and `/api/community/participants/<handle>`
endpoint. Both expose explicit identity and creation DTOs only; the gallery is
creator-scoped, newest-first and continuable. Ordinary account profile data
remains private and is never projected through the Star profile endpoint.
Missing, invalid or temporarily unavailable Star profiles
return authored public categories without database fields, execution context or
diagnostics. Keep the profile and feed projections aligned when adding a new
public field. Explore hide is a private, signed-in personalization preference:
it removes a creation only from that viewer's Explore stream and never changes
the creator's publication state. The Star profile projection intentionally does
not consume the viewer preference, so a Star's complete public gallery remains
available even when one of its creations is hidden from Explore. Hides are
account-scoped, reversible, capped at 500 active preferences, and guarded by a
30-per-ten-minute and 200-per-day allowance; undo does not replenish either
allowance. Unknown showcase IDs may be dismissed locally but are never written
as durable preferences. This control is not a safety report or a community
vote. Handles are
normalized before they become links, avatars accept only site-relative or
HTTPS image URLs, and malformed gallery cursors are rejected with a generic 400
response.

Human creation always targets the private non-publishable class. No request
field, signed-in account, paid tier, UI action, or legacy visibility mutation
can promote it to a public Work. A Star Work may expose “Remix privately”; the
remix uses the same private entitlement and reservation pipeline and remains
visible only to its owner. The original Star Work and its public archive remain
unchanged.

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
opaque capability and re-encode stored images again, including historical assets.
For a private row, the capability is additionally checked against the current
owner session before every cache lookup; copying a private URL to another
account or an anonymous browser returns the same generic not-found category.
Historic `unlisted` or human-public rows do not establish a current publishing
capability; the current data boundary classifies human Works as private and
Star Works as published. Historical origin controls and cached copies require
separate verification.
The exact thumbnail child is included in the public-product route policy; it requires no developer-preview grant and arbitrary child routes are not exempted. The thumbnail child route uses the same capability, checks the current owner-scoped row before every cache hit, and emits a fresh WebP preview inside 512×512. Storage/processing work has explicit admission, byte and time bounds. [Large-library guidance](image-library-scale.md) owns the precise limits and concurrent-read semantics.

Public errors use stable categories and opaque request IDs. Proven capacity rejection before dispatch (local admission, or a typed relay 503 with `not_accepted` and an allowlisted capacity/readiness code) persists only the allowlisted `generation_not_started` category and returns 503 with a short Retry-After. The same category appears in failed snapshots; arbitrary receipt diagnostics are never projected. Older/generic failed receipts remain uncertain. Middleware no longer
adds execution timing or route-classification headers. Operational endpoints require
a separate administrator credential. Ordinary user authentication is insufficient.
Private task records retain execution details; customer snapshots and webhooks use
public projection. Logs omit arbitrary provider message payloads, which may quote
user secrets, while keeping categories, status and call sites. Existing operational
metrics retain capacity, model, attempt and timing information privately.

No Image request uses the retired free-creation gate. Image allowance admission and lifecycle accounting follow the purchased private-creation contract below. The separate free Sites allowance and aggregate Sites limits remain in their own product policy and do not authorize image inference.


## Capability availability

`GET /api/images/availability` requires a verified active account and returns only `status: available | unavailable | unknown` with private, no-store headers. The server reads the configured controller using its inference credential (only Premium when full isolated mode or the independent Premium image switch is enabled), accepts at most 1 KiB, refuses redirects and times out after five seconds. No upstream objects, diagnostics, model inventory or headers reach the browser. A missing/older endpoint or failed read is unknown, never proof of readiness. The exact route is exempt from developer approval, not account verification.

The controller’s authenticated `GET /v1/images/availability?model=...` projects one boolean from fresh image capability. It performs no paid probe, reservation, generation or quota mutation. Availability is advisory; authoritative admission still runs for every generation. The isolated Premium runtime reads its own in-process account engines directly, without an internal HTTP availability endpoint or provider probe. It reports true for fresh successful image evidence, false for unavailable execution or fresh negative evidence, and null when evidence is absent or expired. The application maps null to unknown. Chat inventory cannot establish image permission. A new explicit generation still needs central admission; an unknown status never creates a background probe. See [isolated service operations](../runbooks/relay-pool-services.md) for configuration and separate first-image qualification.

Premium image results use owned storage, a manifest and a durable library flush before receipt completion. Transport success alone is insufficient; completion validates the stored asset owner. The private creation path additionally requires a purchased image allowance reservation committed with its durable receipt before a request can be claimed or dispatched. No legacy/free Image balance authorizes new human inference. Text and Sites admission remain governed by their independent product contracts.

## Purchased private-creation admission

[Quota operations](FREE_GENERATION_QUOTA.md) owns the retired one-time free Image balance as historical accounting only; it cannot authorize new image work. Human synchronous and asynchronous requests require verified account identity, an eligible purchased Image entitlement, sufficient current allowance, a durable reservation and successful admission before dispatch. The reservation is serialized against the account's allowance period so concurrent requests cannot exceed the allocation. Launch values are maintained in the canonical typed configuration; missing or invalid configuration, entitlement, allowance, storage setup, or admission rejects before dispatch.

Saved retries reuse the original durable receipt and reservation rather than reserving twice. Confirmed pre-dispatch rejection, queued cancellation, and queued expiry before claim may release a reservation; successful completion settles according to the established lifecycle; ambiguous generation or storage outcomes after claim remain reserved until authoritative reconciliation. Never clear an uncertain reservation based only on age or add a free automatic retry. Public errors remain generic and allowlisted. The browser allowance DTO exposes only the plan, usable remaining allowance, renewal information and supported product state; billing IDs, grants, payment evidence and execution records stay server-side.

## Workspace entry

`/images` redirects to public Explore. `/images/create`, `/images/library`, and
`/images/favorites` require a verified account session; middleware and each
server page guard independently. Missing, malformed, forged, anonymous or
revoked sessions cannot render the workspace. Refresh uses the Auth service and
retains response cookies; temporary verification failures return a generic
unavailable state. Workspace pages and denials are private/no-store and
noindex. Public discovery routes remain available without an account or image
service readiness. The private studio never hydrates from public demonstration
content or treats a public Star Work as a user's saved private artifact; a
deliberate remix action enters the authenticated, metered private pipeline.

Application artifact URLs are not sufficient proof of storage privacy. New
human objects use a distinct private image storage class, but historical human
objects were stored alongside publicly served assets. Verify that the actual
object origin rejects unauthenticated direct requests for private keys and
historical objects, including cached variants, and migrate/protect historical
objects before claiming all private artifacts are inaccessible outside the
owner-gated application route. Do not treat unguessability, owner-scoped
database rows, or `private, no-store` response metadata as origin access
control.

## Verification

Run `npm run test:image:security`, `npx tsc --noEmit`, and `npm run build`.
The Explore preference tests additionally assert that anonymous callers are
rejected before any write, caller-supplied viewer IDs are ignored, the response
is an allowlisted DTO, rate/cap outcomes are generic and retryable, the private
feed response is not publicly cacheable, and a Star profile remains unaffected.
The [workspace authentication runbook](../operations/workspace-auth.md) owns the sign-in flow and server-backed browser fixture. A current-owner API 401 unmounts the studio and focuses recovery; 403, rate limits and outages do not become sign-in loops. Create/My images switches preserve the supported library view in the URL; same-tab drafts remain account scoped and no generation is replayed.

Initial browser profile failures withhold the studio inside the shared shell, preserving public navigation and Home. Manual session recovery retains same-tab drafts; its pending, unsuccessful and offline states use authored messages. A 403 image error says the action is unavailable for the account and never claims that the session expired. The shared loading shell announces a longer wait after six seconds, outside its decorative busy region. The compiled navigation fixture additionally verifies draft continuity, keyboard recovery, themes and reflow; no new storage or mutation-retry contract is introduced.

The workspace entry suite tests middleware variants, independent server-page denial, Auth outages, valid and revoked native sessions, and expired-session refresh. Existing browser-only account fixtures must provide a verified server session before opening the studio; do not bypass the gate. The compiled HTTP verifier expects sign-in redirects from Images and Sites, scans the public sign-in/home pages and their assets, and preserves capability/JSON/binary checks.
The HTTP suite opens a loopback server around the actual route handlers and merges
middleware headers. It tests binary success, explicit JSON, format conversions,
metadata removal, malformed input, auth failures, rate limits, unavailable models,
capacity errors, exhausted dispatch errors, timeouts, async polling, terminal SSE,
downloads, expired/tampered capabilities, private-owner/foreign artifact access,
unknown fields, and alternate gateway errors. Compact library tests add explicit
prompt-preview DTOs, full owner-authorized details, thumbnail sizing/metadata
removal, coalesced reads, expired/foreign/deleted/private capability denial and
safe failures with Retry-After. The compact endpoint rejects unknown/duplicate
query parameters and never accepts an input user ID as authority.
The OpenAPI test closes JSON object schemas. Documentation and catalog checks
prevent reintroduction of known private vocabulary in published contracts.

Repository review included routes, serializers, middleware, model descriptors,
SDK adapters, static documents, search suggestions, social images, metadata,
README and product API documentation. Operational histories and runbooks remain
private repository material; they must never be copied into site content.

## Adversarial review and operational limits

Customer outputs should reveal only sanitized images, customer-level request
state, user-owned library fields and generic error categories. Model identity
and execution selection remain server-side. Public download
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
