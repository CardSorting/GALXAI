# ADR 0137: Account-owned Sites subdomains

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Status: accepted; implementation and verification are recorded in the linked runbook.
Audience: private maintainers. Extends [customer-owned delivery](0136-customer-owned-sites-delivery.md).

## Decision

Deliver created Sites at `https://APP.USERNAME.galx.ai`. Reserve one explicitly chosen GALX username per verified GALX account and one stable address per account/project. Normalize the Site title into an ASCII app label; allocate a numeric suffix for title collisions. A title change does not rename a published address. This first version does not support username changes, address transfers, deletion or recycling.

Attach the exact hostname using the customer's native Sites connection. Use Sites' returned custom-domain CNAME target and validation records. Pointing a CNAME at an arbitrary generated Site URL does not establish domain ownership or certificate coverage. Use DNS-only records and native exact-hostname TLS, rather than relying on a wildcard certificate covering nested labels. Keep the existing Site audience unchanged.

The existing server PostgreSQL connection owns a private registry. Account sessions authorize only their own reservations and reads. Neither caller-supplied user IDs nor Sites workspace names confer a GALX namespace. The customer-local companion verifies current native Site ownership before attachment and around configuration. It receives no DNS credential or database access. Native attachment continues to enforce the customer's Sites permissions.

## Durable effects and limits

Commit address reservation before external work. A unique namespace and serialized account allocation prevent concurrent collisions. Issue one attachment attempt; after a lost acknowledgement, list native domains for the original project and exact hostname. An absent result after an ambiguous attempt requires reconciliation, not another blind add.

Persist a validated DNS plan before writing records. Accept only the fixed native CNAME target and narrowly allowed validation names under the reserved hostname. Ignore only a completely null native validation placeholder; reject partially specified records. A later conflicting plan requires operator reconciliation. Use a two-minute fenced lease, a 60-second external-work deadline, six-second individual requests and a 30-second recheck interval. Database transactions do not span network operations.

Create missing records with the reservation's ownership marker. Recover only exact records carrying that marker. Preflight every name before writing; never overwrite or delete foreign records. Lost writes can be recovered by reading back the same intent. Cross-account access, arbitrary targets, wildcard names, oversized bodies and caller-supplied readiness claims fail closed.

Server readiness requires exact managed DNS readback and a certificate-verified HTTPS response from the reserved hostname: 2xx, 3xx or the native private-Site 401. Access-control redirects and authentication requirements qualify as reachable; no session, bypass token or cookies are forwarded. Other failures, including 403, 404 and 5xx, remain pending. The companion also refreshes native domain status. Native status alone is not a caller-authoritative `active` flag. This is a reachability observation, not a guarantee of continuous availability or a public-audience grant.

## Public boundary and handoff

Return only `{hostname,status,url}`. `url` is null while reserved or pending. Customer-facing publication output uses the active GALX address; original publication identity and hosting URL remain in the private journal. DNS plans, validation tokens, credentials, native statuses and errors stay private. Public documentation describes addresses, availability and user actions, not this implementation.

DNS/TLS failure does not undo a saved version, re-run generation or repeat publication. Recovery revisits the same project and reservation. Pausing domain mutations keeps authenticated status reads and existing DNS intact. Rollback preserves ownership and pending effects; it cannot silently remove an address that may already be serving a customer.

## Consequences and evidence

The workflow requires a chosen available username, a working customer Sites connection, a verified GALX account, server domain configuration and eligible-account admission. It does not create an extra model turn, change generation pricing or require transparent supplier quotas. Domains are independent of the earlier direct CLI archive-upload limitation.

See [Sites address operations](../maintainers/SITES_DOMAINS.md) for configuration, exact migration, recovery, test commands and dated rollout evidence. Sources: [official Sites custom-domain support](https://learn.chatgpt.com/docs/sites), [hostname and certificate validation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/), and [DNS record creation](https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/).
