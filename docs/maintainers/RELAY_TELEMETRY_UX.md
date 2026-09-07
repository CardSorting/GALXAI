# Relay telemetry UX

This document records the implemented `/telemetry` operating surface in [telemetry.html](../../src/relay/telemetry.html). [PRODUCT.md](../../PRODUCT.md) and [DESIGN.md](../../DESIGN.md) remain the product and visual authorities. This is a narrow extension of the existing dark operator interface; no new visual identity or approved comp was introduced. The implementation follows the familiar Grafana/Langfuse request-table-to-detail-waterfall pattern. See [Relay request telemetry](RELAY_TELEMETRY.md) for the measurement, storage and verification contract.

## Layout and appearance

The page leads with its diagnostic purpose and update controls, then five filtered summary measurements, filters, retention context and a shared table/detail workspace. Detail presents routing and timing facts before diagnosis, chronological phases and attempt evidence. Measurement guidance and optional API access are secondary disclosures below the workspace.

The surface uses the established obsidian background, dark panels, subtle borders and indigo/cyan accents. Inter with system fallbacks carries interface text; JetBrains Mono with monospace fallback carries IDs and timing. Status text accompanies colored dots. Waterfall phases pair labels and numeric duration with indigo relay, amber connection/network and cyan provider/network bars. Panels use 8px corners, controls 6px; depth comes from surface contrast and borders.

Above 1000px the workspace places the table beside detail, with a 1.35:1 column ratio and a minimum 350px detail column. Content is capped at 1800px. At 1000px and below detail follows the table, whose scroll area is capped at 380px; summary measurements use three columns. At 600px and below summaries use two columns, the heading stacks, search takes a full filter row and outer/detail padding becomes 16px. The table retains its columns inside a horizontal scroll container. Long identifiers wrap in detail.

## Interaction and states

- Search matches model, operation, task/trace/job IDs and classified errors. Time range, outcome and failure-evidence filters combine with newest/slowest ordering. Failure evidence also finds failed attempts in recovered requests. Reset restores the default last-hour view.
- Selecting a request highlights its row and writes `#trace=<id>` to the URL. Detail persists independently of table filtering. Missing or expired selections have an explicit retention message.
- Task IDs act as search controls. An exact task-ID search shows all retained calls for that task, their observed elapsed span and summed request time, independently of the other table filters. Parallel calls can overlap.
- Detail supports copying the trace ID and exporting its telemetry JSON. Attached requests offer an original-request link; an evicted original produces a message directing the operator to its job ID in logs.
- Automatic refresh runs every three seconds while visible and unpaused, with no overlapping fetches and an eight-second timeout. Pause stops subsequent automatic refreshes; manual Refresh remains available. Failures preserve the prior snapshot and show a notice. HTTP 401 or 403 stops automatic polling and prompts for administrator access. Transient failures back off up to 30 seconds; entering a valid key allows refresh to resume. Entered keys stay in page memory.
- Initial loading, empty retention, no filter matches, in-progress work, cancellation, recovered retries and terminal failures have distinct copy. Missing measurements display an em dash.

## Data truth

Duration represents relay receipt through job terminal state. HTTP 202 is labelled as job acceptance, separate from outcome. Attached-request duration measures attachment and is excluded from duration percentiles. Duration percentiles use matching completed/failed records; first-output median uses matching records with an observed value. First output is a forwarded output chunk, not client-observed timing or a token count.

Waterfall offsets and lengths come from observed phase timings. Provider phases include network transit; transport failures explicitly remain uncertain. Relay phases include intake, selection and retry waits rather than isolated CPU time. Event-loop p99 is labelled as measured since process start. External tools and full task runtime are outside the measurement boundary.

Retention is ephemeral: up to 500 requests for one hour, reset on restart, with eviction counts shown. Percentiles describe the retained sample. Task IDs must be opaque identifiers; prompts, outputs and credentials are not captured. Phase-limit truncation receives a visible note.

## Accessibility and review evidence

Controls use native buttons, inputs, selects and disclosures with visible labels. Table headers declare column scope, request selection exposes `aria-pressed`, and table/detail sections have accessible names. Cyan focus outlines identify keyboard focus; refresh rendering attempts to restore focus to the same request or detail control. Result counts use a polite live region; notices and copy feedback use status roles. Text labels supplement color throughout. Mobile action buttons reach 44px height. There is no animated chart motion.

The code-led desktop and mobile captures reviewed for this handoff were `/tmp/telemetry-review/desktop.png` and `/tmp/telemetry-review/mobile.png`; they use synthetic review data and are temporary evidence, not shipped assets or an approved visual comp. They show the wide split workspace and narrow stacked layout. These observations describe the implementation and do not constitute a complete accessibility certification.
