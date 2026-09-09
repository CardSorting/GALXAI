# Migrating to capability-aware GALX

<!-- docs-scope: current-guide -->
> Private integration and operations guide. Public documentation describes capabilities and customer contracts only.

## Application clients

Use `https://galx.ai/v1` with server-held application credentials and an explicit entitled public model ID. Catalog presence is not live availability. Preserve operation identity and recovery URLs across uncertain outcomes; review SDK retries so image synthesis is not repeated automatically.

Use canonical image capability `openai-gpt-image-latest`. Legacy application image names resolve to the same capability and cannot be treated as independent fallback providers. Do not consume internal execution fields or headers as a customer contract. Default images are sanitized binary artifacts; request explicit JSON only through the supported allowlisted contract.

Verify chat, image, streaming, tool behavior, asset persistence and paid workflows independently. Internal compatibility details are in [the private contract](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility).

## Operators moving from the shared relay

Drain and stop shared ownership before assigning credentials to federation workers. `docker-compose.relay.yml` is a legacy launcher. Start one supervised controller with persistent signing/journal state and verify ownership and capabilities before changing ingress. Multi-host shared ownership is not implemented.

## Operators moving from bulk import

Remove automatic cache seeding and enabled host discovery from setup scripts. Their retired compatibility entrypoints fail explicitly. Enroll each new account through validated create-only operator input; refresh existing accounts through linked-desktop sign-in. Do not restore upsert behavior to bypass duplicate enrollment.

Use `npm run relay:open` and `npm run relay:desktops` for delegated local sessions instead of entering an API key in the page. Link desktops explicitly, use repair holds when needed and verify sync/worker readiness before resuming.

## Verification and rollback

Run [hardening checks](maintainers/RELAY_HARDENING.md) and keep mutating tests on an explicit isolated database. Preserve private state and rollback images; review holds before stopping/replacing workers. Never run both topologies with the same credentials or repopulate rejected fixture rows. See [the runbook](RELAY_VNEXT_RUNBOOK.md) and [enrollment guide](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md).
