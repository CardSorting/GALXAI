---
version: 1
slug: "src-app-developers-page-tsx"
primary_target: "src/app/developers/page.tsx"
related_targets: ["src/components/developers/DeveloperPreview.tsx", "src/components/dashboard/Navigation.tsx", "route:/developers"]
---

# Developer private preview

Mode: Operate. Preserve GALX's dark interface, Inter typography, restrained indigo controls and existing amber accent. The public home uses the existing galaxy image; no new image generation or visual-world replacement.

Images and Sites are the public products. The developer page leads with small cohorts as a way to manage costs, improve performance and support a thoughtful first experience. A restrained side column explains participation, next steps and current cohort members' reported 30–60% savings. That range is founder-supplied, participant-reported and workload-dependent, not a guarantee or independently measured benchmark.

Verified-account applications collect a short introduction, at least one GitHub/LinkedIn profile, project description, expected traffic and an explicit choice of next or future cohort. Keep both profile fields available without requiring accounts on both networks. Accept pasted profile links without a scheme, normalize to HTTPS, strip tracking, and never imply verified profile ownership. Use grouped native fields, an error summary with field links, a review-before-submit screen and an editable pending-application receipt. Existing applicants can complete missing details without losing their original queue position. A review conflict keeps the draft until explicit discard/reload. Private drafts stay in memory and clear when the account changes.

Signup never implies approval. Status states include loading, not requested, pending, approved, paused, declined, expired, session required and unavailable. Approved participants retain API key/docs/playground links and private feedback. An application edit never changes approval or expiry; its revision invalidates stale staff reviews. No automatic email, queue-position promise, invitation date or fixed saving is implied. Desktop uses a form plus explanatory side column; mobile puts the application first. Evidence is under `.impeccable/review/developer-cohort/`.

The shared top navigation contains Sites, Images, Pricing, FAQ and Developer preview in a stable order, with account access separate. Pricing and FAQ link to the homepage sections; this does not change private developer access. [Navigation guidance](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md) owns the responsive header behavior. Post-signup defaults to Images; explicit developer signup preserves /developers as the return destination. No invitation date, automatic contact or production reliability guarantee is promised.

Native labels, keyboard controls, visible focus, live status messages and 44px controls support desktop and phone use. Private fixture evidence lives under .impeccable/review/developer-preview. Production deployment and real invitations require their own rollout evidence.
