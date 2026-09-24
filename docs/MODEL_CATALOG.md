# Model catalog and observed availability

<!-- docs-scope: current-guide -->

Private reference. A catalog describes public IDs and product metadata; it does not certify provider identity, account access or current capacity. [Routing](ROUTING_ALGORITHMS.md) and [account management](reference/relay-account-management.md) own the execution contract.

| View | Meaning |
| --- | --- |
| Product `/v1/models` | Public model descriptions under product access policy |
| Own isolated runtime model/capability projection | Models observed on eligible accounts in that fixed pool, with workload gates |
| Fixed monitor Accounts/Health | Saved/applied lifecycle and observed issues; not proof of successful generation |
| Retained controller model/capability endpoints | Eligible evidence only for its unassigned legacy federation |
| Private execution records | Actual internal route/model evidence, never a public model promise |

## Premium relay

The Premium relay uses verified paid provider accounts and accepts text, Sites and images subject to observed capability. Provider account class is separate from GALX customer plan. A label or paid account is not evidence that every intended model works.

Text selects the configured deployment pool before account selection and cannot fall back to the peer or legacy dispatch. Capacity counts are meaningful only within the selected pool, requested capability and current authority. Zero eligible accounts is unavailable; a positive count is not an SLA or measured throughput guarantee.

## Image compatibility

Canonical public capability `openai-gpt-image-latest` retains its explicitly supported internal alias contract. OAuth image execution uses the configured Codex image tool; the provider chooses its image implementation. Exact underlying GPT-Image identity, dimensions and quality are not guaranteed merely by the public name. See [the private alias contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

Premium image qualification is an explicit requested trial under its own central image grant. The isolated runtime does not perform automatic background paid probes. Fresh chat inventory alone cannot establish image availability. The retained federation's alias configuration and periodic verification remain separately documented in [legacy operations](maintainers/legacy-federation-operations.md).

Public image responses use sanitized binary artifacts or explicit allowlisted JSON. Keep internal execution identifiers private. Unsupported names cannot silently map to a different provider/model; compatibility normalization does not grant substitution.

## Evidence and economics

Use [current state](../post-mortem/CURRENT_STATE.md) for deployment and dated capacity observations. Installed schemas, passing fixtures and monitor readiness do not prove manual provider sign-in or inference. Use current product pricing/entitlement contracts for customer policy; historical discounts, model counts and benchmark results are not live guarantees.
