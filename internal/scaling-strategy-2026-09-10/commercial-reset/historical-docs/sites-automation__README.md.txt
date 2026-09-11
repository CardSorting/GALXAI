# Sites automation with the relay as the only model provider

**Current implementation:** the [durable local workflow](durable/README.md) supersedes the one-shot runner below. It adds transactional job state, account reservations, fenced leases, reconciliation, immutable publishing intent, normalized artifacts and a bounded Sites connection transport. The [hardening assessment](durable/HARDENING.md) records the new evidence and remaining release gates. This document preserves the original relay feasibility investigation.

**Decision: build a bounded Sites workflow around the relay's existing text capability. Use Codex as an authenticated tool host, without starting a Codex model turn.** One live relay request produced validated content, the deterministic renderer created a local static draft, and the installed Sites helper packaged it successfully. Authenticated Sites access also succeeded with zero Codex model requests. Publication remains untested.

This changes the sequencing in the [main assessment](../SITES_ASSESSMENT.md). A Responses implementation is necessary for the native Codex agent workflow previously tested. It is not a prerequisite for every useful Sites workflow. The user has only the relay for model supply; this proposal requires no second model provider.

## Architecture and user promise

```mermaid
flowchart TD
    A[User supplies a bounded project brief] --> B[GALX workflow runner]
    B --> C[Relay generates structured content as ordinary text]
    C --> D[Validate content and render a fixed template]
    D --> E[Run installed Sites packaging helper]
    E --> F[Review artifact and intended audience]
    F --> G[Customer's authenticated Sites tool host]
    G --> H[Create or update, save, deploy, verify]
```

The final publishing phase is proposed, not implemented by this proof. The runner chooses the allowed operations and their order. The model cannot supply a tool name, executable command, filesystem path, credential, project identifier or deployment audience. It supplies content within a small schema. Tool results are processed by code; they do not require `role: tool` messages or structured function calls from the relay.

For an initial user implementation, run the workspace and Sites connection in a local companion under the customer's existing Codex/Sites login. GALX supplies the workflow and metered model service. A relay credential grants model access only; the user still needs a separate eligible Sites connection. Browser-only users with no such connection cannot publish through this design today. Do not host customers' work under a shared operator's Sites identity.

This uses the installed Sites skills' requirements and helper scripts for a narrow workflow. It does **not** turn arbitrary Markdown skills into executable software, or reproduce a general Codex agent that can design any full-stack application. A sensible first scope is a template-based client portal with generated copy and bounded revisions.

OpenAI documents app-server initialization, threads and MCP tool calls as separate operations. Our installed-runtime experiment establishes that this account can invoke a Sites read without `turn/start`; the documentation does not establish universally supported unattended Sites publishing.[^1]

The familiar engineering pattern is a workflow with predefined steps. Anthropic's engineering guide distinguishes that pattern from agents that choose their own process dynamically, and recommends starting with the simplest effective design. This is a workflow design reference; it introduces no Anthropic model dependency.[^2]

## What actually worked

Recorded September 10, 2026. See [live observations](live-observations.json), [relay preflight](relay-preflight.json), [generated brief](artifacts/brief.json), [local page](artifacts/index.html) and [local archive](artifacts/static-draft.tar.gz).

| Check | Observed result | Limit of the evidence |
| --- | --- | --- |
| Configured relay readiness | Health and model catalog returned 200 | One point-in-time check; no availability estimate |
| Sites tool host | Installed Sites 0.1.66; both skills present; authenticated inventory read succeeded | This machine/account; no publishing operation tested |
| Model-provider isolation | Tool host used an inert local provider; zero unexpected model requests and zero model turns | The Sites service still needs network/account access |
| Actual inference | One request through existing `executeRelayChat`; requested catalog identifier `gpt-5.6-luna` | Requested identifier does not independently verify the underlying model |
| Generation | Valid JSON on the first attempt, 7,097 ms | One synthetic brief, not a quality or latency benchmark |
| Runner elapsed time | 9,124 ms | Includes connection/generation/rendering; excludes the separate packaging invocation |
| Local artifact | Escaped static HTML, 1,857 bytes, exact content schema | No arbitrary code, integrations, assets or real customer data |
| Official packaging | Installed `scripts/package-site.mjs` succeeded; exact archive allowlist passed | No registered `project_id`, source commit or saved version; deployability unestablished |
| Guardrails | Nine offline tests passed | These are content/workflow tests, not tenant or publication authorization tests |
| Usage | No usable token total returned; recorded as `null` | Cost is unknown, not zero |
| External changes | No Site creation, source push, saved version, deployment or audience change | Complete hosted workflow still needs qualification |

The first macOS archive included AppleDouble metadata. Re-running the official helper with process-local `COPYFILE_DISABLE=1` removed it. The final archive has exactly `dist`, `dist/index.html`, `dist/.openai` and `dist/.openai/hosting.json`, no links, and HTML identical to the retained artifact. Its manifest only declares the static directory. Packaging success does not imply that the backend would accept this unregistered project.

The later hardening pass found that this file-list check did not detect PAX extended attributes retained by the macOS packager. The [current artifact pipeline](durable/HARDENING.md) validates and normalizes archive metadata as well. Use its canonical artifacts for further integration work; the archive above remains historical evidence.

The [earlier native Codex experiment](../sites-relay/README.md) remains valid: `/v1/responses` was missing, function definitions were lost and tool-result messages were rejected. This proof succeeds because its model requests need only text. It does not fix or disguise those protocol defects.

## Alternatives under the relay-only constraint

| Approach | Fits current model transport? | Work and release decision |
| --- | --- | --- |
| Fixed workflow, schema-bound content, installed Sites tool host | **Yes; generation/read/packaging demonstrated** | Preferred first implementation; qualify publication, ownership and costs next |
| Generic JSON-to-tool agent loop over chat | Text could carry action proposals, but reliability unmeasured | Defer: creates model-controlled tool selection, repair loops and a larger security/support burden |
| Responses facade that translates arbitrary agent requests into text | No proof of faithful semantics | Defer: path translation does not restore tool-call IDs, continuation, streaming, cancellation or accounting |
| Native Codex model loop through GALX | No, with today's relay | Separate compatibility project if users require general Codex behavior |
| Existing Site calls GALX at runtime | Build-time tool protocol is irrelevant | Useful separate hypothesis; actual hosted API connectivity untested |
| Drive Publish through browser automation | Does not repair model semantics | No need established; an authenticated tool route already exists locally |

The selected workflow reduces the number of model decisions per release. It does not diversify the underlying model supplier or create a hosting availability guarantee. If the relay is unavailable, queue drafts with an honest status and retain already verified local artifacts; do not silently switch providers.

## Next implementation, in order

### 1. Build the local workflow adapter

Expose one template and one content schema initially. Separate model generation, validation, rendering, packaging and publishing into explicit phases. Record the template version, schema version, artifact digest and installed plugin/skill versions. Check the installed capability contract before each new job; fail with an actionable connection/update state on incompatible versions.

Reuse the repository's execution authority where appropriate: [`ExecutionContracts.ts`](../../../../src/core/execution/ExecutionContracts.ts), [`ExecutionSupervisor.ts`](../../../../src/core/execution/ExecutionSupervisor.ts) and [`DurableExecutionAuthority.ts`](../../../../src/core/execution/DurableExecutionAuthority.ts) already define action authorization, budgets, leases and verification. Their presence is not evidence that a secure Sites integration exists. The private prototype does not use those durable facilities yet.

Use installed Sites helpers, with a verified version, instead of redistributing the proprietary plugin. Package only a dedicated project allowlist. Never push the GALX checkout, this report, `.env` files or operational diagnostics. The root `.vercelignore` does not control Sites source uploads.

If a web UI controls the companion, bind each job to the authenticated customer, local session, permitted workspace and Site. Verify origin/session protection and replay resistance. Do not expose the entire app-server or arbitrary MCP calls to browser input. Derive ownership and allowed actions from trusted state, not from model output or submitted object IDs. This local connection protocol still needs implementation and adversarial tests.

### 2. Qualify a customer-owned publication and update

Prepare one isolated project with synthetic content. Inspect the actual create/save/deploy contracts, register the project, link its hosting configuration, push the exact permitted source, package from that source, save the returned version and deploy to the authorized audience. Verify the resulting URL and deployed content. Then change one content field and confirm the update references the new source and saved version.

The reviewable action must bind project, source revision, artifact hash and audience. Existing authorization may cover the action; do not introduce repetitive confirmations. If the tool host requires approval, surface that exact request and resume after the answer rather than auto-approving it. Test revoked access and an ineligible account. A successful owner inventory read cannot substitute for these checks.

This phase is the remaining functional test of the central thesis. No publication should be described as supported until it passes. Keep a local download/export when the user cannot connect Sites.

### 3. Make interruptions and repeated requests safe

Persist intent before an external action and record the returned project/version/deployment identifiers afterward. Use stable job/action keys, leases and fenced writes. After a timeout with an unknown outcome, reconcile against the known project/version or pause for investigation; do not blindly create or deploy again. Local idempotency alone cannot guarantee exactly-once execution by an external service. Discover which remote reconciliation and deduplication operations actually exist before enabling automatic retries.

Durable workflow systems document deterministic recovery and separate activities for external work; activity retry behavior must be chosen explicitly.[^3][^4] Apply that pattern to the existing repository facilities before adopting another platform. Store verified results so a restart can resume packaging/status checks without repeating inference or publication unnecessarily.

Acceptance must cover duplicate submission, stale workers, a crash before and after each side effect, expired login, delayed status, cancellation and cross-customer object substitution. A cancelled client fetch does not prove a relay job stopped; require cancellation acknowledgement or reconcile its eventual usage and outcome. The current prototype only prevents further generation/consumption after its local cancellation signal.

### 4. Establish enforceable economics before selling an allowance

The proof caps completed generation attempts at two and does not retry ambiguous transport errors. Its 700-token output request is **not a demonstrated hard limit**: the inspected relay payload builder does not forward it. The HTML/schema byte bounds apply after generation and cannot cap upstream work. Timeouts also do not prove that upstream charging stopped. Do not advertise any of those as a dollar spending guarantee.

Implement admission/reservation for each generation, trusted usage reconciliation, explicit states for unknown usage and a verified upstream stop/limit mechanism where available. Keep a failed or uncertain job's reservation pending until policy resolves its cost; missing telemetry must not become free usage. Cap concurrency and daily funded work independently of per-response validation. If the available relay cannot provide trustworthy cost evidence or enforceable bounds, keep the offer manual and tightly limited rather than sell an automated compute allowance.

Measure generation attempts, outcome quality, p50/p95 elapsed time, packaging/publishing failures, revision count, support minutes and actual delivery cost across representative briefs. Include malformed output, unavailable relay and exhausted budget cases. One seven-second success establishes feasibility only.

## Positioning and the economic test

Sell **repeatable client deliverables with controlled revisions and verifiable releases**. A portal template that saves paid staff time and can be maintained predictably is a stronger hypothesis than generic cheaper access to the Sites skill. The skill itself is supplied by OpenAI to eligible accounts; it is not a GALX moat.

Keep setup work, ongoing supported changes, model consumption and customer hosting entitlement explicit. Reuse the commercial reset's pilot prices only as hypotheses; this demonstration does not validate them. Avoid unlimited projects, repair loops or revisions. Let routine content changes reuse the template and already verified build path so inference is reserved for work that needs it.

For a priced delivery unit, estimate:

`contribution = collected price − payment costs − model cost − packaging/runtime cost − measured labor − expected rework/support`

Then cover fixed maintenance and acquisition from that contribution. Set acceptance thresholds before the pilot, including a target contribution margin, maximum support minutes and a paid renewal criterion. Reject or narrow the offer if bespoke requests erase the template's savings. A platform fee is justified only by recurring customer value such as maintained releases and project handover, not by the existence of a publishing connector.

## Reproduction and verification scope

Run the offline tests from the GALX repository:

```sh
node --import tsx --test internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/workflow.test.ts
python3 internal/scaling-strategy-2026-09-10/commercial-reset/sites-automation/verify-artifacts.py
```

`relay-preflight.ts` performs readiness reads. The original live integration runner is now retained as [historical source](historical/run-live.ts.txt); `run-live.ts` stops without making requests so it cannot overwrite the old evidence. Use [the durable commands](durable/README.md) for subsequent work. Live demonstrations require an explicitly designated test environment with authorized inference use. The older compatibility fixture must retain its synthetic credentials/upstream. These commands do not install a public feature or publish a Site.

The historical live runner ended at `local_draft_validated`. Packaging was a separate direct invocation of the installed official helper against the reported temporary project. The recorded `local_draft_packaged` result includes that separately verified invocation. New runs use durable job records and normalized, hash-addressed artifacts; do not reuse the old archive as evidence for new content.

Nine tests cover exact schemas, bounded repair, injection-safe rendering, unknown usage and cancellation/error handling. Local source inspection and archive validation supplement them. Production build, browser checks, tenant authorization tests, external side-effect recovery, publication and billing reconciliation are **not** established by this private proof. Application source, production configuration and the financial model were not changed.

[^1]: OpenAI, [Codex App Server](https://learn.chatgpt.com/docs/app-server), accessed September 10, 2026. Runtime arguments were also checked against the installed CLI's generated schemas.
[^2]: Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), accessed September 10, 2026.
[^3]: Temporal, [Workflow Execution](https://docs.temporal.io/workflow-execution), accessed September 10, 2026.
[^4]: Temporal, [Activity Execution](https://docs.temporal.io/activity-execution), accessed September 10, 2026. The reconciliation design above is our recommendation, not a claimed Sites guarantee.
