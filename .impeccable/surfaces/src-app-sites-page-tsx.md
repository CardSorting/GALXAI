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
