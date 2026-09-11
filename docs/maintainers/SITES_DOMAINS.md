# Sites address operations

<!-- docs-scope: current-guide -->

Private maintainer guide, September 11, 2026. [ADR 0137](../adr/0137-account-owned-sites-subdomains.md) owns this decision. [Site addresses](../SITE_ADDRESSES.md) is the public capability and status contract. Do not bundle this guide, native registration replies or private registry rows into a Site.

## Configuration and authority

| Setting | Meaning |
| --- | --- |
| `GALX_SITES_DOMAINS_ENABLED` | Server mutation gate; exactly `1` enables setup |
| `GALX_SITES_COHORT_ACCOUNT_IDS` | Existing exact verified-account cohort; shared with Sites admission |
| `GALX_SITES_DNS_ZONE_ID` | Server-only Cloudflare zone ID for `galx.ai` |
| `GALX_SITES_DNS_API_TOKEN` | Server-only DNS edit credential restricted to that zone |
| Existing PostgreSQL configuration | Private backend connection; never supplied to the companion |
| `GALX_SITES_USERNAME` | Customer's explicitly selected, available GALX username in the companion environment |
| `GALX_SITES_SESSION` / `GALX_SITES_BILLING_ORIGIN` | Existing account session and trusted GALX HTTPS origin |

No default username is inferred from an email, editable profile metadata or another provider's workspace. The example owner's existing `goldeneggie` label was chosen for that verified account; it is not a global identity mapping rule. Reserved names and strict labels are defined in [domains.ts](../../src/lib/sites/domains.ts). The initial account cap is 20 persistent reservations. This protects scarce addresses and DNS write capacity; changing it is a separate product decision.

The companion's `bind` command automatically connects the Site address. `publish-saved` reconnects after confirming publication. `connect-domain STATE_DIRECTORY JOB_ID` recovers an already bound Site, including older jobs. `status` reads the saved address. Only a published job with an active address gets a top-level customer URL. A pending domain never triggers another generation or publication. Native IDs and original publication URLs remain in the private local journal.

## Registry and deployment

Migration `20260911153205_sites_custom_domains.sql` adds `private.galx_site_namespaces` and `private.galx_site_domains`, their uniqueness/foreign-key constraints, generated hostname, lease and persisted plan. Both tables enable and force RLS and revoke all access from PUBLIC, anon, authenticated and service_role. There is no Data API policy or publicly callable SQL function. The existing privileged backend connection mediates all ownership checks. Application types are updated in [types.ts](../../src/lib/supabase/types.ts).

Apply the migration before deploying the route. The paired DOWN file intentionally preserves both tables, reservations, plans and DNS effects, while retaining denied public access. Set the mutation flag off before rollback. Do not drop the registry or recycle names to recover uncertain effects.

Deploy the Node application route and privately install its three domain settings plus the existing cohort. Keep generation's separate flag unchanged. Configure the customer's username and install the updated companion. Verify one owner reservation, outside-cohort denial, cross-account 404, exact records, HTTPS and unchanged native audience before widening access. Missing configuration denies mutations; authenticated status reads remain available during a pause. This implementation has no periodic reconciliation worker, and there is no claim of general availability until the application configuration is deployed and tested.

## Native attachment and DNS

The companion uses only native `sites.list_custom_domains`, `sites.add_custom_domain` and `sites.refresh_custom_domain_status` for the selected project. Native `get_site` checks current ownership and owner-private access around these operations. GALX sessions authenticate only to the configured GALX origin. DNS credentials authenticate only to the fixed Cloudflare API origin. Never forward a GALX credential or an access-bypass token to the Site hostname.

The internal authenticated POST actions are `reserve`, `attach`, `configure` and `reconcile`. Each has an exact input schema and verified-account ownership. `reserve` takes project ID, username and app name. `attach` grants one native creation attempt through HTTP 201; a subsequent 200 does not authorize another add. `configure` accepts only domain ID, exact hostname, native CNAME target and narrowly scoped validation records. `reconcile` reuses the saved plan. All success bodies use the same public three-field projection; DNS instructions and provider status never appear in responses.

Use the returned `custom-domains.chatgpt.site` CNAME, DNS-only, TTL 300. Allowed validation names are `_openai-site-verification`, `_cf-custom-hostname` and `_acme-challenge` beneath the reserved hostname. Certificate validation CNAMEs are restricted to `dcv.cloudflare.com`. At least a well-formed OpenAI verification TXT is required. A fully null native placeholder is ignored; incomplete or unrelated entries fail. Do not assume the generated `*.chatgpt.site` URL is a valid custom-domain target.

Every created record carries a marker tied to its reservation UUID. Read all exact names before writing; an existing foreign or different record produces a private conflict. Create only missing exact records, then read back. The server checks HTTPS without following redirects or sending credentials. HTTP 2xx, 3xx and the native private-Site 401 qualify as reachable and preserve access control; 403, 404 and 5xx do not. The companion refreshes native status for certificate/hostname evidence; it cannot mark a hostname active by supplying a status field.

## Recovery

| Observation | Action |
| --- | --- |
| Reserved, native attachment absent, no attempt issued | Continue the original connection workflow |
| Attachment acknowledgement lost | List domains on the original project; adopt only the exact hostname; do not blindly add again |
| Empty native listing after an attempt | Preserve the reservation; reconcile with the original native account before any operator repair |
| Partial DNS write or lost response | After the lease/recheck interval, run `connect-domain` or reconcile the saved plan; exact marked records are adopted |
| Different records or a changed validation plan | Stop and inspect original registration and DNS ownership privately; no automated overwrite or deletion |
| DNS exists, TLS not ready | Keep `pending`, refresh native validation, then recheck; no duplicate publication |
| Revoked access or wrong account | Stop the affected action; never transfer the name or change the Site audience |
| Domain mutation pause | Keep existing DNS and ownership; authenticated GET still reports saved state |

Lease expiry is two minutes, recheck delay 30 seconds, external work bounded to 60 seconds and individual DNS/HTTPS requests to six seconds. The route has a 90-second platform limit. Request bodies are at most 8 KiB with a ten-second intake deadline; provider bodies are at most 128 KiB. Unknown diagnostics are stored privately and public failures remain generic. No automated record rotation, detach, rename or namespace reclamation is provided.

## Verification

```sh
npm run test:sites:domains
npm run test:sites:domains:db
npm run db:verify
npx tsc --noEmit
npx tsc --noEmit -p internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/tsconfig.json
python3 scripts/verify-docs.py
```

The domain database harness creates and drops its own database on the explicit localhost fixture at port 55439; it never inherits production credentials. It covers concurrent reservations, collisions, one native attempt, fencing, lost commits, cross-account denial, role denial and preserved rollback state. The legacy `npm run db:test` separately requires `GALX_INTEGRATION_DATABASE_URL` and a fully initialized integration fixture; the available environment has no such fixture, so its guard refused execution without touching production.

The [domain application verification](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domains-application-verification.json) records 114 passing regressions, a production build and 634 local rendered-page/browser assets with no matches for 30 private markers. The 15 domain/companion tests, 22 disposable PostgreSQL checks, 68 existing delivery checks and 14 native bridge checks also passed; counts overlap. Both TypeScript projects and documentation navigation passed. The isolated build is validation-only and was never deployed.

## September 11 live rollout

The exact migration passed the CLI dry run and was applied to the linked project. The example's native owner was privately matched to an existing verified, non-anonymous GALX account before reserving `goldeneggie`. Its address is `https://studio-delivery-preview.goldeneggie.galx.ai`. The native custom-domain operation returned the target and validation records. Three exact managed DNS records were created and read back. Native domain status, hostname status and certificate status subsequently reached `active`; the private registry also reached `active`.

Anonymous HTTPS returns 401 with a valid certificate. Native access remains owner-only: one allowed account user, no external visitors, and the original custom access policy. No Site save, new deployment, audience change, paid generation or wallet mutation was performed to attach this domain. Setup initially observed an all-null validation placeholder and a temporary 404 before native activation; the tests cover those cases without treating them as success.

Owner-private Sites retain their native sign-in page. This custom-domain rollout does not replace or white-label that authentication UI, and the GALX public-asset scan does not claim to audit the hosted Site or its authentication screen.

The existing Vercel project received sensitive server-only domain configuration and a cohort containing that one verified account. The content-generation enable flag was left unchanged at `0`. Application deployment `dpl_HXEnCXxzKm27od6pqDK9vECwwM3J` was built from the current application source using production configuration, reached `READY`, and was explicitly promoted to `galx.ai`. The preceding production deployment `dpl_CsffXEUDD25CFNDiKhB2hpfre1Nn` is retained as the application rollback target.

The [live HTTP record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domains-live-verification.json) verifies four authentication-denial cases against the deployed address endpoint, including cookie-only and unauthenticated POST. Each returned the exact public 401 DTO and private/no-store header. The scan found no matches for 12 checked private markers across four main pages, their 29 directly linked browser assets, and checked response headers. It is a scoped scan, not a claim about all routes or dynamically imported assets. The example custom hostname returned the expected anonymous 401 over verified TLS.

The [native and registry record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/domains-native-verification.json) preserves the domain activation, unchanged access policy, migration and deployed-source fingerprints separately from local build evidence. All 93 migrations were confirmed applied after rollout.

No customer session was extracted or minted for acceptance testing. Live provisioning used the authenticated native owner connection and private operator registry/DNS access. Authenticated customer-to-application-to-native setup is covered by component tests, not claimed as a live customer round trip. Generation availability and direct CLI archive upload retain their independent qualification status.
