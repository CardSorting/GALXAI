# Sites platform activation — September 12, 2026 UTC

Private operational record following [the workspace release](WORKSPACE_RELEASE_20260912.md). Runtime source is commit `2b72afd`. Public contracts and customer pricing remain unchanged.

## Hosting authority

The user supplied Vercel setup authority after the CLI token-creation request had returned 403. It was accepted for the owned project and initially stored as a sensitive Production variable. A dedicated replacement was then created through Vercel's supported token API with the exact project/team restriction and a 90-day lifetime. The restricted credential successfully read the existing verified `galx.ai` project domain and replaced `GALX_SITES_HOSTING_TOKEN` in Production. Its temporary private recovery copy was removed after installation.

Runtime token metadata ID: `kysYaq34JZBKdDoKUkLc7a3uHBnY7iorZaAedlFrN6LGLYUn`. Project: `prj_NmtiUenK2cf924eREKuCgiDS0uC4`. Team: `team_mlJF16byaaURWNNfkpk72mVy`. Expiry: December 11, 2026 UTC. This metadata is not the bearer credential. The supplied account credential was not revoked and is not the final runtime credential.

The restricted token's account-level metadata endpoint returned 404 even though its project-domain access passed. Recovery reused the same minted token, checked the scope recorded in the creation response, repeated the same environment upsert, and verified the sensitive Production variable's metadata. No duplicate token was minted to recover that check.

Production uses the previously verified project CNAME `a76166bfd6d0ea1e.vercel-dns-017.com`. No apex DNS record or existing customer hostname was changed during credential setup. Domain provisioning remains an exact-host operation of the existing scheduler.

## Generation service

The initial fixed-profile readiness request returned 503 despite two healthy eligible workers. The serving workers still used `galxai-relay:sites-release-20260911`; the later fixed-price source had not replaced those running images.

Built `galxai-relay:sites-fixed-20260912-2b72afd` from a curated source-only context. Image ID: `sha256:39f0361c2c4492158362ce603c6fdaddfad40c99f120afb4760ea0e1ed51bbbf`. The packaged smoke test passed on Node 22.23.2 with external networking disabled: one synthetic provider request, fixed-profile contract validation, administrator authorization, null-usage completion and an identical receipt after restart. It performed no wallet writes or live supplier request.

The controller had no maintenance holds, pending work or tracked jobs before rollout. It drained through its owned lifecycle. Both retained receipt volumes were backed up while stopped; the supervisor was restarted with the tested image. Both replacement workers became healthy with the same volume mappings and unchanged signing authority. Private recovery material is retained under `.relay/sites-activation-20260912/` and excluded from deployment and Git.

At `2026-09-12T01:27:53.069Z`, fresh fixed-profile readiness on the recorded production HTTPS origin returned 200. Anonymous and ordinary inference credentials received 401. Two workers were eligible, with no pending or tracked work. Independently, the original completed receipt and original unresolved receipt matched their stored values after replacement. These checks started no inference and did not settle or clear customer wallet holds.

## Activation settings

At `2026-09-12T01:29:41.414Z`, `GALX_SITES_CONTENT_ENABLED` and `GALX_SITES_MANAGED_PUBLISH_ENABLED` changed from `0` to `1` in Production, with readback. Hosting project/team/CNAME, sensitive hosting credential, existing domain flags and administrator configuration were present. The cohort and tariff were preserved. The default fixed quote remains $0.05 per completed generation, with the existing account allowance and unresolved-operation limits.

Some Production settings remain deliberately unreadable through Vercel. Their omitted values were not treated as empty configuration or used to justify replacing the account cohort. Readiness above used existing administrator authority and the recorded origin; signed-in application setup must independently establish that the deployed configuration admits the intended account.

## Application deployment and acceptance

Vercel's Production build passed for `dpl_2Mh1KYwBUAn595bFzxeqrvoYhEiP` (`https://galxai-egwfhf2gj-cardsortings-projects.vercel.app`). This deployment captures the project-restricted runtime credential and was promoted to `https://galx.ai`. The first candidate, `dpl_B9fdiDRP7ZYJues6D3DrEZNP6VRF`, captured the initial supplied hosting credential and was not promoted.

The signed-in `/sites` page showed the $0.05 quote after promotion. Entering an unsent synthetic brief enabled Send; the former generation-unavailable message was absent. The temporary brief was cleared without submission. At the observed 1311px viewport there was no horizontal overflow. Rendered page text had no matches against the 39 checked private markers.

At `2026-09-12T02:53:52.910Z`, the live guest HTML and all 24 assets collected from the signed-in page passed the same marker scan and contained no checked Vercel bearer-token pattern. Forged workspace GET and POST requests returned the exact allowlisted 401 DTO, without cookies or rewrite headers. An unknown published artifact returned the generic 404 body. This is a Sites-route check, not a whole-site privacy certification.

The existing scheduler completed at `2026-09-12T01:39:06.544Z` after promotion with `outcome=ok`, its every-minute schedule and no recorded diagnostics. No scheduler code, schedule or machine credential was changed in this activation.

An optional $0.05 customer acceptance test was requested, but spending authorization was not received. No paid generation, customer publication, new managed DNS/TLS round trip or unpublish test was submitted. Platform activation and live quote admission are verified; those additional customer acceptance steps remain untested. [Sanitized activation evidence](workspace-activation-verification.json) records these boundaries separately from the historical metered activation evidence.

The preceding production `dpl_6PUQNnBnHLV7SvUex3BsrLVNjg7X` remains the application rollback target. Pause new generation and managed publication before rollback; keep receipt recovery, private workspace records, public snapshots and domain reservations intact. A rollback must preserve the compatible fixed-price receipt reader.

No general-availability claim follows from configuration alone. Paid customer generation, publication, DNS/TLS verification and unpublish acceptance must be distinguished from service readiness, container fixtures and public-boundary checks.
