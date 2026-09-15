---
version: 1
slug: "scripts-macos-relaymonitors-swift"
primary_target: "scripts/macos/RelayMonitors.swift"
related_targets: ["scripts/install-relay-monitor-apps.py", "scripts/relay-local.mjs", "scripts/lib/relay-local-access.mjs"]
---

# GALX Monitors — private Mac access surface

Operate. The owner opens one of two local monitors without recalling ports or terminal commands. Preserve their independent sessions and fixed destinations.

The native menu-bar app uses AppKit menus, system typography, system status symbols, keyboard equivalents and standard alerts. **Open Premium** and **Open Standard** are the primary commands; status describes listener availability only. Separate searchable apps use P/S icons. Dock placement remains the user's choice. Open at Login is opt-in and starts only the menu app. Quit leaves services running.

A warm launch goes directly to the browser. After a brief delay a native progress window explains a slower startup. Duplicate opens for the same destination are suppressed; different destinations queue. The status refresh does not rebuild a menu while the user is navigating it. Errors offer Try Again and Cancel with task-specific recovery. Long-lived credentials and subprocess output never enter native copy.

Custom app links accept only the two fixed destinations. The launcher delegates ticket issuance to each authorized monitor and never aggregates their accounts or browser sessions. See the [owning runbook](../../docs/runbooks/relay-pool-services.md) for installation and limits.

Native build, application installation and deep-link dispatch are verified separately from web captures. Native screenshot capture was unavailable in this session; no rendered-native or VoiceOver acceptance is claimed. The web access screens have their own desktop/mobile browser checks and surface brief.
