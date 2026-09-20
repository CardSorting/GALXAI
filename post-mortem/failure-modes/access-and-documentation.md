# Access and documentation failures

<!-- docs-scope: current-guide -->

## FM-ACCESS-001 — rollback or cached state grants unintended access

Images and Sites remain public products with account and ownership requirements. Other developer endpoints require an individually approved account at both the application and API gateway. A payment, API key, signup or user-editable field is not approval. Staff administration uses independent server-side membership. A prior successful deployment can still be an unsafe rollback if it predates these controls.

Preview snapshots and BroccoliDB batching reduce repeated payloads; current database status and expiry remain authorization authority. An outage cannot fall back to a cached grant. Test unapproved, revoked, expired, forged and cross-account access as well as public-product reachability. Follow [preview operations](../../docs/operations/developer-preview.md).

## FM-ACCESS-002 — public product exemption bypasses account entry

An anonymous HTTP 200 from `/images` or `/sites` exposes an account workspace even when its APIs independently reject unauthenticated calls. Exemption from developer approval does not grant anonymous workspace access. Middleware must verify sessions before static-asset bypasses; each Images/Sites server page must independently guard rendering and remain dynamic. Cookie existence, forged identity/approval headers and client-side prompts cannot replace verification. Preserve refresh cookies, use private no-store responses, and distinguish temporary verification failure from invalid credentials.

Run the workspace entry cases in `npm run test:image:security`, build production output, then check raw redirects, RSC/prefetch variants, misleading extensions and existing-session access. Preserve published Site snapshots and image capabilities. Use the [workspace authentication runbook](../../docs/operations/workspace-auth.md) for server-backed browser checks, safe return context and explicit 401/503 recovery. Browser-local identity cannot decide whether sign-in is complete. See the [workspace-auth incident](../incidents/2026/2026-09-13-workspace-auth/README.md); ACT-013 retains completed release acceptance; current state owns its dated result. The broader session audit also requires server-verified profiles, confirmed account email for staff operations, native account provenance, owner-bound revocation and explicit current-browser logout. Never treat provider keys, raw session IDs or a supplied sudo duration as account/fresh-proof authority. Run `npm run test:auth:sessions`; preserve rotated refresh cookies when logout must be retried. ACT-014 tracks future fresh-proof and durable device acceptance.

A downstream cache override is part of this boundary: September 13 live acceptance found a four-hour Cloudflare browser TTL replacing private headers on static-looking protected paths. Respect origin cache headers and run `node scripts/verify-workspace-cache-http.mjs https://galx.ai` after deployment or CDN changes. Authentication redirects alone do not establish safe cache policy. Active Supabase session lookup and a verified logout postcondition reject copied JWTs on subsequent GALX account requests; do not replace that check with cached identity.

## FM-ACCESS-003 — a public dynamic route loads a protected framework chunk

A public page can render on the server while its browser bundle is denied if framework assets infer access from a route template such as `/profile/[handle]` using a validator that only accepts concrete public handles. The browser then receives a private JSON denial where JavaScript is required and reports a chunk-load failure.

Keep framework-asset exemptions as an explicit route-template allowlist. Never make all page chunks public or treat arbitrary bracketed paths as product routes. Regression coverage must request both encoded and decoded forms of the reviewed template, deny private descendants and unrelated page chunks, and verify the raw hosted asset body, content type and cache behavior after deployment.

## FM-DOCS-001 — old operational advice regresses a repaired system

The September 13 audit found stale September 11 handovers, the retired no-image-studio product rule, process-local image guidance presented too broadly, incomplete catalog coverage, and a diagnostic recipe that exposed secrets and invoked a mutation script. These are operational hazards even when code is correct.

Current guides must be reconciled in full: replace obsolete commands, conditions, examples, rollout and rollback claims. Preserve original observations in dated incident records. Root handover/context files link to a single current-state record. Historical release observations do not certify current runtime behavior.

`npm run docs:check` enforces catalog coverage, local navigation, incident/action/event references, required evidence for resolved records, protected deployment boundaries and source-bound review fingerprints. `npm run docs:sync` updates generated indexes only; it does not certify a semantic review. Changes to monitored source require explicit review through the [documentation workflow](../runbooks/documentation.md).

The guard is deliberately bounded: it cannot infer every stale statement, prove a service healthy or stop someone bypassing CI. Preserve open issues and verification limits rather than falsely marking everything resolved.
