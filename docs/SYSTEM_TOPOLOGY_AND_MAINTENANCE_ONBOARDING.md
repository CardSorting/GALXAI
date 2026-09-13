# System topology and maintainer onboarding

<!-- docs-scope: current-guide -->
> Private onboarding. Begin with [architecture](ARCHITECTURE.md), [the contract](FEDERATION_STRATEGY.md), [current state](../post-mortem/CURRENT_STATE.md) and [incident operations](../post-mortem/README.md).

Follow a request from product authentication and entitlement through the server adapter, model-specific controller admission, assigned worker and signed recovery URLs. Product responses expose only allowed customer fields. Internal topology and execution evidence remain private.

Follow an account from explicit validated enrollment into the encrypted registry, cold preflight, worker capability discovery and model eligibility. A registered row is not guaranteed serving capacity. Bulk host-login import is retired; automatic lifecycle remains.

Follow a repair through a separately authorized desktop, reviewed shard link, optional maintenance hold, operator sign-in, validated credential sync and worker readiness. Desktop connection, saved login, registry revision and traffic state are distinct. Holds preserve inspection without overriding revoked/expired authority.

Use host launchers for monitor/desktops; no browser API-key entry. Practice with synthetic canaries and a disposable database before touching production. Do not run a second controller against live credentials or include normal workspaces in preview cleanup.

Read [enrollment/recovery](maintainers/RELAY_CREDENTIAL_ENROLLMENT.md), [desktop operations](maintainers/RELAY_DESKTOPS.md), [API recovery](RELAY_API_REFERENCE.md#request-recovery) and [security](SECURITY.md). Historical ADR measurements are dated evidence; [ADRs 0131–0133](adr/README.md) define the session's strategy changes.
