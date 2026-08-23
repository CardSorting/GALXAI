# 💻 GALXAI Multi-Ecosystem SDK Cheatsheet

Complete drop-in code snippets for connecting any major AI framework, SDK, or programming language to GALXAI.

---

## ⚡ 1-Line Ultra-Flat Execution & Tagged Templates

```typescript
import galx, { run, stream, extract, tool, embed, generateImage } from 'galxai';

// 1. Tagged Template Literal
const summary = await galx`Summarize the key takeaways for ${topic}`;

// 2. Direct 1-Line Run
const answer = await run('Explain quantum mechanics in simple terms');

// 3. 1-Line Streaming
for await (const chunk of stream('Write a haiku about code')) {
  process.stdout.write(chunk);
}

// 4. 1-Line Vector Embeddings
const vector = await embed('Zero-egress edge routing');
console.log(vector.data[0].embedding.length); // 1536

// 5. 1-Line Schema Extraction
const user = await extract('Jane Doe, 29, Engineer in SF', {
  name: 'string', age: 'number', role: 'string', city: 'string'
});

// 6. 1-Line Image Generation
const image = await generateImage('Futuristic cyber vehicle');
```

---

## 🌌 Official GALXAI Universal SDK (`@galxai/sdk`)

```typescript
import { GalxAI, createCostTrackerPlugin, createLRUCachePlugin } from 'galxai';

const client = new GalxAI({ apiKey: process.env.GALX_API_KEY });

// 1. Fluent Builder with Streaming
const stream = await client.chat
  .builder('gpt-5.6-sol')
  .system('You are an expert systems architect.')
  .user('Explain Raft consensus.')
  .temperature(0.2)
  .stream(true)
  .execute();

// 2. Autonomous Multi-Step Agent Tool Loop
const agent = client.agent({
  model: 'gpt-5.6-sol',
  tools: {
    getQuote: {
      description: 'Get stock quote',
      parameters: { ticker: { type: 'string' } },
      execute: async ({ ticker }) => ({ price: 135.50 })
    }
  }
});
const result = await agent.run('What is Nvidia trading at?');

// 3. Strongly-Typed Structured Outputs
const invoice = await galx.chat.structured({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Invoice #1024 total $450' }],
  schema: {
    type: 'object',
    properties: { invoiceId: { type: 'string' }, total: { type: 'number' } },
    required: ['invoiceId', 'total']
  }
});

// 4. Background Queue with Real-Time SSE Progress
const task = await galx.chat.completions.createAsync({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Mass evaluation' }],
  queue: 'llm-batch',
  groupId: 'session_1'
});
```

---

## 🐍 Python Ecosystem

### 1. Official OpenAI Python SDK
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",  # Or https://api.galx.ai/v1
    api_key=os.environ.get("GALXAI_API_KEY", "galx_live_your_key_here")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain quantum teleportation in 3 sentences."}],
    temperature=0.7
)


print(response.choices[0].message.content)
```

---

### 2. Vercel AI SDK (TypeScript / Node.js)
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const galxai = createOpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: process.env.GALXAI_API_KEY!,
});

async function main() {
  const result = await streamText({
    model: galxai('gpt-5.6-sol'),
    prompt: 'Write an optimized binary search tree in TypeScript.',
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
}

main();
```

---

### 3. LangChain (Python)
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_key_here",
    temperature=0.3
)

response = llm.invoke("What are the primary invariants of smooth weighted round-robin?")
print(response.content)
```

---

### 4. LlamaIndex (Python)
```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="x-ai/grok-4.5",
    api_base="http://localhost:3000/v1",
    api_key="galx_live_your_key_here"
)

response = llm.complete("Summarize the benefits of 2-Phase Token Reservation.")
print(response.text)
```

---

### 5. Instructor (Structured Outputs with Pydantic)
```python
import instructor
from pydantic import BaseModel, Field
from openai import OpenAI

class VulnerabilityReport(BaseModel):
    title: str = Field(description="Name of the security vulnerability")
    severity: str = Field(description="Low, Medium, High, or Critical")
    remediation_steps: list[str]

client = instructor.from_openai(
    OpenAI(
        base_url="http://localhost:3000/v1",
        api_key="galx_live_your_key_here"
    )
)

report = client.chat.completions.create(
    model="gpt-5.6-sol",
    response_model=VulnerabilityReport,
    messages=[{"role": "user", "content": "Analyze SQL injection in string concatenations."}]
)

print(report.model_dump_json(indent=2))
```

---

## 🦀 Rust (`async-openai`)

```rust
use async_openai::{
    config::OpenAIConfig,
    types::{CreateChatCompletionRequestArgs, ChatCompletionRequestUserMessageArgs},
    Client,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = OpenAIConfig::new()
        .with_api_base("http://localhost:3000/v1")
        .with_api_key("galx_live_your_key_here");

    let client = Client::with_config(config);

    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-5.6-sol")
        .messages([ChatCompletionRequestUserMessageArgs::default()
            .content("Derive the time complexity of A* search.")
            .build()?
            .into()])
        .build()?;

    let response = client.chat().create(request).await?;
    println!("{}", response.choices[0].message.content.as_deref().unwrap_or(""));

    Ok(())
}
```

---

## 🐹 Go (`sashabaranov/go-openai`)

```go
package main

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
)

func main() {
	config := openai.DefaultConfig("galx_live_your_key_here")
	config.BaseURL = "http://localhost:3000/v1"

	client := openai.NewClientWithConfig(config)

	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: "x-ai/grok-4.5",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "Explain continuous token bucket replenishment calculus.",
				},
			},
		},
	)

	if err != nil {
		fmt.Printf("ChatCompletion error: %v\n", err)
		return
	}

	fmt.Println(resp.Choices[0].Message.Content)
}
```
