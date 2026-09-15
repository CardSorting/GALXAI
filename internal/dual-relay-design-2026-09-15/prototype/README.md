# Central accounts, two relay consoles: interaction prototype

<!-- docs-scope: research-reference -->

**Historical synthetic prototype.** The walkthrough, scores, captures and limitations below describe this fixture, not the installed monitor. Production management uses [the implemented account contract](../../../docs/reference/relay-account-management.md) and [service runbook](../../../docs/runbooks/relay-pool-services.md). Its local installation, scoped sessions, central lifecycle journal and health/remove/rename controls are now implemented; actual provider sign-in and capability acceptance remain separate.

Private synthetic implementation, September 15, 2026. The [central account contract](../central-account-control.md) requires account management only in GALXAI (`mazhcjisettrzbqhorvp`) with separate Premium/Standard execution environments. This prototype now models one account authority and two scoped consoles. It connects to no Supabase project or provider and does not implement production relay security.

## Run

From the repository root:

```sh
node internal/dual-relay-design-2026-09-15/prototype/serve.mjs
```

Open **http://127.0.0.1:4381** for Premium and **http://127.0.0.1:4382** for Standard. One harness starts a central HTTP service on loopback port 4380 and both console gateways. Stop it with Ctrl-C. Run only one harness against this fixture store.

Only the central service writes `.relay/dual-relay-interaction-prototype/central-v2.json`. Writes use a temporary file, file sync, rename and directory sync. The gateways hold no account database, account cache or fallback writer. Scoped random demo connection tokens remain server-side. Legacy `premium.json`/`standard.json` example files are ignored and never imported. They contain fictional data only.

Restart retains the central accounts and operation receipts. **Restore example accounts** and **Load empty relay** intentionally reset only the selected pool's fictional scenario; earlier receipts remain retained. The demo caps accounts at 30 per pool and receipts at 10,000. At receipt capacity, new operations fail instead of evicting recovery identities. This is a single-writer JSON fixture, not a distributed database protocol.

## Review the experience

1. **Fixed destination:** Premium shows paid upstream accounts and text/Sites/images. Standard shows free upstream accounts and text; Sites/images are not permitted. Accounts in the other pool cannot be enumerated or changed through this console.
2. **Resume setup:** register a named workspace, sign in using the explicitly fictional button, review the fixed destination and confirm registration. Leaving for Accounts or refreshing resumes the saved step. Account activity stays attached to the account.
3. **Lost reply:** enable **Interrupt the registration reply** before registering. The exact operation identity and non-secret intent survive a refresh in the same browser tab. **Refresh status** does not clear uncertainty. **Check saved result** reads that original operation's durable receipt. It displays the latest account state separately.
4. **Unrecorded action:** if transport fails before acceptance, recovery reports no saved result and offers **Retry original action** using the original identity and intent. It never generates a new ID to resolve an uncertain action. The browser test injects this scenario before dispatch.
5. **Saved versus applied:** enable **Relay offline**, then pause a completed account. The detail view shows the centrally saved change and pending acknowledgement. Reconnect the relay to acknowledge it. Repeating Pause cannot turn into Resume. This simulates acknowledgements; it does not stop real work.
6. **Central outage:** **Simulate central outage** makes both consoles' account APIs unavailable. Last observed snapshots remain in open browsers, mutations are disabled and last-success timestamps stay visible. **Restore central connection** recovers the shared demo authority. These controls are explicit harness fault injection, not production endpoints.
7. **Selective verification:** on Premium choose **Image permission denied**. Text and Sites verification stays successful; recheck retries only images. Standard rejects the image scenario before any synthetic verification counter increments.
8. **Exclusive assignment:** in both consoles create a workspace and enable **Use the shared fictional identity at sign-in** before sign-in. Register one, then try the other. The central authority rejects the second registration without revealing peer account details. The checkbox does not let real users assert an upstream identity.
9. **Independent edits:** two accounts can change concurrently without a whole-pool revision conflict. A stale edit of the same account is rejected. The read-only preview disables account mutations, including exact replays, server-side. Production authorization must still be per actor.

## Verification and limits

Run the deterministic model and HTTP suite:

```sh
node --test internal/dual-relay-design-2026-09-15/prototype/verify.mjs
```

It covers both pools, manual registration, selective verification, nested response allowlists, global synthetic identity uniqueness, peer IDs/receipts, immutable replay with current authorization, per-account revision conflicts, explicit pause state, acknowledgement, retained receipts, concurrent HTTP registration, central restart and both simulated and actual central outages. Eight tests passed in this pass. No production database or provider was involved.

The optional [browser acceptance script](verify-browser.mjs) uses an installed Playwright module and Chrome. Set `PLAYWRIGHT_MODULE` to its module path if it is not locally resolvable. It uses isolated temporary state/ports, requires the existing `axe-core` package and writes ignored evidence to `.relay/central-console-audit/`.

Fixture evidence and its historical limitations are in the [technical audit](AUDIT.md); current delivery is in the [delivery index](../delivery-plan.md). Earlier independent-fixture commands and measurements are retained only in [dated history](../history/prototype-v1-verification-2026-09-15.md).

### Deliberate limits

- The central service and both gateways run in one Node test harness. Their HTTP scope tests do not prove separate host/process/network trust boundaries. Two ports do not isolate cookies. The installed service uses separately authorized sessions, fixed monitor origins, credentials and execution VMs; this fixture does not verify them.
- Synthetic role switching and availability controls are demonstration features. Host/Origin checks do not authenticate local users. Do not publish this console, proxy it publicly or treat its demo tokens as production administrator security.
- No real desktops, upstream credentials, model calls, revocation, leases, admission budgets, routing, jobs, active-work counts or telemetry expiry. Global identity checks omit production revoked-identity retention and restore fencing. Real Standard denial across tools/aliases/probes remains required.
- Operations commit synchronously in one central writer. Tests cover a reply lost after commit and a request dropped before acceptance; they do not establish correctness under arbitrary distributed delay, stale acknowledgements or split-brain storage. Crash/power-loss guarantees are not certified.
- Same-tab reload recovery uses session storage. A browser tab closed before recovery can lose its non-secret client reference, while the central account and receipt remain saved. At this fixture checkpoint, centrally discoverable registration recovery remained production work; the installed monitor now exposes central Registration and Activity views. Browser-storage denial must not silently dispatch an unrecoverable action.
- The browser checks are bounded Chrome/axe checks, not a screen-reader study, complete WCAG certification, 200% zoom acceptance or measured operator task-completion study.
- All private implementation copy stays outside public routes, bundles, customer error bodies and deployment content. No production migrations, account movement or runtime cutover occurred in this pass.

### Design detector

Kept the existing Inter/system-sans operator design and its earlier narrow prototype-only font exception. The detector reported no regex findings but lacked optional HTML parser modules, so it did not compute contrast or selector behavior. Browser axe checks supply bounded rendered evidence; this is not a clean bill of health for production. No new exception was added. Formal independent design critique remains separate from the technical audit performed here.
