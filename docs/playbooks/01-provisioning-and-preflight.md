# Provisioning and preflight

<!-- docs-scope: current-guide -->

Private maintainer procedure.

1. Identify the actual component using [current state](../../post-mortem/CURRENT_STATE.md). The selected installation is local: central HTTPS on Docker Desktop and Premium in its Colima VM and daemon. External SSH hosts are not local prerequisites.
2. Follow [service installation](../runbooks/relay-pool-services.md) for reviewed image pins, private secrets, fixed identities, no host mounts, TLS and peer-denial verification. Do not clone main-project or peer credentials into a runtime.
3. Verify central-only account schema and separate execution-only schemas through [database operations](../maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md). Existing assignment, leases and history remain central.
4. Open the fixed Premium monitor, choose **Register account**, prepare its desktop, manually sign in with a paid account, review access and register according to the current activation policy.
5. Follow explicit gate acceptance, enable intended accounts and verify fresh matching applied revisions plus actual capability.
6. Preserve homes, central authority, execution records and uncertain work. Source, built images, installed services and provider acceptance are distinct.

Use [account management](../reference/relay-account-management.md) for health, rename, removal and renewal. The retained [legacy enrollment](../maintainers/legacy-desktop-enrollment.md) procedure applies only to eligible unassigned controller accounts. External API/CLI/token imports remain closed.
