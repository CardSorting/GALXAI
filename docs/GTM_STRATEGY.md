# GALX Go-To-Market and positioning strategy

<!-- docs-scope: commercial-draft -->

Commercial planning material, reconciled September 18, 2026. Claims, prices
and access terms are only current when they match the product and billing
authorities. Public Developer Access has been retired; this document does not
authorize infrastructure changes, commercial entitlements, private approvals,
or a live release.

## The category

GALX presents **managed intelligence**.

- **GALX** is where people create.
- **GALX Nova** is the managed intelligence layer behind the experience.
- Programmable access is an internal capability and, when deliberately useful,
  an explicitly authorized private integration—not a public subscription.

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
others are making. Behind the experience is GALX Nova. Create in GALX, while
GALX retains the option to authorize private integrations that it can support.

The primary customer journey is:

1. Make something worth sharing.
2. Explore creations and find the next idea.
3. Discover that the experience is powered by GALX Nova.
4. Keep programmable access deliberately bounded to products, experiments,
   and approved private cohorts.

The public story does not lead with capacity, pools, quotas, provider names,
routing, model-training claims or operating internals.

## Commercial boundaries

GALX Pro is the consumer image plan at **$10 USD/month for one account**. It
has a real Stripe subscription, published Image Studio terms and fair-use
boundaries.

There is no public Nova Developer subscription, public usage price, or
self-service API purchase path. Private access follows an administrator-owned
resource lifecycle: deliberate review, approval, credential provisioning,
bounded allocation, metering, and revocation. Historical billing records remain
available for reconciliation but never create or approve private API access.

This is intentionally closer to the familiar control-plane pattern used by
cloud consoles than to a public marketplace: GALX chooses the workload it is
willing to accept, then gives an administrator the tools to operate that
workload safely.

## Audience and messages

### Creators and community members

Message: “Make something worth sharing.”

Show the image prompt, studio, community stream and prompt exploration. State
that creations are public by default where applicable. Use real product data for
community counts and examples. Keep Nova attribution farther down the page.

### Developers and private integrators

Message: “Build with GALX Nova when GALX has explicitly enabled your
integration.”

Explain supported API capabilities and integration requirements without implying
public availability. Do not publish a subscription price, public usage rate,
waitlist, application form, or capacity promise. Keep allocation and metering
details in the authenticated admin console.

### Teams and assisted buyers

Use the current supported access path and contact process. Do not introduce
Nova tiers, enterprise limits, dedicated capacity, SLAs or contract terms that
have not been approved.

## Distribution

- Make the image experience the front door and the community the discovery
  loop.
- Use search and social metadata that names GALX Images and GALX Nova without
  exposing implementation details.
- Let the Developer page explain the boundary and supported capabilities; it has
  no checkout, application, waitlist, or public provisioning action.
- Use documentation to explain how to call the API only after access is
  granted; do not use documentation as a public infrastructure tour.
- Measure completed image creation, exploration, remix, private integration
  health, allocation use, and revocation outcomes. Do not substitute decorative
  counts, savings claims, or benchmark promises for product data.

## Founder answers

- **What is GALX?** GALX lets people create AI images. The intelligence
  service behind it is Nova, and GALX may authorize bounded private API
  integrations when it deliberately chooses to support them.
- **What is Nova?** Our managed intelligence layer for reasoning and
  generation.
- **What does managed mean?** You use the capability. GALX handles the
  underlying execution.
- **How does the underlying system work?** We keep implementation details
  internal. We can explain supported capabilities and integration
  requirements.
- **Did you train the models?** Nova is the name of our managed service, not a
  claim that GALX trained a foundation model.
- **How can I get API access?** Public self-service access is not available.
  GALX may deliberately authorize a private integration and administer its
  credential, scope, allocation, metering, and revocation.

## Acceptance boundary

Before publishing a Developer capability or access term, verify it against the
actual API and admin implementation. The current boundary is complete when the
consumer Pro subscription remains independently operable, public Developer
checkout and enrollment are absent, private provisioning is admin-only,
metering and allocation controls remain operational, historical reconciliation
remains intact, and public pages do not expose retired prices, waitlists,
unverified limits, internal provider details, or unsupported usage economics.
