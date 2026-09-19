# GALX Go-To-Market and positioning strategy

<!-- docs-scope: commercial-draft -->

Commercial planning material, reconciled September 18, 2026. Claims, prices
and access terms are only current when they match the product and billing
authorities. This document does not authorize infrastructure changes,
commercial entitlements or a live release.

## The category

GALX presents **managed intelligence**.

- **GALX** is where people create.
- **GALX Nova** is the managed intelligence layer behind the experience.
- **Developer** is the separate route for subscribing to programmable access
  to supported Nova capabilities.

Canonical description:

> GALX Nova is our managed intelligence layer for reasoning and generation.

Plain-language explanation:

> You bring the task. GALX handles the underlying execution.

“Managed intelligence” explains the relationship between the customer and
GALX. It is not another technical prerequisite before someone creates an image.
The term is used by other companies; GALX defines its own service meaning and
does not claim to have invented the category or be its first provider.

## The customer narrative

Bring an idea, not an infrastructure plan.

GALX puts the experience first: describe an image, create it, and explore what
others are making. Behind the experience is GALX Nova. Create in GALX, or
use Developer Access to build with supported capabilities through the API.

The primary customer journey is:

1. Make something worth sharing.
2. Explore creations and find the next idea.
3. Discover that the experience is powered by GALX Nova.
4. Choose the separate Developer path only when programmable access is needed.

The public story does not lead with capacity, pools, quotas, provider names,
routing, model-training claims or operating internals.

## Commercial boundaries

GALX Pro is the consumer image plan at **$10 USD/month for one account**. It
has a real Stripe subscription, published Image Studio terms and fair-use
boundaries.

GALX Nova Developer Access is a **$50/month recurring subscription** for API
access. The fee is an access fee, not prepaid inference, a credit bundle or an
included usage allowance. Usage is billed separately; this change does not
define usage pricing, metering, balances, limits or consumption billing.

Think of Developer Access like membership to a managed workspace: the
subscription gives the developer access to the service; consumption is billed
separately. “Membership” describes the existing Developer Access subscription;
it is not a new plan, workspace application, team-seat offer or capacity
promise.

The Developer route creates the subscription through the existing Stripe
subscription architecture. A successful active subscription grants only the
Developer/API access entitlement. Cancellation or expiration removes that
entitlement through the existing webhook lifecycle. A historical wallet
payment may be reconciled for ledger/refund purposes, but it never creates or
approves Developer access. Do not restore prepaid pack checkout, match
bonuses, old tiers or retired usage promises.

## Audience and messages

### Creators and community members

Message: “Make something worth sharing.”

Show the image prompt, studio, community stream and prompt exploration. State
that creations are public by default where applicable. Use real product data for
community counts and examples. Keep Nova attribution farther down the page.

### Developers

Message: “Build with GALX Nova.”

Explain supported API capabilities and integration requirements. State the
$50/month access subscription and separate usage boundary. Do not defend the
number with internal costs or unverified performance claims.

### Teams and assisted buyers

Use the current supported access path and contact process. Do not introduce
Nova tiers, enterprise limits, dedicated capacity, SLAs or contract terms that
have not been approved.

## Distribution

- Make the image experience the front door and the community the discovery
  loop.
- Use search and social metadata that names GALX Images and GALX Nova without
  exposing implementation details.
- Let the Developer page qualify interest through the supported-capability
  explanation and subscription checkout; keep the private preview form as a
  separate path.
- Use documentation to explain how to call the API only after access is
  granted; do not use documentation as a public infrastructure tour.
- Measure completed image creation, exploration, remix and active Developer
  subscriptions. Do not substitute decorative counts, savings claims or
  benchmark promises for product data.

## Founder answers

- **What is GALX?** GALX lets people create AI images. The intelligence
  service behind it is Nova, and developers can subscribe for API access.
- **What is Nova?** Our managed intelligence layer for reasoning and
  generation.
- **What does managed mean?** You use the capability. GALX handles the
  underlying execution.
- **How does the underlying system work?** We keep implementation details
  internal. We can explain supported capabilities and integration
  requirements.
- **Did you train the models?** Nova is the name of our managed service, not a
  claim that GALX trained a foundation model.
- **Why should I pay $50?** The $50/month subscription provides access to the
  supported Nova API. Usage is billed separately, so review the documented
  capability and applicable usage terms before building.

## Acceptance boundary

Before publishing a Developer capability or price term, verify it against the
actual API and billing implementation. The current change is complete when the
consumer Pro subscription remains independently operable, Developer checkout
creates only the $50/month access subscription, no usage credits are created,
historical reconciliation remains intact, cancellation removes access, and
public pages do not expose retired pack names, match bonuses, unverified
limits, internal provider details or unsupported usage economics.
