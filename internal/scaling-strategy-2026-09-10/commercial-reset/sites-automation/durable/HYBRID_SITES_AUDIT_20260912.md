# Sites hybrid memory and whole-page editing audit

Private maintainer evidence. Scope: the continuing Sites workspace, its context assembly, and additive search index. This is an extension of the incumbent interface, not a redesign or a claim of feature parity with other builders. [ADR 0143](../../../../../docs/adr/0143-hybrid-sites-memory-and-review.md) records the decisions and primary research references.

## Implementation integrity

Pass within the reviewed scope. The existing dark conversation column, paper preview, mobile panel switch, paid-plan inclusion, explicit publishing and version identity are retained. Page content is a workbench view with complete sections, not a replacement page template. The active design hook reported no outstanding deterministic findings after correcting a 17px size to the established 16px role; no redundant detector was run. A fresh finish reviewer inspected nine valid desktop/mobile captures and supplied source, returning **ship**, with no material fixes. Its verdict does not establish production behavior, server security or paper-preview visual fidelity; that preview was retained in source.

## Scoped health assessment

| Dimension | Score | Evidence and limit |
| --- | --- | --- |
| Accessibility | 3/4 | Labeled fields, native links/buttons/disclosures, pressed states, visible focus and readable mobile inputs. No full screen-reader or WCAG conformance claim. |
| Performance | 3/4 | Bounded cached payloads, lexical candidates and context bytes; coalesced refresh; no embedding calls or new client dependency. No production latency, cache hit-rate or Core Web Vitals measurement. |
| Responsive design | 3/4 | 1440px desktop and 390px mobile captures, lower-section navigation and comparison checked; no horizontal overflow in inspected mobile states. Broader device/text-scale coverage is not claimed. |
| Theming | 3/4 | Incumbent palette, typography and spacing preserved; local accent values are documented existing variants. No new theme switching. |
| Implementation integrity | 4/4 | Reviewable changes, explicit conflict resolution and historical labels; server-only context cache and allowlisted public contracts. |
| Total | 16/20 | Good, provisional at the stated source/fixture scope. |

## Findings resolved in this pass

| Severity | Finding and user impact | Resolution and verification |
| --- | --- | --- |
| P1 | Earlier project decisions fell outside recent context; split message truncation could detach an answer from its question. | Owner-scoped lexical recall, restore epoch, complete-pair allocation and strict byte budgets. Cache, context and database tests cover exclusion and isolation. |
| P1 | Uncertain delivery could discard the request identity, causing an unnecessary repeat. | Retain the operation ID; re-read the committed reply before reporting failure. Fixture verified two attempts shared one applied operation, then verified automatic reconciliation without restoring the submitted prompt. |
| P1 | Unsaved project notes could be lost when another session saved changes. | Store draft plus saved base per tab; preserve edits and show both choices. Browser verified panel changes, reload, remote save, final remote revision, and explicit keep/save. |
| P2 | A rapid invalidation could be dropped while refresh was throttled or a save was running. | Trailing refresh retains the final update; receiving tabs re-read authorized data. Browser confirmed the latest remote notes alongside untouched local edits. |
| P2 | Editing focused on the opening preview and offered no clear section-to-chat handoff. | Whole-page content, native outline and editable section starters. Browser verified the lower mobile section and preserved an existing composer draft. |
| P2 | Historical content could retain an old scroll offset and hide its comparison. | Remount the pane when the selected checkpoint changes; verified mobile comparison starts at scroll offset zero. Current-draft updates retain reading position. |
| P2 | Relative fragment links in an embedded preview resolved against the editor URL. | Explicit `about:srcdoc` fragments for the embedded preview, local fragments for exported pages, with contract regression coverage. |

No unresolved material finding was returned by the scoped finish review. These resolved findings are not evidence of exhaustive platform coverage.

## Verification

- Application regressions: **160 passed**, no failures or skips. Production build passed. [Machine evidence](hybrid-application-verification.json) records runtime and log hashes.
- Separate disposable database suites: **86 workspace checks** and **94 legacy checks** passed with all 99 migrations. The legacy suite retains its separate compatibility fixture.
- TypeScript passed. Full lint exited successfully with existing warnings; the new notes/content components pass focused lint after correcting the notes effect dependency.
- Documentation validation passed with 143 ADRs. Public capability docs exclude cache, routing and storage mechanics.
- Production search-index migration applied after a dry run showed exactly one pending file. Ledger: **99 applied, 0 pending, 0 remote-only**. The migration adds only an index, with bounded timeouts; paired rollback retains data and grants. No production policy or eligible-plan limits changed.
- Build output scan: **643 files**, **61 private markers**, zero matches. Live acceptance is recorded separately after deployment; this build evidence alone does not certify the live site.
- Synthetic Chrome checks: notes conflicts, notes reload recovery, latest cross-tab saved notes, uncertain-response replay/reconciliation, Discuss-to-Build handoff, existing-draft preservation, lower-section editing, version comparison and selected-version Download action.
- Required captures in ignored `.impeccable/review/`: `hybrid-desktop.png`, `hybrid-handoff-desktop.png`, `hybrid-notes-desktop.png`, `hybrid-compare-desktop.png`, `hybrid-content-mobile.png`, `hybrid-content-lower-mobile.png`, `hybrid-notes-mobile.png`, `hybrid-chat-mobile.png`, `hybrid-compare-mobile.png`. All were opened and checked before review. Scrolled panels are intentional state evidence.

## Practical limits

The cache is disposable; PostgreSQL remains authoritative. Recall is bounded lexical matching, not exhaustive semantic memory. Existing published snapshots, fair-use limits and static-page capability remain unchanged. No paid production generation or publishing was invoked by these acceptance checks. Native offline toggling, exhaustive assistive-technology coverage, production cache hit rate and multilingual recall quality were not measured.

The browser automation extension cannot inspect an iframe after navigation to `about:srcdoc#fragment`. A native screenshot confirmed it remained the authored page; further automation used the separate Page content view. This is recorded as an automation limit, not as a successful exhaustive embedded-navigation test.

Next operational step is read-only live page/asset/authorization acceptance against the deployment of this revision. Ongoing evaluation should use real, authorized session traces to measure recall relevance and latency before changing memory budgets or promising performance improvements.
