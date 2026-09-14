---
version: 1
slug: "src-components-dashboard-navigation-tsx"
primary_target: "src/components/dashboard/Navigation.tsx"
related_targets: ["src/components/dashboard/navigation.module.css", "src/app/layout.tsx", "src/app/loading.tsx", "src/app/globals.css", "route:/", "route:/images", "route:/sites"]
---

# Shared product navigation

Mode: Operate. Extend the existing dark GALX identity, logo, type and neutral borders. The task is spatial continuity between Home, Images and Sites. Keep destinations and account controls predictable while content changes.

Use one link order: Sites, Images, Pricing, FAQ, Knowledge base, Developer preview. Product links come first; dedicated Pricing, FAQ and Knowledge base destinations and private developer discovery follow. Account actions occupy a separate 152px region regardless of account loading or sign-in state. Links keep constant type metrics and use color/underline for the current destination. For signed-in free accounts, a compact full-width allowance row shows remaining Sites, Images and Site turns; Pro hides it. The desktop navigation itself is one row; below 1100px it has a logo/account row and a horizontally scrollable link row. Links never wrap or disappear. Keyboard focus reveals clipped links, and all links preserve native browser actions.

The product header remains mounted in the root layout above page loading, including Images Library/Favorites and all exact curated reading routes. Login uses `/login?next=/sites` from Home and retains the current canonical product path elsewhere. A delayed, subtle pending underline and text announcement acknowledge a slow route; page content uses a quiet loading placeholder. No page-slide or looping navigation animation is added. Reduced motion disables transitions and smooth scrolling. Stable scrollbar space prevents lateral movement when document height changes. This does not preserve a departed workspace's local results or change access policy.

[Maintainer guidance](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md) owns routing, request intent, recovery and fixture commands. [Dated verification](../../docs/knowledge/audits/2026-09-13-navigation-continuity.json) records local browser checks, source inspection and limitations. Captures are ignored local evidence under `.impeccable/review/navigation/`; fixtures do not establish production acceptance, universal accessibility or measured speed improvements. No new global visual identity, raster asset or comp was needed.

Workspace entry now shares a responsive loading shell with client session hydration. Route-local error recovery keeps the product header, shows authored copy and requests a fresh server render only on explicit retry. Expected verification outages withhold workspace content. A finite 180ms opacity handoff is omitted for reduced motion. See [navigation recovery](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md#workspace-loading-and-render-recovery) for current contracts and verification limits.

Browser profile failure is contained within page content, preserving the public product shell. Recovery has finite pending/failure/offline feedback, guarded keyboard retry and theme-derived colors. The loading status remains outside busy content and offers Home after a six-second wait. Existing per-account local drafts remain available after successful recovery. See the navigation guide for source and fixture scope; no deployment is implied.

Free allowance and availability are separate. The shared quota provider supplies the header and composer; pauses/exhaustion preserve drafts, block button and keyboard submission, and offer a pending manual recheck plus Explore Pro. Keep all private budget and capacity details out of these surfaces.
