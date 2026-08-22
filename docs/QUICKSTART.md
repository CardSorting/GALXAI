# 🚀 GALXAI Quickstart & IDE Setup Guide

Connect your AI tools, frameworks, and IDEs to GALXAI in under 60 seconds.

---

## 1. Get Your Gateway API Key

1. Navigate to the **Keys** tab at `http://localhost:3000/keys` (or `https://galx.ai/keys`).
2. Click **Create Key**.
3. Copy your key: `galx_live_...`.

---

## 2. Framework & SDK Integrations

### Python (OpenAI SDK)
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key=os.environ.get("GALXAI_API_KEY", "galx_live_your_key_here")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain quantum error correction."}]
)

print(response.choices[0].message.content)
```

### TypeScript / Node.js
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
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
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_key_here"
)

result = llm.invoke("Summarize the benefits of pooled quota cycling.")
print(result.content)
```

---

## 3. IDE Setup (Cursor, Continue, VSCode)

### Cursor IDE
1. Open **Cursor Settings** $\to$ **Models**.
2. Under **OpenAI API Key**, paste your `galx_live_...` key.
3. Check **Override OpenAI Base URL** and enter:
   ```text
   http://localhost:3000/v1
   ```
4. Add models: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `x-ai/grok-4.5`.

### Continue (VSCode / JetBrains)
In `~/.continue/config.json`:
```json
{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "http://localhost:3000/v1",
      "apiKey": "galx_live_your_key_here"
    },
    {
      "title": "GALXAI Grok 4.5",
      "provider": "openai",
      "model": "x-ai/grok-4.5",
      "apiBase": "http://localhost:3000/v1",
      "apiKey": "galx_live_your_key_here"
    }
  ]
}
```

---

## 4. Visual Synthesis Integration

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_key_here"
)

image = client.images.generate(
    model="openai-gpt-image-2",
    prompt="Futuristic Tokyo skyline at dusk with bioluminescent gardens",
    size="1024x1024",
    quality="hd"
)

print(image.data[0].url)
```
