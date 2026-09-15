# Project context

Private maintainer context. Read [current operating state](post-mortem/CURRENT_STATE.md) and [product scope](PRODUCT.md) first. [Documentation policy](docs/DOCUMENTATION_POLICY.md) defines authority; [the complete catalog](docs/CATALOG.md) distinguishes guides, component references, decisions and historical evidence.

For an incident, use [post-mortem](post-mortem/README.md) and update its register, rolling log, failure modes and affected guide bodies. Do not infer deployment from source or copy an old “not deployed” statement across later releases. [The September 11 context](post-mortem/archive/2026-09-11/context.md) is archived.

Public content describes capabilities and user expectations. Operational topology, credential sources and diagnostics remain private. Database authority is durable; caches optimize work without granting permission or fabricating successful persistence. Recovery preserves tenant identity and does not replay ambiguous side effects. [Manual desktop enrollment](docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) is the sole shard onboarding procedure; its owning desktop also supplies manually renewed sign-ins. Automatic worker recovery and saved-file sync do not grant external ingestion or provider-session renewal.
