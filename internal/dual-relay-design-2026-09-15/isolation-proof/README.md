# Separate-network and separate-database proof

<!-- docs-scope: research-reference -->

Private disposable experiment for the [strict isolation contract](../strict-isolation.md), September 15, 2026 UTC. It runs real PostgreSQL clusters and restricted clients. It does not run GALX controllers, monitors or upstream provider requests.

## Run

From the repository root, with Docker running and the repository's pinned PostgreSQL image available locally:

```sh
node internal/dual-relay-design-2026-09-15/isolation-proof/run.mjs
```

The runner accepts no target arguments, does not load dotenv, does not use `DATABASE_URL`, and does not pull an image. The digest matches the repository's existing PostgreSQL fixture image. Four temporary containers use two independently created internal bridge networks. Neither database publishes a port. Both clusters use the same database/role names but independently generated passwords, demonstrating that names alone do not establish identity.

[fixture.sql](fixture.sql) creates a minimal single-destination schema in each database. Its singleton binding and foreign key reject a record belonging to the other destination. It has no production account table, actual credentials, registration workflow, leases or provider integration. The private synthetic payload is column-restricted; the monitor can read the allowlisted view but cannot write.

The client containers run as an unprivileged user with dropped capabilities, a read-only root and disposable tmpfs. No host paths, Docker sockets or shared volumes are mounted. PostgreSQL state is also temporary memory storage. The harness has Docker authority for setup/testing/cleanup; the clients do not.

Cleanup checks each resource's exact unique `galx.separation-proof.run` ownership label and removes only its own containers/networks. Creation intent is recorded before the Docker command to allow recovery after a lost acknowledgement. SIGINT/SIGTERM stop further test commands and enter cleanup after the current bounded command. SIGKILL or an unavailable daemon can still leave resources; inspect only the unique run label printed by that invocation before any manual cleanup. Do not use global Docker prune commands.

## What was tested

The final run passed **43 checks**:

- Both clients can resolve and query their own live database; both monitor roles can read only their allowed projection and cannot mutate.
- Clusters have different PostgreSQL system identifiers and independent runtime, monitor and administrator passwords.
- Peer database names do not resolve across networks. Direct peer IPv4 connections fail **even when the probe is deliberately supplied the correct peer password**. The peer remains readable from its own client, excluding a stopped database as the explanation.
- A peer runtime password cannot authenticate against the local database, despite the identical runtime username.
- The runtime cannot change its installed destination; a foreign-pool insert fails the local ownership reference.
- Networks contain only their owned database/client. Ports are unpublished; networks are internal with IPv6 disabled; clients have no shared disk or host mounts.
- Removing Premium's database leaves Standard reads and writes working. Reconstructing the empty Premium fixture and removing Standard's database leaves Premium reads and writes working. The failed local database connection returns failure; this is a direct-client observation, not a test of production router fallback logic.

All owned fixture resources were removed after the final run, which returned exit status 0.

## Failed checks and corrections retained as evidence

1. The initial sandbox run could not access the Docker socket and created no resources. The approved rerun used the local Docker daemon.
2. The first Docker run stopped on an incorrect test assumption: tmpfs configuration was being required in `Mounts`, while this Docker environment reports it in `HostConfig.Tmpfs`. The assertion now checks that authoritative setting and rejects any non-tmpfs mounts.
3. The next run caught an actual fixture configuration issue: using the PostgreSQL image as a client inherited its data `VOLUME`, even with a different entrypoint. An explicit tmpfs override now prevents that unused disk volume. Both failed runs cleaned up their owned resources.
4. The corrected run passed all 43 checks. The network tests did not require weakening a policy or adding a cross-network route.

These were laboratory test/configuration findings, not production incidents.

## Limits

- Both networks and database clusters run on the **same Docker host/daemon**. The daemon administrator can connect networks, inspect credentials or stop both sides. This proof does not meet the installed separate-VM/daemon boundary; the actual local installation also explicitly trusts its common Mac administrator.
- Network denials cover PostgreSQL TCP/5432 over IPv4 and scoped Docker DNS. IPv6 is disabled in this fixture. Production IPv6 policy, TLS, public ingress, host gateways, metadata endpoints, DNS rebinding, provider egress and other ports need separate acceptance tests.
- Database recreation starts empty; it is not backup restoration, durable outage recovery or proof of retention. No accepted/uncertain production work is involved.
- This fixture does not validate real monitor cookies/tickets, credential-envelope encryption, central account registration/uniqueness, destination-bound execution authorization, request routing, caches, queues, artifacts, secret-manager or deploy-role isolation. The current contract retains account management in GALXAI; this experiment has no central service and cannot prove central-outage or revocation behavior.
- The [earlier 69-check SQL proof](../schema-proof/README.md) separately tests RLS, grants, operation replay and workload policy in a shared-database experiment. Its result cannot be added to these checks as a production security certification.
- At this proof checkpoint, public product source and application migrations were unchanged. Do not activate a second controller against the current shared environment file based on this test.

## Repository verification

The [implemented account reference](../../../docs/reference/relay-account-management.md) records the current contract; this fixture retains only its historical mechanism scope. Repository build/documentation verification is recorded in the parent [evidence section](../README.md#evidence-and-limits). No live-site cleanliness or provider-readiness claim follows from the local proof.
