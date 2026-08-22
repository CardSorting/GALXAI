# ❓ Frequently Asked Questions (FAQs)

---

### General & Architecture

#### 1. What is GALXAI?
GALXAI is a high-throughput universal AI model routing gateway. It unifies distributed API credentials into a pooled compute substrate, delivering continuous capacity, zero rate-limit drops, and substantial pricing discounts across 12 flagship reasoning and visual models.

#### 2. Do I need to manage multiple API keys for OpenAI and xAI?
No. You only need a single GALXAI Developer Gateway Key (`galx_live_...`). GALXAI handles all upstream credential sharding, rate limits, circuit governance, and failover transparently.

#### 3. Is GALXAI fully compatible with OpenAI SDKs?
Yes, 100%. GALXAI implements standard OpenAI REST APIs (`/v1/chat/completions`, `/v1/images/generations`, `/v1/models`). You simply change `baseURL` to point to GALXAI.

---

### Quota Cycling & Performance

#### 4. How does GALXAI prevent HTTP 429 rate limits?
GALXAI uses **2-Phase Atomic Token Reservation** combined with **Adaptive Hydraulic Headroom (P-AHT)**. When requests arrive, capacity is soft-locked across candidate shards with the highest continuous unreserved token capacity, preventing concurrent workers from overwhelming any single upstream credential.

#### 5. What happens if an upstream provider experiences an outage?
GALXAI's **4-State Circuit Breaker** immediately moves degraded credentials into `cooldown` with exponential jitter backoff, transparently retrying candidate shards in $< 15\text{ms}$.

---

### Security & Privacy

#### 6. Does GALXAI store or log my prompts?
No. GALXAI enforces a strict **Zero Content Retention Policy**. Prompts and streaming chunks pass through in-memory streams without ever touching persistent disk storage.

#### 7. How are credentials secured?
Credentials are encrypted using **AES-256-GCM** with **Additional Authenticated Data (AAD)** binding to prevent ciphertext transplantation attacks. Furthermore, plaintext memory buffers are zeroized (`zeroizeBuffer`) immediately upon request completion.

---

### Billing & Pricing

#### 8. How are discounts calculated?
GALXAI offers up to **28% discount** below standard list prices due to pooled volume efficiencies. Pricing is billed purely on actual tokens consumed without minimum monthly commits.
