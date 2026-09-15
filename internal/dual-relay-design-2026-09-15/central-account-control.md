# Central account management with isolated execution

<!-- docs-scope: research-reference -->

The complete implemented contract now lives in [Account and registration management](../../docs/reference/relay-account-management.md). This stable research URL points to that canonical reference so schema, API, health, lifecycle and recovery details have one owner.

## Implemented strategy

`mazhcjisettrzbqhorvp` alone owns canonical accounts, encrypted credentials, exclusive assignments, registration/review, lifecycle commands/history and existing account leases/budgets. Premium paid provider accounts support text/Sites/images; Standard free accounts support text only. The intended text catalog is shared, subject to observed access. GALX customer plans are separate.

Each pool has an execution-only database and a separate local VM/daemon/disk/runtime/monitor. Its runtime hosts in-process account engines and receives only scoped own-account material. Central HTTPS runs outside both pools on Docker Desktop. Persistent peer denial covers direct and Mac-forwarded paths; shared physical Mac/administrator and central availability remain explicit dependencies. Neither pool reads, administers, borrows or fails over to the other.

The fixed monitors use Accounts, Registration and Activity with status/health filters, issue ordering and recognizable names. Rename/removal are central revision-aware operations. Unfinished removed registrations can be restored with fresh review; registered-account removal is permanent revocation with retained files/history. Explicit manual renewal replaces the legacy background saved-file bridge for these services. Native launchers provide scoped one-use access tickets without browser service keys.

## Reference patterns

The design uses familiar concepts from [AWS central control and application planes](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/control-plane-vs.-application-plane.html), [GitHub runner groups](https://docs.github.com/en/actions/concepts/runners/runner-groups), [Kubernetes desired/observed state](https://kubernetes.io/docs/concepts/overview/working-with-objects/), [Primer removal flows](https://www.primer.style/product/scenario-patterns/delete/) and [Cloudscape status indicators](https://cloudscape.design/components/status-indicator/). These are bounded architecture/interaction references; GALX does not adopt those services or claim equivalent guarantees.

## Procedures and evidence

- [Service installation, native access and activation](../../docs/runbooks/relay-pool-services.md)
- [Schema and migration operations](../../docs/maintainers/POSTGRESQL_MIGRATION_AND_AOP_DB_RUNBOOK.md#central-relay-authorization-and-execution-projects)
- [Manual registration and renewal](../../docs/maintainers/RELAY_CREDENTIAL_ENROLLMENT.md)
- [Account API and recovery](../../docs/RELAY_API_REFERENCE.md)
- [Delivery status](delivery-plan.md) and [current state](../../post-mortem/CURRENT_STATE.md)

Local services and management are installed; latest acceptance has registration open, execution closed and zero registered accounts. Manual sign-ins, provider qualification and public application cutover remain pending. Historical prototype/proof results are separate evidence. [ADR 0153](../../docs/adr/0153-central-account-authority-isolated-relays.md) retains its decision status.
