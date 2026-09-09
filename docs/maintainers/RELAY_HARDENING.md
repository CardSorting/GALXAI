# Federation hardening checks

<!-- docs-scope: current-guide -->
> Private validation guide. Choose checks for the changed boundary; record revision, environment and results rather than treating historical test counts as a gate.

## Fast regressions

```sh
npm run test:relay:capabilities
node --import tsx --test scripts/test-relay-enrollment.ts
node --import tsx --test scripts/test-public-information-boundary.ts scripts/test-image-public-http.ts scripts/test-relay-client-auth.ts
npm run test:relay:desktop-login
npx tsc --noEmit
python3 scripts/verify-docs.py
```

The capability suite covers lifecycle, desktop/credential recovery, maintenance, monitor authorization, telemetry and HTTP/adaptive-quota behavior. Enrollment tests cover retired entrypoints, validation and isolation. Public-boundary tests inspect adversarial bodies, headers, errors and artifacts. Guest tests exercise CLI/source handling without a real account sign-in.

## Storage and real containers

```sh
node --import tsx --test scripts/test-shard-enrollment-storage.ts
npm run test:relay:docker
node --import tsx scripts/test-relay-lifecycle-docker.ts
```

The storage harness uses disposable PostgreSQL plus mocked REST tests. Read its prerequisites before running. The broad `npm run db:test` requires an explicit isolated loopback database and must fail under production configuration; see [test isolation](RELAY_CREDENTIAL_ENROLLMENT.md#isolated-integration-tests).

Docker canaries use synthetic inventories/credentials. The federation canary removes containers but retains checkpoint volumes under its existing driver behavior. The lifecycle canary removes its containers and checkpoint volumes. Desktop previews use a scoped test manifest for retryable cleanup. Never expand cleanup to normal production workspaces.

## Build and browser checks

Run `npm run build` and relevant source lint. For changed guest/worker code, build the corresponding image and test that candidate explicitly. A successful build does not replace a running container.

Exercise session issuance, origin/host restrictions, ordinary-key denial, anonymous asset/data denial, read-only monitor isolation, renewal/revocation, link/generation races and display backpressure. Exercise actual guest input when changing its transport. Inspect native accessibility and layout at desktop and phone widths.

Scan rendered public pages and browser assets for selected private markers and inspect raw public HTTP responses/artifacts before claiming a clean public boundary. Public documentation source is [content.ts](../../src/lib/docs/content.ts); private repository docs must not be bundled there.

## Acceptance limits

Fixtures do not prove provider approval, current upstream compatibility, physical phone input, guest semantic accessibility or paid application completion. Real inference can incur usage and needs its own bounded verification. Record exact deployments separately from local tests; see [the session record](RELAY_SESSION_VERIFICATION_20260909.md).
