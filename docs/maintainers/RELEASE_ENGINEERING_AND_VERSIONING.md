# 🚀 Maintainer Guide: Release Engineering, Versioning & Canary Rollout

> **Target Audience**: Release Engineers, Core Maintainers, and DevOps Leads.  
> **Standard**: Semantic Versioning 2.0.0 (SemVer) with Conventional Commits and automated canary gates.

---

## 1. Semantic Versioning Specification (SemVer)

GALXAI version numbers follow `MAJOR.MINOR.PATCH` (e.g. `0.1.0` $\to$ `0.2.0` $\to$ `1.0.0`):

| Level | Semantic Change | Examples in GALXAI |
| :--- | :--- | :--- |
| **`MAJOR`** (X.0.0) | **Breaking Architectural Changes** | • Changes to public REST API request/response schemas.<br>• Deprecation of JWE auth headers or vault cryptographic envelope tags.<br>• Removal of supported compaction modes. |
| **`MINOR`** (0.X.0) | **Backward-Compatible New Features** | • Addition of new enterprise domain compactors (e.g. `BroccoliDicomCompactor`).<br>• Introduction of new streaming modes (e.g. `arrow_dict_stream`).<br>• Support for new upstream model providers (`anthropic`, `gemini`).<br>• New interactive developer tools or programmatic SEO hubs. |
| **`PATCH`** (0.0.X) | **Backward-Compatible Bug & Perf Fixes** | • Regex optimizations in domain compactors.<br>• Fixes to P-AHT floating-point rounding precision.<br>• Updates to documentation and ADR clarifications.<br>• Dependency patch upgrades. |

---

## 2. Release Channels & Branch Topology

```text
┌──────────────┐     Automated Smoke Pass      ┌──────────────┐     Canary Stability (24h)     ┌──────────────┐
│  main branch │ ────────────────────────────► │   canary     │ ─────────────────────────────► │    latest    │
│ (Active Dev) │                               │ (@galxai/sdk)│                                │ (Production) │
└──────────────┘                               └──────────────┘                                └──────────────┘
```

1. **`main`**: The single trunk where all PRs merge following the 5-Gate Checklist.
2. **`canary`**: Automatically published on every merge to `main` for internal dogfooding and automated integration tests.
3. **`latest`**: Stable production release tagged after 24 hours of zero-regression canary traffic.

---

## 3. Pre-Release Verification Protocol

Before tagging a production release, the release maintainer MUST execute the full pre-flight verification pipeline:

```bash
# Step 1: Workstation Environment & Crypto Verification
npm run onboard

# Step 2: Empirical Inference Boundary Benchmarks (All 3 Models)
npm run bench:inference-boundary

# Step 3: Compaction Facade REST API Suite (19 modes, 7/7 suites)
npm run test:broccolidb:api

# Step 4: Hardening & Fail-Closed Safety Regressions
npm run test:broccolidb:hardening

# Step 5: Master 180-Domain Compactor Cluster Suite
npm run bench:180-domains

# Step 6: Universal Router & Ingestion Suite (218 Tests)
npm run test:router

# Step 7: Cloudflare Edge Mesh 46-Point Test Suite
npm run worker:test

# Step 8: Strict TypeScript Typecheck
npx tsc --noEmit
```

---

## 4. Tagging & Publishing a Release

```bash
# 1. Bump version in package.json and create annotated git tag
npm version minor -m "chore(release): bump version to %s"

# 2. Push commit and tag to origin
git push origin main --follow-tags

# 3. Deploy Cloudflare Edge Mesh to Production
npm run worker:deploy

# 4. Trigger Vercel Production Deployment
vercel --prod
```

---

## 5. Emergency Hotfix & Rollback Procedure

If a critical Sev-1 regression is detected in production:

1. **Instant Edge Traffic Rollback**:
   Re-deploy the previous known-good Cloudflare Worker release tag:
   ```bash
   wrangler rollback [PREVIOUS_DEPLOYMENT_ID]
   ```
2. **Vercel Instant Rollback**:
   In the Vercel Dashboard, promote the previous green deployment to Production instantly.
3. **Author Hotfix PR**:
   Branch from the release tag, author the patch with regression tests, pass all 5 gates, and cut a patch release (`v0.1.1`).

---

*Maintain unwavering release confidence.* 🥦🚀🛡️
