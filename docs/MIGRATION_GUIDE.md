# 🔄 Migration Guide: Moving to GALXAI

Step-by-step instructions for switching existing OpenAI, Anthropic, Azure, OpenRouter, and framework-based applications to **GALXAI**.

---

## 1. Zero-Code-Change Environment Variable Switch

If your application uses standard SDKs and environment variables, you can migrate instantly without editing application source code:

### Standard OpenAI Applications
```env
OPENAI_BASE_URL=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key_here
```

### Anthropic Claude Applications (Claude Code, Windsurf, Anthropic SDK)
```env
ANTHROPIC_BASE_URL=https://api.galx.ai
ANTHROPIC_API_KEY=galx_live_your_gateway_key_here
```

---

## 2. Model ID Mapping Table

| Previous Provider / Model | Recommended GALXAI Model ID | Key Advantages & Savings |
| :--- | :--- | :--- |
| `o1`, `o1-preview`, `o3-mini` | `gpt-5.6-sol` | 900K context, sub-15ms edge routing, **25% OFF** |
| `gpt-4o`, `gpt-4o-2024-11-20` | `gpt-5.6-terra` | 900K context, balanced cost and speed, **23% OFF** |
| `gpt-4o-mini` | `gpt-5.6-luna` | 900K context, ultra-low $0.11/1M input pricing, **27% OFF** |
| `claude-3-7-sonnet`, `claude-3-5-sonnet` | `claude-3-7-sonnet` | Native `/v1/messages` compatibility, streaming SSE |
| `grok-3`, `grok-2` | `x-ai/grok-4.6` | Massive 1M context, frontier multimodal reasoning, **30% OFF** |
| `grok-beta`, `grok-2` | `x-ai/grok-4.5` | Massive 500K context, native visual reasoning, **28% OFF** |
| `text-embedding-3-small` | `text-embedding-3-small` | 1536-dim, $<15\text{ms}$ Edge PoP computation |
| `dall-e-3` | `openai-dalle-3` / `openai-gpt-image-2` | Stored on Cloudflare R2 (`assets.galx.ai`) with **$0 egress** |

---

## 3. Framework Migration Recipes

### A. Vercel AI SDK (`@ai-sdk/openai`)
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

const galxai = createOpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY,
});

// Streaming completion with gpt-5.6-sol
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = await streamText({
    model: galxai('gpt-5.6-sol'),
    prompt,
  });
  return result.toDataStreamResponse();
}
```

---

### B. Python (OpenAI SDK)
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY")
)

stream = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Analyze quantum circuit optimization."}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

---

### C. Anthropic Python SDK
```python
import os
from anthropic import Anthropic

client = Anthropic(
    base_url="https://api.galx.ai",
    api_key=os.environ.get("GALXAI_API_KEY")
)

message = client.messages.create(
    model="claude-3-7-sonnet",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain zero-knowledge rollups."}]
)
print(message.content[0].text)
```

---

### D. LangChain (Python & TypeScript)
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    base_url="https://api.galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

response = llm.invoke("Summarize state-of-the-art retrieval algorithms.")
print(response.content)
```

---

### E. LlamaIndex (Python)
```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="gpt-5.6-sol",
    api_base="https://api.galx.ai/v1",
    api_key=os.environ["GALXAI_API_KEY"]
)

response = llm.complete("Explain vector embeddings indexing.")
print(response.text)
```

---

### F. Cursor IDE / Continue Dev Setup
1. Open **Cursor Settings > Models > OpenAI API Key**.
2. Set **Base URL** (Override): `https://api.galx.ai/v1`.
3. Set **API Key**: `galx_live_your_gateway_key_here`.
4. Add custom model names: `gpt-5.6-sol`, `gpt-5.6-terra`, `x-ai/grok-4.5`.

---

## 4. Why Migrate to GALXAI?

1. **Continuous Rate Limit Immunity**: No single-key 429 bottlenecks; traffic is cycled across pooled physical credentials with sub-15ms failover.
2. **Instant 20%–40% Cost Arbitrage**: Wholesale compute volume discounts passed directly to your account with 0% markups.
3. **100% Prompt Caching Pass-Through**: 75% prompt caching discounts credited directly to your prepaid compute wallet.
4. **Zero-Egress Multimodal Storage**: All generated images and media artifacts stream to Cloudflare R2 (`assets.galx.ai`) with $0 egress fees.
5. **Zero Data Retention (ZDR v10.0)**: Hardware-level memory zeroization (`0xAA` -> `0x00`) guaranteeing enterprise HIPAA and GDPR Safe Harbor compliance.
