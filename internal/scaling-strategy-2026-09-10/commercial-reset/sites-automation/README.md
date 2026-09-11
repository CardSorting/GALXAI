# Relay-powered Sites workflow

Current private implementation: the [durable companion](durable/README.md), [fixed-price policy](durable/OPAQUE_PROVIDER_POLICY.md) and [delivery runbook](durable/LIVE_ADAPTERS.md). [ADRs 0134–0136](../../../../docs/adr/README.md) govern the strategy.

The existing relay supplies short text. Deterministic code validates the content, renders a fixed template and packages its exact files. Customer-owned Sites tools handle save and private publication without a Codex model turn. This is a bounded workflow; native Responses/tool-loop compatibility is a separate project.

Generation uses a versioned fixed customer price and rolling account allowance with durable completion receipts. Exact supplier quota and token cost are not prerequisites. Missing usage remains unknown without blocking a known fixed-price completion; uncertain execution stays reserved and is never replayed to guess an outcome. The server enforces account funding, cohort membership, local request limits and fresh receipt readiness.

The companion retains local jobs, immutable archives, source/save acknowledgements and publication locks. Use the native-host upload handoff for the historically verified delivery path. Direct CLI archive save remains unqualified and has no automatic fallback. Read-only Sites access does not establish upload or publication success.

The fixed-mode changes are locally verified, not deployed by their implementation pass. Earlier live text, save and private publication observations remain dated evidence. The earlier metered release kept paid generation disabled. Follow [Sites operations](../../../../docs/maintainers/SITES_OPERATIONS.md) for configuration, deployment, pause and original-operation recovery.

## Navigation and historical evidence

- [Durable workflow and offline demonstration](durable/README.md)
- [Current customer-local commands](durable/LIVE_ADAPTERS.md)
- [Current fixed-mode verification](durable/opaque-provider-verification.json)
- [Initial live observations](live-observations.json) and [connection contract](connection-contract.json)
- [Original feasibility narrative](../historical-docs/sites-automation__README.md.txt)

The old `run-live.ts` entry point is retired and refuses to run. Its source remains in [the historical snapshot](historical/run-live.ts.txt). `local.ts` is explicitly diagnostic and does not produce monetary settlement. Use separate state for `live.ts`; never reuse a fixture receipt as authority for billing or publication.
