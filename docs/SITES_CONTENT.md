# Site content generation

<!-- docs-scope: current-guide -->

Create a simple page or revise its content through [Sites](https://galx.ai/sites). Creating, updating and publishing Sites is included with eligible active paid plans, subject to fair usage. New updates do not carry a separate generation charge.

This API produces structured text for a static information page. It does not create a working store, account system or custom application. Publishing is a separate action; your conversation and unpublished changes stay private.

## Authentication and access

Use `Authorization: Bearer YOUR_ACCOUNT_SESSION_TOKEN` for every request. An inference API key, account ID or ambient cookie alone does not authorize Sites. Responses are private and must not be cached.

`GET https://galx.ai/api/sites/content` checks current access:

```json
{"access":"included"}
```

Access does not reserve a future update. A request can be temporarily declined under fair usage. Existing drafts remain available when new updates are paused or your paid plan is no longer active.

## Request an update

Send `POST https://galx.ai/api/sites/content` with `Content-Type: application/json`:

```json
{
  "operationId": "my-site-first-draft",
  "brief": "Create a landing page for a neighborhood makers market.",
  "repair": false
}
```

| Field | Meaning |
| --- | --- |
| `operationId` | A unique identity for this update, 1–120 letters, numbers, underscores, periods, colons or hyphens |
| `brief` | Nonempty plain text, at most 2,000 UTF-8 bytes, without control characters |
| `repair` | Whether this is a new request to correct an earlier unusable response |

Keep the same identity when checking an interrupted request. A new change or repair uses a new identity. Reusing an identity with changed content is rejected. Price, tier, model and account fields are not accepted.

```json
{
  "operationId": "my-site-first-draft",
  "status": "completed",
  "text": "{\"schema_version\":1,\"title\":\"Makers Market\",\"summary\":\"Meet your local makers.\",\"sections\":[{\"heading\":\"Discover\",\"body\":\"Explore handmade work from your neighborhood.\"}]}"
}
```

`text` contains a JSON document with exactly `schema_version`, `title`, `summary` and `sections`. There are one to three sections, each with `heading` and `body`. Titles and headings have at most 90 characters, the summary 350 and each section body 650. Render these values as literal text. A completed update with unusable content returns an empty string.

## Recover and retry

A retained operation can return `status: "pending"`. Check it with `GET /api/sites/content?operationId=my-site-first-draft`; do not start another update while its outcome is uncertain. This read does not generate another page.

Temporary deferral does not consume a message. Fair usage is checked on each new update; being asked to pause does not necessarily mean waiting until the next allowance or billing period. Honor `Retry-After` when supplied, and avoid immediate repeated submissions. A deferred operation that was never accepted can be retried with its original identity and content.

| Response | Action |
| --- | --- |
| `400 invalid_request` | Check the exact fields and brief size |
| `401 sign_in_required` | Sign in again |
| `403 paid_plan_required` | Check whether your active paid plan includes Sites |
| `409 operation_conflict` | Preserve the original request; use a new identity for a different update |
| `429 rate_limited` | Pause before another update; honor `Retry-After` |
| `503 content_unavailable` | Retry later; recover an interrupted operation before submitting another |

Historical requests accepted under an earlier contract retain their original receipts and recovery behavior. New requests use the included-access contract above. See [the workspace guide](SITES_WORKSPACE.md) and [Site addresses](SITE_ADDRESSES.md) for saving and publishing.
