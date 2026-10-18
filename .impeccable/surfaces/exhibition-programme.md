---
version: 1
slug: "exhibition-programme"
primary_target: "src/app/exhibitions/page.tsx"
related_targets: ["src/app/exhibitions/[slug]/page.tsx", "src/app/editorials/page.tsx", "src/app/editorials/[slug]/page.tsx", "src/components/exhibitions/Programme.tsx", "src/components/exhibitions/ArtworkImage.tsx", "src/components/exhibitions/programme.module.css", "src/components/exhibitions/editorial.module.css", "src/components/exhibitions/Editorial.tsx", "src/components/exhibitions/EssayActions.tsx", "src/components/exhibitions/essay-actions.module.css", "src/lib/exhibitions/editorials.ts", "src/lib/exhibitions/catalog.ts", "route:/exhibitions", "route:/exhibitions/instruments-for-the-impossible", "route:/exhibitions/things-that-hold-time", "route:/editorials/what-an-object-can-ask", "route:/editorials/reading-the-trace"]
---

# Exhibition and editorial programme

Private maintainer design brief, reconciled October 18, 2026. [PRODUCT.md](../../PRODUCT.md)
owns product truth; [DESIGN.md](../../DESIGN.md) owns GALX identity. The
[direction contract](../review/exhibitions/direction.md) pins the institutional
extension. [Programme maintenance](../../docs/reference/exhibition-programme.md)
owns publication and access. No private brief or production record is imported
into public pages. This is implemented source guidance, not hosted acceptance.

## Intent and mode

Experience for exhibitions; Read for editorials. Preserve the charcoal ground,
warm off-white, Bodoni Moda display, Inter text, thin rules and uncropped STAR
Works. The thesis remains sustained looking and specific curatorial writing.
No fabricated publication credentials, issue numbers or physical medium claims.

## Destinations and reading order

The exhibition index leads with the VANTA work and entry to Instruments for the
Impossible, then Things That Hold Time, editorial previews and STAR practices.
The `#editorials` bookmark remains valid and offers All editorials.

`/editorials` is its own canonical index. A Bodoni masthead and concise
introduction precede programme navigation. A lead essay pairs a large title,
standfirst, byline/date/estimated reading time and Read essay action with its
uncropped artwork. A ruled, smaller secondary entry follows. Text precedes
artwork in DOM and visual order on desktop and phone. Both retain artist,
work title, year, medium and View work links. No search/filter is added for two
authored entries.

Essays use one centered, left-aligned reading axis. A breadcrumb names the
current essay and returns to Editorials; title, standfirst, metadata and small
View artwork / Copy link / Print controls precede the prose directly. No
reference rail interrupts the opening paragraph. The illustration follows its
authored paragraph, with intrinsic proportions determining its width: a
landscape can break out wider while a portrait remains narrower. Caption,
artist practice and View work remain attached to the image.

The completion section links the accompanying exhibition; Read next follows
authored order and wraps after the final essay. No contents list, progress
indicator or scroll listener is needed for these short essays.

## Scoped tokens and typography

The programme stylesheet owns `--paper` (#eeede7), `--ink-supporting` (#c2c4c2),
`--ink-muted` (#adafae), `--ground` (#0b0e12), `--rule` (#34383d),
`--image-ground` (#14191e), `--action-rule` (#777d80) and `--link-hover` (#fff).
Editorial CSS inherits these rather than duplicating a palette. Shared global
navigation keeps its own system. Print overrides the local reading palette.

Bodoni Moda is self-hosted through Programme with declared weights 400–500 and
swap display; used display weight is 400 with Georgia fallbacks. It applies to
exhibition and editorial headings only. Inter remains the reading/metadata voice.

- Editorial masthead: 3.5–6rem fluid display.
- Lead essay title: 2.75–4.5rem; secondary: 2.5–3.5rem.
- Article title: 3–5.5rem desktop, 2.75–4rem phone, balanced wrapping.
- Article standfirst: 20px desktop, 18px phone, 1.75 leading.
- Long-form prose: 18px desktop, 17px phone, 1.85 leading, maximum 46rem (about 65ch at 18px Inter).
- Metadata: 13px, wrapping author/date/reading estimate with deliberate gaps.
- Essay captions: 13px identity; 14px curatorial copy at 1.8 leading. Other programme captions retain 12px identity.

The editorial record owns date and byline. UTC formatting avoids date drift.
Reading time is text length at 200 words/minute rounded up, minimum one minute.
No factual essay text is replaced by presentation logic.

## Layout and adaptation

The shared 1320px container uses 56px minimum side margins, 32px below 1000px,
and 20px below 700px. Programme padding is 48/88px, 30/56px on phones.
The editorial lead uses text/artwork columns (1:1.1); the secondary is 1:.65,
with generous separation and a thin rule. Below 700px each becomes one column,
keeping DOM, visual and keyboard order aligned. Artwork fields bound height
rather than cropping image content.

Articles are bounded at 1040px. Headline, deck, metadata, controls, prose and
exhibition completion share a centered 46rem maximum measure. The prose uses a
three-track grid with paragraphs in the center and artwork spanning the tracks.
Artwork width is bounded by its intrinsic ratio at 40rem high and a 52rem width
ceiling, so captions align with the actual composition. There is no sidebar or
pre-prose context row at any width. Paragraph gaps remain 24px; figures use
40px vertical separation, 32px on phones. Breadcrumbs and tools wrap naturally.
Footer and related reading remain distinct from essay prose.

Exhibition compositions retain their existing cover, introduction and varied
work sequence. Exhibition editorial previews now stack image and text on
phones. They keep small thumbnails alongside text on wider screens.

## Interaction and failure handling

Use ordinary IntentLinks, disabled viewport prefetch and existing bounded
hover/focus warmups. In-page artwork navigation reserves 112px scroll space.
Actions, section links, artist links and View work reserve at least 44px height.
Links have off-white visible focus, underlines/hover feedback and scoped text
selection. Reduced motion retains state feedback without arrow translation.

Only allowlisted published artifacts are passed to the client image component.
Intrinsic dimensions reserve aspect ratio; `object-fit: contain` preserves the
whole work. First index art is eager/high priority; essay illustration loading is eager
with normal fetch priority for artwork jumps and print availability; other
subsequent programme art remains lazy.
A failed lookup or image error shows an unavailable state while captions and
practice links remain. Compact previews use short error text that fits their
frame. No substitute artwork or generation is triggered. Missing detail slugs
or invalid essay associations fail closed before image retrieval.

Copy link writes only the canonical public address, announces completion and
shows a focused selectable address when the clipboard is unavailable or denied.
One in-flight write and a component-lifecycle fence prevent duplicate and stale
feedback. Print opens the browser dialog only after a click. Both use 44px
controls and the existing neutral palette/focus treatment. No success toast,
remote dependency or fixed toolbar competes with reading.

Print CSS uses dark ink on white and removes the shared header, ambient layer,
footer, local controls and onward reading on essay pages. Normal block flow,
widow/orphan handling and figure grouping support paper. The print frame drops
its aspect reserve; contained artwork uses at most half the page height and
compact 9pt captions, so small-paper pagination can keep artwork and caption
together. Explicit image-frame classes support this treatment without depending
on nested div order. These rules do not
promise a particular printer or paper-size result; acceptance is dated separately.

## Evidence and limits

The October 7 [HTTP record](../review/exhibitions/http-verification.json) and
[finish disposition](../review/exhibitions/finish-review.md) remain dated evidence
of that implementation; they do not describe this revised editorial layout.
The October 18 change records its local checks separately. Local production,
browser and boundary results never establish deployment or live-site cleanliness.
