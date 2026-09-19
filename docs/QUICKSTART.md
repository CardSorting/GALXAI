# API quickstart

<!-- docs-scope: current-guide -->

This quickstart is for an integration that already has an administrator-issued
GALX API credential. It follows the familiar “configure once, inspect access,
make one request” flow used by hosted API consoles.

There is no public checkout, enrollment, waitlist, or automatic key issuance.
If you need private access, a GALX administrator must deliberately approve the
cohort, provision the credential, and assign bounded usage and traffic limits.

## 1. Set the credential

Store the secret in your server environment:

```bash
export GALX_API_KEY='YOUR_GALX_API_KEY'
```

Never put this value in browser JavaScript, a mobile bundle, source control, or
a URL. The raw secret is delivered once during administrator provisioning; use
your secret manager for ongoing storage and rotation.

## 2. Confirm the access scope

```bash
curl --fail-with-body https://galx.ai/v1/models \
  -H "Authorization: Bearer $GALX_API_KEY"
```

Choose a model identifier from the returned `data` list. Do not hard-code a
provider-specific name from an unrelated account or assume that a model label
means a particular underlying implementation.

## 3. Make a text request

```bash
curl --fail-with-body https://galx.ai/v1/chat/completions \
  -H "Authorization: Bearer $GALX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MODEL_ID_FROM_V1_MODELS",
    "messages": [{"role": "user", "content": "Hello from GALX."}]
  }'
```

The API returns an allowlisted response shape. For streaming, add
`"stream": true` and handle the documented event sequence. For image
generation, use the [image contract](API_REFERENCE.md#image-generation).

## 4. Handle the normal recovery states

- `401` means the credential is missing, invalid, expired, or revoked.
- `403` means the credential is not allowed to use that capability or scope.
- `429` means the assigned traffic or usage allocation was reached.
- A timeout can leave the outcome uncertain. Check an asynchronous request or
  the operation status before submitting a duplicate side effect.
- Errors contain an opaque request ID. Share that ID with the authorized GALX
  administrator; do not send secrets or internal request payloads.

Private integrations remain metered and bounded even when GALX is not charging
a public developer subscription. Allocation and credential changes are made by
administrators, not by the API caller.

## Next steps

- [API base URL and authentication](API_BASE_URL.md)
- [API reference](API_REFERENCE.md)
- [OpenAPI schema](https://galx.ai/api/openapi.json)
- [Public developer page](https://galx.ai/developers)
