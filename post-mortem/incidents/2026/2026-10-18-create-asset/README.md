# Private Create page cannot load its browser entry

<!-- docs-scope: operational-record -->

## Impact and scope

INC-20261018-CREATE-ASSET, SEV-2, access availability. Live acceptance of the
October 18 passive-notice correction found the signed-in Create page displaying
its generic render-recovery screen. Library still renders three owned images
without the busy popup, and Google sign-in remains accepted. Broader customer
impact and the original start time are unknown. No data exposure or new inference
is established by this failure.

## Evidence and cause

The browser reports a chunk-load error. The exact Create entry script returns
401 and a generic authentication DTO both through the public hostname and the
private web listener. The asset exists in the accepted build. The shared
`publicPages` developer-exemption set includes Library/Favorites but omits the
exact `/images/create` route; the framework-asset classifier inherits that
omission. The same policy source is present in the earlier accepted build, so
this is not introduced by the passive-notice branch removal.

The 44 whole-image checks and 65 general public checks passed but did not load
this particular private-workspace entry bundle. Those passing results do not
supersede the failed actual Create observation. The first notice image and all
receipts remain retained in the [release record](../../../releases/2026-10-18-google-and-image-notice.json).

## Containment and recovery

Do not grant developer access, expose all framework chunks, change account roles,
clear working sessions or use the inactive source. Retain native authority,
Library availability and the accepted Google credential. The correction adds
only the existing consumer Create route to the exact exemption set; middleware
and server pages still require verified account entry before workspace content.

A new full-middleware regression fails before the fix. It requires Create
scripts to load without querying identity, denies private sibling/administrator
chunk templates and preserves anonymous-page sign-in. All 71 image/security
checks and TypeScript pass after the one-line correction. The fresh image09 passes all 44 whole-image checks, including the unchanged
full deadline and clean shutdown, and replaced only the owned web container
after a clean drain. Native configuration, data, Auth, Nova and ingress are unchanged.

## Prevention and closure

ACT-056 is completed: the exact Create script returns HTTP200 JavaScript with
immutable caching and bytes identical to the accepted build. The signed-in editor
renders on desktop and phone without the busy popup or render recovery, while
Generate stays disabled under existing gates. Library retains its three owned
images. All69 live account/asset checks (42assets,13configured secrets/zero
matches) and38 cache checks pass, including anonymous workspace/API denial. The public verifier now accepts the retained
build directory and checks the Create entry's bounded asset list, covering the
previous acceptance gap. Retain the failing-before regression, explicit entry-asset verifier and matching
image rehearsal for future replacements. The incident is recovered; existing
styling advisories and mobile overflow are outside this exact asset correction. See [FM-ACCESS-003](../../../failure-modes/access-and-documentation.md).
