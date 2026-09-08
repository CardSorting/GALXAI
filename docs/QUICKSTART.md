# Quickstart

<!-- docs-scope: current-guide -->
> **Reading scope:** Current guidance. The federation contract governs relay behavior; source and dated verification define implementation evidence. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

Use `https://galx.ai/v1` from your application server. Store `GALXAI_API_KEY` in the server environment. Browser UI calls your backend; never put a developer credential in a `NEXT_PUBLIC_*` variable.

## Make one explicit-model request

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"],
    max_retries=0,
)
response = client.chat.completions.create(
    model="gpt-5.6-terra",
    messages=[{"role": "user", "content": "Explain capability-aware routing briefly."}],
)
print(response.choices[0].message.content)
```

The selected model must be enabled for your key and have eligible capacity. Check the [catalog and availability distinction](MODEL_CATALOG.md). `api.galx.ai` and `relay.galx.ai` are separate services, not interchangeable base URLs.

## Generate an image

The product endpoint is `POST /v1/images/generations` with an explicit model and prompt. For `openai-gpt-image-2`, inspect returned execution metadata: an enabled OAuth worker may use the documented Codex image-tool compatibility alias. Its actual image-model selection is provider-managed; exact model, dimensions, and quality are not promised. Native API-key execution remains exact.

Keep generation on your backend, validate returned bytes or the application asset URL, and show failures without automatically starting another generation. See [image API details](API_REFERENCE.md) and [compatibility semantics](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

## Recover without duplicate work

Assign one operation key and retain request IDs, execution state, receipt scope, and any returned job URLs. Reuse the same key and payload only according to the transport's retry guidance. A lost acknowledgement is not proof that execution failed. A model-unavailable error is not permission to select a different model.

The federation adapter uses bounded process-local receipts, not durable exactly-once execution. Its [API reference](RELAY_API_REFERENCE.md) explains accepted, pending, and uncertain states. Application SDK cascades or races must be an explicit choice about alternative models and additional work.

Continue with the [developer guide](DEVELOPER_GUIDE.md), [API boundaries](API_BASE_URL.md), or [operator runbook](RELAY_VNEXT_RUNBOOK.md).
