# Historical two-console prototype: first verification

<!-- docs-scope: research-reference -->

Historical evidence retained September 15, 2026 UTC. The commands below belong to the earlier independent-fixture implementation and are not current instructions. See [the current prototype](../prototype/README.md). [Architecture and delivery requirements](../README.md) remain proposed. The current [central account contract](../central-account-control.md) requires two isolated execution environments and administrator sessions, while both consoles manage accounts only in GALXAI. This earlier prototype demonstrates the interaction only; all accounts, sign-in results and verification outcomes are fictional. It is not a production relay, authentication system or registry.

## Open both consoles

From the repository root, run one command in each of two terminals:

```sh
node internal/dual-relay-design-2026-09-15/prototype/serve.mjs --relay premium
```

```sh
node internal/dual-relay-design-2026-09-15/prototype/serve.mjs --relay standard
```

Open **http://127.0.0.1:4381** for Premium and **http://127.0.0.1:4382** for Standard. Use the exact loopback addresses. Stop each process with Ctrl-C. Run only one process per profile: these small JSON fixtures do not coordinate competing processes.

The prototype uses Node's standard library and makes no provider calls. It persists synthetic state in `.relay/dual-relay-interaction-prototype/`, separately for each profile. Restarting retains that example state. **Prototype controls → Restore example accounts** resets only the selected profile's fictional data. The directory is private and excluded from deployment; do not copy this fixture into a public route.

## Review the experience

1. Open both consoles. Premium names paid upstream accounts and three workloads; Standard names free upstream accounts and shows Sites/Images as **Not enabled**.
2. Choose **Register paid account** or **Register free account**. Prepare a named workspace, leave and return to its account URL. The saved step resumes.
3. Choose **Simulate completed sign-in**, review the fixed destination, confirm the account type, then choose **Register account**. No credentials are requested.
4. Before registering a second example, enable **Interrupt the registration reply**. Registration saves, the response fails, and the UI offers **Check saved result** with further changes disabled. Checking recovers the saved verification step.
5. On Premium, choose **Image permission denied** before simulated verification. Text/Sites remain ready. Change the result to success and choose **Recheck unavailable workload**; only images are checked again. Standard cannot select this image scenario.
6. Compare **Pause new work** with **Pause live updates**. The first changes account admission state; the second freezes this view and disables changes until status refreshes.
7. Choose **Read only** under Prototype controls. Registration and traffic mutations are disabled. This is an intentionally switchable demo role, not a credential or authorization implementation.

## Verification and limits

### Recorded checks

- `node internal/dual-relay-design-2026-09-15/prototype/verify.mjs`: passed for Premium and Standard. Covers confirmation, replay, stale revisions, fixed destination, foreign account IDs, duplicate display names, role restrictions, workload-specific retries, saved serialization and explicit nested snapshot allowlists.
- `node --check` for the browser client and fixture server: passed.
- Chrome walkthrough: two separate origins remained identifiable; registration resumed after refresh; interrupted acknowledgement recovered without adding another account; partial image readiness preserved text/Sites; frozen updates and read-only mode disabled traffic changes.
- Final browser checks confirmed completed step labels, focus on action results and recovery, and a keyboard-scrollable account table. Standard's account/table views measured `scrollWidth === innerWidth === 320`; the table scrolled within its own region. Desktop Premium and 390px Standard were also visually inspected. This is bounded browser verification, not a full accessibility audit or screen-reader study.
- Direct HTTP checks rejected the other console's Origin and a forged Host with 403. No real tokens, cookies, registry grants or production authorization were exercised.

### Deliberate limits

- Fake sign-in; no upstream accounts, Docker workspaces, workers, model execution, routing, leases or background capability probes.
- Display names are unique within a fixture. Central account registration, global uniqueness, destination-bound execution authorization and assignment fencing still require production implementation. The fixture’s separate local account files do not represent the required GALXAI-only production account backend.
- Two ports on one loopback hostname are not cookie isolation. The final consoles require separate hostnames and independently authorized sessions under the strict separation contract.
- Saved state uses a local JSON file. It does not supply crash-safe distributed operation outcomes, audit retention or production schema migrations. The interrupted-reply scenario commits synchronously before returning an error. Arbitrarily delayed or reordered network requests are outside this demonstration.
- Read-only mode is synthetic and shared by tabs of one fixture; production sessions must authorize each actor separately. Host/Origin checks do not authenticate a local user.
- The prototype caps examples at 30 accounts and does not simulate traffic occupancy, evidence expiry, desktop handoff, full disconnect/restart scenarios, 200% zoom or every supported browser. Those remain acceptance work in the architecture specification.
- Operator-only internal copy belongs in an authenticated console. It must never become public API, marketing or customer-facing UI copy.

### Repository checks

- `npm run build`: passed on the September 15 working tree with Next.js 15.5.25; 285 static pages generated. The build skipped linting and reported the existing edge-runtime/static-generation notice.
- A targeted scan of 1,328 generated HTML/JavaScript files under `.next/static` and `.next/server/app` found no matches for this prototype's distinctive path/copy markers. This proves only absence of those markers in the inspected build files, not a general privacy audit or a live-site certification.
- `npm run docs:impact`: inspected all unmapped paths. They are the private research/prototype, its scoped typography exception and generated documentation inventory; no production knowledge domain changed and no review fingerprint was refreshed.
- `npm run docs:sync` and `npm run docs:check`: passed. Existing overdue review notices remain for ACT-001, ACT-015 and ACT-016; this research does not complete those actions.
- `npm run test:docs`: all 38 tests passed (21 incident-guard and 17 knowledge tests). Their fixture scans are distinct from the actual build scan above.
- Both temporary review servers were stopped after browser verification. No deployment or live provider readiness certification is implied.

### Design detector decision

Kept Inter/system-sans to match the existing relay monitor and Operate-mode guidance. A narrowly scoped `overused-font` exception covers only this prototype's `style.css` in `.impeccable/config.json`. No production UI detector rule was disabled. Independent formal critique remains pending the earlier authorization request: the [Impeccable skill](../../../.agents/skills/impeccable/SKILL.md) delegates to its [critique playbook](../../../.agents/skills/impeccable/reference/critique.md), which requires asking once about sub-agents and then: “Then stop until the user answers.” That gate applies to formal independent critique, not to the separate prototype implementation checks recorded above.
