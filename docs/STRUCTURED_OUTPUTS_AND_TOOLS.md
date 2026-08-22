# ⚙️ Structured Outputs & Function Calling Guide

GALXAI natively supports strict JSON Schema enforcement and parallel function / tool calling across reasoning flagships (`gpt-5.6-sol`, `gpt-5.6-terra`, `x-ai/grok-4.5`).

---

## 1. Strict Structured Outputs (`json_schema`)

Ensure 100% adherence to defined JSON schemas for reliable downstream parsing.

### Python Example
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "Extract entity attributes accurately."},
        {"role": "user", "content": "Order #4928 placed by Alice Smith (alice@example.com) for 3 units of SKU-X92."}
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "OrderExtraction",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "integer"},
                    "customer_name": {"type": "string"},
                    "email": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sku": {"type": "string"},
                                "quantity": {"type": "integer"}
                            },
                            "required": ["sku", "quantity"],
                            "additionalProperties": False
                        }
                    }
                },
                "required": ["order_id", "customer_name", "email", "items"],
                "additionalProperties": False
            }
        }
    }
)

print(response.choices[0].message.content)
```

---

## 2. Type-Safe Structured Extraction with `@galxai/sdk`

The official SDK automatically handles JSON Schema serialization and runtime extraction:

```typescript
import { GalxAI } from '@/sdk';

const galx = new GalxAI();

interface UserProfile {
  name: string;
  role: string;
  skills: string[];
}

const profile = await galx.chat.structured<UserProfile>({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Alice Smith is a Principal Distributed Systems Engineer specialized in Raft and Rust.' }],
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      role: { type: 'string' },
      skills: { type: 'array', items: { type: 'string' } }
    },
    required: ['name', 'role', 'skills']
  }
});

console.log(profile.name);   // "Alice Smith"
console.log(profile.skills); // ["Raft", "Rust"]
```

---

## 3. Autonomous Multi-Step Tool Calling Runtime (`galx.agent`)

Eliminate manual while loops, argument parsers, and tool message appending with `galx.agent`:

```typescript
import { GalxAI } from '@/sdk';

const galx = new GalxAI();

const agent = galx.agent({
  model: 'gpt-5.6-sol',
  systemPrompt: 'You are an autonomous cloud infrastructure engineer.',
  tools: {
    getClusterHealth: {
      description: 'Get real-time health stats for a compute cluster',
      parameters: {
        type: 'object',
        properties: { clusterId: { type: 'string' } },
        required: ['clusterId']
      },
      execute: async ({ clusterId }) => {
        return { clusterId, status: 'HEALTHY', activeNodes: 48, p99LatencyMs: 12.4 };
      }
    }
  },
  maxSteps: 5
});

const result = await agent.run('Check the health of cluster us-east-prod-1 and summarize findings.');

console.log(result.text);                // Final synthesized answer
console.log(result.toolCallsExecuted);   // Full execution history
console.log(result.stepsCount);          // Number of execution steps taken
```

