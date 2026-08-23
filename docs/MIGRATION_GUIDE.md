# 🔄 Migration Guide: Moving to GALXAI

Step-by-step instructions for switching existing OpenAI, Azure OpenAI, Anthropic, or OpenRouter applications to GALXAI.

---

## 1. Zero-Code-Change Environment Variable Switch

If your application reads standard OpenAI environment variables, you can migrate without modifying any application source code:

### Before (Direct OpenAI)
```env
OPENAI_API_KEY=sk-proj-original_openai_key
```

### After (GALXAI Universal Gateway)
```env
OPENAI_BASE_URL=http://localhost:3000/v1       # Or https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key_here
```

---

## 2. Model ID Mapping Table

| Previous Provider / Model | Recommended GALXAI Model ID | Key Upgrades |
| :--- | :--- | :--- |
| `o1`, `o1-preview`, `o3-mini` | `gpt-5.6-sol` | 900K context, faster TTFT, 25% lower pricing |
| `gpt-4o`, `gpt-4o-2024-11-20` | `gpt-5.6-terra` | 900K context, balanced cost and speed |
| `gpt-4o-mini` | `gpt-5.6-luna` | 900K context, ultra-low $0.11/1M input pricing |
| `grok-3`, `grok-2` | `x-ai/grok-4.6` | Massive 1M context, frontier multimodal reasoning |
| `grok-beta`, `grok-2` | `x-ai/grok-4.5` | Massive 500K context, native visual reasoning |
| `dall-e-3` | `openai-dalle-3` / `openai-gpt-image-2` | Multi-resolution, 25% discount |

---

## 3. SDK Migration Matrix

### Python SDK Migration
```diff
 from openai import OpenAI
 
 client = OpenAI(
-    api_key=os.environ["OPENAI_API_KEY"]
+    base_url="http://localhost:3000/v1",
+    api_key=os.environ["GALXAI_API_KEY"]
 )
```

### TypeScript / Node.js Migration
```diff
 import OpenAI from 'openai';
 
 const openai = new OpenAI({
-  apiKey: process.env.OPENAI_API_KEY,
+  baseURL: 'http://localhost:3000/v1',
+  apiKey: process.env.GALXAI_API_KEY,
 });
```

---

## 4. Why Migrate to GALXAI?

1. **Continuous Immunity to HTTP 429**: No single-key rate limit bottlenecks; traffic is automatically cycled across pooled credentials.
2. **Instant 20-28% Cost Reductions**: Pooled volume rates are passed directly to your account.
3. **Multi-Model Unification**: Access both OpenAI and xAI Grok flagship reasoning engines through a single API key and billing interface.
