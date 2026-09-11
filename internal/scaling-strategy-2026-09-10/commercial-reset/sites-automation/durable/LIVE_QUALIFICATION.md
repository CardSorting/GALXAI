# Live qualification — September 10, 2026

Private historical operational evidence. The observations below describe the September 10 qualification, not present availability. [ADRs 0134–0136](../../../../../docs/adr/README.md), [Sites operations](../../../../../docs/maintainers/SITES_OPERATIONS.md) and [the delivery runbook](LIVE_ADAPTERS.md) govern the later fixed-price implementation. Supplier usage/ceiling prerequisites in this record apply to the earlier metered contract.

## Verified

- [Private sample Site](https://galx-studio-delivery-check-bq97iip8.goldeneggie.chatgpt.site) reached `succeeded`. Registration, source push, official packaging, canonical validation, version save and private publication completed. The native account remained the sole allowed viewer afterward. An unauthenticated HTTP check returned 403. No public audience was enabled.
- The sample used a dedicated two-file static checkout, containing no GALX source, operational details, credentials or external dependencies. It tests publication independently of paid generation. It is not proof of the full billed companion workflow or a live-site security audit.
- One isolated worker running the patched relay completed a real request with **11 input / 5 output / 16 total tokens**. Existing-job replay returned the same usage without another generation. No production service was restarted and no wallet was charged. [Metering observations](live-metering-verification.json).
- Database recovery preserves the accepted job and original relay origin before streaming. The authenticated lookup retrieves that exact job, settles at the originally reserved rate, and refunds unused reservation atomically. Tests cover missing usage, interrupted streams, duplicate settlement, changed origins, conflicting job IDs and cross-account denial.

## Findings that changed the implementation

1. The relay discarded `response.usage`. It now validates and allowlists final usage, includes it before `[DONE]`, and retains it for ordinary stream replay. Incomplete or inconsistent evidence, retries and failovers without complete attempt accounting remain unbillable automatically.
2. Sites returned a compound version ID containing `~`. The companion now preserves this identifier without rewriting it.
3. Sites normalized the uploaded gzip into a tar with a different hash. The adapter now journals an upload intent and records the trusted save acknowledgement’s source/version/hash/size beside the local artifact digest. Subsequent reads must match that receipt. It refuses an arbitrary externally supplied version and never retries a save after an unknown acknowledgement.
4. A fresh CLI no longer lists the Sites skills, although the current hosted session can call Sites. Both installed CLI versions failed the read-only skill check; `codex plugin add sites@openai-bundled --json` returned `plugin not found`. No cache edits, permission bypasses or browser publishing automation were used. The hosted session’s credential was passed through non-echoing input and per-command process environment for Git, never written to disk or command arguments.
5. Forwarding `max_output_tokens` failed twice; the repeat captured `upstream_error_400`. The otherwise successful comparison omitted it. Output-limit forwarding is therefore opt-in in relay configuration and disabled by default. A five-token response does not establish an enforceable ceiling.

## Release sequence

1. Restore Sites availability on the supported customer CLI surface, then qualify `save-version → publish-saved → update` with that customer's connection. Current-session publication does not establish CLI portability. Preserve the existing Site and pending IDs; do not create duplicates to recover a connection failure.
2. Qualify an upstream output ceiling or choose another demonstrably bounded execution contract. Do not activate a tariff that relies on the currently rejected parameter.
3. Add durable relay receipt retention independent of in-memory streams, with explicit retention and operator recovery. Current replay lasts only the worker's retained window (default ten minutes), and completed output does not survive worker restart. Expiry/404 must never release funds automatically. Old holds without a persisted origin/reference remain operator cases.
4. Deploy the verified relay change, publish an approved tariff, and enable the billing route for a controlled customer cohort. Measure unresolved holds, paid usage, revision cost and support time before widening access. The reservation and single-active-operation controls already fail closed.

No production environment flags, rate card, customer balances, SQL schema or database grants changed in this pass. Pricing and supplier margin remain separate commercial qualification tasks. Verification totals overlap: 61 core/adapter/API/relay tests, 10 scoped transport/source tests, 36 disposable PostgreSQL/HTTP checks, and 75 application regressions, plus the production build and local asset scan.

The existing [live adapter runbook](LIVE_ADAPTERS.md) describes commands and trust boundaries. [Application evidence](application-verification.json) records the exact build and tests. The [OpenAI response contract](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create) informed field validation; the live experiment determines what this relay upstream actually accepts.
