# Build and inspect the two relay images

<!-- docs-scope: current-guide -->

## Purpose and trigger

Use this procedure to build Premium and Standard Docker artifacts before deploying the isolated relay architecture. Owner: Relay operator. Success means two locally available, verified **staging images** with the same engine and fixed pool metadata. Neither accepts work. This procedure does not activate accounts, create monitors, push to a registry or replace the current controller.

## Authority and prerequisites

Accounts remain managed only by the main project under [ADR 0153](../adr/0153-central-account-authority-isolated-relays.md). The staging images remain closed permanently. Scoped central services, account classification, leases, execution schemas and two monitors are now implemented in the separate [service release](relay-pool-services.md); the later [local installation](../../post-mortem/releases/2026-09-15-relay-local.json) and [management release](../../post-mortem/releases/2026-09-15-relay-account-management.json) installed them with registration open and execution closed. Manual sign-ins, provider qualification and public application cutover remain pending. The retained controller uses [legacy operations](../maintainers/legacy-federation-operations.md).

Use Docker Engine/Desktop with Buildx and Compose. Run commands from the repository root. [Dockerfile.relay-pools](../../Dockerfile.relay-pools) pins the official Node image by digest; [the dedicated lockfile](../../docker/relay-pools/package-lock.json) pins build and runtime dependencies. Both targets share one engine build. The source allowlist excludes environment files, host state, private documents and generated artifacts from the build context. Final images contain the engine, bootstrap, fixed policy and runtime dependencies; they contain no monitor pages or desktop application.

These choices follow Docker's [multi-stage and digest-pinning guidance](https://docs.docker.com/build/building/best-practices/). Runtime secret files use [Compose's file-mounted secrets](https://docs.docker.com/compose/how-tos/use-secrets/). Local Compose secrets are host-file mounts, not an encrypted secret-management service; the container UID must be able to read each file. In production, arrange restrictive ownership/permissions for UID 1000 through the host's secret-delivery process. Do not make real keys world-readable to work around a mount error.

## Procedure

1. Build both native-platform images without loading `.env.local`:

   ```sh
   npm run relay:pools:build
   ```

   Expected tags are `galxai-relay-premium:staged-20260915` and `galxai-relay-standard:staged-20260915`. The committed [Bake file](../../docker/relay-pools/docker-bake.hcl) owns these defaults. `TAG` changes a build tag only; Compose templates intentionally retain explicit reviewed tags and do not automatically follow it. Building a tag does not replace any running container.

2. Inspect each image without providing keys:

   ```sh
   docker run --rm --network none galxai-relay-premium:staged-20260915 --describe
   docker run --rm --network none galxai-relay-standard:staged-20260915 --describe
   ```

   Both report `servingReady: false` and `awaiting-central-authorization`. Premium metadata requires paid accounts and text/Sites/images; Standard requires free accounts and text. Metadata alone does not validate an account subscription or implement an active admission protocol.

3. Verify the actual images with disposable containers and synthetic keys:

   ```sh
   npm run test:relay:pool-images
   npm run verify:relay:pool-images
   ```

   The container verifier uses no network, no production keys and no existing container names. It tests the native dependencies, filesystem, fixed identities, unsafe-environment refusal, administrator denial, unavailable workloads and graceful shutdown. It validates both Compose templates without launching those stacks, then removes its own containers and temporary files. Private output goes to `.relay/pool-images-verification.json`. Check exit status; a report emitted before cleanup does not itself prove cleanup succeeded.

4. For an explicitly requested persistent staging instance, provide **four different keys**, each 32–256 base64url characters, as individual files outside the repository. Set `GALX_PREMIUM_INFERENCE_KEY_FILE` and `GALX_PREMIUM_ADMIN_KEY_FILE` only on the Premium host; set `GALX_STANDARD_INFERENCE_KEY_FILE` and `GALX_STANDARD_ADMIN_KEY_FILE` only on Standard. The values are absolute file paths, not credentials. Then run the matching command on each host:

   ```sh
   docker compose --env-file /dev/null -f docker/relay-pools/compose.premium.yaml up -d --no-build --pull never
   docker compose --env-file /dev/null -f docker/relay-pools/compose.standard.yaml up -d --no-build --pull never
   ```

   These historical staging stacks reuse the installed runtime loopback ports; never start them on an occupied service target or treat them as a service upgrade. Use an explicitly isolated staging target. These are separate stacks, not files to merge. Their project/network names, loopback ports (13301/13302), and secret references differ. They have internal networks, no volume or Docker-socket mounts, read-only roots, non-root users, dropped capabilities, resource limits and bounded logs. Staging checkpoints live only in a small temporary filesystem. Restart policy is `no`; an unhealthy setup should be inspected rather than repeatedly restarted.

## Stop conditions

The image entrypoint rejects central database/vault variables, assigned-account injection, mismatched pool identity, activation flags, missing or malformed key files and identical inference/admin keys. It never prints supplied values. Do not bypass it, override the container command to launch the legacy bundle, mount old credential/state directories, or pass root `.env.local`. Host/daemon administrators can override image entrypoints; image labels are not protection against that authority.

`GET /health/live` and `/health` return only liveness. `GET /health/ready` requires the separate administrator key and returns HTTP 503 with an explicit non-serving stage. An inference or peer key receives 401 there. All generation, registration, probe, Sites, tool and recovery routes remain unavailable before their engine handlers. There is no runtime environment flag that opens this gate. Docker's healthy status therefore means **process alive**, never ready to generate.

Do not attach these internal networks to the current tunnel or interpret two local Compose networks as two isolated hosts. A shared daemon remains a shared privileged boundary. The separate service images include scoped monitor backends; this historical staging package does not include them. The broad-privileged federation controller is not a second account manager.

## Recovery and rollback

For a staging stack started by this procedure, stop the corresponding file with `docker compose --env-file /dev/null -f docker/relay-pools/compose.premium.yaml down` or the Standard equivalent, with its same secret-path environment available. Remove only that stack. Never use a global Docker prune, remove production containers or erase existing relay state to clean up a staging check.

Rebuild with the retained source, pinned base and lockfile if an image is missing. Preserve prior tags and record IDs when updating. The existing live controller and worker tags are unaffected by these builds. No database rollback is part of this procedure because no migration or account assignment occurs.

## Verification and evidence

The [September 15 image record](../../post-mortem/releases/2026-09-15-relay-pool-images.json) names the built image IDs, platform, source fingerprints and checks. It is local artifact evidence, not registry publication, real generation, separate-host isolation or monitor acceptance. Build for the destination architecture before installation; the initial local images were tested on Linux ARM64 through Docker Desktop. For another platform, use Buildx's explicit `--set '*.platform=linux/amd64'` with separate tags and rerun native/container verification on the destination.

For the installed local authorization/runtime/monitor package and its remaining manual sign-in, provider qualification and activation, use the [service installation procedure](relay-pool-services.md). These staging tags cannot be activated by a flag.
