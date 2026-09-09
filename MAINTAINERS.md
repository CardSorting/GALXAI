# GALX maintainer guide

This is private operational navigation. Public content describes capabilities and customer contracts; follow [AGENTS.md](AGENTS.md) and [the security boundary](docs/SECURITY.md).

## Start here

Read [the federation contract](docs/FEDERATION_STRATEGY.md), [current handover](HANDOVER.md) and [runbook](docs/RELAY_VNEXT_RUNBOOK.md). Registered credentials, inference workers and repair desktops are distinct. Automatic worker lifecycle remains supported; ambient credential population is retired.

Use [explicit enrollment](docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md) for a new account and [linked desktop sign-in](docs/maintainers/RELAY_DESKTOPS.md) for refresh. The host launchers delegate browser sessions; do not paste an admin key into the page. A maintenance hold stops new work/replacements without overriding registry authority.

## Local work and verification

Use repository runtime/dependency requirements and existing project scripts. Keep credentials in private environment/secret storage. Do not start another controller against already-owned production credentials.

Run [targeted hardening checks](docs/maintainers/RELAY_HARDENING.md) for the changed boundary, TypeScript and relevant lint. The broad database integration suite requires a dedicated loopback test database and strips inherited Data API credentials. Production configuration must fail its guard.

Build the application and affected images. Verify raw public response allowlists, authorization, image artifacts and rendered/browser-asset boundaries when relevant. A build is not a deployment; synthetic tests are not current provider availability or performance measurements.

## Review and release

Preserve tenant authority, exact capability selection, revision/generation fences, bounded I/O and uncertain-operation identity. Do not use telemetry to rewrite health, retry ambiguous synthesis automatically or restore rejected credentials from caches.

Review worker/desktop ownership and maintenance holds before reload. Graceful controller stop removes unheld workers. Preserve needed journals, checkpoints and homes; keep disposable cleanup scoped to its accepted test resources. Record source, image and running process revisions separately.

Follow [Git workflow](docs/maintainers/GIT_WORKFLOWS_AND_HOOKS.md), [deployment boundaries](docs/DEPLOYMENT.md) and [request recovery](docs/RELAY_API_REFERENCE.md#request-recovery). Billing/entitlement changes and external publishing retain their own authorization.

## Documentation and ownership

Update affected guides and entire ADR bodies when strategy changes. Date evidence and reconcile status, examples and navigation. [ADRs 0131–0133](docs/adr/README.md) record operator access, credential recovery and enrollment. Run `python3 scripts/verify-docs.py` and semantic stale-guidance searches.

The [complete catalog](docs/CATALOG.md) includes subsystem references, research and historical evidence. Those scopes do not establish fleet-wide SLAs. Use [the maintainer catalog](docs/maintainers/README.md) for component ownership, security incidents and database procedures.
