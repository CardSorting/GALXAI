---
version: 1
slug: "src-components-dashboard-navigation-tsx"
primary_target: "src/components/dashboard/Navigation.tsx"
related_targets: ["src/components/dashboard/navigation.module.css", "src/app/layout.tsx", "src/app/loading.tsx", "src/app/globals.css", "route:/", "route:/images", "route:/sites"]
---

# Shared product navigation

Mode: Operate. Extend the existing dark GALX identity, logo, type and neutral borders. The task is spatial continuity between Home, Images and Sites. Keep destinations and account controls predictable while content changes.

Use one link order: Sites, Images, Pricing, FAQ, Developer preview. Product links come first; homepage sections and private developer discovery follow. Account actions occupy a separate 152px region regardless of account loading or sign-in state. Links keep constant type metrics and use color/underline for the current destination. The desktop header is one row; below 900px it has a logo/account row and a horizontally scrollable link row. Links never wrap or disappear. Keyboard focus reveals clipped links, and all links preserve native browser actions.

The product header remains mounted in the root layout above page loading. A delayed, subtle pending underline and text announcement acknowledge a slow route; page content uses a quiet loading placeholder. No page-slide or looping navigation animation is added. Reduced motion disables transitions and smooth scrolling. Stable scrollbar space prevents lateral movement when document height changes. This does not preserve a departed workspace's local results or change access policy.

[Maintainer guidance](../../docs/NATURAL_NAVIGATION_AND_OMNISEARCH.md) owns routing, request intent, recovery and fixture commands. [Dated verification](../../docs/knowledge/audits/2026-09-13-navigation-continuity.json) records local browser checks, source inspection and limitations. Captures are ignored local evidence under `.impeccable/review/navigation/`; fixtures do not establish production acceptance, universal accessibility or measured speed improvements. No new global visual identity, raster asset or comp was needed.
