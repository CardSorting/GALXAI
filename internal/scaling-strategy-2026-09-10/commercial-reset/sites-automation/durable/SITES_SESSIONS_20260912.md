# Sites continuing-conversation audit and qualification

Private engineering evidence. This record describes the scoped Sites session change under [ADR 0142](../../../../../docs/adr/0142-continuous-sites-conversations.md); it is not public product copy.

## Baseline audit

The previous implementation had a familiar visual arrangement but incomplete project continuity. A second generation received only the current document and newest brief. History was deleted beyond eighty messages; unsent text was shared across Sites. Generic acknowledgements concealed whether a request had been applied, and there was no discussion mode, pinned guidance or recoverable draft version.

Code-based baseline: accessibility 3/4, performance 2/4, responsive 3/4, theming 3/4, integrity 1/4; total 12/20. This is a scoped engineering rubric, not a WCAG certification or benchmark against another product.

| Priority | Finding | Applied change |
| --- | --- | --- |
| P1 | Earlier decisions are absent from subsequent generation | Rolling project memory, current content, pinned notes and bounded recent completed turns |
| P1 | Earlier conversation is discarded | Durable private turns and cursor-based retrieval; bounded display window |
| P1 | A global composer draft leaks between projects | Account/Site-scoped same-tab drafts and mode; submitted text clears immediately and later typing survives |
| P1 | Stale responses can replace a newer draft | Revision/time ordering and selected-Site checks |
| P1 | No way to recover a good earlier draft | Immutable versions, preview and restore-as-new, with publication unchanged |
| P2 | Every change scrolls users away from earlier messages | Near-bottom following, resize handling, earlier-page anchor and return-to-latest controls |
| P2 | Requests can only ask for a generated page | Build/Discuss with actual assistant answers and clarification support |
| P2 | Some mobile targets are smaller than 44px | Scoped 44px mobile actions and explicit Chat/Preview switching |
| P2 | Full drafts/history load for every library item | Summary list plus fresh selected-Site read; sequential visibility-aware polling |

Pattern research used official Lovable knowledge/Plan-mode and Bolt version-history documentation, linked from the ADR. These inform familiar interaction choices without promising those products’ application-generation capabilities. GALX continues to support its bounded text page template.

## Verification recorded before release

- 154 application/boundary regression tests passed in the isolated Node 22 build harness.
- Production build passed and scanned rendered output/browser assets for private implementation markers. The final build after reviewer corrections scanned 643 rendered/browser artifacts against 57 private markers, with zero matches.
- 76 extended database checks passed across 98 migrations, including 105-turn retention, import/pending work, duplicate keys beyond the old window, unchanged-content comparison, publication-preserving restore, context epoch reset, role denial and non-destructive rollback.
- The separate legacy fixture passed all 94 checks.
- Static database verification passed 98 migration/rollback pairs with zero warnings or fatal violations.
- Browser review used a separately copied local component and synthetic API fixtures. No real account data, inference, publication or external service requests were used.
- Browser observations: separate Site drafts, immediate composer clearing, new typing preserved during reply, Discuss without a version change, saved context notes, version preview, inline restore confirmation and restoration as a new version. Desktop 1440×940 and mobile 390×844 had no document horizontal overflow; visible mobile controls met a 44px minimum height. The opaque-origin iframe retained its empty sandbox attribute.
- Independent review identified first-creation draft transfer and historical-version download ambiguity. Both were corrected. A delayed 5-second create plus first-generation 429 preserved concurrent next-message text and Discuss mode; a separate empty-next-draft case restored the rejected original prompt. The actual downloaded `site-version-1.html` matched the selected historical content and excluded the current draft’s changed summary.
- Detector: six advisory findings in incumbent CSS size/chrome details, zero hard findings. No new font/color exceptions were added.

Screenshot evidence is kept in the ignored `.impeccable/review/` directory. This local fixture review does not qualify the entire authenticated application shell or a live paid generation. The independent verdict pass marked both listed fixes resolved and returned `ship`, limited to those corrections and the supplied captures. The post-change scoped assessment is 17/20 (accessibility 3, performance 3, responsive 4, theming 3, integrity 4); screen-reader certification and production load measurement were not performed. Deployment evidence is recorded separately below.

## Rollout

Follow the admission-pause/drain/backfill/deploy/resume sequence in [conversation operations](../../../../../docs/maintainers/SITES_CONVERSATIONS.md). Approved plan eligibility, production limit values and hosting/DNS credentials remain unchanged. Preserve all history on rollback. Record the actual production deployment and policy restoration separately from the synthetic fixtures.
