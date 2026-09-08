import type { ModelSpecItem } from '@/core/router/PublicModelCatalog';

export interface SandboxPresetItem {
  title: string;
  desc: string;
  prompt: string;
  response: string;
}

export function getSandboxPresets(model: ModelSpecItem): Record<'refactor' | 'audit' | 'json' | 'architecture', SandboxPresetItem> {
  return {
    refactor: {
      title: 'Full Codebase Refactor',
      desc: 'Migrate a legacy Express auth handler to Next.js App Router with Zod validation.',
      prompt: `Refactor this legacy Node.js route into a Next.js App Router route handler (route.ts) with strict Zod payload validation and atomic error handling:\n\napp.post('/api/auth/login', (req, res) => {\n  const { email, password } = req.body;\n  if (!email || !password) return res.status(400).send('Missing fields');\n  // ...\n});`,
      response: `import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid corporate email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = LoginSchema.parse(rawBody);

    // Atomic authentication against secure vault
    const userSession = await authenticateUser(validated.email, validated.password);

    return NextResponse.json({
      success: true,
      user: { id: userSession.id, email: userSession.email },
      expiresAt: userSession.expiresAt,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "VALIDATION_FAILED",
        issues: error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      }, { status: 422 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}`
    },
    audit: {
      title: 'Zero-Shot Bug & Concurrency Audit',
      desc: 'Audit a distributed lock lease manager for race conditions under high concurrency.',
      prompt: `Audit this concurrent token-bucket lease manager for edge-case race conditions and memory leaks:\n\nclass AtomicLeaseManager {\n  private leases = new Map<string, number>();\n  async acquire(key: string, ttl: number) {\n    const now = Date.now();\n    if (this.leases.has(key) && this.leases.get(key)! > now) return false;\n    this.leases.set(key, now + ttl);\n    return true;\n  }\n}`,
      response: `### Concurrency & Memory Audit Results:

1. **🚨 Race Condition in Check-Then-Act**:
   - In Node.js / V8, if \`acquire()\` contains any \`await\` point or asynchronous tick between \`this.leases.has()\` and \`this.leases.set()\`, two concurrent coroutines can both observe \`false\` and overwrite the lease.
   - **Fix**: Use an atomic compare-and-swap primitive or synchronous lock guard.

2. **⚠️ Memory Leak in Unbounded Map**:
   - Expired leases are never pruned. If unique keys are generated continuously, \`leases\` will grow unbounded until OOM crash.
   - **Fix**: Introduce an active TTL wheel or lazy eviction upon \`.get()\` / periodic sweep.

3. **✅ Hardened Implementation**:
\`\`\`typescript
export class HardenedLeaseManager {
  private leases = new Map<string, number>();

  acquireSync(key: string, ttlMs: number): boolean {
    const now = Date.now();
    const existingExpiry = this.leases.get(key);
    if (existingExpiry && existingExpiry > now) {
      return false; // Active lock held
    }
    this.leases.set(key, now + ttlMs);
    return true;
  }
}
\`\`\``
    },
    json: {
      title: 'Strict Structured JSON Extraction',
      desc: 'Parse unstructured financial invoice text into strict, validated JSON.',
      prompt: `Extract the vendor, line items, subtotal, tax rate, and total from this invoice snippet into valid JSON:\n\n"Invoice #9821 from Acme Cloud Corp. 5x GPU Cluster instances @ $400/ea ($2,000), 1x Enterprise Support tier ($500). State Tax: 8.5% ($212.50). Total Balance Due: $2,712.50 by Oct 31."`,
      response: `{
  "invoice_number": "9821",
  "vendor": "Acme Cloud Corp",
  "currency": "USD",
  "line_items": [
    {
      "description": "GPU Cluster instances",
      "quantity": 5,
      "unit_price": 400.00,
      "total_price": 2000.00
    },
    {
      "description": "Enterprise Support tier",
      "quantity": 1,
      "unit_price": 500.00,
      "total_price": 500.00
    }
  ],
  "subtotal": 2500.00,
  "tax_rate_percent": 8.5,
  "tax_amount": 212.50,
  "total_balance_due": 2712.50,
  "due_date": "2026-10-31"
}`
    },
    architecture: {
      title: 'High-Scale Cloud Architecture',
      desc: 'Design an event-driven queue topology capable of 100K requests/sec with zero drops.',
      prompt: `Design a high-resiliency ingestion pipeline for ${model.name} capable of handling 100,000 requests/sec with automatic backpressure and 75% prompt caching pass-through.`,
      response: `Use a bounded work queue in your application, set request timeouts, and handle Retry-After when provided. Track request IDs and completion status. Measure throughput with your expected prompts before setting concurrency limits.`
    }
  };
}

export function getCodeRecipes(model: ModelSpecItem, customApiKey?: string) {
  const apiKey = customApiKey?.trim() || 'galx_live_your_gateway_key';
  const isImage = model.category === 'image';

  if (isImage) {
    return {
      cli: `# 1. Run zero-install image generation in terminal:
npx galxai image --model "${model.id}" "Cyberpunk futuristic architecture, isometric blueprint, 8k"`,

      curl: `curl https://galx.ai/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "${model.id}",
    "prompt": "Cyberpunk futuristic architecture, isometric blueprint, 8k",
    "size": "1024x1024",
    "n": 1
  }'`,

      python: `from openai import OpenAI

# Initialize client pointing to GALXAI Universal Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${apiKey}"
)

response = client.images.generate(
    model="${model.id}",
    prompt="Cyberpunk futuristic architecture, isometric blueprint, 8k",
    size="1024x1024",
    n=1
)

print(response.data[0].url)`,

      node: `import OpenAI from "openai";

// Drop-in replacement for OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "${apiKey}",
});

async function main() {
  const response = await openai.images.generate({
    model: "${model.id}",
    prompt: "Cyberpunk futuristic architecture, isometric blueprint, 8k",
    size: "1024x1024",
    n: 1,
  });

  console.log(response.data[0]?.url);
}

main();`,

      vercel: `import { createOpenAI } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";

// Initialize Vercel AI SDK pointing to GALXAI Universal Router
const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "${apiKey}",
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const { image } = await generateImage({
    model: galxai.image("${model.id}"),
    prompt: prompt || "Cyberpunk futuristic architecture, isometric blueprint, 8k",
    aspectRatio: "1:1",
  });

  return Response.json({ image: image.base64 });
}`,

      langchain: `# OpenAI Image Generation via GALXAI Universal Gateway
import requests

response = requests.post(
    "https://galx.ai/v1/images/generations",
    headers={"Authorization": f"Bearer ${apiKey}"},
    json={
        "model": "${model.id}",
        "prompt": "Cyberpunk futuristic architecture, isometric blueprint, 8k",
        "size": "1024x1024"
    }
)

data = response.json()
print(data["data"][0]["url"])`,

      go: `package main

import (
	"context"
	"fmt"

	openai "github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("${apiKey}")
	config.BaseURL = "https://galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	ctx := context.Background()

	req := openai.ImageRequest{
		Prompt:         "Cyberpunk futuristic architecture, isometric blueprint, 8k",
		Model:          "${model.id}",
		Size:           openai.CreateImageSize1024x1024,
		ResponseFormat: openai.CreateImageResponseFormatURL,
		N:              1,
	}

	resp, err := client.CreateImage(ctx, req)
	if err != nil {
		fmt.Printf("Image generation error: %v\\n", err)
		return
	}

	fmt.Println(resp.Data[0].URL)
}`,

      rust: `use async_openai::{
    config::OpenAIConfig,
    types::{CreateImageRequestArgs, ImageSize, ImageResponseFormat},
    Client,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("https://galx.ai/v1")
        .with_api_key("${apiKey}");

    let client = Client::with_config(config);

    let request = CreateImageRequestArgs::default()
        .model("${model.id}")
        .prompt("Cyberpunk futuristic architecture, isometric blueprint, 8k")
        .n(1)
        .size(ImageSize::S1024x1024)
        .response_format(ImageResponseFormat::Url)
        .build()?;

    let response = client.images().create(request).await?;
    println!("Image URL: {}", response.data[0].url);

    Ok(())
}`,

      cursor: `// In your Cursor / Windsurf Settings -> Models:
// Toggle "Override OpenAI Base URL"
Base URL: https://galx.ai/v1
API Key:  ${apiKey}

// Add custom model identifier:
Model:    ${model.id}

// In .cursorrules at your repo root:
{
  "model": "${model.id}",
  "baseURL": "https://galx.ai/v1"
}`
    };
  }

  return {
    cli: `# 1. Run zero-install streaming prompt in terminal:
npx galxai --model "${model.id}" "Write a high-performance LRU cache in TypeScript"

# 2. Or start an interactive chat session:
npx galxai chat --model "${model.id}"`,

    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "${model.id}",
    "messages": [
      { "role": "system", "content": "You are an expert software engineer." },
      { "role": "user", "content": "Write a high-performance LRU cache in TypeScript." }
    ],
    "temperature": 0.2,
    "stream": true
  }'`,

    python: `from openai import OpenAI

# Initialize client pointing to GALXAI Universal Gateway
# Automatically unlocks wholesale pricing & up to 90% prompt caching
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${apiKey}"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[
        {"role": "system", "content": "You are a senior software architect."},
        {"role": "user", "content": "Refactor this distributed pipeline with atomic error handling."}
    ],
    temperature=0.2,
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,

    node: `import OpenAI from "openai";

// Drop-in replacement for OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "${apiKey}",
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "${model.id}",
    messages: [
      { role: "system", content: "You are an expert coding assistant." },
      { role: "user", content: "Implement a rate-limiter token bucket algorithm." }
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`,

    vercel: `import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Initialize Vercel AI SDK pointing to GALXAI Universal Router
const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "${apiKey}",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai("${model.id}"),
    messages,
  });

  return result.toDataStreamResponse();
}`,

    langchain: `from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

# Initialize LangChain with GALXAI Universal Gateway
llm = ChatOpenAI(
    model="${model.id}",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="${apiKey}",
    temperature=0.2,
    streaming=True
)

messages = [
    SystemMessage(content="You are an autonomous engineering agent."),
    HumanMessage(content="Design an ACID-compliant event sourcing schema.")
]

for chunk in llm.stream(messages):
    print(chunk.content, end="", flush=True)`,

    go: `package main

import (
	"context"
	"errors"
	"fmt"
	"io"

	openai "github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("${apiKey}")
	config.BaseURL = "https://galx.ai/v1"

	client := openai.NewClientWithConfig(config)
	ctx := context.Background()

	req := openai.ChatCompletionRequest{
		Model: "${model.id}",
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleUser,
				Content: "Implement a distributed lock manager in Go with Redis sync.",
			},
		},
		Stream: true,
	}

	stream, err := client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		fmt.Printf("Stream error: %v\\n", err)
		return
	}
	defer stream.Close()

	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			fmt.Printf("Stream recv error: %v\\n", err)
			break
		}
		fmt.Print(response.Choices[0].Delta.Content)
	}
}`,

    rust: `use async_openai::{
    types::{ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs, CreateChatCompletionRequestArgs},
    Client,
    config::OpenAIConfig,
};
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("https://galx.ai/v1")
        .with_api_key("${apiKey}");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("${model.id}")
        .max_tokens(1024u32)
        .messages([
            ChatCompletionRequestSystemMessageArgs::default()
                .content("You are an autonomous systems engineering agent.")
                .build()?
                .into(),
            ChatCompletionRequestUserMessageArgs::default()
                .content("Implement an atomic ring buffer with zero mutex contention in Rust.")
                .build()?
                .into(),
        ])
        .build()?;

    let mut stream = client.chat().create_stream(request).await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(response) => {
                for chat_choice in response.choices {
                    if let Some(ref content) = chat_choice.delta.content {
                        print!("{}", content);
                    }
                }
            }
            Err(err) => {
                eprintln!("Error: {err}");
            }
        }
    }

    Ok(())
}`,

    cursor: `// In your Cursor / Windsurf Settings -> Models:
// Toggle "Override OpenAI Base URL"
Base URL: https://galx.ai/v1
API Key:  ${apiKey}

// Add custom model identifier:
Model:    ${model.id}

// In .cursorrules at your repo root:
{
  "model": "${model.id}",
  "baseURL": "https://galx.ai/v1",
  "promptCaching": true
}`
  };
}
