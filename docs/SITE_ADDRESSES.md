# Site addresses

<!-- docs-scope: current-guide -->

Eligible accounts can receive a Site address in this form:

```text
https://my-product.alice.galx.ai
```

Choose an available username when setting up your first Site. It must contain 3–20 lowercase letters, digits or hyphens, start with a letter and end with a letter or digit. Some names are reserved. Your username is shared across your Sites.

Sites created in the [GALX workspace](SITES_WORKSPACE.md) receive their address when you publish. They need no separate hosting connection.

For Sites created through an existing connected workflow, once automatic addresses are enabled for your connected account, newly created eligible Sites receive an address automatically. You do not need to link each Site or enter DNS records. Existing Sites can be included during setup.

The app name comes from your Site title. Spaces and punctuation become hyphens. If you already have an app with that name, a number is added. Later title edits leave your address unchanged. This version does not support changing or transferring a username or address.

Your address can be `reserved`, `pending` or `active`. Setup may take time and continues automatically while you work on your Site. Wait for `active` and a non-null URL before handing the link to someone else. A Site's existing access settings still apply; receiving an address does not make a private Site public. If your account connection expires, reconnect it to resume setup.

## Check your address

Send `GET https://galx.ai/api/sites/domains?projectId=YOUR_SITE_ID` with `Authorization: Bearer YOUR_ACCOUNT_SESSION_TOKEN`. Use the Site ID from your existing workflow. A cookie, account ID or inference API key alone does not authorize this endpoint.

```json
{
  "hostname": "my-product.alice.galx.ai",
  "status": "active",
  "url": "https://my-product.alice.galx.ai"
}
```

For `reserved` or `pending`, `url` is null. Responses are private and must not be cached. An address belonging to another account is unavailable to this request. Authentication failures return `401`; an unknown address returns `404`. Temporary unavailability returns a generic error. A successful status check describes the last verified state; it is not an uptime guarantee.

Content generation and paid-plan access are described in [Site content generation](SITES_CONTENT.md). Address setup does not submit another content generation.
