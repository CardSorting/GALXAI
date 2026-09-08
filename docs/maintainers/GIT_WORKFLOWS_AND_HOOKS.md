# 🪝 Maintainer Guide: Git Workflows, Hooks & Conventional Commits

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> **Target Audience**: All Maintainers, Contributors, and Autonomous AI Agents.  
> **Standard**: Conventional Commits 1.0.0 with trunk-based development and linear git history.

---

## 1. Conventional Commits 1.0.0 Standard

Every commit message in GALXAI MUST follow the Conventional Commits format:

```text
<type>(<scope>): <short imperative description>

[optional body explaining architectural rationale]

[optional footer referencing ADRs, issues, or breaking changes]
```

### Supported Types:
- **`feat`**: A new user-facing feature or compaction mode (e.g. `feat(broccolidb): add genomic variant compactor`).
- **`fix`**: A bug fix (e.g. `fix(vault): prevent AAD tenant transplantation`).
- **`docs`**: Documentation only (e.g. `docs(maintainers): add git hooks guide`).
- **`perf`**: A code change that improves performance (e.g. `perf(high-velocity): optimize Aho-Corasick trie`).
- **`refactor`**: Code change that neither fixes a bug nor adds a feature (e.g. `refactor(router): extract stream pipeline`).
- **`test`**: Adding missing tests or correcting existing tests (e.g. `test(api): add 19-mode compaction test`).
- **`chore`**: Maintenance tasks, dependency bumps, or tooling setup (e.g. `chore(deps): bump typescript to 5.7`).

### Approved Subsystem Scopes:
`broccolidb`, `vault`, `auth`, `router`, `pool`, `circuit`, `edge`, `db`, `sdk`, `maintainers`, `playbooks`, `ui`.

---

## 2. Setting Up Local Git Hooks

To ensure commits meet the 5 Invariant Gates before pushing:

```bash
npm run hooks:install
```

This installs:
1. `.git/hooks/pre-commit`: Executes `npx tsc --noEmit` on every commit.
2. `.git/hooks/commit-msg`: Validates commit message regex against Conventional Commits.

---

## 3. Branching & PR Workflow

```text
1. git checkout -b feat/my-new-compactor
2. [Write code + test suites + ADR]
3. npm run onboard
4. git commit -m "feat(broccolidb): add DICOM compactor"
5. git push origin feat/my-new-compactor
6. [Open PR with .github/PULL_REQUEST_TEMPLATE.md checklist]
```

---

*Linear, clean, verifiable git history.* 🥦🪝🚀
