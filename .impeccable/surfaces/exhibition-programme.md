---
version: 1
slug: "exhibition-programme"
primary_target: "src/app/exhibitions/page.tsx"
related_targets: ["src/app/exhibitions/[slug]/page.tsx", "src/app/editorials/page.tsx", "src/app/editorials/[slug]/page.tsx", "src/components/exhibitions/Programme.tsx", "src/components/exhibitions/ArtworkImage.tsx", "src/components/exhibitions/programme.module.css", "src/lib/exhibitions/catalog.ts", "route:/exhibitions", "route:/exhibitions/instruments-for-the-impossible", "route:/exhibitions/things-that-hold-time", "route:/editorials/what-an-object-can-ask", "route:/editorials/reading-the-trace"]
---

# Exhibition and editorial programme

Private maintainer design brief, documented from implemented source on October 7,
2026. [PRODUCT.md](../../PRODUCT.md) owns product truth; [DESIGN.md](../../DESIGN.md)
owns GALX's global identity. The [direction contract](../review/exhibitions/direction.md)
owns this scoped institutional addition. This is a code-led extension with no
approved design comp. It does not replace global tokens or component semantics.

## Overview

Mode: Experience for the programme and exhibitions; Read for the essays. The
thesis is to let distinct STAR practices acquire meaning through sustained
looking and specific curatorial writing. Existing GALX navigation surrounds a
quiet charcoal reading surface. Uncropped published works, restrained serif
headings, precise captions and generous separation carry the requested gravity.

The index begins with “Exhibitions & editorials” and a short programme
introduction, followed by the first exhibition's VANTA work and adjacent entry
text. A second exhibition reverses the image/text relationship; an editorial
index and a link to STAR practices follow. Exhibition details present a cover,
introduction and varied work sequence. Essays place an artwork between two
groups of paragraphs and return to their accompanying exhibition.

This document is private design guidance. Public titles, captions, essays and
metadata describe the works and the reading experience. Do not publish this
brief, the direction contract or private production records. The
[programme reference](../../docs/reference/exhibition-programme.md) owns the
publication and access contract. `.impeccable/` is excluded from deployment;
no private Markdown is imported by the programme.

## Colors

The programme's neutral values are scoped to its stylesheet. Artwork supplies
the colour; this surface adds no independent chromatic accent.

| Source value | Role |
| --- | --- |
| `#0b0e12` | Charcoal programme ground and reversed selection text |
| `#eeede7` | Warm off-white primary text, focus outline and selection fill |
| `#c2c4c2` | Supporting prose, work titles and unavailable-state text |
| `#adafae` | Muted dates, bylines and medium labels |
| `#34383d` | Thin section and masthead rules |
| `#777d80` | Text-action underline |
| `#14191e` | Reserved artwork loading/background field |
| `#fff` | Link hover text |

These values are descriptive extraction from
`src/components/exhibitions/programme.module.css`, not additions to the global
palette. Shared navigation retains its existing treatment.

## Typography

The intentional exception is **Bodoni Moda** for exhibition display headings,
editorial titles, the exhibition introduction heading and essay initial. It is
loaded locally by `Programme.tsx` with the declared weight range (400–500), swap
display and Georgia/serif fallbacks. Used heading weights are 400. Body,
masthead, section labels, dates and navigation inherit the existing Inter stack.
Do not extend this exception into workspace controls or global heading rules.

| Role | Implemented desktop values |
| --- | --- |
| Programme masthead | Inter; `clamp(27px, 2.8vw, 40px)`; weight 400; line-height 1.15; tracking −0.03em |
| Exhibition display | Bodoni Moda; `clamp(42px, 4.9vw, 72px)`; line-height 1.04; tracking −0.025em; balanced wrapping |
| Second programme exhibition | Bodoni Moda; `clamp(36px, 4.1vw, 58px)` |
| Essay display | Bodoni Moda; `clamp(46px, 6vw, 82px)`; inherited display line-height and tracking |
| Editorial index title | Bodoni Moda; 30px; line-height 1.2; tracking −0.02em |
| Exhibition introduction heading | Bodoni Moda; 36px; line-height 1.2; tracking −0.02em |
| Section heading | Inter; 23px; weight 400; tracking −0.025em |
| Essay/introduction prose | Inter; 17px; line-height 1.95; maximum measure 70ch; paragraph separation 24px |
| Standfirst | Inter; 17px; line-height 1.8; maximum measure 48ch, 44ch on essays |
| Index supporting prose | Inter; 14–15px; line-height 1.7–1.8; maximum measures 34–39ch |
| Captions and dates | Inter; 12px; line-height 1.65–1.8; captions keep artist, work title/year and medium distinct |
| Text actions | Inter; 14px; back link and section navigation 13px |

At widths up to 1000px the general display becomes 46px and feature supporting
prose becomes 14px. At widths up to 700px the masthead is 28px, general display
uses `clamp(40px, 11vw, 60px)`, second exhibition display is 42px, essay display is
48px, editorial index titles are 28px and introduction headings are 32px. Long
prose becomes 16px with line-height 1.9; standfirsts become 16px. The essay's
opening paragraph has a floated Bodoni initial (4.4em), implemented through a
pseudo-element rather than duplicated text.

## Layout

The content container is bounded at 1320px with a minimum of 56px side margins;
the margins become 32px at widths up to 1000px and 20px at widths up to 700px. Programme padding is
48px above and 88px below, reducing to 30px and 56px on narrow layouts.

The first programme exhibition uses an image/text grid (1.7:1), becoming 1.6:1
at 1600px and wider and 1.4:1 up to 1000px. The second uses text/image columns (1:1.35).
On narrow layouts both put the artwork before its exhibition text. The editorial
index uses two columns with small images alongside text, then a single column
up to 700px. Rules and section gaps (96px desktop; 64px narrow) separate chapters
without wrapping them in cards.

Exhibition detail uses a two-column heading, an 1100px maximum cover, and a
one-to-two-column introduction with 88px separation above it. The remaining
works use two columns; every third work beginning with the first remaining
work spans both columns and is bounded at 960px. At widths up to 700px headings,
introduction and work sequence become single columns, the introduction gap
above becomes 56px and work separation becomes 48px.

Essay headers are centred and bounded at 920px. Reading columns are bounded at
70ch; the inserted artwork at 800px. Header and byline align left on narrow
layouts, and reading/artwork gaps reduce from 60px to 40px. These are source
rules; no rendered reflow or actual viewport fit has been accepted in this pass.

## Elevation & Depth

The scoped surface is flat. It declares no shadows, gradients or backdrop blur.
Neutral ground, thin horizontal rules, scale and spacing distinguish content.
The surrounding shared shell remains governed by its existing design guidance.

## Shapes

Artwork fields are rectangular and declare no corner radius or decorative
frame. Intrinsic dimensions reserve each image's aspect ratio; images use
contain fitting. Work-sequence images have a 640px maximum height on wider
layouts, removed up to 700px. Essay artwork has a 600px maximum height. Captions
remain outside the image field. Text actions use a single bottom rule rather
than a filled button shape.

## Components

- **Programme shell:** one main reading surface and bounded content container;
  scopes the local display font and palette to these routes.
- **Programme navigation:** native anchors to Exhibitions and Editorials;
  shared GALX navigation and footer expose the index. The workspace mobile
  bottom bar is omitted for these authored reading destinations.
- **Artwork:** an image with authored alt text, then a figure caption containing
  public artist-profile link, title/year and “Digital work.” Detail figures add
  curatorial captions. A “View work” link is present when the published source
  exists. The first cover is eager/high priority; subsequent images are lazy.
- **Artwork unavailable:** absent published source or a client image error
  replaces the image with “Artwork temporarily unavailable” and recovery
  context in a status region. Captions and artist links remain. No substitute
  image or generation action is introduced.
- **Programme text link:** an action label with a Lucide arrow, minimum height
  44px, bottom rule and 12px vertical padding. Hover turns text white and moves
  the arrow 2px right and 2px up over 180ms ease-out. Reduced motion disables the
  transition and translation. Back links and “View work” links also use a
  44px minimum height; section links have their own text-link padding.
- **Focus and browser selection:** links receive an off-white 2px visible-focus
  outline with a 6px offset. Underline offset is 5px. Selection reverses the
  scoped foreground and background. These are CSS declarations, not observed
  keyboard or contrast-audit results.
- **Route and content states:** unknown detail slugs invoke the existing
  not-found surface. The catalogue contains two complete exhibitions and two
  essays; there is no catalogue-empty interface, form, disabled control,
  custom route-loading state or new mutation state to document. Pending image
  loads retain the image field rather than an authored spinner.

## Do's and Don'ts

- **Do** preserve full work compositions, precise captions and public practice
  links; use the existing sanitized published-artifact contract.
- **Do** keep Bodoni display type and the neutral ramp within this institutional
  reading scope. Body copy and shared controls retain the incumbent sans voice.
- **Do** keep titles and work content ahead of navigation ornament, and preserve
  clear exhibition-to-essay return paths.
- **Don't** infer a physical medium, venue, curator identity, edition or
  commercial offer from the art or this presentation.
- **Don't** promote private production context or design evidence into public
  copy, metadata, image artifacts or browser props.

October 7 validation limit: this brief reflects source inspection after the
programme introduction correction. The retained
[local HTTP record](../review/exhibitions/http-verification.json) reports five
canonical reading responses, linked asset retrieval, selected image dimensions
and absent embedded metadata, plus hostile-route denials at its stated time.
That dated snapshot does not certify the final source identity or a rendered
visual result. No browser, substitute renderer or screenshot was used because
local browser access was explicitly denied. The
[formal finish disposition](../review/exhibitions/finish-review.md) remains
**recapture**: desktop, mobile and actual-user-viewport evidence is missing.
Responsive composition, on-screen artwork accuracy, font rendering, focus
visibility, overflow, comprehensive accessibility and live-site acceptance
remain unverified. Tests and build checks are recorded separately by the owning
change; documentation does not grant visual acceptance or deployment status.
