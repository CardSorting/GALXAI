# Production relay recovery — September 7, 2026

> Historical evidence from the date in this record. Commands and deployment observations below are not current operating instructions. Use [current state](../../../CURRENT_STATE.md) and the [incident runbooks](../../../runbooks/triage.md).

<!-- docs-scope: operational-record -->
> **Reading scope:** Scoped operational procedure or dated incident evidence. Its component authority remains separate from federation lifecycle, capability routing, and admission recovery. See the [current contract](../../../../docs/FEDERATION_STRATEGY.md) and [complete catalog](../../../../docs/CATALOG.md).

The product API failed a small `gpt-5.6-sol` completion with a 45-second Codex
WebSocket timeout. Vercel still referenced an expired `trycloudflare.com` URL
and had no `VM_RELAY_API_KEY`. The healthy local relay required that key.
The app swallowed relay failures and silently dispatched directly from Vercel,
which masked the configuration problem as a provider timeout.

## Permanent ingress

- Hostname: `https://relay.galx.ai`.
- Named tunnel: `galxai-production-relay`, ID `3df90220-304b-4771-8be8-4569bc147b4e`.
- Cloudflare-managed ingress routes only that hostname to
  `http://galxai-relay:3001`; unmatched hostnames return 404.
- A proxied CNAME points the relay hostname at the named tunnel. The product's
  existing root/www DNS and nameservers were not changed.
- `docker-compose.relay-tunnel.yml` runs a digest-pinned cloudflared 2026.8.3
  connector with restart policy, read-only filesystem, dropped capabilities,
  resource limits, and no published ports. It joins `galxai_default`.
- The tunnel token is stored only in ignored, mode-0600
  `.relay/production-tunnel.env`. It is separate from the relay inference key
  and the Cloudflare management API credential.
- Vercel production uses the permanent URL and the verified inference-only
  `VM_RELAY_API_KEY`, both configured as sensitive variables.

Start/reconcile the connector after the existing relay stack is running:

```sh
docker compose -p galxai-ingress -f docker-compose.relay-tunnel.yml up -d
```

The hostname survives connector restarts. The workstation and Docker must still
remain running; this does not create a second relay host or an uptime guarantee.
Do not replace this named tunnel with a Quick Tunnel: Cloudflare documents Quick
Tunnels as development-only and without SSE support.

## Adapter behavior

Configured relay failures now raise a sanitized `RelayDispatchError`. The router
releases its lease and stops replaying that request across credentials; chat
returns HTTP 503 with `relay_unavailable`. Vercel also fails promptly when its
relay URL is missing. Direct execution remains available outside that configured
chat path; the image adapter has its own existing behavior.

The relay transport keeps a first-output deadline active through job admission
and stream attachment, then enforces idle and total deadlines. It refuses
redirects and attachment URLs outside the admitted job's same-origin stream
path. It handles fragmented UTF-8/SSE frames, error/cancel events, cancellation,
and missing completion markers. A truncated stream cannot become successful
partial or empty JSON. Non-streaming conversion preserves supplied usage and
reasoning; it no longer invents a fixed prompt-token count. Existing router
estimation still applies when the relay does not supply authoritative usage.

## Verification

- Permanent-host health: 200; management without credentials: 401; inference
  credential on management: 403.
- One real relay completion returned `OK` in approximately 2.3 seconds.
- 43 relay tests passed, covering hardening, quota behavior, caller authentication,
  relay failures, fragmented streams, completion markers, attachment-origin
  restrictions, deadlines, and prevention of direct fallback.
- TypeScript and scoped ESLint passed.

Repeat the focused regression checks with `npm run test:relay-chat`.
Never paste keys into commands, logs, documentation, or screenshots. Supply
production secret values to deployment tooling through stdin.

## Recovery

Check `/health/ready`, connector status, DNS, and the two Vercel relay settings
before changing provider credentials. A healthy endpoint is not an inference
test: require completed output with the intended inference key.

Stop the connector with `docker compose -p galxai-ingress -f
docker-compose.relay-tunnel.yml stop` if ingress must be withdrawn. Preserve the
named tunnel/DNS and secret file for restart. Do not restore the expired URL.
Application rollback should retain the corrected URL and key.

References: [Cloudflare named tunnel setup](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel-api/)
and [Quick Tunnel limitations](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

## Image follow-up

Image synthesis retained the old silent direct-WebSocket fallback, unlike chat.
The public image handler also had a 60-second execution ceiling while the relay
allowed up to 90 seconds for visual synthesis. Relay telemetry showed intermittent
provider failures after 20–31 seconds despite successful authentication; a direct
baseline request also succeeded in 37.5 seconds. Credentials alone therefore did
not explain these failures.

Image WebSocket requests now explicitly enable streaming, matching chat. The
updated relay returned a real image in 25 seconds. The application gives relay
image requests a bounded 105-second deadline and a 180-second route execution
budget, and returns sanitized HTTP 503 on relay failure instead of silently
replaying synthesis directly. Empty image responses are rejected. Redirects are
refused to keep the inference credential on the configured origin. Cancellation
and timer cleanup are retained. These changes do not guarantee the provider will
never return a timeout; they prevent masking upstream failures and premature
termination by the former 60-second application limit.
