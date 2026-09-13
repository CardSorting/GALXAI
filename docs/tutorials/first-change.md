# Make your first safe change

<!-- docs-scope: current-guide -->

Outcome: a small local documentation change with passing navigation and knowledge checks. You need a checkout, Git, Python 3.11 or newer, and Node.js 22/npm. This exercise does not need production credentials or inference.

1. Read [current state](../../post-mortem/CURRENT_STATE.md), [product scope](../PRODUCT_SURFACE_STRATEGY.md) and the root [instructions](../../AGENTS.md). Run `git status --short` to identify work already present; preserve it.
2. Run `npm run docs:find -- "favorites"`. Open the image runbook result and follow its source links. Notice the difference between a recovery procedure and dated proof of recovery.
3. Run `npm run docs:impact -- --files src/lib/images/request-service.ts`. The report names affected guides and possible checks; it executes neither tests nor operational commands.
4. Choose a real, small clarity improvement in a guide you understand. Check it against its owning source. Change the whole affected paragraph and any contradictory example. Do not change behavior or fabricate a review merely to finish this exercise.
5. Run `npm run docs:sync` and `npm run docs:check`. If a review is stale, inspect the listed files and use [explicit review](../reference/knowledge-commands.md#record-an-explicit-review) only after that inspection. Regeneration alone cannot satisfy a review.
6. Run `npm run test:docs` and `git diff --check`. Inspect your diff, including generated navigation. Record what you changed and how you verified it using the [PR template](../../.github/PULL_REQUEST_TEMPLATE.md).

You have finished when the change is understandable without the conversation and every check has a recorded result. A local pass is not a commit, remote CI run or deployment. For the next source change, follow [maintaining knowledge with a change](../how-to/change-with-documentation.md).
