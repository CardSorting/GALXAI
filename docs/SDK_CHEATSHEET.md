# 💻 GALXAI Multi-Ecosystem SDK Cheatsheet

Complete drop-in code snippets for connecting any major AI framework or programming language to GALXAI.

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
