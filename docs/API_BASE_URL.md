# API base URL

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
