# ADR 0139: Browser Sites workspace and managed publishing

<!-- docs-scope: decision-record -->

Date: 2026-09-11. Status: accepted. Audience: private maintainers.
Extends [automatic addresses](0138-automatic-sites-domain-provisioning.md) and [customer-owned delivery](0136-customer-owned-sites-delivery.md).

## Decision

Make `/sites` the authoring and management entry point for new GALX Sites, with a conversation column on the left and a sandboxed page preview on the right. `/sites/:id` resumes an account-owned workspace. GALX sign-in is sufficient for authoring; choosing a username is deferred until the first publication. A new GALX workspace does not require installing or supervising a customer companion, supplying a provider credential, or connecting a separate hosting account.

The previous customer-native integration remains an optional, separate path. Its connection and save constraints are real and cannot be removed by putting a browser button over the existing CLI. The inspected native plugin supplies host-scoped tools; the reviewed [Sites documentation](https://learn.chatgpt.com/docs/sites) does not establish a browser OAuth integration for this application. Do not invent that integration or share the operator's native account with customers. No existing native Site, audience or domain is migrated by this decision.

## Authoring and billing

Store drafts and conversation history in `private.galx_site_workspaces`, owned by the verified GALX account. Browser requests carry an explicit session bearer; cookies, submitted owner IDs and inference keys alone do not grant workspace authority. Force RLS and revoke all Data API roles. The existing privileged server connection performs bounded, account-filtered queries, with a per-account creation lock, a 50-workspace cap and version checks for edits.

Generation uses the existing fixed-price content service and its admission gates, wallet settlement and durable receipts. Show the server quote beside Send; require the accepted price and quote version on submission. Each request includes the previous structured draft and the requested change, while model selection and protocol metadata remain private. The first release supports a static information page, not arbitrary application code or autonomous tool execution.

Persist one pending operation before generation and bind its billing identity to both workspace and operation. Concurrent edits cannot replace that operation. An interrupted request reconciles the original receipt without generating again. A confirmed non-dispatch can clear the pending state; an uncertain operation remains pending. Invalid completed content remains billable under the existing contract and cannot replace the last valid draft. Reused operation identities and stale revisions are rejected.

Preview and download use the same deterministic, escaped HTML renderer. The iframe has an empty sandbox attribute, no same-origin/script permissions and no credentials. Its document CSP blocks network, forms and base-URL changes. No model-produced HTML, scripts, assets, URLs or commands execute in the browser or hosting environment. Drafts and chat are excluded from publication.

## Publishing and addresses

The user explicitly selects Publish publicly. Recheck owner, revision, current valid document and account admission; reserve `APP.USERNAME.galx.ai` through the existing namespace registry. In a single transaction, snapshot the approved document and enqueue its managed-host domain plan. A lost acknowledgement retains both the snapshot and the work. New edits leave the approved snapshot unchanged until another explicit publication. Unpublish clears the public snapshot and increments the revision while retaining the address reservation. Archive organizes the library and does not silently unpublish.

The existing scheduled worker handles managed plans in addition to native plans. A server-only adapter registers the exact reserved hostname on the configured Vercel project, reads back uncertain adds and refuses mismatched project, redirect, branch or environment settings. Cloudflare creates only the exact marked CNAME; existing foreign records are never overwritten. Activation requires verified TLS and an exact match to the published HTML, not merely an HTTP 200 from an unrelated deployment. The platform resolves certificates for these exact hostnames; no multi-level wildcard certificate is assumed.

The Next middleware maps exact two-label GALX Site hosts to the narrow published-document handler. Other paths and mutations on these hosts are denied. The handler returns only escaped public HTML or a generic 404, with restrictive CSP, no-store, no cookies and no upstream headers. The hosting credential never enters browser bundles, customer sessions, preview content or public responses.

## Rollout and limits

Keep generation, managed publication and the existing domain worker independently gated. Browser authoring does not imply production generation is enabled. Configure a project-scoped hosting token, project/team identifiers and the verified project CNAME server-side before enabling managed publication. Domain/provider limits remain operational constraints and must be qualified for the intended cohort; do not turn current limits into public capacity promises.

Migration `20260912003002_sites_workspace.sql` creates the private workspace table. Its rollback preserves drafts, public snapshots and unresolved billing operations with access still revoked. Pause new authoring/publication before rolling back; retain a reader/reconciler for existing operations and published Sites. Native discovery and previously established domains retain their separate state.

The implementation, verification commands, onboarding flow and operational configuration are in [Sites workspace operations](../maintainers/SITES_WORKSPACE.md). Public documentation describes only [the user workflow](../SITES_WORKSPACE.md).

The exact-host middleware uses a bounded, credential-free read of the fixed public artifact endpoint and reconstructs its headers. Framework URL rewrites were rejected after raw HTTP testing exposed an internal rewrite address. This adds one origin request per published page view; no browser request inherits that routing information.

The [September 12 platform activation record](../../internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/durable/ACTIVATION_20260912.md) tracks implementation of these gates on the existing infrastructure. The hosting credential is restricted to the selected project/team and has an explicit expiry. Administrative credential creation, rotation and deployment remain platform operations; no customer hosting enrollment is introduced.
