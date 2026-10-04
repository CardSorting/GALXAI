# ADR 0167: Mac Nova runtime and Vercel inference retirement

<!-- docs-scope: decision-record -->

Date: 2026-10-03. Decision: accepted by the owner's explicit transition mandate. Delivery: controlled real-provider acceptance and retirement recorded separately in the [transition evidence](../../post-mortem/releases/2026-10-03-nova-mac-transition.json). This refines placement under [ADR 0165](0165-galx-connect-nova-boundaries.md) and ingress operation under [ADR 0166](0166-private-self-host-request-origin.md); their authorization and origin policies remain intact.

## Context

The accepted Nova request requires a 300-second execution deadline plus time for terminal persistence. The existing Hobby invocation ceiling cannot provide that lifecycle. A paid plan is unavailable. The Mac image has already passed synthetic whole-image origin, streaming, cancellation, deadline, shutdown, recovery and authorization acceptance. Keeping Vercel as another executor would preserve the incompatibility and create competing admission paths.

## Decision

Retain GALX Media and short Connect identity/consent/token work on the existing web surface. Reuse the accepted persistent Next image unchanged on the Mac as the sole Nova inference runtime, with Nova-only private configuration, a loopback-only port and exact controlled TLS ingress at `nova.galx.ai`. Provider credentials and private ownership/control remain behind their existing server boundaries. Do not move unrelated Media configuration or responsibilities to the Mac.

Require real existing-account/first-party-provider acceptance, one safe interruption, revocation and independent image recovery before cutting Nova over. Drain the obsolete Vercel inference paths without replaying ambiguous work. Retire their routes and queue dispatch, protect historical releases with a project-wide deny rule, and remove the Nova Vercel domain binding/alias after controlled observation. Preserve shared Media/Connect credentials and historical deployment evidence. No dual-primary or inference rollback to Vercel is allowed.

The immutable Mac image remains the origin-corrected candidate. The web release separately preserves the observed Media source and overlays only reviewed Connect/authentication and retirement changes, with its own clean-build provenance. Source presence, image acceptance and actual deployment remain separate evidence.

## Consequences and verification

The [transition runbook](../runbooks/nova-hosting-transition.md) owns staged mechanics, automatic containment triggers and recovery. The [Mac runbook](../runbooks/mac-self-hosting.md) owns package verification and stage/status/stop/resume. Quota, neutral outcomes, terminal unknown/no-replay, duplicate attachment, current grants, PKCE and revocation are unchanged. Only the already-reviewed additive integer-refill migration is applied during this transition.

This is a bounded controlled deployment on a single Mac, not high availability, public release or commercial activation. Host power/login/sleep and independent-storage recovery remain separate gates. Existing public-release actions are not accepted or closed by this placement decision. No paid hosting subscription, new pricing or automatic entitlement is introduced.
