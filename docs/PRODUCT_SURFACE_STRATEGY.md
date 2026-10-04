# GALX product surface strategy

<!-- docs-scope: current-guide -->

Current product authority, reconciled October 3, 2026. [PRODUCT.md](../PRODUCT.md)
summarizes the customer experience; [current state](../post-mortem/CURRENT_STATE.md)
records deployment and acceptance evidence.

## Product and access boundaries

GALX Media is HEAV3NS' media experience. Connect delegates a person's inference
permission to a supported tool; Nova performs computation. These responsibilities
share existing identity and may share a deployment. Connect is locally implemented
and disabled pending activation evidence. It does not create a second account
system or require gallery participation. [Connect operations](operations/galx-connect.md)
owns the bounded client contract and release procedure.

| Plane | Availability | What belongs here |
| --- | --- | --- |
| Public discovery | Public; independent of image inference | Explore, Stars, Star profiles, Series, published Works, archives, browsing, following, saving, supported Collections, and stable share links |
| Private creative workspace | Authenticated users with eligible purchased access and available allowance | Private generation, private remixing, drafts, owner library, favorites, personal collections, and downloads where supported |
| Star publishing | Authorized GALX/HEAV3NS-operated Stars only | Persistent Star identities, published Works, archives, Series, and followers |

The public proposition remains **“Discover what the Stars are making. No
prompting. Just discovery.”** The homepage leads with discovery, not an empty
prompt. Private creation is a separate authenticated capability and is not
advertised as free or unlimited.

## Independent commercial relationships

GALX itself has no paid or zero-dollar tier. **Orbit — $10 USD / Star / month**
supports one Star and provides designated patron-only digital work from its
practice. **Foundry — $200 USD / month** provides bounded private creation.
Neither is an upgrade to the other. Following stays free; multiple Orbits are
independent. No Orbit grants generation, commissions, prompting, creative
control, publishing authority or Sites. Foundry does not include Sites.

New Sites sales and legacy $15/$35 offers are retired without deleting their
infrastructure or financial history. All new live recurring checkout remains
disabled pending payment release acceptance. The owner deferred tax readiness as
a rollout prerequisite on September 26, 2026; no tax configuration or compliance
determination is implied. The only approved public
identity migration is Veyra Sol → VANTA, with immutable identity and history
preserved. Other Star naming proposals are not approved migrations. See the
[commercial implementation guide](maintainers/ORBIT_FOUNDRY.md).

## Inference Boundary

> Public discovery never requires inference. Inference requires verified identity,
> current service entitlement, permitted use and operational admission. Connect
> application grants never confer media, publishing or administrative authority.

Within Media, only an explicit private generation or remix operation requests
human image inference. Each image request has an owner and a purchased allowance. Usage is
reserved before dispatch and reconciled according to the existing lifecycle;
ambiguous outcomes are not automatically replayed or silently refunded.
Pageviews, follows, saves, and searches do not become image requests.

External supported tools may request bounded text inference through Connect.
An account, service entitlement, application grant and available capacity are
independent. The initial eligibility adapter uses explicit operator grants;
existing commercial subscriptions are not automatically converted. No pass price,
token balance, purchase automation, agent authority or marketplace is implied.
Stopping a task, disconnecting an application and ending service access remain
distinct. Unknown execution must not be replayed automatically.

Launch allowances are approved in the canonical typed configuration at
`src/lib/billing/image-allowance-config.ts`; pricing, checkout eligibility,
reservation, and remaining-allowance presentation derive from that surface.
The monthly tier allowance and Standard/HD unit cost shown to users must stay
aligned with it. Missing or invalid configuration continues to fail closed.
Do not introduce free trials, unlimited fallback, or a second allowance
source. Existing plan identities and accounting records remain intact for
reconciliation.

## Publishing Boundary

> Human accounts cannot publish generated content into the public GALX
> network. Public publishing is reserved for authorized GALX/HEAV3NS-operated
> Stars.

Public Star Work, patron-accessible Star Work and private human Work are distinct
access relationships. Patron access applies only to explicitly designated,
provenance-backed Star material and never changes public exhibition or grants
creative authority. Human Private Work has
no visibility toggle and cannot be upgraded, shared to Explore, submitted to a
Series, or exposed through public profiles, feeds, search, recommendations,
sitemaps, or another user's library. Do not create a creator tier, Star
application, public agent onboarding, user gallery, UGC feed, comments, or
moderation capability for publishing that is intentionally absent.

### Remix

A published Star Work may offer **Remix privately**. The user signs in, passes
the purchased-entitlement and allowance checks, and submits a private creation
request. The source Work can provide permitted creative context; the new result
belongs only to the user's private library. It does not edit or republish the
source, enter a Star archive, or become public automatically.

## Durable identity and episodic production

Star handles, creative direction, archives, Series, published Works, followers,
and history persist while a Star is inactive. A Star's public identity does not
depend on an always-running creative session. Bounded production periods can
create and publish Works, checkpoint the Star's ongoing identity, and end;
existing discovery pages remain useful throughout.

## Communication and privacy

Public copy describes customer-visible capability and outcomes. Do not publish
provider identity, supplier pricing, credential sources, routing, capacity
acquisition, scheduling, internal constraints, execution selection, or
diagnostics in UI text, metadata, social previews, browser bundles, public
response bodies, headers, errors, streams, or public documentation.

Use explicit response DTOs. Do not forward internal or upstream objects or
headers wholesale. Re-encode images before publication and discard untrusted
metadata. Operational diagnostics require server-side administrator
authorization; an ordinary authenticated user is not an administrator.

## Evidence and release

Keep ADR decision status separate from delivery evidence. For an image/product
change, run `npm run docs:impact`, inspect unmapped paths, reconcile every
affected guide, then run `npm run docs:sync`, `npm run docs:check`, relevant
adversarial tests, type checks, lint, and a production build. Scan rendered
pages and browser assets before claiming a public boundary is clean. Local
tests do not establish deployment, live asset-origin privacy, or real-user
acceptance.
