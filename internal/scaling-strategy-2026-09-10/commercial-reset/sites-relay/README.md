# Sites and relay compatibility experiment

**September 10 native-provider experiment: Sites access survived selecting a custom model provider on this account, but the tested relay could not power a Codex build session.** Codex 0.154.0 sends `/v1/responses`; the real relay returns 404. Existing chat transport also loses tool semantics. The positive Sites read is a separate operation, not a successful inference-through-relay result.

This directory is private. It contains protocol diagnostics, not a customer integration package or a new server endpoint. See the [assessment](../SITES_ASSESSMENT.md) for product decisions and release gates.

The implemented workflow now uses [fixed-price content generation and a deterministic customer-local companion](../sites-automation/README.md). The relay supplies only the bounded content request, while Codex acts as a tool host for the customer's Sites connection. It does not start a Codex model turn. The native Responses/tool-loop work below remains a separate optional project, not a prerequisite for this workflow.

## Reproduce

From the repository root:

```sh
node --import tsx internal/scaling-strategy-2026-09-10/commercial-reset/sites-relay/relay-compatibility.ts --codex
```

Requires the repository's installed dependencies, local loopback listeners, the working `codex` binary, and the existing Sites-enabled login/plugin for the positive connector check. OpenAI network access is needed for that connector check. Omit `--codex` to run the ten local contract checks without an account connection; that mode does not validate Sites or CLI integration. Each run replaces [observations.json](observations.json), so retain prior evidence before using a different mode.

The harness starts the real `GalxaiRelayServer` and `RelayFederationServer` from this checkout. Their model inventory and upstream WebSocket are deterministic fixtures. Credentials are synthetic; host credential discovery and registry access are disabled. The federation has no live workers. Temporary snapshots are removed and listeners are stopped at completion. No existing relay is stopped or reconfigured.

The optional Python probe starts installed Codex with process-local custom-provider settings and an empty temporary workspace. It checks installed Sites skills and runtime access, invokes only `sites.list_sites` with `limit: 1, role: owner`, and attempts a model turn against the loopback relay. That request is expected to fail before any upstream model executes. Hooks are disabled; the thread is ephemeral. The probe never reads or copies an auth file, installs a plugin, changes persistent configuration, or authorizes a Site mutation. Returned Site metadata is discarded.

## Evidence interpretation

| Evidence | Real or synthetic? | What it establishes |
| --- | --- | --- |
| Codex executable, provider selection and HTTP requests | Real installed CLI | It uses the selected provider and requests Responses |
| Sites runtime and inventory read | Real authenticated account | A custom model provider can coexist with this account's Sites connection |
| Relay dispatch, request validation and output aggregation | Real application classes | Current supported routes and tool-contract failures |
| Generated model text/function output | Synthetic WebSocket fixture | How the relay transports given events, not model capability or output quality |
| Hosted application, build, publish and live GALX inference | Not performed | No availability, cost, deployment or tenant-isolation claim |

Ten contract checks completed. A passing diagnostic run means the recorded behavior was reproduced, including expected incompatibilities; it does not mean the desired product workflow works. The first harness run corrected an expected administrator status from 401 to the worker's actual 403 contract. Application behavior was not changed to satisfy a test.

The public GALX application already has a model-catalog route. The direct relay's additional `/v1/models` 404 is recorded separately from the blocking Responses 404. Public route inspection found no Responses handler or rewrite. No request was sent to the deployed public application.

## Customer qualification checklist

The working plugin name on this installation is `sites@openai-bundled`, version 0.1.66. Treat that as observed local availability, not a universal package promise. A pilot user should first confirm that their own Codex catalog includes Sites, install that listed package, start a new session and verify their own Sites connection. A GALX key does not establish that entitlement.

For the current supported Sites setup, an appropriate verification prompt is:

> Confirm the Sites building and hosting skills are available in this session. Perform only a read-only check of my Sites connection. Do not create a Site, save a version, upload source, or deploy anything.

For a native model-driven Codex build session, use a qualified Codex model provider until the complete Responses/tool round trip is supported. The deterministic companion above needs no such relay provider session. Do not publish a GALX custom-provider configuration as a working setup. The custom-provider settings in [codex-provider-probe.py](codex-provider-probe.py) are a diagnostic against a loopback fixture, not a production configuration example.

The next narrower experiment is a customer-owned Site whose authenticated server makes one bounded inference request through GALX's public API. Keep its credential server-side, enforce visitor/project budgets, and measure actual hosted latency, usage and errors. This is different from using GALX to power Codex while it builds the Site, and remains untested here.

## Engineering acceptance before GALX-powered building

1. Reject unsupported tool inputs with an explicit error instead of silently accepting them.
2. Implement the minimal documented Responses contract required by a real Codex client through the customer API and relay. Preserve call IDs, typed output items, tool definitions/choice, arguments, results, continuation, terminal events and usage; no text-only path alias.
3. Prove a deterministic tool-call/result round trip, cancellation, malformed streams, partial failure and interrupted-turn recovery. Keep Site operations client-owned and never replay an ambiguous publication as an inference retry.
4. Verify tenant authorization, response field allowlists, confidential-header removal, credential handling and durable usage settlement. Run the production build and rendered/browser-asset checks for any shipped application change.
5. Run a bounded live inference probe and a separately requested synthetic-data Sites publication under the customer's own account. Record costs and ownership, then test an update and access revocation before making a support promise.

Official references: [Codex provider configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [app-server runtime and tool operations](https://learn.chatgpt.com/docs/app-server), and [Sites](https://learn.chatgpt.com/docs/sites). Account-specific observations take precedence over assumptions drawn from a shared plugin catalog.
