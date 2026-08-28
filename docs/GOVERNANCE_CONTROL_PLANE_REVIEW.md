# GALXAI Governance Control Plane Review

Reviewed: 2026-08-27

## Decision

GALXAI should become an **evidence-gated AI spend control plane**. The gateway is the enforcement point and the SDK/UI packages are adoption channels. The defensible product is not cheaper tokens, generic observability, or opaque model cascading. It is the closed loop that attributes spend, explains a specific waste mechanism, proves a safer alternative on the customer's workload, enforces an approved policy, and measures the realized result.

The operating sequence is:

```text
Observe -> Attribute -> Explain -> Recommend -> Shadow -> Approve -> Canary -> Enforce -> Verify
```

No model substitution should occur before the workload has a named owner and versioned quality evidence.

## What the workspace actually contained

The product surfaces and the enforcement plane had diverged:

- `/audit` described entropy routing, prompt restructuring, loop clamping, and autonomous remediation.
- `GalxModelRouter` and `GalxEdgeGateway` resolved the requested model and sent it upstream without a spend-governance decision.
- The edge gateway accepted any key with a plausible prefix instead of verifying its stored hash, revocation status, model permissions, and spend cap.
- When an upstream key was absent or a provider fetch failed, the gateway returned synthetic successful chat, embedding, and image payloads. That makes availability and quality evidence unreliable.
- The model catalog used stale retail baselines. In particular, its configured Luna customer rates were higher than OpenAI's current public Luna rates while still being presented as a discount.
- The calculator did not include GPT-5.6 cache-write pricing or long-context multipliers.

These are product-trust failures, not presentation details. A spend-governance product cannot make defensible savings claims until authentication, metering, provider responses, and counterfactual pricing are truthful.

## Refined product experience

### Day-one output

The first useful result is a read-only 7–14 day baseline, not an automation switch. The buyer should receive:

1. **Reconciled spend** — provider invoice versus measured calls, tokens, cache reads, cache writes, tool charges, and service tiers.
2. **Allocation coverage** — percentage of spend assigned to a workload, product, environment, team, owner, and cost center. Unallocated spend is shown explicitly.
3. **Addressable waste** — savings opportunities separated into measured, estimated, and quality-gated amounts. Never present all theoretical savings as realizable.
4. **Top causal findings** — each finding includes owner, affected request cohort, evidence, counterfactual, confidence, and proposed control.
5. **Risk status** — policies already safe to enforce, policies awaiting a shadow run, and policies requiring business approval.
6. **Verification plan** — the success metric, guardrail metric, rollout percentage, rollback trigger, and expected monthly impact for every intervention.

The desired “now I understand the bill” moment should look like this:

> Support ticket classification is 18% of spend. Ninety-four percent of those calls use Sol, but a 500-case regression and 5% shadow sample show Luna is within the approved 1% task-success margin. Enforcing the approved route at 25% traffic would save an estimated $31,400/month. The support platform team owns the route; rollback is automatic if the lower confidence bound crosses -1%.

That is stronger than a generic “frontier misallocation: $31,400” card because every number is inspectable and actionable.

## Intervention boundary

| Control | Detect automatically | Enforce automatically | Required evidence or approval |
| --- | --- | --- | --- |
| Missing attribution | Yes | Optional block in enforcement mode | Organization defines required dimensions |
| Key/model allowlist | Yes | Yes | Approved policy |
| Per-request output cap | Yes | Yes | Approved policy |
| Project/environment budget cap | Yes | Yes | Budget owner and fail-open/fail-closed choice |
| Duplicate exact requests | Yes | Only for deterministic/cache-safe routes | Cache policy and data-sensitivity review |
| Prompt-cache misses | Yes | No prompt reordering | Stable-prefix or explicit-cache change reviewed by owner |
| Model right-sizing | Yes | Only after the quality gate passes | Regression set, shadow sample, canary, rollback |
| Runaway agent loop | Yes, with session/turn/tool metadata | Yes, when a deterministic threshold is approved | Per-workload turn/cost/time budget |
| Semantic-cache reuse | Estimate | Normally human-approved | Freshness, privacy, tenant isolation, and false-hit evaluation |
| Provider/contract change | Yes | No | Procurement, security, residency, and reliability approval |

“Entropy” is not a sufficient routing signal. Short or repetitive prompts can still be high stakes, and long prompts can be simple extraction. Explicit workload identity plus measured task success is the safer control primitive.

## Quality gate for model routing

A route is identified by `(workspace, workload, prompt/version, requested model, candidate model)` and moves through these states:

1. `draft` — a cost opportunity exists, but no quality claim is made.
2. `offline_passed` — a representative, versioned regression set passes deterministic checks and task-specific scoring.
3. `shadow_passed` — sampled production inputs are evaluated asynchronously; the user still receives the baseline response.
4. `approved` — the workload owner accepts the maximum regression, sample size, expiry, and rollback conditions.
5. `canary` — a small deterministic cohort receives the candidate response.
6. `enforced` — traffic increases only while quality, error, latency, and cost guardrails hold.
7. `revoked` — a prompt/model change, evidence expiry, or guardrail breach returns traffic to the requested model.

The lower confidence bound of the quality delta must pass the customer's threshold. A mean score or an LLM-judge point estimate is not enough. Structured outputs should also use schema validity and business-rule checks; tool workloads should use tool selection and end-state success; agents should use completion, loop, and intervention rates.

## Cache optimization policy

Do not automatically reorder arbitrary messages or tool schemas. Ordering can change instruction priority, tool behavior, signatures, and application semantics.

Instead:

- measure `cached_tokens` and `cache_write_tokens` from provider usage;
- group requests by a privacy-safe prompt-template fingerprint;
- show the first divergence point that prevents reuse;
- recommend a stable prefix, consistent cache key, or provider-supported explicit breakpoint;
- run the revised prompt as a versioned experiment before rollout.

For GPT-5.6, cache reads are currently priced at one tenth of normal input, while cache writes cost 1.25 times uncached input. A hit-rate card that ignores writes can overstate savings.

## Architecture

```text
Client / SDK
    |
    | request + signed key + workload metadata
    v
Edge gateway
    |-- authenticate key hash, revocation, permissions, spend cap
    |-- normalize request without changing semantics
    |-- evaluate deterministic limits
    |-- evaluate evidence-gated route
    |-- call the real provider or fail closed
    v
Usage event pipeline
    |-- actual provider usage and cost
    |-- attribution and prompt-template fingerprint
    |-- requested/effective model and policy version
    |-- decision reason and evidence ID
    v
Warehouse / control-plane API
    |-- reconciliation and causal findings
    |-- offline/shadow evaluation results
    |-- approvals, canaries, rollback state
    v
Audit UI + notifications
```

Policy evaluation belongs on the request path. Detailed telemetry, shadow calls, evaluation, aggregation, and notifications belong off the request path in a queue or analytics pipeline.

## Existing primitives to keep

- The gateway and SDK-compatible ingress are the right enforcement and adoption primitives.
- The API-key, project allocation, department allocation, and routing-rule tables are useful beginnings.
- Token usage capture, cached-token capture, the credential pool, circuit breakers, and audit logging can support the control loop.
- The audit UI is a useful prototype of the buyer narrative, but it must consume measured findings rather than fixed category shares.
- React components remain useful for developer acquisition and metadata capture, but they are not the enterprise moat.

## Existing primitives to change

- Replace latency-only `galx_model_routing_rules` approval with versioned workload and evaluation evidence.
- Separate availability failover from cost/quality routing. A 429 fallback and a lower-cost substitute have different approval semantics.
- Replace fixed leakage percentages with measured cohorts and uncertainty ranges.
- Add an immutable usage event containing requested model, effective model, provider usage, provider cost, customer price, policy version, evidence ID, and allocation dimensions.
- Treat pricing as versioned data with effective dates and a source. Customer contract rates must not be inferred from monthly spend.
- Move synthetic responses behind an explicit local-test-only switch and mark them in response headers.

## Commercial recommendation

Start with **BYOK gateway plus a platform fee or verified-savings fee**. It is easier to pilot, preserves the customer's existing provider contract, and avoids making GALXAI the credit, tax, reconciliation, and availability counterparty before the product has earned trust.

Offer consolidated inference billing later as an enterprise option when GALXAI can support contract-rate ingestion, invoice reconciliation, credit exposure, regional processing, tax, refunds, and provider outage liability. “No new budget line” is attractive, but it does not remove vendor onboarding and substantially increases operational risk.

## Prioritized build plan

### Phase 0 — trust boundary

- Authoritative API-key validation and spend-cap checks.
- Fail-closed provider behavior.
- Current, versioned provider and contract rates.
- Correct cache-write, cached-read, long-context, tool, batch, and service-tier metering.
- Invoice-to-event reconciliation.

### Phase 1 — read-only value

- Workload/department/environment attribution contract.
- Allocation coverage and unallocated-spend queue.
- Measured causal findings for model choice, output length, retry amplification, agent turns, and cache behavior.
- Downloadable evidence and owner assignment.

### Phase 2 — proof loop

- Dataset capture with privacy controls.
- Deterministic and task-specific evaluators.
- Asynchronous shadow evaluation.
- Evidence expiry on prompt, schema, tool, or model-version changes.

### Phase 3 — controlled enforcement

- Versioned policies, approvals, canaries, and one-click rollback.
- Deterministic spend/output/turn caps.
- Evidence-gated model routes.
- Realized-versus-expected savings and quality monitoring.

## Changes made during this review

- Added `GalxSpendGovernanceEngine`, defaulting to observe mode and requiring named workload evidence before routing.
- Integrated governance decisions and evidence IDs into edge response headers.
- Added authoritative production key validation against stored SHA-256 hashes, revocation, permissions, and spend caps.
- Made production key issuance wait for the authoritative Supabase write before returning the one-time raw secret.
- Rejected production credentials in query strings and unknown chat model IDs instead of silently accepting or remapping them.
- Made synthetic chat, embedding, and image responses local-test-only and explicitly labeled.
- Updated GPT-5.6 public API rates, context windows, cached-input rates, cache-write pricing, and long-context pricing.
- Removed automatic spend-tier rebates until a signed customer rate card is available.
- Added focused governance and edge verification.

## Deliberate limits of this patch

This is a safe enforcement slice, not a complete control plane. It must remain in `observe` mode for production onboarding until the following are built and verified:

- an immutable usage-event pipeline and invoice reconciliation;
- atomic budget reservation plus post-response cost reconciliation (the current spend-cap lookup prevents use of an already-exhausted key, but concurrent requests can still race the cap);
- durable, tenant-scoped policy and evidence storage rather than a global environment JSON document;
- asynchronous shadow evaluation, approval, canary allocation, guardrail monitoring, and automatic rollback;
- measured audit findings replacing the UI's explicitly labeled scenario percentages;
- a versioned rate-card source covering non-text modalities, service tiers, batch pricing, tools, and customer contracts.

---

## Representation-Selection Governance Boundaries (ADR 0066 & ADR 0067)

Context compaction and representation transformation are subject to the same evidence-gated governance principles:

1. **Adaptive Density Gate ($\text{ID}(C)$)**: Compaction must not be unconditionally forced on small or already-dense contexts ($<200$ tokens). The system enforces an automatic identity bypass to prevent negative token dilation and preserve $100\%$ baseline fidelity.
2. **Action Safety over Summary Quality (ADR 0066)**: In noisy corporate environments with conflicting historical authority, compaction is governed by **Action Safety** (disarming the 7 adversarial traps) rather than subjective summary quality.
3. **Fail-Closed Provenance Verification (`BroccoliCompactionSafety`)**: If an extracted representation introduces ungrounded entities, amounts, or identifiers, the control plane immediately aborts the transformation and safely falls back to raw source text.
4. **Empirical Boundary Verification**: Governed under the 7-Tier Progressive Institutional Entropy Matrix (`npm run bench:entropy`) and the OpenAI empirical billing suite (`npm run bench:inference-boundary`).

## Current sources

- OpenAI model prices and capabilities: https://developers.openai.com/api/docs/models/compare
- OpenAI GPT-5.6 cache-write and long-context pricing: https://developers.openai.com/api/docs/models/gpt-5.6-sol
- OpenAI GPT-5.6 caching guidance: https://developers.openai.com/api/docs/guides/latest-model
- FinOps for AI framework: https://www.finops.org/framework/technology-categories/ai/
- Cloudflare dynamic routing concepts: https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/
- Cloudflare Workers production practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Langfuse cost and evaluation concepts: https://langfuse.com/docs/observability/features/token-and-cost-tracking and https://langfuse.com/docs/evaluation/core-concepts

