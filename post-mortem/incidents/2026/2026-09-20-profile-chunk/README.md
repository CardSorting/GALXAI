# Public profile route chunk denied

<!-- docs-scope: operational-record -->

## Impact and scope

Incident `INC-20260920-PROFILECHUNK` is a SEV-2 authorization failure detected at 2026-09-20T02:18:17Z. Public profile pages could return their server document, but anonymous browsers could not load the profile route JavaScript and showed the profile recovery boundary instead. The start time and affected request count are unknown. No account data, accepted generation, or stored artifact was changed.

## Evidence and timeline

The reported browser error named the versioned `/profile/[handle]` page chunk. A raw anonymous request to that exact production asset returned HTTP 401, `application/json`, `private, no-store`, and the allowlisted public authentication error. `/explore` returned HTTP 200 at the same observation. `EVT-20260920-profile-chunk-observed` records the pre-intervention result. `EVT-20260920-profile-chunk-recovered` and [recovery evidence](recovery.json) record the deployed acceptance.

## Cause and contributing conditions

The preview middleware decoded the route chunk path before matching it. It then passed the captured template `profile/[handle]` to the concrete public-profile path validator, which correctly rejects brackets and therefore classified the public route asset as private. Existing tests covered concrete profile pages and static public reading chunks, but not an encoded dynamic public page chunk.

## Containment and recovery

The source repair adds one exact reviewed framework route-template exemption for `/profile/[handle]`. Shared framework assets retain their existing treatment, and unrelated page chunks, private descendants, APIs and administrator chunks remain protected. Rollback is the source revision and does not require data or schema changes.

## Verification and limits

Local verification covered encoded and decoded public chunk names, adversarial private siblings, the public-information boundary, TypeScript, documentation checks and a production build. Deployment `dpl_BfHmeo4ePafqUQZeBafDFdCYn9Er` then served the exact reported route chunk as HTTP 200 JavaScript with immutable caching. A clean anonymous Chrome render showed the Veyra Sol heading and gallery without the profile error boundary. No account mutation, generation, payment or administrator action was exercised.

## Prevention and closure

`FM-ACCESS-003` owns recurrence guidance. The incident is recovered. `ACT-033` is complete because the deployed asset and anonymous browser path passed and the encoded/decoded dynamic-route regression is part of the normal developer-preview suite.
