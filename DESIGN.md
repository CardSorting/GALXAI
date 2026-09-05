---
name: GALXAI
description: Sovereign High-Density Cyberpunk UI for AI Gateway & Model Routing
colors:
  primary: "#6366f1"
  primary-hover: "#4f46e5"
  background: "#07080d"
  surface: "#0d101c"
  surface-hover: "#14192d"
  surface-card: "#121628"
  foreground: "#f3f4f6"
  foreground-muted: "#9ca3af"
  border: "rgba(255, 255, 255, 0.08)"
  border-subtle: "rgba(255, 255, 255, 0.05)"
  neon-cyan: "#00f0ff"
  neon-amber: "#f59e0b"
  neon-emerald: "#10b981"
  neon-rose: "#f43f5e"
  neon-violet: "#8b5cf6"
  accent-indigo: "#6366f1"
  accent-amber: "#f59e0b"
  accent-emerald: "#10b981"
  accent-cyan: "#00f0ff"
  accent-rose: "#f43f5e"
  black: "#000000"
  zinc-500: "#71717a"
  zinc-300: "#d4d4d8"
  emerald-400: "#34d399"
  amber-400: "#fbbf24"
  cyan-glow: "rgba(6, 182, 212, 0.15)"
  shadow-subtle: "rgba(0, 0, 0, 0.37)"
  shadow-heavy: "rgba(0, 0, 0, 0.4)"
  card-glow: "rgba(24, 30, 56, 0.75)"
  track-dark: "rgba(10, 12, 20, 0.5)"
typography:
  heading-22:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
  display-2xl:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.05
  display-xl:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-xs:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
  micro-xs:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.3
  code:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  code-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  code-xs:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  none: "0px"
  xs: "2px"
  sm: "4px"
  md: "6px"
  base: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    padding: "8px 16px"
  card-glass:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: GALXAI

## Overview

GALXAI employs a high-density, mission-critical cyberpunk command center aesthetic. Designed for system architects and AI engineers, the visual language balances dark obsidian surfaces with crisp vector typography, purposeful status luminescence, and zero-distraction layout structure.

## Colors

- **Background (`#07080d`)**: Deep space obsidian base, maximizing contrast with terminal output and telemetry metrics.
- **Surface Panels (`#0d101c` / rgba(13, 16, 28, 0.75))**: High-density backdrop-filtered glass containers with 1px subtle white borders (`rgba(255, 255, 255, 0.08)`).
- **Primary Accent (`#6366f1` / Indigo 500)**: Used for primary calls-to-action, key focus rings, and active navigational indicators.
- **Semantic Status Glows**:
  - **Live / Operational**: Neon Emerald (`#10b981`)
  - **Latency / Scarcity / Warning**: Neon Amber (`#f59e0b`)
  - **Streaming / Routing / Fast**: Neon Cyan (`#00f0ff`)
  - **Degraded / Error**: Neon Rose (`#f43f5e`)

## Typography

- **Display & Headings**: Inter sans-serif with controlled optical tracking (`-0.02em` max). Clear hierarchy with minimum 1.25x scale ratio between steps.
- **Code & Telemetry**: JetBrains Mono for API keys, JSON payloads, tokens, latency counters, and cURL commands with `tabular-nums`.
- **Text Readability**: No gray text on colored backgrounds. Secondary text is tinted with 70% opacity white or matching hue tone.

## Layout

- **High-Density Grid**: Efficient control-plane layouts utilizing sticky navigation rails, model catalog grids, request-inspection panels, and responsive multi-column telemetry cards.
- **Scannability First**: Visual hierarchy prioritized with clear section boundaries, distinct cards, and whitespace rhythm (tight groupings within components, generous padding between sections).

## Elevation & Depth

- **Single Elevation Strategy**: Crisp 1px border (`rgba(255, 255, 255, 0.08)`) with controlled subtle drop shadow (`0 8px 32px rgba(0, 0, 0, 0.37)`). Never pair a 1px hairline border with a wide diffuse cloud shadow.
- **Backdrop Blur**: `12px` to `16px` backdrop filter on overlays, sticky headers, and modal dialogs.

## Shapes

- **Corner Radii**:
  - Cards & Panels: `8px` to `12px` (`rounded-lg`)
  - Inputs & Controls: `6px` to `8px` (`rounded-md`)
  - Pills & Badges: `9999px` (`rounded-full`)
- Never use extreme border radii (24px+) on content cards.

## Components

- **API Request Inspector**: A bounded, single-request diagnostic with request JSON, response envelope, headers, latency, and copyable integration snippets. It must not grow conversation history, personas, sharing, creative projects, or generated-content libraries.
- **Shard Vault Card**: Provider status indicator (OpenAI, Anthropic, Gemini), active token count, endpoint health ping, and key revocation actions.
- **Ledger Bar**: Real-time balance chip, deposit match incentive tag, and instant Stripe/Crypto top-up trigger.

## Do's and Don'ts

### Do's
- ✅ Use crisp, vector Lucide icons rendered in single consistent stroke weights.
- ✅ Style browser defaults: custom dark scrollbars, focus-visible rings, and text selection.
- ✅ Animate only `transform` and `opacity` with smooth exponential easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- ✅ Provide complete states: Default, Hover, Active, Disabled, Loading, Error, and Empty states.

### Don'ts
- ❌ Do not use side-tab colored stripe borders on cards.
- ❌ Do not use bouncy or elastic animations (`animate-bounce`).
- ❌ Do not nest cards inside cards inside cards ("cardocalypse").
- ❌ Do not place uppercase kickers/eyebrows stacked directly over hero headlines.
- ❌ Do not use gray text on colored status badges.
