---
description: Frontend UI/UX Impeccable Design & Anti-Slop Quality Standards
globs: "src/**/*.{tsx,ts,jsx,js,css,scss,html}"
---

# 🎨 Impeccable Frontend Design & Anti-Slop Rules

When designing, building, or refining frontend interfaces in this repository, the agent MUST adhere to the [Impeccable Design Standards](https://impeccable.style/) and avoid all AI-generated design anti-patterns ("slop").

---

## 🚫 1. Anti-Slop Invariants (Refuse AI Defaults)

### Visual Details & Depth
1. **No Side-Tab Accent Borders**: Never put a thick `border-left` or `border-right` on cards, list items, callouts, or alerts. Use subtle background tinting or remove the stripe.
2. **No Hairline + Wide Shadow ("Ghost Card")**: Commit to one elevation strategy — either a defined border or a soft elevation with offset, never a 1px border combined with a wide diffuse shadow.
3. **No Over-Rounding on Cards**: Card border radii should stay between `8px` and `16px` (`rounded-lg` / `rounded-xl`). Do not round whole cards into pills (`rounded-3xl` / `rounded-full` is for tags and buttons only).
4. **No Decorative Background Grids / Stripes**: Do not apply `repeating-linear-gradient` stripes or two-axis grid overlays unless the surface is a genuine canvas, map, blueprint, or measurement tool.
5. **No Glassmorphism as Generic Decoration**: Do not add frosted glass/blur effects or neon glow borders unless solving a real physical layering problem.
6. **No Amateur Hand-Drawn SVG**: Never hand-code crude SVG mascots or doodles. Use crisp vector icons from Lucide/Heroicons or real media assets.

### Typography & Hierarchy
7. **No Kicker / Eyebrow Above Headings**: Never put a tracked uppercase tag (e.g. `FEATURES`, `INTRODUCING`) directly stacked over a hero heading. Let the heading carry its own weight.
8. **No Flat Type Hierarchy**: Always ensure at least a 1.25–1.3x size scale step between headings, subheadings, and body copy.
9. **No Icon-Tile Stack**: Do not place a rounded-square colored icon tile directly above every heading in a 3-column card grid. Use inline icons or let the typography lead.
10. **No Overused Font Reflexes**: Avoid generic Inter-for-everything defaults; pair a distinct display face with a clean body font when establishing design systems.
11. **No Crushed Negative Tracking**: Avoid extreme negative letter-spacing (`tracking-tighter` below `-0.04em`).
12. **No All-Caps Body Text**: Keep running copy in sentence case with comfortable line lengths (65–75 characters / `max-w-prose`).

### Color & Contrast
13. **No AI Color Palette (Purple-to-Blue Gradients Everywhere)**: Avoid purple-to-indigo gradients, cyan-on-dark cyberpunk defaults, and saturated radial halos. Choose intentional, contextual palettes.
14. **No Gray Text on Colored Backgrounds**: Never put gray (`text-zinc-400`, `text-gray-500`) on colored surfaces. Tint secondary text with a shade of the background color or use white with proper opacity.
15. **Contrast Compliance**: Normal text must satisfy ≥ 4.5:1 contrast ratio; large text ≥ 3:1.

### Layout & Structure
16. **No Nested Cards ("Cardocalypse")**: Never place cards inside cards inside cards. Flatten visual hierarchy using spacing, typography, and subtle dividers.
17. **No Monotonous Spacing**: Vary spacing dynamically — tight groupings for related items, generous whitespace between sections.
18. **No Identical 3-Card Feature Grids**: Design intentional layouts fitted to content rather than repeating the same icon+heading+paragraph box 3 times.

### Motion & Interactions
19. **No Bounce / Elastic Easing**: Interface controls and dialogs must never spring, bounce, or overshoot. Use smooth exponential deceleration (`cubic-bezier(0.16, 1, 0.3, 1)` or standard ease-out).
20. **No Animating Layout Properties**: Animate only `transform` and `opacity`. Never animate `width`, `height`, `padding`, or `margin` directly.
21. **No Fake Pulsing Dots / Fake Cursors**: Animate status dots only when data is genuinely streaming or active; do not add fake pulsing to static state indicators.

---

## ⚡ 2. The Impeccable Craft Floor

- **Browser Polish**: Always style custom scrollbars, text selection (`::selection`), focus rings (`focus-visible`), and tabular numbers (`font-variant-numeric: tabular-nums`).
- **Complete States**: Every component must handle Default, Hover, Active, Focus, Disabled, Loading, and Empty states gracefully.
- **Copy Polish**: Controls must name their exact action; errors must clearly state the problem and the resolution path.

---

## 🛠️ 3. Execution & Verification Workflow

When executing UI changes:
1. Consult `.agents/skills/impeccable/SKILL.md` for specific commands (`/impeccable polish`, `/impeccable distill`, `/impeccable harden`, `/impeccable clarify`, etc.).
2. Run `npx -y impeccable detect <file-or-dir>` after editing UI components to catch any lingering anti-patterns before completion.
