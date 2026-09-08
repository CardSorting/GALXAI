# Public information boundary

Public content explains what GALX does, how to call it, and what users can expect.
Keep topology, shard configuration, credential sources, authentication to upstreams,
routing mechanics, internal constraints, execution-model selection, and implementation
diagnostics private. Do not publish these in UI copy, metadata, social previews,
browser bundles, response bodies, headers, errors, streams, or public documentation.

Use explicit public response field allowlists. Do not forward internal objects or
upstream headers wholesale. Keep operational diagnostics behind server-side
administrator authorization; an ordinary authenticated user is not an administrator.
Public model names and aliases must not promise an unverified underlying model.
Preserve internal protocol identifiers and operational records without presenting them.
Verify changes with adversarial response tests, authorization tests, and a production
build. Scan rendered pages and browser assets before claiming the live site is clean.

PUBLIC DOCUMENTATION DESCRIBES CAPABILITY, NOT IMPLEMENTATION.
Image HTTP responses default to sanitized binary artifacts. Explicit JSON contracts
use allowlisted DTOs. Re-encode images before publication; never trust upstream
metadata. Test raw HTTP bodies, headers, errors, async retrieval, and artifacts.
