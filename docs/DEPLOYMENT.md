# Deployment boundaries

Reviewed 2026-09-07. Deploying the relay does not deploy the application, Worker, database migrations, or storage policies. Treat each as a separate change with its own secrets and verification.

| Target | Repository definition | Current guidance |
| --- | --- | --- |
| Standalone relay | `Dockerfile.relay`, `docker-compose.relay.yml`, `src/relay` | [Relay runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md) |
| Application | `src/app`, Next.js/package configuration | [Vercel guide](VERCEL_DEPLOYMENT.md); verify target before running deployment commands |
| Cloudflare Worker | `wrangler.toml`, `src/workers/cloudflare` | [Cloudflare strategy](CLOUDFLARE_STRATEGY.md) |
| PostgreSQL registry and application database | `supabase/migrations`, repository services | [Registry authority ADR](adr/0115-postgresql-authoritative-shard-registry-and-secret-free-projections.md) and database runbooks |
| Image storage | `GalxR2AssetAdapter`, `GalxUnifiedR2StorageManager` | [Image lifecycle ADR](adr/0121-user-and-session-r2-partitioning-manifest-lifecycle-and-relay-image-synthesis.md) |

## Relay deployment

The verified local deployment publishes loopback port 3001 and uses a non-root, read-only container with a private checkpoint volume. Personal credentials and the source tree are not mounted. Network listeners require configured relay keys. The application uses `VM_RELAY_URL` and `VM_RELAY_API_KEY`; operators use `RELAY_ADMIN_API_KEYS`.

Build, canary, checkpoint migration, drain, cutover, and rollback instructions are maintained in the [relay runbook](VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md). Do not substitute an old sibling-repository PM2 command or a host process for the container isolation boundary.

## Secrets and consumer rollout

Keep deployment credentials server-side. Public frontend configuration must not contain relay administrator keys, provider tokens, database passwords, or vault roots. Local `.env.local` is ignored and restricted to mode 0600; remote deployments need their own secret configuration.

Updating a local environment file does not update a running process or remote deployment. Roll out app adapter changes and its inference key to each actual consumer. Verify submit, authenticated stream attachment, and terminal completion. A 202 acknowledgement or healthy container alone is insufficient.

## Evidence and limits

The 2026-09-07 relay deployment passed canary and post-cutover inference, authentication, registry, and container-boundary checks. No app server was listening on local port 3000. No remote application, public tunnel, global failover, or high-availability configuration was verified by that rollout. Deployment cost and service-level objectives require measured, environment-specific evidence.
