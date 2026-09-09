---
version: 1
slug: "src-relay-federation-html"
primary_target: "src/relay/federation.html"
related_targets: ["src/relay/federation.js", "src/relay/monitor-login.html", "src/relay/monitor-login.js"]
---

# Relay operations monitor

## Scope and mode

Operate. A private, local administrator surface using GALX's existing dark operator palette and compact tables. PRODUCT.md and DESIGN.md remain the product and visual authorities. The user requested familiar monitoring patterns and explanations of actual fleet and request behavior.

## Primary task and hierarchy

Open from the host CLI without entering an API key. Within the first viewport, determine whether new work can be accepted, how many workers are actually running, why rejected credentials remain offline, and whether telemetry is complete. Investigate through Events, Requests and Workers tabs.

The summary distinguishes admission availability, worker occupancy (which can include background checks), retained request counts, failed executions and completed-execution median duration. Figures come from observed data and declare coverage; HTTP 202 is acceptance, never execution completion. The Workers tab count is running workers; its table also explicitly includes offline credential states.

## Interactions and evidence

- Events are newest-first timestamped markers with stable codes, severity, category, exact IDs, plain explanations and next steps. Fleet decisions include start/adoption, capability changes, persisted credential rejections, retries, drains, removal and telemetry outage/recovery. Unchanged heartbeats do not create events.
- Requests show current or last observed phase, outcome, attempts, first output and a common-scale phase timeline. A linked HTTP-response event opens the corresponding worker trace. Stale running traces are unconfirmed, never silently marked finished. Timeline precedes collapsible identifiers; expanded details, focus and selection survive refresh.
- Worker details explain readiness, rejection, cooldown, retry and model-specific evidence. Model availability remains available beneath the worker table; model filtering includes unavailable reported models.
- Time windows, search, outcome/category filters, Clear filters, JSON export and per-record copy/export are native controls. Pause freezes data and the time window. Manual refresh works while paused. `/` focuses search, Escape closes detail, arrow/Home/End keys navigate tabs.
- Desktop uses a list with adjacent details. Mobile puts selected details before the list and uses full-width search, readable selectors, bounded table scrolling and 44px-high controls. No full-page horizontal overflow at tested widths from 320 to 1440px.
- Background collection is independent of browser polling, single-flight and bounded. The UI refreshes every three seconds while visible, labels collection gaps, and preserves the last snapshot on network failure. An empty retained window never claims zero historical traffic.

## Access and privacy

The host launcher delegates an HttpOnly, read-only, local browser session. Administrator credentials never enter the browser. Sign-in tickets are single-use, short-lived and removed from the URL. Controller restarts expire sessions; `npm run relay:open` reconnects. Disconnect revokes access. Private HTML, JS and telemetry require the server-side session. Anonymous visitors see only the generic launcher screen. Public API credentials do not grant monitor access.

Trace DTOs omit prompts, output, credentials, arbitrary provider messages and runtime objects. Events are local in-memory records capped at 500 / one hour and reset with the controller; remembered credential rejections are restored as explicitly labeled restart markers. Up to 500 worker traces are retained for one hour and may predate controller startup. Background capability checks are not request traces.

## Verification

114 relay, authorization, recovery, telemetry and public-response tests passed; production build, TypeScript and targeted lint passed. Chrome desktop/mobile checks cover loading, empty, errors, partial/stale data, request timelines, filters, exports, pause, retained session, keyboard navigation and revocation. Axe WCAG A/AA checks passed in overview and request-detail states. A narrow-layout grid overflow, tab-focus navigation issue and invalid metric definition-list markup were corrected during validation. Static detector completed its regex pass with no findings; its optional HTML parser modules were unavailable, so rendered browser checks supplied accessibility/contrast evidence. Private artifacts and the detailed audit are in `.relay/`.
# Shard repair navigation — 2026-09-09

Worker details now list linked repair desktops and provide a setup path into Relay Desktops. Manual traffic holds have an explicit Work paused state and pause/resume event explanations, distinct from paused monitor updates. The private desktop session controls admission; this monitor remains read-only. Desktop and serving-worker health remain separate. Relationship browser tests verified the monitor-to-desktop round trip; implementation, references and evidence are recorded in `.relay/shard-desktop-audit.md`.
