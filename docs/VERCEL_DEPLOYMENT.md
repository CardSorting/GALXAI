# Application deployment and relay connectivity

The Next.js application, Cloudflare Worker, and Node relay are separate deployments. This guide covers the repository's application setup boundary; it does not assert that a remote Vercel deployment was verified during the local relay rollout.

## Application configuration

Use [package.json](../package.json), [.env.example](../.env.example), and the deployment project configuration as the source for build scripts and environment names. Configure application identity, database access, vault secrets, and any enabled provider/storage integrations in the target environment. Keep privileged keys server-side. Do not generate or rotate vault roots merely to deploy an application that must read existing credentials.

Use the application's existing preview/deployment workflow. Inspect the relevant package script before executing it: inference benchmarks can call paid providers, environment synchronization mutates remote configuration, and vault population is not a read-only check. Validate the build and the endpoints changed by the release; record results with the deployed version.

## Relay connection

Set `VM_RELAY_URL` to an origin reachable from the deployed application and `VM_RELAY_API_KEY` to an inference key accepted by that relay. These are server-side settings. Do not use a provider credential or relay administrator key as the application's inference key. The adapter falls back to the first `RELAY_API_KEYS` entry when `VM_RELAY_API_KEY` is absent, but an explicit dedicated key avoids configuration ambiguity.

The verified relay runs from this repository through Docker Compose on `127.0.0.1:3001`. A remote application cannot reach it by setting its own relay URL to `localhost`. Public ingress requires a separately configured and tested tunnel or proxy, suitable authentication, TLS, and streaming behavior. An ephemeral development URL is not a stable production dependency.

The adapter submits chat work, receives HTTP 202, and attaches to the job stream. Moving upstream work to the relay does not remove the application's own execution or streaming limits. Inspect the actual deployment's limits and validate a representative long-running request. The adapter also retains direct-provider/SDK/CLI fallback paths; a successful request alone does not prove it used the relay.

## Verification and rollback

Check the application's authentication and product API contract, then verify a request with correlated relay telemetry. Confirm that an invalid relay key fails, cancellation terminates appropriately, and terminal failures are surfaced without endless client retries. Test from the deployed application's network, not only the operator's laptop.

The 2026-09-07 relay rollout verified the local container and a short chat/SSE request. Remote application connectivity, public tunnel ingress, and live image storage were not part of that verification. Keep application rollback separate from relay image rollback and database migration strategy.

See [deployment overview](DEPLOYMENT.md), [relay setup and rollback](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md), [API base URLs](API_BASE_URL.md), and [Cloudflare strategy](CLOUDFLARE_STRATEGY.md).
