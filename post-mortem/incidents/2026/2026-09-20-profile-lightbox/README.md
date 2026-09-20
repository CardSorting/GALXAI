# Public profile lightbox viewport overflow

<!-- docs-scope: operational-record -->

## Impact and scope

Incident `INC-20260920-LIGHTBOX` is a SEV-2 presentation failure observed at 2026-09-20T02:40:00Z. On public profile image deep links, the application navigation could paint above the lightbox and narrow viewports could crop the media surface and its right-edge controls. The reported Morrow Kest creation reproduced the fault. The incident start time and affected request count are unknown. No account, generation, payment, or stored image state was changed.

## Evidence and timeline

Pre-intervention desktop and phone-sized browser captures reproduced the shell overlap and media overflow on the reported public URL. The public creation DTO described the requested aspect, while the delivered sanitized artifact had a different intrinsic shape; the lightbox layout did not reliably constrain itself to the viewport and artifact box. `EVT-20260920-profile-lightbox-observed` records this observation. `EVT-20260920-profile-lightbox-recovered` and [recovery evidence](recovery.json) record the deployed acceptance.

## Cause and contributing conditions

The lightbox was rendered inside a lower application stacking context, so its local z-index could not overtake the persistent navigation. Its mobile grid also relied on content-driven sizing and image maximums without an explicit bounded row and border box. This allowed tall or metadata-mismatched assets to enlarge or visually escape the intended media region. Existing build checks did not include the public profile deep-link lightbox at both desktop and narrow viewport breakpoints.

## Containment and recovery

The source repair portals the dialog to the document body, locks background scroll while open, restores focus on close, bounds the dialog and both grid tracks to the viewport, and contains the image according to its intrinsic dimensions. Mobile uses the full dynamic viewport with safe-area-aware padding and independently scrolling details. No API, storage, generation, or profile-data contract changes.

## Verification and limits

TypeScript and production builds pass. Local production and development browser captures verified the reported deep link at desktop and the narrow breakpoint. Production deployment `dpl_God3HUju5MCgrPHU3drcGDQqJ6aN` for source `f59f4a4` then returned HTTP 200 at the exact deep link, and clean hosted browser captures showed the overlay above the shell, the intrinsic image inside the media region, and previous, next, zoom, and close controls visible. The build boundary scan covered 537 generated browser/rendered assets. Physical-device and assistive-technology coverage remain separate.

## Prevention and closure

`FM-IMG-006` owns recurrence guidance. The incident is recovered and `ACT-034` is complete. Reopen if persistent shell navigation appears above a public image dialog or media/edge controls escape a supported viewport.
