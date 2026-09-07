---
version: 1
slug: "src-relay-federation-html"
primary_target: "src/relay/federation.html"
related_targets: ["src/relay/federation.js"]
---

# Relay federation model availability

## Scope and visitor mode

Operate. This standalone relay administrator surface extends the incumbent GALX dark operator interface. PRODUCT.md and DESIGN.md remain the product and visual authorities; this brief records only the federation surface.

## Audience, job, and action

An engineering operator connects with an administrator key, finds an exact model with limited eligible shard redundancy, and selects that model to inspect its owning shards. Model pools lead; shard inventory follows. Search matches model names or shard IDs, and the inventory additionally matches relay IDs.

## Built content and behavior

- Model rows show eligible shard count and the supplied HEALTHY, FRAGILE, or UNAVAILABLE state. One eligible shard is fragile; zero is unavailable.
- Selecting a model reveals its eligible count, redundancy, and each reporting shard's capability state, relay health, active streams/capacity, and evidence age with Fresh or Expired text. If the selected model disappears from a newer snapshot, its former detail is replaced with an explicit message.
- Shard inventory keeps capability lifecycle, relay health, active streams/capacity, and inventory age in separate columns. Health stays textual and does not inherit capability-state coloring.
- The key lives in page memory and the password field clears after connection. Disconnect clears the key and displayed snapshot. Refresh runs every ten seconds while the page is visible; a manual refresh control is available after connecting.
- Registry staleness announces that new admissions are paused. Fetch failures identify the failure and explicitly mark retained values as the last snapshot. Initial and empty model states explain whether no snapshot, no inventory, or no filter matches exist.

## Direction and inherited design

The memorable interaction is model-to-shard inspection beside the model list: exact-model redundancy is legible independently of relay health. Compact dark tables, restrained semantic colors, muted supporting text, visible keyboard focus, and tabular numeric values continue the operator world. The detail panel is a single bordered surface; no raster assets ship.

The desktop composition pairs the model table and selected-model detail above the shard inventory. Below the implemented 760px breakpoint they stack. The inventory preserves a readable 640px minimum table width inside a horizontally scrollable, keyboard-focusable named region with an explicit scroll hint.

## Evidence and remaining decisions

Built sources: src/relay/federation.html and src/relay/federation.js. Desktop and mobile captures were supplied at /tmp/galx-federation-desktop.png and /tmp/galx-federation-mobile.png. The finish review reported the absent-model detail, health-color separation, and accessible mobile table fixes resolved, with disposition ship for this scope. No unresolved surface-direction decisions. This brief does not establish new global tokens or certify deployment behavior.
