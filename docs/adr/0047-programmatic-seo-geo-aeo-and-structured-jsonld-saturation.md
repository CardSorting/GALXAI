# ADR 0047: Programmatic SEO (pSEO), Generative Engine Optimization (GEO), Answer Engine Optimization (AEO) & Structured JSON-LD Saturation

<!-- docs-scope: decision-record -->
> **Reading scope:** Decision history with topic-specific precedence. Original status and measurements are dated; consult the current contract before operating the relay. See the [current contract](../FEDERATION_STRATEGY.md) and [complete catalog](../CATALOG.md).

> Decision scope: Historical decision record. Its original status and measurements describe its own scope. For current relay ownership, capability routing, retry authority, and deployment, ADRs [0126](0126-capability-aware-shard-relay-federation.md) and [0127](0127-codex-image-tool-alias-production-cutover.md) take precedence. Shared-relay selection, implicit model fallback, and simulation performance do not define the current federation. Unrelated subsystem decisions are not superseded by this note.

## Status
**Accepted** (2026-08-23)

## Context
As search behaviors shift from traditional 10-blue-links keyword queries toward Answer Engines (Perplexity, SearchGPT, Google AI Overviews, Claude Search), developer platforms require a unified programmatic publishing architecture. Traditional static documentation suffers from:
1. **Shallow Entity Grounding**: Generic metadata fails to establish semantic relationships across Wikidata entities, model IDs, latency benchmarks, and pricing matrices.
2. **Slow Citation Ingestion**: LLM crawlers (GPTBot, PerplexityBot, ClaudeBot) parse unstructured text inefficiently, missing pricing discounts and SDK compatibility flags.
3. **Keyword Fragmentation**: Fragmented developer search queries across comparisons, framework integrations, error code troubleshooting, SDK languages, and cloud migrations require hundreds of distinct, high-intent landing pages.
4. **Hydration Overhead**: Dynamic client rendering on search landing pages damages Core Web Vitals and increases First Contentful Paint (FCP).

---

## Decision

We implement a comprehensive Programmatic SEO, GEO, and AEO publishing substrate covering **235 statically pre-rendered routes** (`generateStaticParams`) with zero runtime server overhead:

```
+----------------------------------------------------------------------------------------------------+
|                                    GALXAI pSEO & AEO ARCHITECTURE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  1. INVERTED PYRAMID ANSWER ENGINE ARCHITECTURE                                                    |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|     | Lead Direct Answer Block  |   | Quantitative Rate Matrix  |   | 1-Click Code Runbook      |  |
|     | LLM Citation Extraction   |   | TTFT, Tok/s, Pricing      |   | Python, TS, cURL Snippets |  |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|                                                                                                    |
|  2. SATURATED SCHEMA.ORG JSON-LD GRAPH                                                             |
|     +---------------------------------------------------------------------------------------+      |
|     | TechArticle • WebApplication • SoftwareSourceCode • HowTo • FAQPage • BreadcrumbList  |      |
|     | Dataset • FinancialProduct • DefinedTermSet • Organization                            |      |
|     +---------------------------------------------------------------------------------------+      |
|                                                                                                    |
|  3. MACHINE DISCOVERY & REPUTATION SUBSTRATES                                                      |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
|     | llms.txt & llms-full.txt  |   | /api/openapi.json (v3.1)  |   | /api/seo/rates Feed       |  |
|     | LLM Scraper Manifests     |   | AI Agent Tool Registry    |   | Live JSON Rates for GEO   |  |
|     +---------------------------+   +---------------------------+   +---------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### 1. Inverted Pyramid Content Structure
- Every page begins with a bold, concise **Executive Answer Block** containing direct answers to target developer queries.
- Answer blocks provide immediate citations for Perplexity, SearchGPT, and Google AI Overviews.
- Followed by detailed architectural deep dives, comparison matrices, and syntax-highlighted code runbooks.

### 2. Multi-Layered Schema.org Graph Integration
Every programmatic route injects a comprehensive, validated Schema.org `@graph`:
- `TechArticle`: Technical documentation with author, publisher, datePublished, and keyword tags.
- `WebApplication`: Interactive developer calculators and studio tools with free pricing offers.
- `SoftwareSourceCode`: Multi-language code snippets with programmingLanguage and codeSample properties.
- `HowTo`: Step-by-step setup guides with duration and instruction steps.
- `FAQPage`: Structured question-and-answer pairs matching user search intent.
- `BreadcrumbList`: Complete hierarchical breadcrumb trail for navigation and rich snippets.

### 3. Machine Discovery Standards
- `public/llms.txt` and `public/llms-full.txt`: Standardized AI markdown files detailing model catalogs, pricing, and SDK usage.
- `public/.well-known/ai-plugin.json`: Direct OpenAI ChatGPT tool plugin manifest.
- `public/.well-known/security.txt`: RFC 9116 cybersecurity disclosure standard establishing domain E-E-A-T.
- `/api/openapi.json`: OpenAPI 3.1 schema for automated agent ingestion.
- `/api/seo/rates`: Machine-readable JSON live pricing feed.

---

## Consequences

### Positive
- **100% Static Pre-Rendering**: All 235 routes pre-render at build time (`npm run build`), delivering sub-20ms TTFB via Edge CDNs.
- **Apex Citation Authority**: Grounded JSON-LD schemas and inverted pyramid answers ensure maximum citation probability in AI search engines.
- **Zero Server Latency**: Search crawlers hit pure static HTML without triggering backend database queries or Lambda cold starts.

### Neutral
- Build times scale linearly with route volume (235 routes compile in ~30 seconds on standard CI/CD runners).
- Dataset changes in `src/lib/data/*.ts` require a production build to reflect across all static pages.
