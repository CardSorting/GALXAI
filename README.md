# GALXAI

GALX provides text and image generation APIs, model discovery, API keys, and usage controls.

Use `https://galx.ai/v1` as the API base URL. Authenticate with
`Authorization: Bearer YOUR_GALX_API_KEY`.
A user ID is not a credential. Missing or invalid credentials return `401`;
browser requests require a valid signed-in session.

## Image generation

`POST /v1/images/generations` accepts a text `prompt` and the public model alias
`openai-gpt-image-latest`. A successful request returns one image as binary bytes
with its `image/png`, `image/jpeg`, or `image/webp` content type.
Set `output_format` to `png`, `jpeg`, or `webp` to select a format.

For existing JSON clients, set `response_format` to `b64_json` or `url`.
`Accept: application/json` also selects base64 JSON. JSON contains only `created`
and `data`, with each item containing only `b64_json` or `url`. URL results are
GALX download links valid for one hour or self-contained data URLs. Save the
image before a download link expires. Request up to four images using JSON;
binary responses support one image per request.

Images are static. PNG and WebP support transparency; JPEG does not. Dimensions
can vary from the requested size. Image metadata is not preserved.

For asynchronous requests, send `Prefer: respond-async`. A `202` response contains
`id`, `status`, and `task_url`. GET that URL with the same authentication to retrieve
the result; pending requests return `202`. Append `/stream` for status events.

Errors contain only `error.code`, `error.message`, and `error.request_id`.
Contact support with the request ID. A timeout can leave a request outcome
uncertain; check an asynchronous request before submitting another generation.

## Site content generation

Eligible accounts can use the [Site content contract](docs/SITES_CONTENT.md) for quoted, bounded
text drafts and recovery by operation ID. It uses an account session bearer at
`/api/sites/content`. The guide covers fixed pricing, allowances, repairs and
settlement; availability depends on account eligibility.

## Documentation

- [API documentation](https://galx.ai/docs)
- [Models](https://galx.ai/models)
- [API schema](https://galx.ai/api/openapi.json)
- [Pricing](https://galx.ai/pricing)
- [Service status](https://galx.ai/status)
