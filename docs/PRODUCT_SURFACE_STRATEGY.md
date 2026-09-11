# GALX product surface strategy

<!-- docs-scope: domain-reference -->

Private product reference, reconciled September 11, 2026. [ADR 0119](adr/0119-inference-first-product-surface-and-client-retirement.md) established the inference-first product and model-catalog landing. The explicit September 10 [image studio restoration](maintainers/image-studio-review.md) and [ADRs 0134–0136](adr/README.md) define the later image and Sites scopes. Public content follows [ADR 0129](adr/0129-public-image-artifacts-and-verified-identity.md).

## Product thesis and surfaces

GALX provides model discovery, authenticated inference, billing and usage controls. `/models` remains the default authenticated destination; explicit protected return destinations remain intact. The restored `/images` studio lets users generate and manage their own images under its separate image/public-boundary contract. Destination chat/persona/social applications remain downstream.

The selected Sites strategy adds bounded text generation and a customer-local delivery workflow. The GALX server owns quotes, account funding, rolling allowances and settlement. Deterministic code validates generated content, renders a fixed template and packages an exact artifact. The customer owns their Sites connection, source, saved version and private publication. This implementation introduces no public hosted Sites builder UI or generic agent-execution surface.

| Surface | Scope |
| --- | --- |
| Model and API integration | Capabilities, account keys, integration examples and current customer contracts |
| Billing and usage | Allowed customer statements, balances, accepted prices and opaque receipts |
| Image studio | Explicitly restored generation and personal image library under its existing scope |
| Sites content API | Quote, bounded brief, generated text schema and existing-operation recovery |
| Customer-local Sites companion | Validated static artifacts and exact owner-private save/publication using that customer's connection |
| Private operator tools | Capability, health, enrollment, desktop and operational diagnostics under administrator authorization |

## Price and allowance language

The provisional Sites fixed price and rolling allowance are configurable product decisions, not claimed supplier costs or quotas. The API quote is the accepted customer contract. A known completed generation can be charged with missing token usage; an unknown completion retains its reservation. Repairs are separately quoted. The per-generation price does not include an agency subscription, setup work, hosting entitlement or unlimited revisions.

Public descriptions explain deliverables, prices, accepted limits, errors and recovery. Keep model selection, supplier authentication, topology, readiness fields and execution diagnostics private. Do not claim exact underlying model identity, guaranteed provider quota, universal savings, margins or live availability from a local implementation.

## Roadmap and activation

The fixed Sites flow is locally implemented and verified. The prior deployed metered precursor remained disabled; the new mode requires its own compatible rollout and account activation. [Sites operations](maintainers/SITES_OPERATIONS.md) owns that procedure. Native-host private save/update has separate historical evidence; direct CLI archive upload is unqualified and does not gate content generation.

The proposed agency operations fee and setup engagement remain commercial experiments in the private strategy package. They are not implemented subscription terms. Scope any expansion by customer job, configured budget, ownership, recovery behavior and a measurable result. Additional providers and a native Codex Responses/tool integration are independent future work, not prerequisites for this bounded workflow.

## Measures and invariants

Measure successful integrations, completed and reconciled content operations, original-price settlements, customer-owned delivery, support effort and paid retention. Track unknown outcomes and actual expense where available independently from generated-text volume. A passing build or a private sample publication does not establish full live paid delivery.

Preserve inference APIs when changing presentation. Keep verified account identity and all financial writes server-side, public DTOs allowlisted, and uncertain side effects recoverable under their original identity. Do not introduce a public database authority surface or a repeated publication as a shortcut to recovery.
