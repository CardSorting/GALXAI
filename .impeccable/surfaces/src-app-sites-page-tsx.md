---
version: 1
slug: "src-app-sites-page-tsx"
primary_target: "src/app/sites/page.tsx"
related_targets: ["src/components/sites/SitesWorkspace.tsx","src/components/sites/sites.css","src/components/sites/use-sites-workspace.ts","route:/sites"]
---

# Sites workspace

Mode: Operate. Primary routes: /sites and /sites/:id. Related source: SitesWorkspace.tsx, sites.css, use-sites-workspace.ts.

User-pinned composition: conversation in a left column, website in a right viewport. Preserve the existing GALX dark app shell and indigo controls; the authored page is a warm light canvas clearly separated from the interface. No visual-world replacement or image comp is needed for this specified structure.

First viewport: 64px Sites heading under the existing navigation; 380px chat column with welcome, concrete starter prompts and bottom composer; remaining width holds the page viewport, device controls and explicit publication action. The illustrative preview is labeled until a real draft exists. Mobile switches between Chat and Preview, retaining the same document and conversation.

Signature interaction: send a quoted change and see the saved document replace the right-hand preview; desktop/phone controls inspect the same document. Motion is limited to in-progress feedback and restrained opacity; reduced-motion preference removes animation.

Onboarding: sign in, describe, preview, then choose a username at first publication. GALX-managed publishing is the stated default assumption while the hosting preference question is unanswered. Existing native connections are not imported. Publication requires an explicit public-audience action and the current revision. Authenticated drafts, history, account errors, loading, pending generation, pending address, archived state and unavailable generation/publishing are all first-class states.

Constraints: static information pages only; no arbitrary generated HTML/scripts, secret-bearing iframe, invented provider OAuth, raw diagnostics, hidden charges or automatic publication after edits. Scope verification to synthetic browser fixtures and separately recorded production evidence.

Workspace entry now shares a responsive loading shell with client session hydration. Route-local error recovery keeps the product header, shows authored copy and requests a fresh server render only on explicit retry. Expected verification outages withhold workspace content. A finite 180ms opacity handoff is omitted for reduced motion. See [navigation recovery](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md#workspace-loading-and-render-recovery) for current contracts and verification limits.

Browser profile failure is contained within page content, preserving the public product shell. Recovery has finite pending/failure/offline feedback, guarded keyboard retry and theme-derived colors. The loading status remains outside busy content and offers Home after a six-second wait. Existing per-account local drafts remain available after successful recovery. See the navigation guide for source and fixture scope; no deployment is implied.

Free allowance and availability are separate. The shared quota provider supplies the header and composer; pauses/exhaustion preserve drafts, block button and keyboard submission, and offer a pending manual recheck plus Explore Pro. Keep all private budget and capacity details out of these surfaces.

The workspace measures its top position after navigation wraps and gives the split pane the remaining viewport height (640px minimum for short/zoomed views). Composer and pause actions stay together; history/messages scroll inside their pane. Resize observation is cleaned up on unmount.
