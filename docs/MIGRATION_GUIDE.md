# 🔄 Universal Migration Guide: Seamless Transition to GALXAI

Step-by-step instructions for switching existing OpenAI, Anthropic, Ollama, LangChain, LlamaIndex, Vercel AI SDK, LiteLLM, and OpenRouter applications to **GALXAI** with **zero code refactoring**, **25%–40% wholesale savings**, and **75% prompt cache rebates**.

---

## ⚡ 1. The Zero-Code-Change Environment Variable Migration

If your application reads standard environment variables, you can migrate instantly without changing a single line of code:

### OpenAI SDK Applications (Node.js & Python)
```env
OPENAI_BASE_URL=https://galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key_here
```

### Anthropic SDK & Claude Code CLI
```env
ANTHROPIC_BASE_URL=https://galx.ai
ANTHROPIC_API_KEY=galx_live_your_gateway_key_here
```

### Ollama CLI, OpenWebUI & Continue.dev
```env
OLLAMA_HOST=https://galx.ai
OLLAMA_API_KEY=galx_live_your_gateway_key_here
```

### LiteLLM Proxy / Python SDK
```env
OPENAI_API_BASE=https://galx.ai/v1
OPENAI_API_KEY=galx_live_your_gateway_key_here
```

---

## 📦 2. 1-Line Import Swaps (TypeScript & Node.js)

If you prefer using dedicated client shims, simply swap the import statement:

### OpenAI Node.js Migration
```diff
- import OpenAI from "openai";
+ import OpenAI from "@galxai/sdk/openai";

const openai = new OpenAI(); // Automatically routes to https://galx.ai/v1
```

### Anthropic SDK Migration
```diff
- import Anthropic from "@anthropic-ai/sdk";
+ import Anthropic from "@galxai/sdk/anthropic";

const anthropic = new Anthropic(); // Automatically routes to https://galx.ai
```

### Vercel AI SDK Migration
```diff
- import { createOpenAI } from "@ai-sdk/openai";
- const openai = createOpenAI({ baseURL: "https://..." });
+ import { galxai } from "@galxai/sdk/ai";

const result = streamText({
- model: openai("gpt-4o"),
+ model: galxai("gpt-5.6-sol"),
  messages,
});
```

### LangChain Migration
```diff
- import { ChatOpenAI } from "@langchain/openai";
- const llm = new ChatOpenAI({ openAIApiKey: "...", configuration: { baseURL: "..." } });
+ import { ChatGalxAI } from "@galxai/sdk/langchain";
+ const llm = new ChatGalxAI({ model: "gpt-5.6-sol" });
```

### LlamaIndex Migration
```diff
- import { OpenAI } from "llamaindex";
- const llm = new OpenAI({ apiKey: "..." });
+ import { GalxLLM } from "@galxai/sdk/llamaindex";
+ const llm = new GalxLLM({ model: "gpt-5.6-sol" });
```

---

## 🗺️ 3. Model ID Mapping & Automatic Resolution Matrix

You do not need to rename your model strings in existing codebases. The GALXAI router automatically resolves prior provider model IDs to their optimal flagship counterpart:

| Existing Model ID in Codebase | Automatically Resolved Canonical Model | Advantage & Wholesale Savings |
| :--- | :--- | :--- |
| `gpt-4o`, `gpt-4`, `chatgpt-4o`, `coding`, `sol` | **`gpt-5.6-sol`** | Flagship SOTA coding & logic, 900K context, **25% OFF** |
| `o1`, `o1-preview`, `o3`, `o3-mini`, `deepseek-r1` | **`gpt-5.6-terra`** | Frontier reasoning & chain-of-thought, **25% OFF** |
| `gpt-4o-mini`, `gemini-2.0-flash`, `fast`, `luna` | **`gpt-5.6-luna`** | Sub-15ms completions, $0.95/1M in, **36% OFF** |
| `claude-3-7-sonnet`, `claude-3-5-sonnet` | **`gpt-5.6-sol`** (or native messages endpoint) | SOTA reasoning, full `/v1/messages` SSE streaming |
| `grok-3`, `grok-2`, `xai-grok`, `grok` | **`x-ai/grok-4.6`** | 1M context multimodal reasoning, **30% OFF** |
| `dall-e-3`, `dalle-3`, `midjourney`, `flux` | **`openai-gpt-image-2`** | 4K synthesis, aspect ratio support, **25% OFF** ($0 egress R2) |

---

## 🛠️ 4. Tool & IDE Migration

### Cursor IDE & Windsurf
1. Navigate to **Cursor Settings** $\to$ **Models**.
2. Set **Override OpenAI Base URL**:
   ```text
   https://galx.ai/v1
   ```
3. Paste your `galx_live_...` key in the **OpenAI API Key** field.
4. Add models: `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `x-ai/grok-4.6`.

### Claude Code CLI
```bash
export ANTHROPIC_BASE_URL="https://galx.ai"
export ANTHROPIC_API_KEY="galx_live_your_key_here"
claude
```

### Aider Terminal Pair Programmer
```bash
export OPENAI_API_BASE="https://galx.ai/v1"
export OPENAI_API_KEY="galx_live_your_key_here"
aider --model gpt-5.6-sol
```

### OpenWebUI (Docker / Local)
In your `docker-compose.yml` or OpenWebUI settings:
```yaml
environment:
  - OPENAI_API_BASE_URL=https://galx.ai/v1
  - OPENAI_API_KEY=galx_live_your_key_here
```

---

## 🔒 5. Verification After Migration

Validate your connection in 1 second using the zero-install CLI:
```bash
npx galxai "Verify GALXAI connection"
# Outputs immediate streaming completion from flagship model
```
