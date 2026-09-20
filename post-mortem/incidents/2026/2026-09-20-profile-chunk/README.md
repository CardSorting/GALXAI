# Public profile route chunk denied

<!-- docs-scope: operational-record -->

## Impact and scope

Incident `INC-20260920-PROFILECHUNK` is a SEV-2 authorization failure detected at 2026-09-20T02:18:17Z. Public profile pages could return their server document, but anonymous browsers could not load the profile route JavaScript and showed the profile recovery boundary instead. The start time and affected request count are unknown. No account data, accepted generation, or stored artifact was changed.

## Evidence and timeline

The reported browser error named the versioned `/profile/[handle]` page chunk. A raw anonymous request to that exact production asset returned HTTP 401, `application/json`, `private, no-store`, and the allowlisted public authentication error. `/explore` returned HTTP 200 at the same observation. `EVT-20260920-profile-chunk-observed` records the pre-intervention result.

## Cause and contributing conditions

The preview middleware decoded the route chunk path before matching it. It then passed the captured template `profile/[handle]` to the concrete public-profile path validator, which correctly rejects brackets and therefore classified the public route asset as private. Existing tests covered concrete profile pages and static public reading chunks, but not an encoded dynamic public page chunk.

## Containment and recovery

The source repair adds one exact reviewed framework route-template exemption for `/profile/[handle]`. Shared framework assets retain their existing treatment, and unrelated page chunks, private descendants, APIs and administrator chunks remain protected. Rollback is the source revision and does not require data or schema changes.

## Verification and limits

Required local verification covers encoded and decoded public chunk names, adversarial private siblings, the public-information boundary, TypeScript, documentation checks and a production build. Hosted recovery additionally requires the exact route asset to return JavaScript with a successful status and a real anonymous profile navigation to render without the error boundary. A successful build or deployment state alone is insufficient.

## Prevention and closure

`FM-ACCESS-003` owns recurrence guidance. The incident remains investigating until a deployed asset and anonymous browser path pass. `ACT-033` tracks keeping the dynamic-route asset regression in the authorization suite.
