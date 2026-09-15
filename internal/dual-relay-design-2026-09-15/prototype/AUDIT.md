# Central account console: technical audit and improvements

<!-- docs-scope: research-reference -->

**Historical synthetic prototype.** The walkthrough, scores, captures and limitations below describe this fixture, not the installed monitor. Production management uses [the implemented account contract](../../../docs/reference/relay-account-management.md) and [service runbook](../../../docs/runbooks/relay-pool-services.md). Its local installation, scoped sessions, central lifecycle journal and health/remove/rename controls are now implemented; actual provider sign-in and capability acceptance remain separate.

Private review, September 15, 2026. Scope: the synthetic prototype in this directory and its alignment with the [central account contract](../central-account-control.md). This is a technical audit followed by user-authorized hardening, not an independent design critique, production security certification or operator usability study.

## Implementation integrity verdict

**Pass within the prototype scope.** The final implementation expresses a specific operator workflow: one central account authority, two fixed destinations, manual registration, workload-specific evidence and original-operation recovery. It preserves GALX's incumbent operator palette and navigation. No provider or production Supabase calls occur.

The detector returned zero regex findings. Optional HTML parser modules were unavailable, so that result excludes computed contrast, selector matching and comprehensive static HTML checks. Chrome/axe supplied separate rendered evidence. The existing narrow font exception remained unchanged.

## Summary

**Provisional technical health: 15/20 — Good, with production acceptance still open.** This is an evidence-limited implementation score; it does not measure whether the experience is “world class.”

| Dimension | Score | Evidence and limit |
| --- | --- | --- |
| Accessibility | 3/4 | Eight inspected Chrome states had no axe WCAG A/AA/2.1 AA violations; keyboard search, recovery controls and disclosure state checked. No full screen-reader or WCAG 2.2 certification. |
| Performance | 3/4 | Browser HTML/CSS/JS total 44,513 bytes, no framework/imported runtime or external assets; visible-tab, single-flight polling and revision-gated rendering. No field performance or stressed 30-account benchmark. |
| Responsive design | 3/4 | Desktop 1440px, Standard 390/320px overview/table/long-label flows; no whole-page overflow. Mobile inputs 16px and principal controls 44px tall. Zoom, every link target and every browser remain unverified. |
| Theming | 3/4 | Incumbent dark operator tokens and text/status distinctions maintained. A few older literal surface colors remain; no new light-mode requirement was invented. |
| Implementation integrity | 3/4 | Central ownership, explicit desired state and durable recovery tested. Single-process JSON harness and synthetic roles cannot establish production guarantees. |
| **Total** | **15/20** | **Good — scoped technical evidence** |

Nine verified issues were recorded in this pass: **P0: 0; P1: 4; P2: 4; P3: 1.** Eight were corrected; the inherited low-impact token consolidation remains open. Production requirements below are acceptance gaps, not incidents in a live deployment.

## Familiar patterns and bounded adaptations

| Reference | What it establishes | Applied here |
| --- | --- | --- |
| [Cloudscape resource details](https://cloudscape.design/patterns/resource-management/details/) | A resource gets a self-contained place for its details and actions. | Stable account URL, saved setup step, workload checks, pause/resume and account-specific activity. A small disclosure keeps the primary next action visible. |
| [GitHub self-hosted runner monitoring](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/monitor-and-troubleshoot) | Connection and execution status are explicit, including offline states. | Central management connection and relay connection appear separately. No fabricated active-work counts; actual occupancy remains future integration. |
| [Kubernetes object state](https://kubernetes.io/docs/concepts/overview/working-with-objects/) | Desired state and observed status are distinct. | Central save advances desired generation; readiness requires acknowledgement. Offline pause does not claim execution stopped. This does not require Kubernetes. |
| [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) | Reusing the original key and parameters avoids repeating a mutation after transport failure. | Exact saved intent and operation ID, durable receipt lookup, same-ID retry, mismatch rejection. No automatic 24-hour eviction was copied; this demo rejects new operations at its storage cap. |
| [AWS central management with siloed application environments](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/full-stack-isolation.html) | Central governance can coexist with separate execution environments. | The only synthetic account writer is central. Each console gateway has one scope and no registry fallback. Actual network/process isolation requires later production tests. |

Sources were consulted September 15. These are design inferences and adaptations; they do not establish equivalent reliability or security guarantees.

## Corrected findings

### P1 — Separate account stores contradicted central ownership

- **Location:** [serve.mjs](serve.mjs), `createAuthority` / `createConsole`; [model.mjs](model.mjs), `initialAuthority` / registration.
- **Category:** Implementation integrity. **Impact:** two independent registries cannot establish exclusive assignment or model the requested account authority.
- **Resolution:** one central store and atomic serialized identity checks; console gateways retain no account registry. Concurrent HTTP registration has one winner; peer account IDs and receipts are denied.
- **Contract:** GALX central account requirement; no WCAG claim. **Command:** `$impeccable harden`.

### P1 — “Check saved result” merely refreshed the page

- **Location:** [app.js](app.js), `submit` / `recoverOperation`; [model.mjs](model.mjs), operation ledger.
- **Category:** Implementation integrity. **Impact:** a fresh snapshot could erase uncertainty without establishing what the original mutation did, allowing duplicate action attempts.
- **Resolution:** save exact non-secret intent before dispatch; restore it on same-tab reload; query its scoped receipt. A missing receipt offers original-ID retry. Generic refresh cannot clear it. Replay returns the original receipt with the current snapshot and checks current mutation permission.
- **Contract:** durable operation identity and explicit outcome; no WCAG claim. **Command:** `$impeccable harden`.

### P1 — Saved pause looked applied immediately

- **Location:** [model.mjs](model.mjs), `set_paused` / relay acknowledgement; [app.js](app.js), readiness and account detail.
- **Category:** Implementation integrity. **Impact:** an operator could believe a disconnected relay had applied a pause or stopped existing work.
- **Resolution:** explicit pause/resume intent, desired/applied generations, offline verification denial and pending acknowledgement copy. An unavailable central connection shows unconfirmed status and disables mutation.
- **Contract:** desired/observed state; actual fencing remains production work. **Command:** `$impeccable harden`.

### P1 — Receipt history silently evicted the oldest operation

- **Location:** [model.mjs](model.mjs), ledger capacity and scenario reset.
- **Category:** Implementation integrity. **Impact:** a late retry could lose proof of a previous save and repeat it.
- **Resolution:** no silent eviction; cap blocks new mutations. Fictional account resets preserve earlier receipts. Production must retain results or tombstones through a defined retry/restore horizon.
- **Contract:** original-operation recovery. **Command:** `$impeccable harden`.

### P2 — Unrelated account edits invalidated each other

- **Location:** [model.mjs](model.mjs), revision checks; [app.js](app.js), action command.
- **Category:** Implementation integrity. **Impact:** work on one account could make another operator's unrelated account form fail.
- **Resolution:** account mutations check that account's revision. Same-account stale writes fail; different accounts can update independently. Whole-pool scenario controls still check the view revision.
- **Command:** `$impeccable harden`.

### P2 — Small controls and mobile input text reduced ergonomics

- **Location:** [style.css](style.css), final responsive/control rules.
- **Category:** Responsive design. **Impact:** small controls are harder to tap; small input fonts can trigger mobile zoom.
- **Resolution:** principal controls and linked form actions have 44px minimum height, mobile inputs use 16px, long account names wrap, tables scroll in their own keyboard region. The 44px goal is a product choice, not a claim about WCAG AA's minimum.
- **Command:** `$impeccable adapt`.

### P2 — Activity disclosure lacked an expand indicator and lost open state

- **Location:** [style.css](style.css), activity summary; [app.js](app.js), render preservation.
- **Category:** Accessibility / implementation integrity. **Impact:** the expandable content was hard to discover and a state update could interrupt reading.
- **Resolution:** restore native disclosure marker; preserve open state, summary focus and table scroll on same-route updates. Browser checks verified the disclosure stays open through a new account revision.
- **Command:** `$impeccable harden`, then `$impeccable polish`.

### P2 — Skip link could appear over mobile navigation in a full-page capture

- **Location:** [style.css](style.css), `.skip:not(:focus)`.
- **Category:** Accessibility / responsive design. **Impact:** a hidden utility link obscured primary navigation in the inspected narrow layout.
- **Resolution:** explicit clipped hidden state, retaining the visible focused link. Final image and computed-style checks confirmed the correction.
- **Command:** `$impeccable polish`.

## Open finding and acceptance work

**P3 — Inherited literal surface colors.** Location: [style.css](style.css), original base rules. Category: theming. Impact: future palette changes require editing several literals. Current dark rendering remains coherent. Consolidate the matching literals into named tokens when the console moves into the production design system; no additional color exception is needed. Suggested command: `$impeccable polish`.

Before production delivery, implement the [delivery plan](../delivery-plan.md): main-project assignment/registrar/lease boundaries, independent administrator sessions, role-specific configuration, two isolated execution hosts and execution-only relay schemas. Test revoked identities, stale installation acknowledgements, authorization expiry, restore fencing, no peer fallback and zero Standard Sites/image calls across real aliases/probes/routes. These are required engineering work and cannot be satisfied by a UI score.

Production ergonomics should add centrally discoverable unresolved operations for recovery after tab closure, durable audit pagination/retention, fresh telemetry timestamps and actor-specific authorization. The fixture deliberately omits those integrations. Follow with `$impeccable harden` for real recovery/error states, `$impeccable audit` for the integrated browser acceptance and `$impeccable polish` for final UI details. Do not repeat a scored audit merely to increase the score without new evidence.

## Evidence

- Eight model/HTTP tests passed, including actual central-service shutdown/restart, concurrent duplicate identity registration and original receipt recovery. Fixture files are temporary and cleaned by the tests.
- Chrome browser suite passed ten named interaction flows plus frozen-update/expanded-activity checks. Eight rendered states at 1440/390/320px: zero axe violations and zero whole-page overflow. No browser exceptions. Final screenshots visually confirmed the mobile long-label and desktop pending-acknowledgement states.
- `node --check` passed for the browser client. ES modules loaded successfully in model/HTTP/browser tests.
- Ten existing public-information and identity-authorization tests passed. These remain distinct from synthetic scope tests and do not certify the proposed production architecture.
- `npm run build` passed on the current working tree: Next.js 15.5.25, 285 generated pages. Existing build lint skip remains; this was not a new lint certification.
- Scanned 1,331 generated HTML/JavaScript files under `.next/static` and `.next/server/app` for five distinctive prototype markers: no matches. This proves only absence of those markers from the inspected artifacts, not live-site privacy.
- Ignored local browser output: `.relay/central-console-audit/results.json` and corresponding screenshots. The detector's HTML analysis was degraded; this limitation remains explicit.
- `npm run docs:sync`, `npm run docs:check` and all 38 documentation tests passed. Existing overdue ACT-001/015/016 review notices remain open; this prototype pass does not complete them.
- Documentation impact was reviewed for the private prototype, research contract, historical evidence and generated inventory. Existing ADR 0153 remains proposed with production delivery not started. Earlier retained review evidence was not overwritten and production review fingerprints were not automatically refreshed.

## Patterns to preserve

Keep fixed destination names near actions; scope data on the server; use explicit fields in monitor responses; separate connection, registration, workload verification and applied state; retain setup progress; preserve original operation identities; and give failed actions a specific recovery control. These reduce operator guesswork without exposing private implementation in customer-facing products.
