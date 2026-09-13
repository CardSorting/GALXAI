# Contributing to GALXAI

Read [AGENTS.md](AGENTS.md), [product scope](PRODUCT.md), [current state](post-mortem/CURRENT_STATE.md) and [the developer guide](docs/DEVELOPER_GUIDE.md) before changing behavior. Images and Sites are public products; the developer API is a private preview. Existing account, payment and ownership checks remain separate from preview approval and staff authorization.

## Local development

Use Node 22 as declared in [package.json](package.json) and the checked-in npm lockfile. Install with `npm ci`; configure only the local settings needed for the task from [.env.example](.env.example), keeping credentials outside Git. Run `npm run dev` for the application. Starting the application is not permission to start another controller against production resources.

Inspect a script before running it. Inference benchmarks can spend money, environment sync writes remote configuration, and vault population is a mutation. Do not include those actions in routine diagnosis or documentation verification.

## Implementation and review

Preserve server-verified identity, current access decisions, explicit public DTOs, owner-scoped persistence and original operation identity. Image responses use sanitized artifacts; public errors do not expose internal exceptions. Use durable storage before acknowledging an accepted operation or mutation. BroccoliDB caches and batching must not become permission or persistence authority.

Keep changes focused and retain unrelated work. Describe the problem, resulting behavior, verification and meaningful limits in the PR. Add or reconcile a topic-specific ADR when changing architecture, authorization, persistence or public contracts; older decisions retain only their stated scope. Use conventional commit titles.

## Verification

Run tests appropriate to the changed boundary, plus required authorization/adversarial checks and the production build. Image/auth/storage changes require `npm run test:image:security`; durable image/Favorites changes also require `npm run test:image:db`, which provisions an isolated disposable database. Preview changes require `npm run test:developer-preview` and the relevant admin/database suite. Never point integration fixtures at production.

Documentation changes require `npm run docs:sync` and `npm run docs:check`. If source-bound guides change, complete the [review workflow](post-mortem/runbooks/documentation.md). For a recovered incident, record actual-client verification separately from local tests and deployment status.

Before claiming the live public surface is clean, scan its rendered pages and associated browser assets. No passing check certifies unrelated routes, future availability or production load capacity.

## Release and follow-through

Follow [deployment boundaries](docs/DEPLOYMENT.md), preserve a compatible rollback and record the exact deployed component. Do not revert developer gating or drop populated operation receipts. Update complete affected documents and [post-mortem](post-mortem/README.md) in the same change; retain historical observations without leaving obsolete instructions active.
