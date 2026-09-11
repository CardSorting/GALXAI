# Site content generation

<!-- docs-scope: current-guide -->

Generate a title, summary and one to three short text sections for a website.
This contract is for eligible accounts when Site content generation is available.
Your current quote determines the accepted price. Save and publish the resulting
content through your site workflow.

Eligible Site workflows also provide an [address under your username](SITE_ADDRESSES.md). Address setup and readiness are separate from the accepted content-generation charge.

## Endpoint and authentication

Use `https://galx.ai/api/sites/content`. Authenticate every request with
`Authorization: Bearer YOUR_ACCOUNT_SESSION_TOKEN`. This endpoint uses an account
session token; a GALX inference API key, user ID or cookie alone does not authorize it.
Supported methods are GET and POST. Responses are private and must not be cached.

## Obtain and accept a quote

Send `GET /api/sites/content` before starting a new generation:

```json
{
  "currency": "USD",
  "unit": "micro_usd",
  "quoteVersion": "sites-fixed-005-v1",
  "maxChargeMicroUsd": 50000
}
```

One million micro-USD equals one US dollar. This fixed-price example is **$0.05
per completed generation**. The amount is charged for completed work even if its
content needs repair. A repair is another generation with a new operation ID and
its own accepted quote. Availability and the applicable price can change; always
use the quote returned for your account. An accepted operation keeps its original price.

A quote does not reserve funds or guarantee that a later request will be admitted.
If the quote has changed before submission, obtain the current quote and review it
before starting new work. Do not change a pending operation's identity to accept a new price.

## Generate a draft

Send `POST /api/sites/content` with `Content-Type: application/json` and exactly
these fields:

```json
{
  "operationId": "draft-001",
  "brief": "A neighborhood bakery offering fresh bread and weekend classes.",
  "repair": false,
  "quoteVersion": "sites-fixed-005-v1",
  "maxChargeMicroUsd": 50000
}
```

| Field | Contract |
| --- | --- |
| `operationId` | Unique ID for this account's operation, 1–120 letters, digits, underscores, periods, colons or hyphens; save it before submission |
| `brief` | Nonempty text, at most 2,000 UTF-8 bytes, without control characters or line breaks |
| `repair` | Boolean; true requests a replacement response for an earlier completed invalid draft |
| `quoteVersion` | Exact version from the accepted quote |
| `maxChargeMicroUsd` | Exact integer maximum from that quote |

The complete JSON request is limited to 8,192 bytes. Extra fields are rejected.
Reuse an operation ID only to identify its original input; changing its brief or
repair flag conflicts with the original operation. Prefer GET recovery after any
interrupted submission. A completed operation can be retrieved without generating
or charging again. An account with unresolved work must reconcile it before new work.

## Read a result

A successful response has exactly `operationId`, `text` and `cost`:

```json
{
  "operationId": "draft-001",
  "text": "{\"schema_version\":1,\"title\":\"Neighborhood Bakery\",\"summary\":\"Fresh bread and weekend classes.\",\"sections\":[{\"heading\":\"Visit us\",\"body\":\"Discover our daily selection.\"}]}",
  "cost": {
    "units": 50000,
    "receipt": "12345678-1234-1234-1234-123456789abc"
  }
}
```

Parse `text` as JSON. Its fields are `schema_version: 1`, `title`, `summary`, and
`sections`. Each of one to three sections has only `heading` and `body`. Titles and
headings are at most 90 characters, summaries 350, and section bodies 650. Each
string must be nonempty and contain no control characters or line breaks. Treat
all generated strings as literal text when rendering. An invalid draft is returned
as an empty string and may still have a settled charge.

`cost.units` is the settled amount in micro-USD; `cost.receipt` is an opaque receipt.
A null `cost` means settlement remains unresolved. It does not mean the request is
free or that it is safe to generate again. A confirmed unused reservation closes
with an empty `text` and a zero charge.

## Recover interrupted work

Send `GET /api/sites/content?operationId=draft-001` using the original account's
session. A recovered result has the same shape as a generation result. Repeated
retrieval starts no generation and creates no duplicate charge. Saved operations
remain retrievable by their owner when new generation is paused or their new-work
allowance is exhausted, subject to service availability.

Keep the original operation ID when a POST times out or returns an uncertain
result. A missing result does not establish that the request never ran. If recovery
remains unresolved, contact support with the operation ID. A client disconnect or
local cancellation does not by itself establish a refund.

## Allowances and errors

The provisional fixed-price offer allows 20 admitted operations per account in a
rolling 24 hours. This is an account allowance, not a promise of instantaneous
availability. An admitted operation counts once even if later unused or unresolved;
status reads and completed-result retrieval do not consume another operation.

Errors use `{ "error": { "code": "..." } }`:

| Status/code | Action |
| --- | --- |
| `400 invalid_request` | Check input fields and accepted quote; preserve any existing operation identity |
| `401 sign_in_required` | Sign in and use a valid account session token |
| `402 payment_required` | Resolve the account's funding requirement |
| `404 operation_not_found` | Check account and operation ID; do not infer non-execution from absence |
| `409 operation_conflict` | Retrieve the original operation; its ID cannot name different input |
| `409 operation_pending` | Recover the existing operation before starting another |
| `413 request_too_large` | Reduce the new request to the documented limits |
| `415 json_required` | Send JSON with the required content type |
| `429 generation_limit_reached` | Wait for allowance to become available; existing operations remain retrievable |
| `503 content_unavailable` | New work or recovery is temporarily unavailable; reconcile an interrupted POST before considering another operation |

No error authorizes an automatic price increase or a duplicate generation. Keep
account session tokens out of source files, browser logs and shared error reports.
