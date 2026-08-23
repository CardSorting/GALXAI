# ❓ Frequently Asked Questions (FAQs)

---

### General & Architecture

#### 1. What is GALXAI?
GALXAI is an enterprise-grade Universal AI Gateway providing high-throughput, low-latency access to frontier reasoning and visual models (OpenAI GPT-5.6 Sol, Terra, Luna and xAI Grok 4.6/4.5) at **25% to 40% below direct retail prices**. It acts as a 1-line drop-in replacement for the official OpenAI and Anthropic SDKs.

#### 2. Do I need to manage multiple provider accounts or SDKs?
No. You only need a single GALXAI Developer Gateway Key (`galx_live_...`). GALXAI provides unified access to all 12 reasoning and visual models across OpenAI and xAI without needing separate accounts, subscriptions, or disparate billing systems.

#### 3. Is GALXAI 100% compatible with OpenAI and Anthropic SDKs?
Yes, completely. GALXAI natively implements standard OpenAI REST APIs (`/v1/chat/completions`, `/v1/embeddings`, `/v1/images/generations`, `/v1/models`) and Anthropic Claude APIs (`/v1/messages`). Simply update your base URL to `https://api.galx.ai/v1` or `https://api.galx.ai`.

#### 4. Does GALXAI support Vector Embeddings at the Edge?
Yes. GALXAI provides native `/v1/embeddings` calculated directly across 300+ Cloudflare Edge PoPs (<15ms latency) returning 1536-dimensional or 3072-dimensional embedding vectors with standard OpenAI SDK parity or via the `@galxai/sdk`.

#### 5. How does $0 Multimodal Egress work with Cloudflare R2?
Generated images (`openai-gpt-image-2`, `openai-dalle-3`) and audio artifacts are streamed directly to Cloudflare R2 object storage and served over the global Anycast CDN custom domain `assets.galx.ai`. Developers pay **$0 egress fees** regardless of download bandwidth or global traffic volumes.

---

### Deployment & Infrastructure

#### 6. How is GALXAI deployed in production?
GALXAI utilizes a dual-engine architecture:
- **Vercel**: Next.js 15 App Router web platform, dashboard, and Serverless API routes (multi-region in `sfo1` and `iad1`).
- **Cloudflare Workers**: Zero-egress global edge gateway (`api.galx.ai`) and R2 media CDN (`assets.galx.ai`).
- **Supabase**: Authoritative PostgreSQL database with Transaction Pooling (Port 6543) and AES-256-GCM Credential Vault.

#### 7. How do I run the automated pre-deployment verification gate?
Run `npm run deploy:check`. This executes the **8-Phase Pre-Flight Audit Engine**, validates all cryptographic HKDF keys, verifies live Supabase HTTPS reachability, runs ESLint and TypeScript checks, and builds the production Next.js bundle across all 117 pages.

#### 8. How do I test a live Vercel deployment?
Run `npm run vercel:smoke -- --url=https://galx.ai` to execute automated live HTTP/HTTPS smoke tests validating health telemetry, HTML prerendering, Edge OG images, robots.txt, and security headers.

---

### Pricing & Compute Wallet

#### 9. How does GALXAI offer 25%–40% discounts compared to direct retail?
Through large-scale enterprise compute commitments and intelligent low-latency routing, GALXAI secures wholesale capacity and passes direct wholesale rates to developers with **0% markup**.

#### 10. How does the 75% Prompt Caching Rebate work?
For prompts containing system instructions or context prefixes exceeding 1,024 tokens, cached input tokens automatically receive a **75% discount**. GALXAI passes 100% of this rebate directly to your wallet.

#### 11. How does developer billing work?
GALXAI operates a prepaid pay-as-you-go compute wallet. Every new account receives an initial **$5.00 introductory compute credit**. Deductions are micro-metered in real-time per token. Developers can also enable automated reload protection to guarantee zero downtime for production agent workloads.

---

### Security, Privacy & Compliance

#### 12. Does GALXAI store or log prompts?
No. GALXAI enforces a strict **Zero Content Retention Policy (ZDR v10.0)**. Prompts and streaming chunks are processed purely in ephemeral memory buffers with 2-pass cryptographic overwrite (`0xAA` -> `0x00`) and are never logged to disk, retained in databases, or used for model training.

#### 13. What is GALXAI's uptime SLA?
GALXAI provides a **99.99% Enterprise Uptime SLA** backed by sub-15ms automated failover, 4-state circuit breakers, and 300+ edge Points of Presence, protecting agent fleets and production applications from upstream vendor hiccups and unexpected rate limits.

#### 14. How are BYOQ (Bring Your Own Quota) API credentials protected?
BYOQ credentials are encrypted using **AES-256-GCM Envelope Encryption** with Additional Authenticated Data (AAD) cryptographically binding each ciphertext to its specific `tenantId` and `shardId`. Master keys are derived using **HKDF-SHA256** with unique tenant salts.
