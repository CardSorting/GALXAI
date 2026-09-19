# API reference

<!-- docs-scope: current-guide -->

GALX exposes text, image, and model-discovery capabilities to GALX products
and explicitly authorized private integrations. This is a capability reference,
not a public signup or billing guide. Access is provisioned by an administrator
and remains bounded, metered, and revocable.

## Common contract

| Concern | Contract |
| --- | --- |
| Base URL | `https://galx.ai/v1` |
| Authentication | `Authorization: Bearer YOUR_GALX_API_KEY` |
| Model selection | Use an exact identifier returned by `GET /v1/models` |
| Credential lifecycle | Administered privately; expiry, allocation, and revocation apply |
| Public availability | No public subscription, enrollment, waitlist, or self-service key provisioning |

Credentials belong on a server or trusted runtime. Never expose a key in a
browser bundle, URL, source repository, log, or screenshot. Public model names
and aliases describe capabilities; they do not promise an unverified underlying
provider or implementation.

## Model discovery

`GET /v1/models` returns the model identifiers available to the credential's
scope. Treat this response as the source of truth for a request:

```bash
curl --fail-with-body https://galx.ai/v1/models \
  -H "Authorization: Bearer $GALX_API_KEY"
```

## Text generation

`POST /v1/chat/completions` accepts a supported `model` and `messages` array.
Streaming uses the documented event sequence when `stream` is enabled. The
response contains the requested capability's allowlisted result fields.

```bash
curl --fail-with-body https://galx.ai/v1/chat/completions \
  -H "Authorization: Bearer $GALX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MODEL_ID_FROM_V1_MODELS",
    "messages": [{"role": "user", "content": "Summarize this request."}]
  }'
```

## Image generation

`POST /v1/images/generations` accepts a text `prompt` and a supported GALX image
capability. A successful request returns one image as binary bytes with an
`image/png`, `image/jpeg`, or `image/webp` content type. Set `output_format` to
`png`, `jpeg`, or `webp` when selecting a format.

For JSON clients, set `response_format` to `b64_json` or `url`. An
`Accept: application/json` request also selects base64 JSON. JSON contains only
`created` and `data`, with each item containing `b64_json` or `url`. Download
links are temporary; save the image before the link expires. JSON requests can
ask for up to four images; binary responses support one image per request.

For asynchronous work, send `Prefer: respond-async`. The `202` response
contains `id`, `status`, and `task_url`. Retrieve that URL with the same
credential; pending work remains `202`. Append `/stream` for status events.

Image artifacts are static. PNG and WebP support transparency; JPEG does not.
Dimensions can vary from the requested size, and source metadata is not
preserved.

## Site content

Site content is a separate account product with its own eligibility and
settlement contract. See [Site content](SITES_CONTENT.md) when that capability
is explicitly enabled for the account. Do not infer API access from Site or
Images eligibility.

## Errors and uncertain outcomes

Errors contain only `error.code`, `error.message`, and `error.request_id`.

- `401`: credential missing, invalid, expired, or revoked.
- `403`: capability, scope, or account authorization denied.
- `429`: assigned traffic or usage allocation reached.
- `5xx` or a timeout: outcome may be uncertain; check the operation before
  retrying a side effect.

Private integrations are metered so GALX can understand consumption, enforce
allocations, plan capacity, and investigate abnormal use. Metering is not a
public price sheet or a promise of self-service availability.

## Related references

- [API quickstart](QUICKSTART.md)
- [Base URL and authentication](API_BASE_URL.md)
- [OpenAPI schema](https://galx.ai/api/openapi.json)
- [Public developer page](https://galx.ai/developers)
