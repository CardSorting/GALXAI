# 🚀 GALXAI Quickstart & Integration Guide

Connect your AI tools, frameworks, agents, and IDEs to GALXAI in under 60 seconds with **25%–40% wholesale compute discounts** and **75% prompt cache pass-through**.

---

## 1. Get Your Gateway API Key

1. **Sign In or Connect Account**: Visit `/auth/connect` or navigate to `/checkout?amount=25` to activate your account.
2. **Mint Gateway Key**: Head to the **Keys** tab at `/keys/new` or grab your instant key on `/checkout/success`.
3. **Copy Key**: Format `galx_live_...`.

---

## 2. Ultra-Flat Zero-Dependency SDK (TypeScript & Node.js)

```typescript
import { galx } from '@galxai/sdk';

// 1. Tagged Template Literal Direct Execution
const answer = await galx`Explain the Raft consensus algorithm concisely.`;
console.log(answer);

// 2. Direct Model Run with 75% Prompt Cache Rebate
const res = await galx.run({
  model: 'gpt-5.6-sol',
  prompt: 'Write an asynchronous worker queue in TypeScript.'
});
console.log(res.text);

// 3. Asynchronous Background Task Dispatch
const handle = await galx.jobs.submit({
  model: 'gpt-5.6-sol',
  prompt: 'Conduct a comprehensive code review of the repository.'
});
const result = await handle.result();
console.log(result.text);
```

---

## 3. Standard OpenAI Client SDK Integrations

### Python (OpenAI SDK)
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY", "galx_live_your_key_here")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain quantum error correction."}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### TypeScript / OpenAI SDK
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY,
});

async function main() {
  const stream = await client.chat.completions.create({
    model: 'x-ai/grok-4.5',
    messages: [{ role: 'user', content: 'Stream a technical summary of Raft consensus.' }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
```

### LangChain (Python)
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_key_here"
)

result = llm.invoke("Summarize the benefits of pooled quota cycling.")
print(result.content)
```

---

## 4. IDE Setup (Cursor, Continue, VSCode)

### Cursor IDE
1. Open **Cursor Settings** $\to$ **Models**.
2. Under **OpenAI API Key**, paste your `galx_live_...` key.
3. Check **Override OpenAI Base URL** and enter:
   ```text
   https://api.galx.ai/v1
   ```
4. Add models: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `x-ai/grok-4.6`, `x-ai/grok-4.5`.

### Continue (VSCode / JetBrains)
In `~/.continue/config.json`:
```json
{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://api.galx.ai/v1",
      "apiKey": "galx_live_your_key_here"
    },
    {
      "title": "GALXAI Grok 4.6",
      "provider": "openai",
      "model": "x-ai/grok-4.6",
      "apiBase": "https://api.galx.ai/v1",
      "apiKey": "galx_live_your_key_here"
    }
  ]
}
```

---

## 5. Vector Embeddings (Edge PoP $<15\text{ms}$)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_key_here"
)

embedding = client.embeddings.create(
    model="text-embedding-3-small",
    input="Autonomous agent fleet coordination and consensus"
)

print(f"Vector dimensions: {len(embedding.data[0].embedding)}")
```

---

## 6. Visual Synthesis & Multimodal CDN Integration ($0 Egress)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_key_here"
)

image = client.images.generate(
    model="openai-gpt-image-2",
    prompt="Futuristic Tokyo skyline at dusk with bioluminescent gardens",
    size="1024x1024",
    quality="hd"
)

# Assets are stored in Cloudflare R2 and served via https://assets.galx.ai ($0 egress)
print(image.data[0].url)
```
