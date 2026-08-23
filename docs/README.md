# 📚 GALXAI Documentation & Architecture Sitemap

Welcome to the comprehensive technical documentation and operational guides for **GALXAI**, the universal AI compute clearinghouse and zero-hesitation developer execution substrate.

---

## 🎯 Developer Guides & Integrations

- **[Quickstart Integration Guide](QUICKSTART.md)**: 30-second drop-in guides for Python, TypeScript, Cursor, Windsurf, Claude Code CLI, and cURL.
- **[Universal API Reference](API_REFERENCE.md)**: Complete REST API specifications for `/v1/chat/completions`, `/v1/messages`, `/v1/embeddings`, and `/v1/images/generations`.
- **[Flagship Model Catalog & Wholesale Rates](MODEL_CATALOG.md)**: Specifications, context windows, and wholesale pricing for GPT-5.6 Sol, Terra, Luna, and xAI Grok 4.6.
- **[Pricing, Rebates & Economic Arbitrage](PRICING_AND_DISCOUNT_STRATEGY.md)**: Detailed breakdown of the 4-pillar discount architecture (25%–40% wholesale discount, 75% prompt caching rebate).
- **[Multi-Ecosystem SDK Cheatsheet](SDK_CHEATSHEET.md)**: Drop-in code snippets for OpenAI, Anthropic, Vercel AI SDK, LangChain, and LlamaIndex.
- **[Universal Migration Guide](MIGRATION_GUIDE.md)**: Step-by-step zero-code-change migration instructions from raw OpenAI, Anthropic, or OpenRouter setups.
- **[Frequently Asked Questions (FAQs)](FAQS.md)**: Clear answers covering zero-hesitation ergonomics, prompt caching, billing, security, and uptime SLAs.

---

## 🏛️ System Architecture & Substrates

- **[System Architecture Specification](ARCHITECTURE.md)**: System topology, in-memory reactive BroccoliDB layer, ZDR v10.0 privacy, and circuit breaker FSM.
- **[Go-To-Market (GTM) Strategy](GTM_STRATEGY.md)**: Developer JTBD framework, market whitespace, and growth loops.
- **[Mathematical Routing Algorithms](ROUTING_ALGORITHMS.md)**: Mathematical derivations of Predictive Adaptive Headroom (P-AHT), Smooth Weighted Round-Robin (SWRR), and TASD swarm dispersion.
- **[Security Posture & Cryptographic Vault](SECURITY.md)**: AES-256-GCM envelope vault, HKDF key derivation, and authenticated tenant binding.
- **[Streaming & SSE Protocol Specification](STREAMING_AND_SSE_PROTOCOL.md)**: Sub-15ms TTFT streaming protocols, Keep-Alive ping intervals, and zero-copy buffers.
- **[Asynchronous Queues & CloudTasks](QUEUE_SPECIFICATION.md)**: Background queue architecture, token-bucket pacing, and DLQ topologies.
- **[Developer & Contributing Guide](DEVELOPER_GUIDE.md)**: Codebase organization, provider adapter design, and test suite conventions.
- **[Architecture Decision Records (ADRs)](adr/README.md)**: 42 formal specifications governing security, cryptographic vaults, and developer ergonomics.
- **[Operational SRE Playbooks](playbooks/README.md)**: 7 lifecycle runbooks for deployment, incident remediation, and secret rotation.

---

## 🧪 Verification & Audit

To verify all developer ergonomics, routes, and contracts across the platform:
```bash
npx tsx scripts/verify-zero-hesitation-ergonomics.ts
# 🏁 AUDIT RESULTS: 98 / 98 TESTS PASSED (100%)
```
