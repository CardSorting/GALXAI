# ADR 0119: Inference-First Product Surface and First-Party Client Retirement

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Metadata

* **Status**: Accepted with later scoped extensions: the image studio was restored September 10, and Sites content/customer-local delivery is governed by ADRs 0134–0136
* **Date**: 2026-09-04
* **Subsystem**: product surface, authentication, model catalog, Supabase lifecycle
* **Impact**: product positioning, frontend maintenance, post-auth activation, database surface area
* **Migration**: `20260905011334_retire_browser_client_tables.sql`

## 1. Context

GALXAI is an inference platform: its durable value is model discovery, authenticated API access, routing, metering, reliability, and spend governance. A first-party browser chat application and image studio introduced a conflicting product model. Users could reasonably interpret GALXAI as another destination chat or creative application, while maintainers inherited conversation presentation, composer behavior, sharing, personas, generated-image history, and studio interaction state.

That surface duplicated work that belongs in downstream products. It also coupled browser features to `custom_personas` and `image_generations`, expanded the public Supabase schema, and pulled roadmap attention away from the inference boundary.

The desired first authenticated action is therefore model selection, not content generation. A developer should see the available model fleet, choose a workload class, inspect the exact model ID and economics, and continue to API-key or integration setup.

## 2. Decision

### 2.1 Product boundary

GALXAI keeps the destination browser chat/persona retirement. The original image-studio prohibition was superseded by the explicit September 10 restoration at `/images`, recorded in [the image review](../maintainers/image-studio-review.md). The original retirement affected these routes/components; this list is not an instruction to remove the restored studio:

* `/chat`, `/share`, and `/characters`;
* `/studio`;
* the homepage procedural image-studio interaction;
* the first-party persona CRUD endpoint and repository;
* the exported `<GalxChat />` application widget.

Optional SDK primitives that developers embed in their own products are not first-party destination applications. They may remain when they preserve server-side credential custody and call the public inference contracts.

The existing `/playground` is classified narrowly as a stateless API request diagnostic. It may expose request JSON, response envelopes, headers, latency, and copyable integration snippets, but it must not add conversation history, personas, sharing, image libraries, creative project state, or synthetic output represented as successful inference. It should evolve toward the product name **API Request Inspector**. The destination test is behavioral, not route- or component-name based.

### 2.2 Inference contracts remain

The retirement is a presentation decision, not a model-capability deletion. GALXAI retains:

* `POST /v1/chat/completions` and compatible message/inference handling;
* `POST /v1/images/generations`;
* `GET /v1/models` and model detail discovery;
* logical session identity, rolling context, and `chat_conversations` / `chat_messages` for callers that explicitly opt into durable inference sessions;
* the versioned browser-agent transport SDK as an integration library, without a GALXAI-hosted chat destination.

Transport names such as `chat`, `messages`, and `conversation` describe wire compatibility and context semantics. They do not authorize a consumer chat product.

### 2.3 Post-auth activation

`/models` is the default successful authentication destination for password login, signup, email confirmation, OAuth callback, and the homepage authentication flow. Explicit return destinations continue to win for user-initiated protected workflows.

The catalog renders the canonical `FRONTEND_VISIBLE_MODELS` array as cards and exposes model-type tabs for all models, language/reasoning models, and image-generation models. The selector includes counts, keyboard navigation, accessible tab semantics, search, and an empty-result recovery action. Model cards lead to specifications or API-key deployment rather than opening an inference composer.

### 2.4 Database retirement

The client-only `public.custom_personas` and `public.image_generations` relations are cleared and removed from the public/Data API schema. The applied migration:

1. removes persona projection from `fn_get_chat_delta_sync`;
2. drops the persona foreign key without removing generic `persona_id` compatibility metadata;
3. deletes the eight legacy persona rows and the already-empty image history;
4. revokes all table privileges; and
5. moves empty tombstones to `private.retired_custom_personas` and `private.retired_image_generations`.

The private empty tombstones satisfy the repository's staged expand/contract rule and provide a schema-only rollback path for one release. Deleted client data is not recreated by rollback. Direct `DROP TABLE`, `TRUNCATE`, and `CASCADE` remain prohibited in forward migrations.

## 3. Invariants

1. The primary hosted journey discovers, configures and governs inference. The restored `/images` surface is an explicit supported exception; destination chat/persona features remain retired. Sites content and customer-local delivery follow ADRs 0134–0136 without adding a hosted builder.
2. Removing a first-party client must not remove its compatible inference endpoint.
3. Session persistence exists for explicit inference continuity, not to justify restoring a browser chat UI.
4. The default post-auth destination is the canonical model catalog.
5. A model card ends in specifications, API credentials, or integration guidance—not an embedded composer.
6. Client-only persistence must not remain exposed through the public Supabase schema after its product surface is retired.
7. This ADR governs the retained inference-first/default-auth boundary. The September 10 image restoration and ADRs 0134–0136 govern their later scoped extensions.

## 4. Consequences

### Positive

* The primary product reads as an inference and governance platform immediately after login.
* Destination chat, sharing and persona presentation remain retired. The restored image studio again owns its explicitly supported generation/library UI.
* Supabase loses two public client-only relations and the chat sync payload becomes smaller.
* Chat and image inference remain compatible for SDK, REST, IDE, and downstream application consumers.

### Trade-offs

* Destination conversation UI remains downstream. Image generation is available through the separately restored studio; Sites content is delivered through its bounded API and customer-local workflow.
* Activation now depends on model-card clarity and a strong path from model choice to API-key creation and documentation.
* The private tombstones remain for one staged-retirement interval; a later contract decision may remove them under the database governance protocol.

## Sites extension — September 11

[ADR 0134](0134-fixed-price-sites-generation-with-opaque-provider-quotas.md) adds fixed-price bounded content under verified account identity. [ADR 0135](0135-durable-sites-receipts-and-local-admission.md) defines durable settlement evidence, and [ADR 0136](0136-customer-owned-sites-delivery.md) keeps artifact save/publication under customer ownership. The flow uses the existing relay and makes no claim of native agent-provider compatibility or a hosted general-purpose builder. The `/models` default and private operational boundary remain intact.

## 5. Original retirement verification

These checks describe the original retirement scope. They are not a fresh verification of production database state or an instruction to remove the later restored image studio. Sites verification is recorded separately in ADRs 0134–0136.

* `npm run build` proves the retired application routes are absent and `/models` remains generated.
* `npx tsc --noEmit` validates authentication and model-catalog contracts.
* `npm run lint` validates the changed frontend surface.
* `npm run db:verify` validates migration and rollback parity.
* `npm run db:test` uses a disposable Docker fixture under [ADR 0133](0133-explicit-validated-enrollment-and-test-isolation.md), with optional initialized loopback overrides; it is not a live production verification command.
* `npm run test:chat:hardening` verifies preserved context and inference-session handling.
* Live catalog checks verify both retired relations are absent from `public`, both private tombstones contain zero rows, and chat sync no longer references `custom_personas`.

## 6. Supersession and references

* Partially supersedes ADR 0055 by retiring the hosted chat widget while retaining SDK and server-action integrations.
* Supersedes the persona/image table scope inherited through ADR 0101 and reconciled by ADR 0117; ADR 0117 remains authoritative for surviving tenant-owned tables.
* Partially supersedes ADR 0118: its versioned same-origin transport library remains, but there is no first-party browser agent/chat application.
* Clarifies ADR 0116: logical session identity and persistence remain infrastructure contracts independent of any browser chat UI.
* [Product Surface Strategy](../PRODUCT_SURFACE_STRATEGY.md) translates this decision into navigation, copy, roadmap, and activation rules.
