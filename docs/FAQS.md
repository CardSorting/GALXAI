# ❓ Frequently Asked Questions (FAQs)

---

### General & Architecture

#### 1. What is GALXAI?
GALXAI is an enterprise-grade Universal AI Gateway providing high-throughput, low-latency access to frontier models (OpenAI GPT-5.6 Sol, Terra, Luna and xAI Grok 4.5) at **25% to 40% below direct retail prices**. It acts as a 1-line drop-in replacement for the official OpenAI SDK.

#### 2. Do I need to manage multiple provider accounts or SDKs?
No. You only need a single GALXAI Developer Gateway Key (`galx_live_...`). GALXAI provides unified access to all 12 reasoning and visual models across OpenAI and xAI without needing separate accounts or disparate billing systems.

#### 3. Is GALXAI 100% compatible with OpenAI SDKs?
Yes, completely. GALXAI natively implements standard OpenAI REST APIs (`/v1/chat/completions`, `/v1/images/generations`, `/v1/models`) and Server-Sent Events (SSE) streaming. Simply update `baseURL="https://api.galxai.com/v1"`.

---

### Pricing & Compute Wallet

#### 4. How does GALXAI offer 25%–40% discounts compared to direct retail?
Through large-scale enterprise compute commitments and intelligent low-latency routing, GALXAI secures wholesale capacity and passes direct wholesale rates to developers with **0% markup**.

#### 5. How does the 75% Prompt Caching Rebate work?
For prompts containing system instructions or context prefixes exceeding 1,024 tokens, cached input tokens automatically receive a **75% discount**. GALXAI passes 100% of this rebate directly to your wallet.

#### 6. How does developer billing work?
GALXAI operates a pay-as-you-go developer compute wallet. Every new account receives a **$5.00 free compute credit**. Deductions are micro-metered in real-time per token. Developers can also enable automated reload protection to guarantee zero downtime for production workloads.

---

### Security, Privacy & Reliability

#### 7. Does GALXAI store or log prompts?
No. GALXAI enforces a strict **Zero Content Retention Policy**. Prompts and streaming chunks are processed purely in ephemeral memory buffers and are never logged to disk, retained in databases, or used for model training.

#### 8. What is GALXAI's uptime SLA?
GALXAI provides a **99.99% Enterprise Uptime SLA** backed by sub-15ms automated failover, protecting agent fleets and production applications from upstream vendor hiccups and unexpected rate limits.
