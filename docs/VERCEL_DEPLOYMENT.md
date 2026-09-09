# Application deployment and relay connectivity

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

The Next.js application, Cloudflare Worker, and Node relay are separate deployments. This guide covers application setup. ADR 0127 records the September 7 gateway promotion and actual DreamBees image verification; recheck the target release before making a current deployment claim.

## Application configuration

Use [package.json](../package.json), [.env.example](../.env.example), and the deployment project configuration as the source for build scripts and environment names. Configure application identity, database access, vault secrets, and any enabled provider/storage integrations in the target environment. Keep privileged keys server-side. Do not generate or rotate vault roots merely to deploy an application that must read existing credentials.

Use the application's existing preview/deployment workflow. Inspect the relevant package script before executing it: inference benchmarks can call paid providers, environment synchronization mutates remote configuration, and vault population is not a read-only check. Validate the build and the endpoints changed by the release; record results with the deployed version.

## Relay connection

Set `VM_RELAY_URL` to an origin reachable from the deployed application and `VM_RELAY_API_KEY` to an inference key accepted by that relay. These are server-side settings. Do not use a provider credential or relay administrator key as the application's inference key. The adapter falls back to the first `RELAY_API_KEYS` entry when `VM_RELAY_API_KEY` is absent, but an explicit dedicated key avoids configuration ambiguity.

The supervised federation controller listens on `127.0.0.1:3001` and manages at most one Docker worker per eligible shard. The shared Compose layout is legacy. A remote application cannot reach it by setting its own relay URL to `localhost`. Public ingress requires a separately configured and tested tunnel or proxy, suitable authentication, TLS, and streaming behavior. An ephemeral development URL is not a stable production dependency.

The adapter submits chat work, receives HTTP 202, and attaches to the job stream. Moving upstream work to the relay does not remove the application's own execution or streaming limits. Inspect the actual deployment's limits and validate a representative long-running request. Direct-provider/SDK/CLI paths are separate configurations. A configured relay error does not authorize automatic fallback or replay; inspect execution metadata and correlated traces.

## Verification and rollback

Check the application's authentication and product API contract, then verify a request with correlated relay telemetry. Confirm that an invalid relay key fails, cancellation terminates appropriately, and terminal failures are surfaced without endless client retries. Test from the deployed application's network, not only the operator's laptop.

[ADR 0127](adr/0127-codex-image-tool-alias-production-cutover.md) records the later September 7 production gateway/tunnel cutover and successful actual-client DreamBees image verification. Application asset persistence remains a separate verification boundary. Keep application rollback separate from relay image rollback and database migration strategy.

See [deployment overview](DEPLOYMENT.md), [relay setup and rollback](RELAY_VNEXT_RUNBOOK.md), [API base URLs](API_BASE_URL.md), and [Cloudflare strategy](CLOUDFLARE_STRATEGY.md).
