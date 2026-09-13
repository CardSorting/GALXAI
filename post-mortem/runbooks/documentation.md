# Keep incident records and guides current

<!-- docs-scope: current-guide -->

## At each meaningful incident step

Append one JSON object per line to `post-mortem/events.jsonl`, using [the event template](../templates/event.json). IDs are unique. Record the observation time accurately; date-only historical evidence stays date-only. Link every action/result to an incident and evidence. Corrections append an event with `supersedes`; previous observations remain intact.

Update `register.json` when severity, state, owner role or follow-up work changes. Every open action has an owner role, review date, next step and concrete closure criterion. Recovered incidents keep their prevention work open until supported by evidence. Do not assign an individual without agreement or record a scheduled task that was never installed.

Run `npm run docs:sync` to regenerate the incident index, rolling log, action board and complete documentation inventories. This command performs local file updates only; it does not deploy, query production, approve access or certify a source review.

## When code or policy changes

Read [documentation policy](../../docs/DOCUMENTATION_POLICY.md). Update complete affected guide bodies, examples, rollout/rollback guidance, failure modes, current-state observations and ADR precedence. Preserve prior observations in dated records; remove obsolete actionable instructions from current guides.

`review.json` binds the critical incident guides to relevant source and guide hashes. `npm run docs:check` fails when those sources or reviewed bodies change. After actually comparing the new source and documentation, run:

```sh
npm run docs:review -- --reviewer "your-name-or-role" --note "Describe the source and guide reconciliation performed"
npm run docs:sync
npm run docs:check
```

The review command records a dated local attestation and hashes; it does not replace semantic review, security tests or live verification. The inventory classifies all repository-owned Markdown in root, docs, internal, post-mortem, source design notes, simulations and test outputs. Installed skills, dependency trees, generated build assets and local tool caches are outside that authored-document inventory.

## Before a release

Run the documentation guard and the tests required by the changed boundary. The CI preflight runs the same documentation check. Review unknowns and overdue action dates; the checker reports overdue items but does not pretend an incident is resolved. Retain a compatible rollback and the private response boundary.

After a production build, run `npm run docs:check:build` to inspect browser/rendered assets for the incident marker set and runtime traces for incident-file inclusion. This is a local build check. Before claiming a live public surface clean, scan the actual deployed pages and associated browser assets separately. Private docs must never enter `public/`, application imports, a static export or a deployment upload. Vercel and Docker exclude `/post-mortem/`, `/internal/` and `/docs/`; Git ignores raw evidence. Sanitize evidence before committing, not after publication.
