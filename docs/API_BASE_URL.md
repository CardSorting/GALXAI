# API base URL

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

> Application/SDK scope: these interfaces do not replace the [federation contract](FEDERATION_STRATEGY.md). Model eligibility precedes load; no implicit model substitution occurs in the federation. The [Codex image alias](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility) is opt-in, verified, and provider-managed. Use the [recovery table](RELAY_API_REFERENCE.md#request-recovery) for accepted or uncertain work. Server credentials must never enter browser bundles.

> Runtime boundary: this guide describes the product/application API. The federation relay has a separate [API contract](RELAY_API_REFERENCE.md), inference and administrator keys, and an HTTP 202 chat job workflow. Its local deployment is covered by the [relay runbook](RELAY_VNEXT_RUNBOOK.md). Product keys, relay keys, and upstream provider credentials are distinct.

Use `https://galx.ai/v1` for customer API requests and SDK setup.

```python
import os
from openai import OpenAI

client = OpenAI(base_url="https://galx.ai/v1", api_key=os.environ["GALX_API_KEY"])
```

`https://api.galx.ai` is a separate Cloudflare Worker deployment configured in `wrangler.toml`. It runs `GalxEdgeGateway`, with its own authentication, endpoint coverage, and upstream configuration. It does not redirect or proxy to the application API. Treating the two hosts as aliases can change request behavior.

The application routes live under `src/app/v1/`. Its chat handler uses `GalxModelRouter`; the Worker has a separate provider pass-through implementation. The SDK default is defined in `src/sdk/base-url.ts`. Explicit SDK `baseURL` options and `GALXAI_BASE_URL` / `GALX_BASE_URL` overrides remain supported. Worker configuration variables `GALX_EDGE_URL` and `NEXT_PUBLIC_GALX_EDGE_URL` no longer implicitly override the SDK base URL.

## Routing verification

Unauthenticated live checks on September 6, 2026 (America/Denver) found:

- `https://galx.ai/v1/models`: HTTP 200, model catalog from the application's `/v1/models` route, with Vercel response headers.
- `https://api.galx.ai/v1/models`: HTTP 401, API-key authentication error from the separate Cloudflare gateway.

These checks establish distinct routing behavior. They do not establish authenticated inference success, uptime, or an SLA. No domain or deployment configuration was changed.
