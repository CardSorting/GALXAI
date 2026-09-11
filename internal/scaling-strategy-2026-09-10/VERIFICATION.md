# Verification record

This is a private local audit of source revision `4587642`, performed September 10, 2026. Runtime findings were reproduced against an isolated copy of tracked source with no dotenv files and no production authority credentials. Dependencies were reused from the existing installation. No production request, database mutation, provider enrollment, purchase, billing configuration change, deployment or external message was made.

## Completed checks

| Check | Result | Scope |
| --- | --- | --- |
| Source inspection | Completed | Catalog, routing, streaming, metering, checkout/fulfillment, seat admission, public DTOs, prior audit records and CI |
| Existing adversarial/security/reliability tests | **66 passed, 0 failed** | Nine selected test files, including subtests; Node 22.21.1; initial Node 26.8.1 run also passed |
| Production build | **Passed** | Isolated `scripts/build-ci.mjs`, Node 22.21.1, fixture public configuration and random synthetic signing material |
| Public asset scan | **616 files scanned, zero selected-marker matches** | Local generated JavaScript and prerendered HTML; eight exact markers; see [asset-scan.json](asset-scan.json) |
| Additional diagnostic probes | **Observed gaps reproduced** | Node 22.21.1; actual quota-response branch and isolated stream/buffer/catalog/task projection functions; see [audit-observations.json](audit-observations.json) |
| Required Node 22 runtime | **Verified using an isolated official distribution** | Homebrew installation failed to start; checksum-verified official Node 22.21.1 used without changing system packages |
| Private package checks | **Passed** | Local links/anchors, JSON decoding, 192 CSV scenarios, cap invariants and selected secret-format patterns |
| Repository documentation index | **4 existing issues** | `image-studio-review.md` and `signup-credit.md` each lack a valid scope marker and catalog entry; source files unchanged by this audit |

The first sandboxed test run could not open loopback sockets, and the first build could not resolve Google Fonts. The approved reruns passed with the same isolated configuration. The installed Homebrew Node 22 binary also could not start because `libsimdjson.29.dylib` was missing. An official standalone Node 22.21.1 distribution was downloaded to a temporary directory, checked against Node's published SHA-256 list, and used to repeat all 66 checks, the probes and the production build successfully. No system package repair was needed. This establishes local required-runtime verification; a remote CI run was not performed.

The [verification manifest](verification-manifest.json) records the runtime distribution, checksum, source revision and hashes of the local raw logs.

The security/reliability command was:

```sh
node --import tsx --test \
  scripts/test-image-public-http.ts \
  scripts/test-public-information-boundary.ts \
  scripts/test-image-retry-contract.ts \
  scripts/test-auth-identity-boundary.ts \
  scripts/test-relay-chat-transport.ts \
  scripts/test-postgres-admission.ts \
  scripts/test-relay-capabilities.ts \
  scripts/test-federation-admission.ts \
  scripts/test-ci-build.mjs
```

Tests received only a minimal environment, synthetic vault/signing values and invalid-domain public fixtures. The isolated build used `CI=true` and the repository's guarded `scripts/build-ci.mjs`. It must never be deployed. Local raw logs remain in the temporary audit snapshot; the committed report contains bounded summaries rather than production-sensitive logs.

## Diagnostic results

| Probe | Observed result | Interpretation |
| --- | --- | --- |
| Chat quota failure | 429 contains internal pool/headroom and congestion header | Actual response construction crosses the public boundary |
| Same stream, one chunk | 32 completion tokens | Byte estimate includes SSE envelope rather than authoritative usage |
| Same stream, one byte per chunk | 126 completion tokens | Charge changes with chunk boundaries; fixture declares one completion token |
| Unknown SSE field | Forwarded in both chunking cases | No exact public event projection at this layer |
| Cancellation after response bytes | Zero charge events | Supplier liability can exist without a durable usage event; exact customer charge policy needs definition |
| Buffered settlement exception | Zero pending entries | Failed fire-and-forget entries are not retained by this buffer |
| Two models for one user | One payload, first model only, no original request metadata | Coalescing loses per-request attribution |
| Invented model identifier | Resolves to default Sol | Strict identity is absent in the catalog resolver; some route-specific entitlement gates may reject earlier |
| $10 credit definitions | Calculator $15; product description $20 | Definitions conflict before first-purchase eligibility adjustment |
| Async tool completion | `tool_calls` finish reason, no tool calls or usage | Projection removes functionality required by an agent client |

The probes replace supplier, repository and identity dependencies with synthetic values. They do not attempt to break into a live account, bill a user, or measure incurred losses. [audit-probes.mjs](audit-probes.mjs) is diagnostic code, not a test specification endorsing the observed behavior. Once fixes land, replace these probes with desired-behavior regressions in the appropriate application suites.

To reproduce, create a disposable source copy excluding all dotenv/secret/private-state files, include this directory, and install or reuse the existing dependencies. Run the probe from that copy's root with `node --import tsx internal/scaling-strategy-2026-09-10/audit-probes.mjs`, using synthetic vault/signing material if required by imported modules. The probe explicitly rejects dotenv files and configured production authority variables. Do not run broad database integration suites under production configuration; the September 9 records document why this matters.

## Evidence limits

No current production SLO, supplier invoice, rate-limit allocation, procurement agreement, customer willingness-to-pay study or current fleet inventory was retrieved. Historical operational records are cited with their dates. The audit does not certify provider independence, complete end-to-end privacy, supplier model identity on every path, or financial reconciliation.

The static asset scan checks eight selected literal markers. It does not render every authenticated page, inspect every dynamic API error, detect every secret encoding or inspect the live site. The dynamic chat findings remain open despite that clean scoped scan. No claim that the live site is clean is made.

No database schema or SQL was changed. Financial concurrency, RLS/migrations and payment lifecycle acceptance remain implementation gates. The existing database admission tests use synthetic transport faults; they do not replace a complete transactional wallet test suite.

The report additions are in this private strategy directory. The root `.vercelignore` also excludes `/internal/` to keep the package out of Vercel uploads. No application source imports the package. Application behavior remains at the audited baseline. Recommendations and roadmap tickets are proposals ready for implementation, not claims of deployed improvements.
