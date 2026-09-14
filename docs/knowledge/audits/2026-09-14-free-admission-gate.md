# Free admission and composer audit — September 14, 2026

<!-- docs-scope: operational-record -->

Scope: local free Sites/Images admission, allowance display, composer stop states and paid coexistence. This is a bounded code and synthetic-browser review, not a whole-product accessibility certification, production cost measurement or live release. [Machine evidence](2026-09-14-free-admission-gate.json) retains exact checks and source hashes; [operations](../../maintainers/FREE_GENERATION_QUOTA.md) owns current instructions.

## Implementation integrity

The original per-account allowance lacked an aggregate stop: many verified free accounts could consume the same paid baseline room. The corrected path has a private expiring aggregate budget, serialized admission and a separate paid-capacity threshold for Sites. Both resources default paused. No browser flag can authorize free or paid execution. Public responses retain explicit field allowlists and sanitized image artifacts. The new UI uses the incumbent tokens and one shared allowance reader; the detector reports no findings in the new notice component/CSS.

## Findings and actions

| Severity | Finding and user impact | Resolution / owning source |
| --- | --- | --- |
| P1 | Per-account-only quotas could exhaust shared capacity across many identities. | Aggregate concurrency, rolling and cumulative attempt bounds in `free-generation-gate.ts`; paused-by-default migration and revision-checked operator command. |
| P1 | Free Site requests occupied paid baseline capacity. | Verified tier, required quota reservation, healthy-only quarter-capacity gate in `fair-store.ts` / `fair-policy.ts`. Paid work can continue in remaining room. |
| P1 | Expiring or cancelling a request could be mistaken for evidence that work ended. | Separate durable capacity settlement; uncertainty retains occupancy, while non-start returns customer quota without renewing aggregate budget. |
| P1 | Site button looked enabled for free users but the send hook required Pro. | `use-sites-workspace.ts` accepts explicit free access; browser fixture submits a mocked request and verifies rejection preserves the draft. |
| P2 | Exhaustion, busy periods and a temporary pause lacked distinct actionable composer states. | `GenerationGateNotice.tsx` displays truthful remaining allowance, stops button/keyboard submission and offers manual recheck or Pro. No automatic retry or purchase. |
| P2 | Overlapping quota events could be dropped and composers could duplicate header reads. | One root provider, one in-flight read and one trailing refresh, with owner/unmount fencing. |
| P2 | Fixed editor height could push pause actions below the viewport after adding the notice. | Measure navigation-relative available height and let the message pane scroll; keep a 640px minimum for short/zoomed views. |
| P3 | New border fallback introduced an unnecessary literal color. | Replaced with existing Sites/Images line tokens. No detector suppression added. |

Positive properties retained: strict current account/Pro authority, durable operation identities, no retry after uncertain dispatch, owned history/downloads during pauses, no invented renewal time, ordinary plan links and no new external services.

## UX health assessment

Targeted health score: **16/20 (Good)**. This is a scoped engineering assessment, not a whole-site rating.

| Dimension | Score | Evidence / limitation |
| --- | --- | --- |
| Accessibility | 3/4 | Zero axe violations in header/new gate; keyboard stop and reachable recovery links checked. No whole-app or screen-reader certification. |
| Performance | 3/4 | One shared read, coalesced trailing refresh, bounded private admission and no new dependency. Field latency remains unmeasured. |
| Responsive design | 3/4 | 1440/390/320px passed; viewport-aware Sites composer, no horizontal overflow, upgrade actions hit-tested. Short/zoomed views retain a scrollable minimum height. |
| Theming | 3/4 | Incumbent tokens, dark/light fixture and no detector findings in new CSS/component. The surrounding Sites surface retains its existing visual theme. |
| Implementation integrity | 4/4 | Server admission, UI states, draft recovery and operator pause agree; no private controls enter browser assets. |

All eight fixture states passed at all three widths. Six total POSTs were intercepted create/rejected-generation fixtures; no external generation or publication occurred. The first visual pass found the fixed-height issue and an outdated Images test URL; both were resolved. A final hit-test confirmed the Images plan action is reachable above mobile navigation. No further visual refinement was performed. Automated accessibility coverage is scoped to the shared header and new gate, with actual prompt submission mocked. Performance review checks request coalescing, bounded queries and the absence of new dependencies; it does not measure field Core Web Vitals. Closed/expired/exhausted aggregate gates skip usage-history scans. Existing whole-page typography, contrast and unrelated legacy components are outside this targeted score.

## Pattern research and limitations

Official documentation supports demand-sensitive free access and paid availability in [Claude](https://support.claude.com/en/articles/8114491-get-started-with-claude) and its [paid-plan explanation](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console), hard free-tier pauses in [Vercel](https://vercel.com/docs/plans/hobby), and nearby usage nudges/stop states in [Lovable](https://docs.lovable.dev/introduction/credits-and-usage). Retrieved September 14, 2026. GALX adopts interaction patterns; no source establishes another product's private scheduler or GALX's supplier budget.

Email grants do not prevent person-level multi-account abuse. The aggregate budget bounds its generation impact. Workload units are not dollar costs. A closed gate and conservative unknown reservations can reduce free availability. Small Sites capacity remains paid-only; no limits were raised here. Production migrations, release, budget activation, real generation and field latency/cost acceptance remain separate. Further UX refinement is limited to defects found in this pass; no broad redesign is implied.
