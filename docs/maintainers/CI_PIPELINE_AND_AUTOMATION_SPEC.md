# CI and documentation automation

<!-- docs-scope: current-guide -->

This page describes the checked-in workflows. Their presence does not prove they are enabled, required by branch protection, or successful on a remote revision. Inspect the actual hosted run for release evidence.

## Application preflight

[vercel-preflight.yml](../../.github/workflows/vercel-preflight.yml) triggers on pushes and pull requests targeting `main` or `staging`. It uses Node.js 22, `npm ci`, fixture public configuration, read-only contents permission and a fifteen-minute job timeout. New runs cancel older runs in the same configured concurrency group.

The workflow runs documentation/incident validation and guard tests; image/identity security, isolated image database checks and the historical image artifact fixture; YAML security and production dependency audit; offline Vercel preflight; browser-agent, session and cooldown checks; isolated egress checks, including client request budgets and Sites bootstrap ownership/response tests through `test:egress:transport`; controller capability tests; lint/type checks; an isolated Next.js production build; and the compiled private-content check. The YAML and [package scripts](../../package.json) are authoritative for the exact commands and order.

It does not run every repository test, a paid inference benchmark, or automatically merge a PR. Select additional component tests from the [domain map](../knowledge/DOMAINS.md). Record real inference acceptance separately when authorized and relevant.

## Documentation workflow

[documentation.yml](../../.github/workflows/documentation.yml) runs the offline docs guards on pushes, PRs, manual dispatch and Mondays at 09:17 UTC. Every event requires a review for each registered domain, retained evidence with matching hashes, matching source/guide fingerprints and a current review date. It exercises the incident/knowledge guard fixtures, including rejection of Git-ignored navigation/evidence targets that cannot survive a clean checkout. A readable owner/deadline table and status artifact are produced even on failure; artifact retention is 14 days. The workflow needs no application dependencies, service credentials or model access.

PR and push runs fetch history and compare the incident journal against the event baseline, so committing a rewritten journal does not bypass the append-only check. Scheduled/manual runs compare the current committed prefix; they do not reconstruct changes outside that baseline.

The [September 13 activation receipt](../knowledge/audits/2026-09-13-ci-activation.json) confirms the workflow is active on `main` and both manual and push audits passed at `28d8caa`. The first attempt exposed ignored local evidence links; its correction and fixture coverage are retained. This dated receipt does not assert a scheduled event, required merge checks or full application/gateway CI success.

Regeneration is a local authoring step. CI does not rewrite docs, refresh review fingerprints, create issues, send messages, approve ADRs or deploy. Unreviewed registered domains fail; unreviewed historical documents remain classified separately. The schedule requires an enabled workflow on the default branch and can be delayed by GitHub. Use the [weekly audit runbook](../runbooks/weekly-knowledge-audit.md) to inspect activation, dispatch a bounded verification and triage missed or failed runs. A manual success proves the same audit job, not that a future cron event has already fired.

## Gateway workflow

[deploy-cloudflare.yml](../../.github/workflows/deploy-cloudflare.yml) triggers on `main` pushes matching worker source, the worker test or isolation bootstrap, package manifests, `wrangler.toml` or its own workflow file. It installs dependencies, tests worker components and performs a Wrangler dry run. The test strips inherited application credentials before importing components, stores fixture objects in a temporary directory, and uses explicit HTTP and repository fixtures. Unexpected HTTP fails the suite, even when a component catches the error. Health tests require only the public status/timestamp fields; preview approval covers success and denial/outage, and image tests cover binary, JSON and async delivery boundaries. These checks do not prove real inference, socket warming, webhook delivery or production queue execution. Its deployment step is conditional on the configured token. It is not a release-tag workflow, and it does not prove the application or database was deployed with the gateway.

## Failure handling and release evidence

Read the failed step and its actual output. Correct source failures before rerunning; do not refresh review attestations to bypass a stale-guide failure. Dependency advisories, missing fixtures and source regressions have different remedies. Use [knowledge maintenance](../runbooks/knowledge-maintenance.md) for docs failures and [release readiness](../runbooks/release-readiness.md) before rollout.

Local passing results, remote CI, deployment and actual-client acceptance are separate evidence. Required status checks, reviewer team availability and remote workflow settings are external configuration and have not been certified by this document.
