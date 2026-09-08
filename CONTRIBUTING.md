# 🤝 Contributing to GALXAI

> Current relay authority: [federation contract](docs/FEDERATION_STRATEGY.md), [runbook](docs/RELAY_VNEXT_RUNBOOK.md), and [ADR catalog](docs/adr/README.md). One active shard owns one worker; model capability precedes load; retries preserve execution authority. Use [parent/subagent guidance](docs/maintainers/AI_AGENT_PAIR_PROGRAMMING_AND_GOVERNANCE.md) and `python3 scripts/verify-docs.py` for documentation changes. Older subsystem targets below are not federation SLAs.

Thank you for your interest in contributing to GALXAI! We welcome contributions from developers, researchers, and distributed systems engineers worldwide.

This guide outlines our development workflow, pull request expectations, coding standards, and testing conventions.

---

## 📑 Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [Development Environment Setup](#2-development-environment-setup)
3. [Subsystem Architecture & Guidelines](#3-subsystem-architecture--guidelines)
4. [Pull Request & Contribution Workflow](#4-pull-request--contribution-workflow)
5. [Commit Message Conventions](#5-commit-message-conventions)
6. [Architecture Decision Records (ADRs)](#6-architecture-decision-records-adrs)
7. [Testing & Quality Verification](#7-testing--quality-verification)

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. We expect all contributors and maintainers to adhere to standard professional open-source standards.

---

## 2. Development Environment Setup

### Prerequisites
- **Node.js**: `v20.0.0` or higher (LTS recommended)
- **npm**: `v10.0.0` or higher (or `pnpm`)
- **Git**: `v2.40+`

### Quickstart
```bash
# 1. Clone the repository
git clone https://github.com/CardSorting/GALXAI.git
cd GALXAI

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 3. Subsystem Architecture & Guidelines

### Layer 1: Core Substrate (`src/core/`)
- **Pure TypeScript**: Zero React, zero DOM, and zero browser-specific APIs.
- **Zero GC in Hot Paths**: Avoid allocating temporary arrays or objects inside token/byte streaming loops.
- **Fail-Closed Safety**: Any representation transformation must be guarded by `BroccoliCompactionSafety`.

### Layer 2: API & Gateway Layer (`src/app/api/` & `src/app/v1/`)
- **OpenAI & Anthropic Compatibility**: All public endpoints must conform to standard provider schemas (`RFC 8895` SSE streaming).
- **Sub-15ms Wire Latency**: Use zero-copy binary streaming and unbuffered headers (`X-Accel-Buffering: no`).

### Layer 3: Developer SDK & Integrations (`src/sdk/`)
- **Downstream Ownership**: SDK primitives, server actions, and middleware help developers build their own applications while keeping provider credentials server-side.
- **No Destination Client**: Do not add a GALXAI-hosted chat, persona, sharing, image-studio, or generated-content library through the SDK or web application.

### Layer 4: Web Control Plane (`src/app/` & `src/components/`)
- **Model-First Activation**: Successful authentication defaults to `/models`; model selection should lead to specifications, credentials, or integration guidance.
- **Platform Scope**: Hosted UI is limited to discovery, configuration, billing, telemetry, routing, governance, documentation, and bounded API diagnostics.
- **Decision Test**: Apply [Product Surface Strategy](docs/PRODUCT_SURFACE_STRATEGY.md) before proposing a web feature.

---

## 4. Pull Request & Contribution Workflow

1. **Fork & Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or: git checkout -b fix/your-bugfix
   ```

2. **Develop & Test Locally**:
   Ensure all tests and strict typechecking pass:
   ```bash
   npm run test:broccolidb:api
   npm run test:broccolidb:hardening
   npm run bench:inference-boundary
   npx tsc --noEmit
   ```

3. **Open a Pull Request**:
   - Title your PR using [Conventional Commits](#5-commit-message-conventions).
   - Describe the problem solved, architectural implications, and verification commands executed.
   - Link any related issues or ADRs.
   - For web-product changes, state how the proposal passes the Product Surface Strategy decision test.

---

## 5. Commit Message Conventions

We follow the [Conventional Commits specification](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Common Types:
- `feat`: A new feature or compactor mode.
- `fix`: A bug fix or regression patch.
- `docs`: Documentation updates.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves execution speed or memory efficiency.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Build process or tooling changes.

### Examples:
```text
feat(broccolidb): add DICOM medical imaging stream compactor
fix(router): resolve P-AHT race condition during parallel bursts
docs(playbooks): add Stage 8 unframed observation protocol
```

---

## 6. Architecture Decision Records (ADRs)

If your contribution introduces a new architectural subsystem, alters public API contracts, changes routing/compaction invariants, or revisits the hosted-product boundary, **you must author an Architecture Decision Record (ADR)** in `docs/adr/`. A proposal for conversation history, creative projects, sharing, or client-only persistence must explicitly revisit ADR 0119.

Follow the template in [`docs/adr/README.md`](docs/adr/README.md).

---

## 7. Testing & Quality Verification

Every PR must pass the authoritative verification suite:

```bash
# 1. Complete Pre-Deployment Quality Pipeline
npm run deploy:check

# 2. Empirical Boundary Benchmark (OpenAI Models)
npm run bench:inference-boundary

# 3. Compaction Gateway & Facade API Suite
npm run test:broccolidb:api

# 4. Production Hardening & Safety Regressions
npm run test:broccolidb:hardening

# 5. Master 180-Domain Compactor Cluster Suite
node --import tsx scripts/test-broccolidb-150-domain-suite.ts

# 6. Strict TypeScript Typecheck
npx tsc --noEmit
```

---

*For maintainer governance and emergency runbooks, see [MAINTAINERS.md](MAINTAINERS.md).* 🥦🚀
