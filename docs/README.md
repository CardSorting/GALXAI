# 📚 GALXAI Documentation & Architecture Sitemap

Welcome to the comprehensive technical documentation and operational guides for **GALXAI**, the universal AI compute clearinghouse and zero-hesitation developer execution substrate.

---

## 🏛️ Institutional Investor & Venture Diligence Data Room

- **[Investor Data Room & Investment Memo Index](investors/README.md)**: Institutional diligence room for venture partners, angels, and financial auditors.
  - **[01. Executive Summary & Investment Memo](investors/01_EXECUTIVE_SUMMARY_AND_MEMO.md)**: 1-pager covering company thesis, traction, financial highlights, and round terms.
  - **[02. Pitch Deck Slide-by-Slide Specification](investors/02_PITCH_DECK_SLIDE_BY_SLIDE.md)**: 12-slide institutional pitch deck narrative.
  - **[03. Market Sizing: TAM, SAM & SOM Analysis](investors/03_MARKET_SIZING_TAM_SAM_SOM.md)**: Econometric top-down ($1.3T TAM) and bottom-up ($1.31B SOM) sizing.
  - **[04. Unit Economics: CAC, LTV, Margins & Payback](investors/04_UNIT_ECONOMICS_CAC_LTV_PAYBACK.md)**: Blended CAC ($185), LTV ($5,350), Gross Margins (42% $\to$ 68%), and 138% NDR.
  - **[05. Competitive Landscape & Strategic Moats](investors/05_COMPETITIVE_LANDSCAPE_AND_MOATS.md)**: 2x2 positioning matrix, feature teardown, and 4 defensible moats.
  - **[06. 5-Year Financial Projections & Operating Model](investors/06_FINANCIAL_PROJECTIONS_AND_MODEL.md)**: 5-year P&L forecast ($1.2M $\to$ $85M ARR) and headcount ramp.
  - **[07. Technical Due Diligence & Architecture Proof](investors/07_TECHNICAL_DILIGENCE_AND_PATENTS.md)**: Architecture audit FAQs for Partner CTOs, sub-15ms wire proof, and ZDR privacy.

---

## 🎯 Developer Guides & Integrations

- **[Quickstart Integration Guide](QUICKSTART.md)**: 30-second drop-in guides for Python, TypeScript, Cursor, Windsurf, Claude Code CLI, and cURL.
- **[Universal API Reference](API_REFERENCE.md)**: Complete REST API specifications for `/v1/chat/completions`, `/v1/messages`, `/v1/embeddings`, `/api/auth/ingest`, and `/api/ingest`.
- **[Standardized OAuth & Ingestion Architecture](STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md)**: Detailed specification of two-tier identity isolation, Supabase SSR callback, and RFC 9530 transport security.
- **[Flagship Model Catalog & Wholesale Rates](MODEL_CATALOG.md)**: Specifications, context windows, and wholesale pricing for GPT-5.6 Sol, Terra, Luna, and xAI Grok 4.6.
- **[Pricing, Rebates & Economic Arbitrage](PRICING_AND_DISCOUNT_STRATEGY.md)**: Detailed breakdown of the 4-pillar discount architecture (25%–40% wholesale discount, 75% prompt caching rebate).
- **[Multi-Ecosystem SDK Cheatsheet](SDK_CHEATSHEET.md)**: Drop-in code snippets for OpenAI, Anthropic, Vercel AI SDK, LangChain, and LlamaIndex.
- **[Universal Migration Guide](MIGRATION_GUIDE.md)**: Step-by-step zero-code-change migration instructions from raw OpenAI, Anthropic, or OpenRouter setups.
- **[Frequently Asked Questions (FAQs)](FAQS.md)**: Clear answers covering zero-hesitation ergonomics, prompt caching, billing, security, and uptime SLAs.

---

## 🏛️ System Architecture & Substrates

- **[System Architecture Specification](ARCHITECTURE.md)**: System topology, two-tier siloed identity, in-memory reactive BroccoliDB layer, ZDR v10.0 privacy, and circuit breaker FSM.
- **[Security Posture & Cryptographic Vault](SECURITY.md)**: AES-256-GCM envelope vault, HKDF key derivation, RFC 9530 constant-time digests, and anti-replay nonces.
- **[Enterprise OAuth 2.0 / 2.1 & Token Lifecycle](OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md)**: RFC 6819 Refresh Token Rotation (RTR), Token Family Theft Containment, DPoP, and OIDC Back-Channel Logout.
- **[Provider-as-Auth Technical Specification](PROVIDER_AS_AUTH_SPECIFICATION.md)**: Backend credential vaulting, Substrate tenant sharding, and upstream provider identity roots.
- **[Natural Navigation & OmniSearch](NATURAL_NAVIGATION_AND_OMNISEARCH.md)**: BroccoliOmniSearch natural language routing, phonetic tolerance, and self-healing breadcrumbs.
- **[Cloudflare Strategy & Edge Gateway](CLOUDFLARE_STRATEGY.md)**: Zero-egress Cloudflare Workers edge mesh, R2 CDN media acceleration, and custom domains.
- **[Go-To-Market (GTM) Strategy](GTM_STRATEGY.md)**: Developer JTBD framework, market whitespace, and growth loops.
- **[Mathematical Routing Algorithms](ROUTING_ALGORITHMS.md)**: Mathematical derivations of Predictive Adaptive Headroom (P-AHT), Smooth Weighted Round-Robin (SWRR), and TASD swarm dispersion.
- **[Streaming & SSE Protocol Specification](STREAMING_AND_SSE_PROTOCOL.md)**: Sub-15ms TTFT streaming protocols, Keep-Alive ping intervals, and zero-copy buffers.
- **[Asynchronous Queues & CloudTasks](QUEUE_SPECIFICATION.md)**: Background queue architecture, token-bucket pacing, and DLQ topologies.
- **[Developer & Contributing Guide](DEVELOPER_GUIDE.md)**: Codebase organization, provider adapter design, and test suite conventions.
- **[Architecture Decision Records (ADRs)](adr/README.md)**: 54 formal architectural specifications governing security, transport hardening, pSEO/AEO saturation, and SLA failovers.
- **[Operational SRE Playbooks](playbooks/README.md)**: 7 lifecycle runbooks for deployment, incident remediation, and secret rotation.
- **[Production Infrastructure & Deployment Guide](DEPLOYMENT.md)**: Multi-target deployment topology across Vercel, Cloudflare Edge, Docker, and Kubernetes.
- **[Vercel Production Deployment & Hardening Guide](VERCEL_DEPLOYMENT.md)**: Complete guide for Next.js 15 deployment on Vercel, 8-phase pre-flight verification, environment sync, and 12-point automated live smoke testing.
- **[Programmatic SEO (pSEO), AEO & GEO Strategy](PSEO_AND_AEO_STRATEGY.md)**: Comprehensive architectural strategy covering 13 interactive developer tools, 14 programmatic content hubs, Schema.org `@graph` ontology, and machine-readable `llms.txt` standards.
- **[Interactive Developer Tools Suite](../src/app/tools)**: Suite of 13 interactive browser tools including Enterprise LLM ROI & Token Budget Calculator, AI Token Streaming & Speed Benchmark Simulator, 1M Context Window Visualizer, Prompt Caching Estimator, BPE Token Counter, and Model Cost Comparator.
- **[AEO Engineering Glossary Hub](../src/app/glossary)**: 14 dedicated programmatic glossary term portals (`/glossary/[slug]`) with Schema.org `DefinedTermSet` and Wikidata entity mapping.
- **[Incident Postmortems Hub](../src/app/postmortems)**: Verifiable real-world incident postmortems, root cause analyses, and multi-origin failover architectures.

---

## 🧪 Verification & Audit

Run the automated test suites to verify platform resilience, security, and developer ergonomics:

```bash
# 1. Universal Router, Privacy, SOC2, BroccoliDB, Ingestion Transport & API Strategy Suite (217 tests)
npm run test:router

# 2. Universal Zero-Hesitation Ergonomics & Mental Model Suite (98 tests)
npx tsx scripts/verify-zero-hesitation-ergonomics.ts

# 3. 8-Phase Enterprise Vercel Pre-Flight Readiness Engine
npm run vercel:verify
```
