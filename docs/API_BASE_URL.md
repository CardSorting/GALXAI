# API base URL and authentication

<!-- docs-scope: current-guide -->

GALX provides a documented API for GALX products and explicitly authorized
private integrations. This page answers the two questions most clients need
before making a request: where to send it and how to authenticate.

## Before you begin

An authorized GALX administrator must provision an integration credential and
assign its usage and traffic allocation. There is no public subscription,
application, waitlist, or self-service credential workflow for general-purpose
API access. If you do not already have a credential, this page cannot create
one for you.

## Base URL

Use:

```text
https://galx.ai/v1
```

Append the documented resource path. For example, an approved integration can
inspect the model identifiers currently available to its access scope:

```bash
curl --fail-with-body https://galx.ai/v1/models \
  -H "Authorization: Bearer $GALX_API_KEY"
```

Use the exact model identifier returned for your access scope. A public model
name is a capability label; it does not promise an unverified underlying
provider or implementation.

## Authentication

Send the credential in the `Authorization` header:

```http
Authorization: Bearer YOUR_GALX_API_KEY
```

Keep the credential on a server or trusted runtime. Do not commit it, place it
in a browser bundle, or expose it in logs, URLs, screenshots, or client-side
source. A user ID, account email, or signed-in browser session is not a
replacement for an API credential.

Invalid or missing credentials return `401`. A valid credential can still be
denied when it is expired, revoked, outside its assigned scope, or over its
administrator-defined allocation.

## Related references

- [Quickstart](QUICKSTART.md) — make a first request with an existing credential.
- [API reference](API_REFERENCE.md) — capability and response contracts.
- [OpenAPI schema](https://galx.ai/api/openapi.json) — machine-readable shapes.
- [Public developer page](https://galx.ai/developers) — explains the access boundary; it does not provision access.

Public documentation describes capabilities and user-visible outcomes. It does
not describe provider relationships, routing, capacity acquisition, scheduling,
or internal economics.
