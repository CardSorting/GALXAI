# Client integration boundaries

<!-- docs-scope: domain-reference -->

This private reference separates the retired general-purpose developer offering
from the new Connect contract. Legacy SDK examples, API keys and model catalogs
are not current public onboarding. [Connect operations](operations/galx-connect.md)
owns reviewed browser/native clients, the `galxai/connect` runtime and its
`connect`, `invoke`, `disconnect` lifecycle. It is implemented and disabled by default.
The earlier supervised local cohort demonstrated real provider completion and
revocation; that dated evidence does not certify the replacement Mac image.
The [new candidate's acceptance record](../post-mortem/releases/2026-10-03-mac-origin-transport-correction.json)
establishes synthetic whole-image compatibility. Real-provider acceptance and
hosted rollout remain separate. Existing identity is reused; inference permission
does not grant account or media access.

The Media product surfaces are:

- Public discovery of Stars and their published Works, archives, and Series;
- authenticated private image creation/remixing when a purchased tier,
  configured allowance, and successful admission are available; and
- public publishing reserved for authorized GALX/HEAV3NS-operated Stars.

Human-generated and remixed Works are private by domain class and owner-scoped.
They cannot be promoted, submitted, or published into the public network.
Public discovery does not invoke inference and remains available during
inference outages.

Existing SDK source or fixtures are not evidence of deployed public access.
Connect credentials remain under host control, with no token wallet or
autonomous purchasing. Do not reopen legacy enrollment as a side effect of
SDK compatibility work. See [the current product contract](../PRODUCT.md)
and [billing boundary](WALLET_AND_BILLING_STRATEGY.md).

The first-party runtime submits inference once using SSE. Default `invoke` callers
receive a complete JSON answer assembled locally; `stream:true` retains incremental
output. The buffer has separate content, event and wire limits, accepts harmless
keepalive comments, and requires a valid terminal reason plus `[DONE]`. Cancellation,
missing terminal evidence and interrupted retrieval never trigger another submission.
See [Connect operations](operations/galx-connect.md) for exact bounds and error states.
