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

## 2. Tool & Function Calling

Provide models with external tools for live execution loops.

### TypeScript Example
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: process.env.GALXAI_API_KEY!,
});

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_system_metrics',
      description: 'Fetches real-time server telemetry and latency percentiles.',
      parameters: {
        type: 'object',
        properties: {
          metric_type: { type: 'string', enum: ['latency', 'throughput', 'circuit_status'] },
          window_minutes: { type: 'number', description: 'Window in minutes' },
        },
        required: ['metric_type'],
      },
    },
  },
];

const response = await client.chat.completions.create({
  model: 'x-ai/grok-4.5',
  messages: [{ role: 'user', content: 'What has been our P99 latency over the last 15 minutes?' }],
  tools,
  tool_choice: 'auto',
});

console.log(JSON.stringify(response.choices[0].message.tool_calls, null, 2));
```
